/*
 * eeprom.h
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef EEPROM_H_
#define EEPROM_H_

#include "settings.h"
//#include <hal_eeprom.h>
#include <ee24m01r.h>

#define EEPROM_PAGE_SIZE             EE24M01R_PAGE_SIZE
#define EEPROM_SETTINGS_START_ADDR   (0U)
#define EEPROM_SETTINGS_SIZE       (sizeof(Settings_t))
#define EEPROM_SETTINGS_END_ADDR                            \
            (EEPROM_SETTINGS_START_ADDR + EEPROM_SETTINGS_SIZE)
#define EEPROM_LOG_START_ADDR  (EEPROM_SETTINGS_END_ADDR + 1)
#define EEPROM_LOG_SIZE        ((EE24M01R_BANK1_END_ADDR - EEPROM_LOG_START_ADDR)+ \
                                EE24M01R_BANK2_CAPACITY /*- 4 -4 due to next address is stored last in sector 2*/)
#define EEPROM_LOG_NEXT_ADDR_LOC \
  (EE24M01R_BANK1_END_ADDR + EE24M01R_BANK2_END_ADDR - 4 - EEPROM_SETTINGS_SIZE)
void eepromInit(void);

//extern EepromFileStream *settings_fs, *log_bank1_fs, *log_bank2_fs;

extern ee24partition_t settings_ee, log_ee;

#endif /* EEPROM_H_ */
