/*
 * inputs.c
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */


#include "inputs.h"
#include "settings.h"
#include "diag.h"
#include <hal.h>
#include <ch.h>
#include <stm32f042x6.h>
#include <stm32_dma.h>

#define DMA_SAMPLES_CNT 5
// medium priority
#define DMA_PRIORITY 1U

#define TIM2_SPEED  100000U

volatile const Inputs_t inputs = {0};

// ---------------------------------------------------------------
// private stuff for this module

volatile Inputs_t* INPUTS = (Inputs_t*)&inputs;

// we can't use chibios ICU here as that only supports capture from a
// single channel at a time, we role our own driver here

static stm32_dma_stream_t *dma_tim2_ch2 = 0,
                          *dma_tim2_ch3 = 0,
                          *dma_tim2_ch4 = 0;
static const uint32_t frequency = 100000u;
static uint32_t _receiverPulseStart = 0;
static uint32_t _ch2data[DMA_SAMPLES_CNT],
                _ch3data[DMA_SAMPLES_CNT],
                _ch4data[DMA_SAMPLES_CNT];

// interupts
OSAL_IRQ_HANDLER(STM32_TIM2_HANDLER) {
  // we should only get here from CH1 (reciever) interrupt

  OSAL_IRQ_PROLOGUE();
  if (STM32_TIM2->CCER & STM32_TIM_CCER_CC1P) {
    // positive flank
    _receiverPulseStart = STM32_TIM2->CCR[0];
    // trigger on negative flank next time
    STM32_TIM2->CCER |= STM32_TIM_CCER_CC1P;
  } else {
    // negative flank
    uint32_t diff = STM32_TIM2->CCR[0] - _receiverPulseStart;
    if (diff < 100)
      INPUTS->brakeForce = 0;
    else if (diff > 200)
      INPUTS->brakeForce = 100;
    else
      // 100 = 1ms pulse = 0,
      // 200 = 2ms pulse = vlu 100
      if ((diagSetValues & diag_Set_InputRcv) == 0)
        INPUTS->brakeForce = (uint8_t)(diff - 100);

    // trigger on positive flank next time
    STM32_TIM2->CCER &= ~STM32_TIM_CCER_CC1P;
  }

  OSAL_IRQ_EPILOGUE();
}

// DMA interrupt callback
static void dma_complete_callback(uint32_t *arr, uint32_t flags) {
  // error handling
  if ((flags & (STM32_DMA_ISR_TEIF | STM32_DMA_ISR_DMEIF)) != 0) {
    // not sure what to do? error occured
  } else {
    // calculate mid value of the samples
    uint32_t sumOfSamples = 0, last = arr[0];
    for (size_t i = 1; i < DMA_SAMPLES_CNT; ++i) {
      sumOfSamples += arr[i] - last;
    }

    // we want rev per sec so TIM2 runs at 100000Hz
    uint32_t vlu = (sumOfSamples / 4);
    if (vlu > 0)
      vlu = TIM2_SPEED / vlu;

    if (arr == _ch2data && (diagSetValues & diag_Set_InputWhl0) == 0)
      INPUTS->wheelRPS[0] =
          (uint8_t)(vlu / settings.WheelSensor0_pulses_per_rev);
    else if (arr == _ch3data && (diagSetValues & diag_Set_InputWhl1) == 0)
      INPUTS->wheelRPS[1] =
          (uint8_t)(vlu / settings.WheelSensor1_pulses_per_rev);
    else if (arr == _ch4data && (diagSetValues & diag_Set_InputWhl2) == 0)
      INPUTS->wheelRPS[2] =
          (uint8_t)(vlu / settings.WheelSensor2_pulses_per_rev);
  }
}

