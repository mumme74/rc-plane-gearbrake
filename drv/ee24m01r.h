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

#define EE24M01R_12C_ADDR_BASE              0x50U // this is 7bit based, Rd/Wr bit set automatically by chibios
#define EE24M01R_I2C_DEV_SEL(devid)           (EE24M01R_12C_ADDR_BASE | \
                                                 ((devid & 0x03U) << 1))
#define EE24M01R_I2C_DEV_SEL_ID_PAGE(devid)   (EE24M01R_12C_ADDR_BASE | \
                                                 ((devid & 0x03U) << 1))

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

// a argument struct
typedef struct {
  const ee24partition_t *eep; /* @eep pointer to a ee24partition_t */
  uint32_t offset;        /* offset read from this addr, offset=0 is from start*/
  uint8_t *buf;         /* buf read data gets put here, must be at least of size len */
  i2caddr_t sad;         /* slave adress i2c*/
  uint16_t len;          /* len number of bytes read, start at offset and move forward until len*/
  uint8_t memAddrBuf[2];   /* memory address in EEPROM*/
} ee24_arg_t;

/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @buf read data gets put here, must be at least of size len
 * @len number of bytes read, start at offset and move forward until len
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_read(ee24_arg_t *arg);

/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @wrbuf data to write here
 * @len number of bytes to write from wrbuf, start at offset and move forward until len
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_write(ee24_arg_t *arg);

#endif /* DRV_EE24M01R_H_ */
