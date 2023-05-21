/*
 * comms.h
 *
 *  Created on: 4 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef COMMS_H_
#define COMMS_H_


#include <stdint.h>
#include <stddef.h>

#define _QUOTE(arg) #arg
#define QUOTE(arg) _QUOTE(arg)

#define wMaxPacketSize 0x40 // usb package size, must be aligned to 4 bytes

#define TO_BIG_ENDIAN_16(u8buf, vlu16) \
  ((uint8_t*)(u8buf))[0] = ((vlu16) >> 8) & 0xff; \
  ((uint8_t*)(u8buf))[1] = ((vlu16) >> 0) & 0xff
#define TO_BIG_ENDIAN_32(u8buf, vlu32) \
  ((uint8_t*)(u8buf))[0] = ((vlu32) >> 24) & 0xFF; \
  ((uint8_t*)(u8buf))[1] = ((vlu32) >> 16) & 0xFF; \
  ((uint8_t*)(u8buf))[2] = ((vlu32) >> 8) & 0xFF; \
  ((uint8_t*)(u8buf))[3] = ((vlu32) >> 0) & 0xFF

#define FROM_BIG_ENDIAN_16(u8buf) \
  *(u8buf) << 8 | *((u8buf)+1)
#define FROM_BIG_ENDIAN_32(buf) \
  *(u8buf) << 24 | *((u8buf)+1) << 16 | *((u8buf)+2) << 8 | *((u8buf)+3)


/**
 * Init send pkg for a new send transmit
 * Must be done before any fill with data is performed
 */
#define INIT_PKG(pkg, Cmd, reqid) \
  (pkg).onefrm.len = 3; \
  (pkg).onefrm.cmd = Cmd; \
  (pkg).onefrm.reqId = reqid

/**
 * Init sendframe as a header frame (first in a series of transmits)
 * NOTE! Assumes INIT_SNDPKG is already set
 */
#define INIT_PKG_HEADER_FRM(pkg, totalsize, logNextAddr) \
  (pkg).headerfrm.len = 13; \
  (pkg).headerfrm.cmd |= 0x80; \
  TO_BIG_ENDIAN_16((pkg).datafrm.pkgNr, 0); \
  TO_BIG_ENDIAN_32((pkg).headerfrm.totalSize, totalsize); \
  TO_BIG_ENDIAN_32((pkg).headerfrm.logNextAddress, logNextAddr)

/**
 * Init sendframe as a header frame (first in a series of transmits)
 * NOTE! Assumes INIT_SNDPKG is already set
 */
#define INIT_PKG_DATA_FRM(pkg, pkgnr) \
  (pkg).datafrm.len = 5; \
  (pkg).datafrm.cmd |= 0x80; \
  TO_BIG_ENDIAN_16((pkg).datafrm.pkgNr, pkgnr)


#define PKG_PUSH(pkg, u8vlu) \
  (pkg).u8buf[(pkg).onefrm.len++] = u8vlu

#define PKG_PUSH_16(pkg, u16vlu) \
  TO_BIG_ENDIAN_16(&(pkg).u8buf[(pkg).onefrm.len], u16vlu); \
  (pkg).onefrm.len += 2

#define PKG_PUSH_32(pkg, u32vlu) \
  TO_BIG_ENDIAN_32(&(pkg).u8buf[(pkg).onefrm.len], u32vlu); \
  (pkg).onefrm.len += 4

/* #define commsSendNow(pkg) \
  usbStartTransmitI(&USBD1, 1, (pkg)->u8buf, (pkg)->onefrm.len)*/

#define commsSendNowWithCmd(pkg, Cmd) \
  (pkg)->onefrm.cmd = Cmd; \
  usbWaitTransmit(pkg) //commsSendNow(pkg)

typedef enum {
  commsCmd_Error                 = 0x00u,
  commsCmd_Ping                  = 0x01u,
  commsCmd_Pong                  = 0x02u,
  commsCmd_Reset                 = 0x03u,

  commsCmd_SettingsSetDefault    = 0x07u,
  commsCmd_SettingsSaveAll       = 0x08u,
  commsCmd_SettingsGetAll        = 0x09u,

  commsCmd_LogGetAll             = 0x10u,
  commsCmd_LogNextAddr           = 0x11u,
  commsCmd_LogClearAll           = 0x12u,

  commsCmd_DiagReadAll           = 0x18u,
  commsCmd_DiagSetVlu            = 0x19u,
  commsCmd_DiagClearVlu          = 0x1Au,

  commsCmd_version               = 0x20u,
  commsCmd_fwHash                = 0x21u,
  commsCmd_OK                    = 0x7F,
} CommsCmdType_e;

// out as in USB host out, ie in to this device
typedef union __attribute__((__packed__)) {
  uint8_t u8buf[wMaxPacketSize];
  struct __attribute__((__packed__)) {
    uint8_t len; // length of data in this specific package
    uint8_t cmd;
    uint8_t reqId;
    uint8_t data[wMaxPacketSize -3];
  } onefrm;
  struct __attribute__((__packed__)) {
    // all types must be uint8_t to align properly without struct padding
    uint8_t len; // length of data in this specific package
    uint8_t cmd; // if cmd & 0x80 then its a part of many frames
    uint8_t reqId;
    uint8_t pkgNr[2]; // pkg nr 0 is a header byte for many frames
    uint8_t totalSize[4]; // size in bytes data which this multiframe sends
    uint8_t logNextAddress[4]; // the next address to store a log in EEPROM
  } headerfrm;
  struct __attribute__((__packed__)) {
    uint8_t len; // length of data in this specific package
    uint8_t cmd; // if cmd & 0x80 then its a part of many frames
    uint8_t reqId;
    uint8_t pkgNr[2]; // pkg nr 0 is a header byte for many frames
    uint8_t data[wMaxPacketSize -5];
  } datafrm;
} usbpkg_t;

void commsInit(void);

void commsStart(void);

/**
 * @breif send response to host
 */
//size_t commsSend(size_t len);


#endif /* COMMS_H_ */