static stm32_dma_stream_t* startDmaCh(
    uint32_t streamId, volatile uint32_t *data, void *param)
{
  stm32_dma_stream_t* dma = (stm32_dma_stream_t*)dmaStreamAlloc(
                        streamId,
                        STM32_ICU_TIM2_IRQ_PRIORITY -1,
                        (stm32_dmaisr_t)dma_complete_callback,
                        param);
  osalDbgAssert(dma != NULL, "unable to allocate stream");
  dmaStreamSetPeripheral(dma, data);

  uint32_t mode =
        STM32_DMA_CR_PL(DMA_PRIORITY)   // priority normal
      | STM32_DMA_CR_DIR_P2M            // Peripheral to Memory
      | STM32_DMA_CR_MSIZE_WORD         // 32bit size in Memory
      | STM32_DMA_CR_PSIZE_WORD         // 32bit size in Peripheral
      | STM32_DMA_CR_MINC               // memory increment, place in next
      | STM32_DMA_CR_TCIE               // transfer complete interrupt
      | STM32_DMA_CR_TEIE               // transfer error interrupt
      | STM32_DMA_CR_CIRC;              // circular mode

  dmaStreamSetMemory0(dma, data);
  dmaStreamSetTransactionSize(dma, DMA_SAMPLES_CNT);
  dmaStreamSetMode(dma, mode);
  dmaStreamEnable(dma);

  return dma;
}

static void stopTmr2(void) {

  /* Clock deactivation.*/
  STM32_TIM2->CR1  = 0;                    /* Timer disabled.              */
  STM32_TIM2->DIER = 0;                    /* All IRQs disabled.           */
  STM32_TIM2->SR   = 0;                    /* Clear eventual pending IRQs. */
  STM32_TIM2->CNT  = 0;                    /* Clear counter */


  if (dma_tim2_ch2)
    dmaStreamFree(dma_tim2_ch2);
  if (dma_tim2_ch3)
    dmaStreamFree(dma_tim2_ch3);
  if (dma_tim2_ch4)
    dmaStreamFree(dma_tim2_ch4);

  dma_tim2_ch2 = dma_tim2_ch3 = dma_tim2_ch4 = NULL;
}

