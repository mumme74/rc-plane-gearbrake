/*
 * comms.c
 *
 *  Created on: 4 aug. 2021
 *      Author: fredrikjohansson
 */

#include "comms.h"
#include "threads.h"
#include "usbcfg.h"
#include "logger.h"

#include <hal.h>
#include <halconf.h>
#include <stm32f042x6.h>

// this file handle all serial IO

#define COM_VERSION 0x01u // bumb on every API change i serial communication

// ------------------------------------------------------------------
// module private stuff
static thread_t *commsThdp = 0;
static CommsReq_t cmd;
static uint8_t obuf[256];

static systime_t calc_timeout(uint16_t bytes) {
  uint32_t tmo = (bytes * 10 * //8n1 startbit + payload + stopbit
                 10000000U) / SERIAL_DEFAULT_BITRATE;
  return TIME_US2I(tmo);
}


static void routeCmd(void) {
  switch(cmd.type) {
  case commsCmd_Ping:
    sendHeader(commsCmd_Pong, 0);
    break;
  case commsCmd_Reset:
    if (sendHeader(commsCmd_OK, 0) == 3)
      NVIC_SystemReset();
    break;
  case commsCmd_SettingsSetDefault:
    settingsDefault();
    sendHeader(commsCmd_OK, 0);
    break;
  case commsCmd_SettingsSaveAll:
    settingsSetAll(obuf, &cmd);
    break;
  case commsCmd_SettingsGetAll:
    settingsGetAll(obuf, &cmd);
    break;
  case commsCmd_LogGetAll:
    loggerReadAll(obuf, &cmd, sizeof(obuf) / sizeof(obuf[0]));
    break;
  case commsCmd_LogNextAddr:
    loggerNextAddr(obuf, &cmd);
    break;
  case commsCmd_LogClearAll:
    loggerClearAll(obuf, sizeof(obuf) / sizeof(obuf[0]));
    sendHeader(commsCmd_OK, 0);
    break;
  case commsCmd_version:
    sendHeader(commsCmd_version, 1);
    obuf[0] = COM_VERSION;
    sendPayload(1);
    break;
  default:
    return; // do nothing
  }
}

static void reInitializeUsb(void) {
  if (SDU1.state == SDU_READY)
    sduStop(&SDU1);
  SDU1.state = SDU_UNINIT;
  /*
   * Initializes a serial-over-USB CDC driver.
   */
  sduObjectInit(&SDU1);
  sduStart(&SDU1, &serusbcfg);

  /*
   * Activates the USB driver and then the USB bus pull-up on D+.
   * Note, a delay is inserted in order to not have to disconnect the cable
   * after a reset.
   */
  usbDisconnectBus(serusbcfg.usbp);
  chThdSleepMilliseconds(1500);
  usbStart(serusbcfg.usbp, &usbcfg);
  usbConnectBus(serusbcfg.usbp);
}



THD_WORKING_AREA(waCommsThd, 128);
THD_FUNCTION(CommsThd, arg) {
  (void)arg;

  // startup USB
  reInitializeUsb();

  static systime_t tmo;
  static uint8_t buf[3];
  static uint8_t *pbuf = buf;
  static size_t nRead = 0;

  while(true) {
    tmo = serusbcfg.usbp->state == USB_ACTIVE ?
              TIME_US2I(750) : TIME_MS2I(500);
    nRead += ibqReadTimeout(&SDU1.ibqueue, pbuf, 3, tmo);
    if (nRead >= 1 && pbuf == &buf[0]) {
      cmd.size = buf[0];
      ++pbuf;
    }
    if (nRead >= 2 && pbuf == &buf[1]) {
      cmd.type = (CommsCmdType_e)buf[1];
      ++pbuf;
    }
    if (nRead >=3 && pbuf == &buf[2]) {
      cmd.reqId = buf[2];
      pbuf = &buf[0];
      nRead = 0;
      routeCmd();
    }
  }
}

static thread_descriptor_t commsThdDesc = {
   "comms",
   THD_WORKING_AREA_BASE(waCommsThd),
   THD_WORKING_AREA_END(waCommsThd),
   PRIO_USB_CDC_THD,
   CommsThd,
   NULL
};


// ------------------------------------------------------------------
// public stuff

void commsInit(void) {}

void commsStart(void) {
  commsThdp = chThdCreate(&commsThdDesc);
}

/** Serial protocol description
 * Host initiates a communication with a Cmd
 * A Cmd is a byte stream with the following structure
 * [byte0] length of cmd in bytes, including this byte
 * [byte1] Command type (single char)
 * [byte2] request ID, used to differentiate responses
 * [byte3... byte255] optional depending on command
 *
 * A response from device  had the following structure:
 * [byte0] length of response
 *    if size is more then 127 bytes size will take 2 bytes (a 1 in 8th pos of byte)
 *    if size is bigger than 32768 bytes, size will take 3 bytes and so on..
 * [byte1] request ID, this is a response to request ID
 * [byte2... byte-end] response payload
 *
 * example Ping:
 *  [0x03][0x01][1] (last byte is ID and can be 0-255)
 * response (Pong):
 *  [0x03][0x02][1] (responds with the same id)
 *
 * example LogClearAll:
 *  [0x03][0x11][2]
 * response (OK)
 *  [0x03][0xFF][2]
 *
 * example LogGetAll:
 *  [0x03][0x10][3]
 * response:
 *  [0x83][0xFF][0xE2] Size is three 7bit continuations Settings 30bytes and 128kb gives 1FFE2
 *  [log0........byte-end] Payload
 *
 *  Size is sort of like how utf8 works
 */

size_t sendHeader(CommsCmdType_e type, uint32_t len) {
  len += 2; // include header length
  // first find ut how many baytes length must be
  uint8_t pos = 0, i;
  for (i = 5u; i < 0xFFu; --i) {
    if (len & (0x7Fu << i *7u) || i == 0) {
      ++len; ++pos;
    }
  }
  // store len BIG endian in headers first bits
  for (i = pos -1; i < 0xFFu; --i) {
    uint8_t vlu = (len & (0x7Fu << i * 7u)) >> i*7u;
    obuf[pos - 1 - i] = pos > 1 ? 0x80u | vlu : vlu; // store Big end first
  }
  // type and reqId
  obuf[pos++] = type;
  obuf[pos++] = cmd.reqId;
  return sendPayload(pos);
}

size_t sendPayload(uint16_t len) {
  return obqWriteTimeout(&SDU1.obqueue, obuf, len, calc_timeout(len));
}
