/*
 * pwmout.h
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef PWMOUT_H_
#define PWMOUT_H_

#include <stdint.h>

typedef enum {
  off,
  freq1Hz,
  freq10Hz,
  freq100Hz,
  freq1kHz,
  freq10kHz,
  freqHighest = freq10kHz
} PwmFrequency_e;

typedef enum {
  breakChStart = 1,
  brake0 = breakChStart,  // brake0 is at TIM3_ch1
  brake1 = 2,
  brake2 = 3,
  brakeChEnd = brake2
} OutputCh_e;

/**
 * @brief initialize the pwm output driver
 *        this should be done once when seettings are read
 * @ch the channel to activate or deactivate
 */
void setActive(OutputCh_e ch, int active);

/**
 * @brief sets the pwm frequency of the outputs
 * ie number of periods under a second
 */
void pwmoutSetFrequency(PwmFrequency_e freq);

/**
 * @brief all the possible selectable frequencies
 */
typedef struct {
  const uint8_t size;         // the number of frequencies
  const uint16_t const *frequencies; // the available frequencies
} PwmFrequencies_t;

extern const PwmFrequencies_t pwmoutFrequencies;


/**
 * @brief sets the output duty for each channel
 * @ch the channel to set duty on
 * @duty in percents
 */
void pwmoutSetDuty(OutputCh_e ch, uint8_t duty);


/**
 * @breif call every time settings has changed
 */
void pwmoutSettingsChanged(void);


#endif /* PWMOUT_H_ */
