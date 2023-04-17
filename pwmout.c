/*
 * pwmout.c
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */


#include "pwmout.h"
#include "hal.h"
#include "settings.h"


// ------------------------------------------------------------
// private stuff to this module

static uint16_t const availableFrequencies[] = {1, 10, 100, 1000, 10000};

static PWMConfig pwmcfg = {
  10000,                                  /* 10kHz PWM clock frequency.     */
  10000,                                  /* Initial PWM period 1S.         */
  NULL,                                     /* Period callback.               */
  {
   {PWM_OUTPUT_DISABLED, NULL},         /* CH1 mode and callback.         */
   {PWM_OUTPUT_ACTIVE_HIGH, NULL},             /* CH2 mode and callback.         */
   {PWM_OUTPUT_ACTIVE_HIGH, NULL},             /* CH3 mode and callback.         */
   {PWM_OUTPUT_ACTIVE_HIGH, NULL}              /* CH4 mode and callback.         */
  },
  0,                                        /* Control Register 2.            */
  0                                         /* DMA/Interrupt Enable Register. */
};


static void setPeriod(uint32_t hz, pwmcnt_t initial_period) {
  pwmStop(&PWMD3);

  if (hz == 0) return;

  pwmcfg.frequency = hz;
  pwmcfg.period = initial_period;

  pwmStart(&PWMD3, &pwmcfg);
}

// ------------------------------------------------------------


// public stuff from this module

/**
 * @brief sets the pwm frequency of the outputs
 * ie number of periods under a second
 */
void pwmoutSetFrequency(PwmFrequency_e freq) {
  switch (freq) {
  case off:
    setPeriod(0, 0);
    break;
  case freq1Hz:
    setPeriod(10000, 10000);
    break;
  case freq10Hz:
    setPeriod(10000, 1000);
    break;
  case freq100Hz:
    setPeriod(10000, 100);
    break;
  case freq1kHz:
    setPeriod(1000000, 1000);
    break;
  case freq10kHz:
    setPeriod(1000000, 100);
    break;
  default:
    // ignore
    break;
  }
}

/**
 * @brief all the possible selectable frequencies
 */
const PwmFrequencies_t pwmoutFrequencies = {
  size: sizeof(availableFrequencies)/sizeof(availableFrequencies[0]),
  frequencies: availableFrequencies
};

/**
 * @brief sets the output duty for each channel
 * @ch the channel to set duty on
 * @duty in percents
 */
void pwmoutSetDuty(OutputCh_e ch, uint8_t duty) {
  if (PWMD3.state != PWM_READY)
    pwmStart(&PWMD3, &pwmcfg);

  pwmEnableChannel(&PWMD3, ch, PWM_PERCENTAGE_TO_WIDTH(&PWMD3, duty * 100));
}


/**
 * @brief called each time settings has changed
 */
void pwmoutSettingsChanged(void) {
  if (PWMD3.state == PWM_READY) {
    for(OutputCh_e ch = breakChStart; ch < brakeChEnd; ++ch)
      pwmDisableChannel(&PWMD3, ch);
  }

  pwmoutSetFrequency(settings.PwmFreq);
}

void pwmoutInit(void) {
  pwmoutSettingsChanged();
}
