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
static systime_t calc_12c_timeout(uint32_t bytes) {
  uint32_t bits = 16 + 18 +  // dev.sel. and 2 address bytes with ACK bit
                  (bytes * 10); // payload bits with ACK bit
  uint32_t tmo = bits * 1000000U;
  tmo /= MIN_I2C_FREQUENCY;
  tmo += 1000; // +1000us to be on the safe side
  return TIME_US2I(tmo);
}

typedef msg_t (*funcPtr_t)(ee24_arg_t *arg);

static msg_t page_and_bank_selection(ee24_arg_t *arg, funcPtr_t func) {
  // we can read from 2 partitions, only applicable when we read from the page in the middle
  // we also must write in alignment to page size

  // set ic slave address
  arg->sad = arg->eep->i2cAddrBase;

  // FIXME chasing a bug
  static volatile uint32_t cnt = 0;
  if (arg->offset == 124984-56)
    cnt++;

  uint16_t remainLen = 0;

  // 16bit address in partition
  uint32_t beginAddr = arg->eep->startAddr + arg->offset;
  const uint32_t endAddr = arg->eep->startAddr + arg->offset + arg->len -1u; // -1 due to len beeing 1 based
  if ((beginAddr <= EE24M01R_BANK1_END_ADDR) &&
      (endAddr > EE24M01R_BANK1_END_ADDR))
  {
    // we should read from 2 partitions, recursive read from first part
    remainLen = endAddr - EE24M01R_BANK1_END_ADDR;

  } else if ((beginAddr & 0xff00) != (endAddr & 0xFF00)) {
    // align to page we belong to
    // split on pages in memory
    const uint16_t endPage = endAddr / EE24M01R_PAGE_SIZE;
    remainLen = endAddr +1 - (endPage * EE24M01R_PAGE_SIZE);

  }

  if (remainLen > 0) {
    arg->len -= remainLen;

    osalDbgAssert(arg->eep->startAddr + arg->offset + arg->len <= EE24M01R_TOTAL_CAPACITY,
                  "range exceeded, driver bug");

    // call our caller recursive
    msg_t status = func(arg);
    if (status != MSG_OK)
      return status;

    // we have now read the first part
    arg->buf += arg->len; // advance buffer by read amount
    beginAddr += arg->len;
    arg->len = remainLen;
  }

  // select bank 2 in EEPROM
  if (beginAddr > EE24M01R_BANK1_END_ADDR) {
    arg->sad |= 0x01; // sad is 7 based bit nr 2 in SAD represents high or low addrs so 0x01 -> sad: 0bxxxxxx1x
    beginAddr -= EE24M01R_BANK1_CAPACITY;
  }

  // read from memory
  arg->memAddrBuf[0] = (beginAddr & 0xFF00) >> 8;
  arg->memAddrBuf[1] = (beginAddr & 0x00FF) >> 0;

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

  uint8_t *origBuf = arg->buf;

  msg_t status = page_and_bank_selection(arg, &ee24m01r_read);
  if (status != MSG_OK) return status;

  osalDbgAssert((arg->offset + arg->len) <= arg->eep->size,
             "out of device bounds");

#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(arg->eep->i2cp);
#endif
  status = i2cMasterTransmitTimeout(arg->eep->i2cp, arg->sad, arg->memAddrBuf, 2,
                                    arg->buf, arg->len,
                                    calc_12c_timeout(arg->len));


#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(arg->eep->i2cp);
#endif

  // restore
  arg->len += (uint8_t)((uint32_t)arg->buf - (uint32_t)origBuf);
  arg->buf = origBuf;

  return status;
}


/**
 * @brief write to eeprom in chunks of up to 256 bytes
 * @description write len bytes from partition from offset and forward
 * @eep pointer to a ee24partition_t
 * @offset read from this addr, offset=0 is from start
 * @returns MSG_OK if ok
 */
msg_t ee24m01r_write(ee24_arg_t *arg)
{
  osalDbgAssert(arg->len <= EE24M01R_PAGE_SIZE, "Can't write more than pageSize");

  // write to from memory
  osalDbgAssert((arg->offset + arg->len) <= arg->eep->size,
             "out of device bounds");

  uint8_t *origBuf = arg->buf;

  msg_t status = page_and_bank_selection(arg, &ee24m01r_write);
  if (status != MSG_OK) return status;

  static uint8_t buf[EE24M01R_PAGE_SIZE + 2];

  // FIXME remove this used for testing
  static volatile uint16_t cmp = 0;
  if (cmp == 0)
    cmp = arg->memAddrBuf[0]<<8|arg->memAddrBuf[1];
  uint16_t curMem = arg->memAddrBuf[0]<<8|arg->memAddrBuf[1];
  if (cmp > curMem || cmp+256 < curMem)
    cmp++;
  cmp = curMem;

// aquire bus to use as a mutex to not access writebuffer inadvertantly
#if I2C_USE_MUTUAL_EXCLUSION
  i2cAcquireBus(arg->eep->i2cp);
#endif

  // disable write lock write pin
  palClearLine(LINE_I2C_WC);

  // copy data to transmit buffer
  buf[0] = arg->memAddrBuf[0];
  buf[1] = arg->memAddrBuf[1];
  for(uint32_t i = 0; i < arg->len; ++i)
    buf[i + 2] = arg->buf[i];

  // write to memory
  status = i2cMasterTransmitTimeout(arg->eep->i2cp, arg->sad,
                                    buf, arg->len+2, NULL, 0,
                                    calc_12c_timeout(arg->len+2) +
                                    TIME_MS2I(EE24M01R_WRITE_TIME));
  // re-enable write lock, start write cycle
  palSetLine(LINE_I2C_WC);

#if I2C_USE_MUTUAL_EXCLUSION
  i2cReleaseBus(arg->eep->i2cp);
#endif

  // wait for eeprom to finish writing data
  chThdSleep(TIME_MS2I(EE24M01R_WRITE_TIME));

  // restore
  arg->len += (uint8_t)((uint32_t)arg->buf - (uint32_t)origBuf);;
  arg->buf = origBuf;

  return status;
}

