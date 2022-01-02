/*
 * eeprom.c
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#include "cfg/halconf.h"
#include "eeprom.h"
#include "ee24m01r.h"
#include <hal.h>
#include <stdint.h>

// -----------------------------------------------------------------
// private stuff for this module


// -----------------------------------------------------------------
// Public stuff for this module

ee24partition_t settings_ee = {
  &I2CD1,
  EE24M01R_I2C_LOW_BANK(0),
  EEPROM_SETTINGS_START_ADDR,
  EEPROM_SETTINGS_SIZE
};

ee24partition_t log_ee = {
  &I2CD1,
  EE24M01R_I2C_LOW_BANK(0),
  EEPROM_LOG_START_ADDR,
  EEPROM_LOG_SIZE
};

void eepromInit(void) {}
