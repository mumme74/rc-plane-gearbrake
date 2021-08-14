/*
 * ee24m01r.c
 *
 *  Created on: 12 aug. 2021
 *      Author: fredrikjohansson
 */


#include "ee24m01r.h"
#include <hal.h>
#include <ch.h>

// -----------------------------------------------------------------
// private stuff to this module

/**
 * @brief     Calculates required timeout to send.
 * @ if exceeded i2c transmit sends
 */
static systime_t calc_timeout(size_t bytes) {
  uint32_t bits = 10 + 18 +  // dev.sel. and 2 address bytes with ACK bit
                  (bytes * 9); // payload bits with ACK bit
  uint32_t tmo = (bits / I2C_8BIT_TIME_US) +
                 (bits % I2C_8BIT_TIME_US) +
                 100; // +100us to be on the safe side
  return TIME_US2I(tmo);
}



// -----------------------------------------------------------------
// public stuff to this module


/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 *
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @buf read data gets put here, must be at least of size len
 * @len number of bytes read, start at offset and move forward until len
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_read(const ee24partition_t *eep,
                    const size_t offset,
                    uint8_t buf[],
                    const uint8_t len)
{
  //osalDbgAssert(len <= EE24M01R_PAGE_SIZE, "Can't read more than pageSize");

  msg_t status = MSG_RESET;

  // we can read from 2 partitions, only applicable when we read from the page in the middle
  uint8_t *bufp = buf;
  uint8_t _len = len, lenPart1 = 0;
  const size_t endAddr = eep->startAddr + offset + len;
  if ((eep->startAddr + offset <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive read from first part
    lenPart1 = endAddr - EE24M01R_BANK1_END_ADDR;
    osalDbgAssert(eep->startAddr + offset + lenPart1 <= EE24M01R_BANK1_END_ADDR,
                  "BANK1 range exceeded, drv bug");

    status = ee24m01r_read(eep, offset, buf, lenPart1);
    if (status != MSG_OK)
      return status;

    // we have now read the first part
    _len -= lenPart1;
    bufp += lenPart1;
  }

  // read from memory
  const uint32_t memAddr = eep->startAddr + offset + lenPart1;
  const uint8_t memAddrBuf[2] = {(memAddr & 0xFF00) >> 8, (memAddr & 0xFF)};
  // bit nr 2 in SAD represents high or low addrs so 0x0001xxxx -> sad: 0bxxxxxx1x
  const uint8_t sad = eep->i2cAddrBase |
                      (memAddr & 0x00010000) >> 15 |
                      EE24M01R_READ_BIT;

  osalDbgAssert(((len <= eep->size) && ((offset + len) <= eep->size)),
             "out of device bounds");

#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(eep->i2cp);
#endif

  status = i2cMasterTransmitTimeout(eep->i2cp, sad, memAddrBuf, 2,
                                    bufp, _len,
                                    calc_timeout(_len));

#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(eep->i2cp);
#endif

  return status;
}


/**
 * @brief read from eeprom in chunks of up to 256 bytes
 * @description reads len bytes from partition from addr and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_write(ee24partition_t *eep,
                     size_t offset,
                     const uint8_t wrbuf[],
                     uint8_t len)
{
  //osalDbgAssert(len <= EE24M01R_PAGE_SIZE, "Can't write more than pageSize");

  // read from memory
  osalDbgAssert(((len <= eep->size) && ((offset + len) <= eep->size)),
             "out of device bounds");

  msg_t status = MSG_RESET;

  // first determine if we should send the first part to the first partition,
  // before going to partition 2
  // we can write to 2 partitions, only applicable when we
  // write to the page in the middle
  uint8_t _len = len, lenPart1 = 0;
  const size_t endAddr = eep->startAddr + offset + len;
  if ((eep->startAddr + offset <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive write from first part
    lenPart1 = endAddr - EE24M01R_BANK1_END_ADDR;
    osalDbgAssert(eep->startAddr + offset + lenPart1 <= EE24M01R_BANK1_END_ADDR,
                  "BANK1 range exceeded, drv bug");

    status = ee24m01r_write(eep, offset, wrbuf, lenPart1);
    if (status != MSG_OK)
      return status;

    // we have now read the first part
    _len -= lenPart1;
  }

  static uint8_t buf[EE24M01R_PAGE_SIZE + 2];

// aquire bus to use as a mutex to not access writebuffer inadvertantly
#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(eep->i2cp);
#endif

  // set address and init buffer
  uint8_t *bufp = buf + lenPart1;
  const uint8_t *wbuf = wrbuf + lenPart1;
  // first 2 bytes are addr.
  const uint32_t memAddr = eep->startAddr + offset + lenPart1;
  *bufp++ = (uint8_t)((memAddr & 0xFF00) >> 8);
  *bufp++ = (uint8_t)(memAddr & 0xFF);
  // bit nr 2 in SAD represents high or low addrs so 0x0001xxxx -> sad: 0bxxxxxx1x
  const uint8_t sad = eep->i2cAddrBase | (memAddr & 0x00010000) >> 15;

  // for memcpy to buffer
  while(wbuf < wrbuf+len) *bufp++ = *wbuf++;
  // reset ptr after memcpy
  bufp = buf + lenPart1;

  // write to memory
  status = i2cMasterTransmitTimeout(eep->i2cp, sad,
                                    bufp, _len, 0, 0,
                                    calc_timeout(_len) +
                                    TIME_MS2I(EE24M01R_WRITE_TIME));

#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(eep->i2cp);
#endif

  return status;
}

