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

#if 0
uint8_t settingsWrBuf[EEPROM_PAGE_SIZE + 2],
        logBank1WrBuf[EEPROM_PAGE_SIZE + 2],
        logBank2WrBuf[EEPROM_PAGE_SIZE + 2];

static const EepromDevice *eedevp;
static I2CEepromFileStream settings_ee;
static I2CEepromFileStream log_bank1_ee;
static I2CEepromFileStream log_bank2_ee;

static I2CEepromFileConfig settings_eecfg = {
  /* Lower barrier of file in EEPROM memory array. */
  EEPROM_SETTINGS_START_ADDR,
  /* Higher barrier of file in EEPROM memory array. */
  EEPROM_SETTINGS_END_ADDR ,
  /* Size of memory array in bytes. */
  EEPROM_SETTINGS_END_ADDR - EEPROM_SETTINGS_END_ADDR,
  /* Size of single page in bytes. */
  EEPROM_PAGE_SIZE,
  /* Time needed by IC for single byte/page writing. */
  EEPROM_WRITE_TIME,
  /* i2c Driver connected to IC. */
  &I2CD1,
  /* Address of IC on I2C bus. */
  EEPROM_I2C_BUS_ADDR_BANK1,
  /* Pointer to write buffer. The safest size is (pagesize + 2) */
  settingsWrBuf,
};

static I2CEepromFileConfig log_bank1_eecfg = {
  /* Lower barrier of file in EEPROM memory array. */
  EEPROM_LOG_BANK1_START_ADDR,
  /* Higher barrier of file in EEPROM memory array. */
  EEPROM_BANK1_END_ADDR ,
  /* Size of memory array in bytes. */
  EEPROM_SETTINGS_END_ADDR - EEPROM_SETTINGS_END_ADDR,
  /* Size of single page in bytes. */
  EEPROM_PAGE_SIZE,
  /* Time needed by IC for single byte/page writing. */
  EEPROM_WRITE_TIME,
  /* i2c Driver connected to IC. */
  &I2CD1,
  /* Address of IC on I2C bus. */
  EEPROM_I2C_BUS_ADDR_BANK1,
  /* Pointer to write buffer. The safest size is (pagesize + 2) */
  logBank1WrBuf,
};

static I2CEepromFileConfig log_bank2_eecfg = {
  /* Lower barrier of file in EEPROM memory array. */
  EEPROM_BANK2_START_ADDR,
  /* Higher barrier of file in EEPROM memory array. */
  EEPROM_BANK2_END_ADDR ,
  /* Size of memory array in bytes. */
  EEPROM_SETTINGS_END_ADDR - EEPROM_SETTINGS_END_ADDR,
  /* Size of single page in bytes. */
  EEPROM_PAGE_SIZE,
  /* Time needed by IC for single byte/page writing. */
  EEPROM_WRITE_TIME,
  /* i2c Driver connected to IC. */
  &I2CD1,
  /* Address of IC on I2C bus. */
  EEPROM_I2C_BUS_ADDR_BANK1,
  /* Pointer to write buffer. The safest size is (pagesize + 2) */
  logBank2WrBuf,
};
#endif

// -----------------------------------------------------------------
// Public stuff for this module
#if 0
EepromFileStream *settings_fs,
                 *log_bank1_fs,
                 *log_bank2_fs;

void eepromInit(void) {
  eedevp = EepromFindDevice(EEPROM_DEV_24XX);
  settings_fs = I2CEepromFileOpen(&settings_ee, &settings_eecfg, eedevp);
  log_bank1_fs = I2CEepromFileOpen(&log_bank1_ee, &log_bank1_eecfg, eedevp);
  log_bank2_fs = I2CEepromFileOpen(&log_bank2_ee, &log_bank2_eecfg, eedevp);
;
}
#endif

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