static void startTmr2(void) {

  rccEnableTIM2(true);
  rccResetTIM2();
  nvicEnableVector(STM32_TIM2_NUMBER, STM32_ICU_TIM2_IRQ_PRIORITY);


  for (size_t i = 0; i < sizeof(STM32_TIM2->CCR) / sizeof(STM32_TIM2->CCR[0]); ++i )
    STM32_TIM2->CCR[i] = 0; // reset comparator
  STM32_TIM2->CNT    = 0;                  /* Counter reset to zero.       */

  nvicDisableVector(STM32_TIM2_NUMBER);
  rccDisableTIM2();

  /* Timer configuration.*/
  STM32_TIM2->SR   = 0;                      /* Clear eventual pending IRQs. */

  uint32_t // enable interrupt in ch1 (receiver in),
           // later in IRQ we clear the CC1P to detect negative flank, ie setting CC1P
           dier = STM32_TIM_DIER_CC1IE,
           // select input CH1 and store on CCR[0], default disable ch2
           ccmr1 = STM32_TIM_CCMR1_CC1S(1),
           // default to disable ch3-4
           ccmr2 = 0,
           // enable ch1, positive flank CC1P=0
           ccer = STM32_TIM_CCER_CC1E;

  // enable DMA interrupt on CH2-4
  if (settings.WheelSensor0_pulses_per_rev > 0) {
    dier  |= STM32_TIM_DIER_CC2DE; // DMA interrupt on CH2
    ccmr1 |= STM32_TIM_CCMR1_CC2S(1);// enable ch2
    ccer  |= STM32_TIM_CCER_CC2E; // enable ch2 with positive flank
  }
  if (settings.WheelSensor1_pulses_per_rev > 0) {
    // DMA interrupt on CH3
    dier  |= STM32_TIM_DIER_CC3DE; // DMA interrupt on CH3
    ccmr2 |= STM32_TIM_CCMR2_CC3S(1);// enable ch3
    ccer  |= STM32_TIM_CCER_CC3E; // enable ch3 with positive flank
  }
  if (settings.WheelSensor2_pulses_per_rev > 0) {
    // DMA interrupt on CH4
    dier  |= STM32_TIM_DIER_CC4DE; // DMA interrupt on CH4
    ccmr2 |= STM32_TIM_CCMR2_CC4S(1);// enable ch4
    ccer  |= STM32_TIM_CCER_CC4E; // enable ch4 with positive flank
  }

  // interrupts and dma
  STM32_TIM2->DIER = dier;

  // frequency and auto reload register
  uint32_t psc = (STM32_TIMCLK1 / frequency) - 1;
  STM32_TIM2->PSC = psc; // 48000000 / 480 gives 100khz ie a 1ms pulse becomes 100
  STM32_TIM2->ARR = 0xFFFFFFFF; // basically almost never autoreload

  // select input CH1 and CH2, store value in each respective register
  STM32_TIM2->CCMR1 = ccmr1; //STM32_TIM_CCMR1_CC1S(1) | STM32_TIM_CCMR1_CC2S(1);
  STM32_TIM2->CCMR2 = ccmr2; //STM32_TIM_CCMR2_CC3S(1) | STM32_TIM_CCMR2_CC4S(1);

  // enable
  STM32_TIM2->CCER = ccer;
  // later in IRQ we clear the CC1P to detect negative flank, ie setting CC1P
  //STM32_TIM2->CCER = /*STM32_TIM_CCER_CC1P |*/ STM32_TIM_CCER_CC1E
  //                 | /*STM32_TIM_CCER_CC2P |*/ STM32_TIM_CCER_CC2E
  //                 | /*STM32_TIM_CCER_CC3P |*/ STM32_TIM_CCER_CC3E
  //                 | /*STM32_TIM_CCER_CC4P |*/ STM32_TIM_CCER_CC4E;

  // DMA channel TIM2_CH2 = DMA_CH3,
  dma_tim2_ch2 = startDmaCh(STM32_DMA_STREAM_ID(1, 3),
                          &STM32_TIM2->CCR[1],
                          (void *)_ch2data);

  // TIM2_CH3 = DMA_CH1,
  dma_tim2_ch3 = startDmaCh(STM32_DMA_STREAM_ID(1, 1),
                          &STM32_TIM2->CCR[2],
                          (void *)_ch3data);

  // TIM2_CH4 = DMA_CH4
  dma_tim2_ch4 = startDmaCh(STM32_DMA_STREAM_ID(1, 4),
                          &STM32_TIM2->CCR[3],
                          (void *)_ch4data);

  // start input capture
  // trigger UG and clearing IRQ status
  STM32_TIM2->EGR |= STM32_TIM_EGR_UG; // clear event generated
  STM32_TIM2->SR = 0;

  STM32_TIM2->CR1 = STM32_TIM_CR1_URS | STM32_TIM_CR1_CEN;
}

/*
 * Source: wikipedia.org/wiki/Servo_control
 *  RC servos has a refresh rate of about 20ms,
 *  with pulse width of 1-2 ms
 *  where  1ms is 90deg left, 2ms is 90deg right,
 *  1.5ms is center position. Refresh rate is not important, can be 40-200hz
 *        ___                               ___
 *  so: __|  |______________________________|  |
 *        <-> 1ms = -90deg
 *        <--------------------20ms-------->
 *
 *        ______                            ______
 *      __|     |___________________________|     |
 *        <----> 2ms = +90deg
 *        <--------------------20ms--------->
 *
 *        ____                              ____
 *      __|   |_____________________________|   |
 *        <-->  1.5ms = 0deg
 *        <--------------------20ms--------->
 */

// at 100khz and 32 bits the counter should overflow each 11.9hour or so.
// we can probably ignore overflow error as that is such a rare occurence


// ---------------------------------------------------------------

// public stuff


void inputsInit(void) { }

void inputsStart(void) {
  //startTmr2(); // rely on settings notify here, when i2c have read e2prom
}

void inputsSettingsChanged(void) {
  stopTmr2();
  startTmr2();
}

void inputsStop(void) {
  stopTmr2();
}
