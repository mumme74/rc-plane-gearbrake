/*
 * i2c_bus.c
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */


#include "i2c_bus.h"

#include <hal.h>

// ----------------------------------------------------------------
// Private stuff for this module



// ----------------------------------------------------------------
// Public stuff for this module
// config for i2c, values from programming manual 21.4.10, 1Mhz
const I2CConfig i2ccfg = {
  STM32_TIMINGR_PRESC(5U) |
  STM32_TIMINGR_SCLDEL(1U) | STM32_TIMINGR_SDADEL(0U) |
  STM32_TIMINGR_SCLH(1U)  | STM32_TIMINGR_SCLL(3U),
  0,
  0
};

void i2c_busInit(void) {
  i2cStart(&I2CD1, &i2ccfg);
}
