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

/*
#define EEPROM_I2C_BUS_ADDR_BANK1    0x50U
#define EEPROM_I2C_BUS_ADDR_BANK2    0x51U
#define EEPROM_I2C_BUS_ADDR_ID_PAGE  0x58U

#define EEPROM_TOTAL_CAPACITY_BITS   1000000U
#define EEPROM_TOTAL_CAPACITY        (EEPROM_TOTAL_CAPACITY_BITS / 8U)
#define EEPROM_BANK1_CAPACITY_BITS   500000U
#define EEPROM_BANK2_CAPACITY_BITS   500000U
#define EEPROM_BANK1_CAPACITY        (EEPROM_BANK1_CAPACITY_BITS / 8U)
#define EEPROM_BANK2_CAPACITY        (EEPROM_BANK2_CAPACITY_BITS / 8U)
#define EEPROM_BANK1_START_ADDR      0U
#define EEPROM_BANK1_END_ADDR        (EEPROM_BANK1_CAPACITY - EEPROM_BANK1_START_ADDR -1)
*/
/* start address is at 0 but the 16th bit is set with a different i2c address */
/*#define EEPROM_BANK2_START_ADDR      0U
#define EEPROM_BANK2_END_ADDR        (EEPROM_BANK1_CAPACITY - EEPROM_BANK1_START_ADDR -1)


#define EEPROM_PAGE_SIZE             256U
#define EEPROM_WRITE_TIME            5U*/ /* in milliseconds */

#define EEPROM_PAGE_SIZE             EE24M01R_PAGE_SIZE
#define EEPROM_SETTINGS_START_ADDR   (0U)
#define EEPROM_SETTINGS_SIZE       (sizeof(Settings_t))
#define EEPROM_SETTINGS_END_ADDR                            \
            (EEPROM_SETTINGS_START_ADDR + EEPROM_SETTINGS_SIZE)
#define EEPROM_LOG_START_ADDR  (EEPROM_SETTINGS_END_ADDR + 1)
#define EEPROM_LOG_SIZE        ((EE24M01R_BANK1_CAPACITY - EEPROM_LOG_START_ADDR)+ \
                                EE24M01R_BANK2_CAPACITY)
void eepromInit(void);

//extern EepromFileStream *settings_fs, *log_bank1_fs, *log_bank2_fs;

extern ee24partition_t settings_ee, log_ee;

#endif /* EEPROM_H_ */
