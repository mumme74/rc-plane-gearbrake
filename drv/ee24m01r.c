/*
 * ee24m01r.c
 *
 *  Created on: 12 aug. 2021
 *      Author: fredrikjohansson
 */


#include "ee24m01r.h"
#include <hal.h>
#include <halconf.h>
#include <ch.h>
#include "board.h"

// -----------------------------------------------------------------
// private stuff to this module

/**
 * @brief     Calculates required timeout to send.
 * @ if exceeded i2c transmit sends
 */
static systime_t calc_timeout(size_t bytes) {
  uint32_t bits = 16 + 18 +  // dev.sel. and 2 address bytes with ACK bit
                  (bytes * 9); // payload bits with ACK bit
  uint32_t tmo = bits * 1000000U;
  tmo /= MIN_I2C_FREQUENCY;
  tmo += 100; // +100us to be on the safe side
  return TIME_US2I(tmo);
}

typedef msg_t (*funcPtr_t)(ee24_arg_t *arg) ;

static msg_t bank_selection(ee24_arg_t *arg, funcPtr_t func) {
  // we can read from 2 partitions, only applicable when we read from the page in the middle
  uint16_t lenPart1 = 0;
  const size_t endAddr = arg->eep->startAddr + arg->offset + arg->len;
  if ((arg->eep->startAddr + arg->offset <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive read from first part
    lenPart1 = EE24M01R_PAGE_SIZE - (endAddr - EE24M01R_BANK1_END_ADDR);
    osalDbgAssert(arg->eep->startAddr + arg->offset + lenPart1 <= EE24M01R_BANK1_END_ADDR,
                  "BANK1 range exceeded, drv bug");
    uint16_t remainLen = arg->len - lenPart1;
    arg->len = lenPart1;

    msg_t status = func(arg);
    if (status != MSG_OK)
      return status;

    // we have now read the first part
    arg->len = remainLen;
    arg->buf += lenPart1;
  }

  // read from memory
  const uint32_t memAddr = arg->eep->startAddr + arg->offset + lenPart1;
  arg->memAddrBuf[0] = (memAddr & 0xFF00) >> 8;
  arg->memAddrBuf[1] = (memAddr & 0xFF);

  // bit nr 2 in SAD represents high or low addrs so 0x0001xxxx -> sad: 0bxxxxxx1x
  arg->sad = arg->eep->i2cAddrBase |
                      (memAddr & 0x00010000) >> 16 |
                      EE24M01R_READ_BIT;
  return MSG_OK;
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
msg_t ee24m01r_read(ee24_arg_t *arg)
{
  osalDbgAssert(arg->len <= EE24M01R_PAGE_SIZE, "Can't read more than pageSize");

  msg_t status = bank_selection(arg, &ee24m01r_read);
  if (status != MSG_OK) return status;

  /*
  // we can read from 2 partitions, only applicable when we read from the page in the middle
  uint8_t *bufp = buf;
  uint16_t _len = len, lenPart1 = 0;
  const size_t endAddr = eep->startAddr + offset + len;
  if ((eep->startAddr + offset <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive read from first part
    lenPart1 = EE24M01R_PAGE_SIZE - (endAddr - EE24M01R_BANK1_END_ADDR);
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
  const i2caddr_t sad = eep->i2cAddrBase |
                      (memAddr & 0x00010000) >> 16 |
                      EE24M01R_READ_BIT;
*/
  osalDbgAssert(((arg->len <= arg->eep->size) &&
                ((arg->offset + arg->len) <= arg->eep->size)),
             "out of device bounds");

#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(arg->eep->i2cp);
#endif
  status = i2cMasterTransmitTimeout(arg->eep->i2cp, arg->sad, arg->memAddrBuf, 2,
                                    arg->buf, arg->len,
                                    calc_timeout(arg->len));

#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(arg->eep->i2cp);
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
msg_t ee24m01r_write(ee24_arg_t *arg)
{
  osalDbgAssert(arg->len <= EE24M01R_PAGE_SIZE, "Can't write more than pageSize");

  // read from memory
  osalDbgAssert(((arg->len <= arg->eep->size) &&
                ((arg->offset + arg->len) <= arg->eep->size)),
             "out of device bounds");

  msg_t status = bank_selection(arg, &ee24m01r_write);
  if (status != MSG_OK) return status;

  // first determine if we should send the first part to the first partition,
  // before going to partition 2
  // we can write to 2 partitions, only applicable when we
  // write to the page in the middle
  /*
  uint16_t _len = len, lenPart1 = 0;
  const size_t endAddr = eep->startAddr + offset + len;
  if ((eep->startAddr + offset <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive write from first part
    lenPart1 = EE24M01R_PAGE_SIZE - (endAddr - EE24M01R_BANK1_END_ADDR);
    osalDbgAssert(eep->startAddr + offset + lenPart1 <= EE24M01R_BANK1_END_ADDR,
                  "BANK1 range exceeded, drv bug");

    status = ee24m01r_write(eep, offset, wrbuf, lenPart1);
    if (status != MSG_OK)
      return status;

    // we have now read the first part
    _len -= lenPart1;
  }
  */

  static uint8_t buf[EE24M01R_PAGE_SIZE + 2];

// aquire bus to use as a mutex to not access writebuffer inadvertantly
#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(arg->eep->i2cp);
#endif

  palClearLine(LINE_I2C_WC);

  /*
  // set address and init buffer
  uint8_t *bufp = buf + lenPart1;
  const uint8_t *wbuf = wrbuf + lenPart1;
  // first 2 bytes are addr.
  const uint32_t memAddr = eep->startAddr + offset + lenPart1;
  *bufp++ = (uint8_t)((memAddr & 0xFF00) >> 8);
  *bufp++ = (uint8_t)(memAddr & 0xFF);
  // bit nr 2 in SAD represents high or low addrs so 0x0001xxxx -> sad: 0bxxxxxx1x
  const i2caddr_t sad = eep->i2cAddrBase | (memAddr & 0x00010000) >> 16;

  // for memcpy to buffer
  while(wbuf < wrbuf+len) *bufp++ = *wbuf++;
  // reset ptr after memcpy
  bufp = buf + lenPart1;


  // write to memory
  status = i2cMasterTransmitTimeout(eep->i2cp, sad,
                                    bufp, _len+2, NULL, 0,
                                    calc_timeout(_len+2) +
                                    TIME_MS2I(EE24M01R_WRITE_TIME));
*/
  buf[0] = arg->memAddrBuf[0];
  buf[1] = arg->memAddrBuf[1];
  for(size_t i = 0; i < arg->len; ++i)
    buf[i + 2] = arg->buf[i];

  // write to memory
  status = i2cMasterTransmitTimeout(arg->eep->i2cp, arg->sad,
                                    buf, arg->len+2, NULL, 0,
                                    calc_timeout(arg->len+2) +
                                    TIME_MS2I(EE24M01R_WRITE_TIME));
  palSetLine(LINE_I2C_WC);

#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(arg->eep->i2cp);
#endif


  // wait for eeprom to finish writing data
  chThdSleep(TIME_MS2I(EE24M01R_WRITE_TIME));

  return status;
}

