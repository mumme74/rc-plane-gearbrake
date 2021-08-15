/*
 * ee24m01r.h
 *
 *  Created on: 12 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef DRV_EE24M01R_H_
#define DRV_EE24M01R_H_

#include <hal.h>

// driver for EEPROM 1Mbit 24M01R

#define EE24M01R_12C_ADDR_BASE              0x50U
#define EE24M01R_I2C_DEV_SEL(devid)            ((devid & 0x03U) << 1)
#define EE24M01R_I2C_DEV_SEL_ID_PAGE(devid)    ((devid & 0x03U) << 1)

#define EE24M01R_I2C_LOW_BANK(devid)        EE24M01R_12C_ADDR_BASE \
                                             | EE24M01R_I2C_DEV_SEL(devid)
#define EE24M01R_I2C_HIGH_BANK(devid)       EE24M01R_I2C_LOW_BANK(devid) | 0x1U

#define EE24M01R_TOTAL_CAPACITY_BITS   1000000U
#define EE24M01R_TOTAL_CAPACITY        (EE24M01R_TOTAL_CAPACITY_BITS / 8U)
#define EE24M01R_BANK1_CAPACITY_BITS   500000U
#define EE24M01R_BANK2_CAPACITY_BITS   500000U
#define EE24M01R_BANK1_CAPACITY        (EE24M01R_BANK1_CAPACITY_BITS / 8U)
#define EE24M01R_BANK2_CAPACITY        (EE24M01R_BANK2_CAPACITY_BITS / 8U)
#define EE24M01R_BANK1_START_ADDR      0U
#define EE24M01R_BANK1_END_ADDR        (EE24M01R_BANK1_CAPACITY - EE24M01R_BANK1_START_ADDR -1)
/* start address is at 0 but the 16th bit is set with a different i2c address */
#define EE24M01R_BANK2_START_ADDR      0U
#define EE24M01R_BANK2_END_ADDR        (EE24M01R_BANK1_CAPACITY - EE24M01R_BANK1_START_ADDR -1)

#define EE24M01R_READ_BIT              0x01U

#define EE24M01R_PAGE_SIZE             256U
#define EE24M01R_WRITE_TIME            5U /* in milliseconds */

// A partition can stretch over low and high bytes (flip the 16th bit i i2C address)
typedef struct {
  I2CDriver *i2cp;
  uint8_t i2cAddrBase; /* I2C addr excluding R/W bit (7-bit) */
  uint32_t startAddr; /* the first address in this partition */
  uint32_t size;   /* how many bytes in partition */
} ee24partition_t;

/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @buf read data gets put here, must be at least of size len
 * @len number of bytes read, start at offset and move forward until len
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_read(const ee24partition_t *eep,
                    const size_t offset,
                    uint8_t buf[],
                    const uint16_t len);

/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @wrbuf data to write here
 * @len number of bytes to write from wrbuf, start at offset and move forward until len
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_write(ee24partition_t *eep,
                     size_t offset,
                     const uint8_t wrbuf[],
                     uint16_t len);

#endif /* DRV_EE24M01R_H_ */
