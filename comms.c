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
#include <stm32f042x6.h>

// this file handle all serial IO

#define COM_VERSION 0x01u // bumb on every API change i serial communication

// ------------------------------------------------------------------
// module private stuff
static thread_t *commsThdp = 0;
static CommsCmd_t cmd;
static uint8_t obuf[256];
static systime_t sendTimeout = TIME_MS2I(10);

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

static size_t sendHeader(CommsCmdType_e type) {
  obuf[0] = 3;
  obuf[1] = type;
  obuf[2] = cmd.reqId;
  return obqWriteTimeout(&SDU1.obqueue, obuf, 3, sendTimeout);
}

static void readSettings(void) {
  // -3 due to header bytes
  const size_t sz = cmd.size -3;

  static uint8_t *pbuf = obuf;
  static size_t nRead = 0;
  static systime_t tmo;
  tmo = chVTGetSystemTimeX() + TIME_MS2I(100);

  // first read in all settings from serial buffer
  while (serusbcfg.usbp->state == USB_ACTIVE &&
         chVTGetSystemTimeX() < tmo &&
         pbuf < obuf + sz)
  {
    nRead = ibqReadTimeout(&SDU1.ibqueue, pbuf, sz, TIME_US2I(750));
    pbuf += nRead;
  }

  if (sz != (size_t)(pbuf - obuf)) {
    // incomplete or mismatched
    sendHeader(commsCmd_Error);
    return;
  }

  // set settings
  uint8_t *setMem = (uint8_t*)&settings;
  for (size_t i = 0; i < sz; ++i)
    setMem[i] = obuf[i];

  // save settings
  if (settingsSave() == MSG_OK)
    sendHeader(commsCmd_OK);
  else
    sendHeader(commsCmd_Error);
}


static void routeCmd(void) {
  switch(cmd.type) {
  case commsCmd_Ping:
    sendHeader(commsCmd_Pong);
    break;
  case commsCmd_Reset:
    if (sendHeader(commsCmd_OK) == 3)
      NVIC_SystemReset();
    break;
  case commsCmd_SettingsSetDefault:
    settingsDefault();
    if (settingsSave() == MSG_OK)
      sendHeader(commsCmd_OK);
    else
      sendHeader(commsCmd_Error);
    break;
  case commsCmd_SettingsSetAll:
    readSettings();
    break;
  case commsCmd_SettingsGetAll:
    settingsGetAll(obuf, &cmd, sizeof(obuf) / sizeof(obuf[0]), sendTimeout);
    break;
  case commsCmd_LogGetAll:
    loggerReadAll(obuf, &cmd, sizeof(obuf) / sizeof(obuf[0]), sendTimeout);
    break;
  case commsCmd_LogNextAddr:
    loggerNextAddr(obuf, &cmd, sendTimeout);
    break;
  case commsCmd_LogClearAll:
    loggerClearAll(obuf, sizeof(obuf) / sizeof(obuf[0]));
    sendHeader(commsCmd_OK);
    break;
  case commsCmd_version:
    obuf[0] = 4;
    obuf[1] = commsCmd_version;
    obuf[2] = cmd.reqId;
    obuf[3] = COM_VERSION;
    obqWriteTimeout(&SDU1.obqueue, obuf, obuf[0], sendTimeout);
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
    nRead = ibqReadTimeout(&SDU1.ibqueue, pbuf, 3, tmo);
    if (nRead >= 1 && pbuf == &buf[0]) {
      cmd.size = buf[0];
      ++pbuf;
    }
    if (nRead >= 1 && pbuf == &buf[1]) {
      cmd.type = (CommsCmdType_e)buf[1];
      ++pbuf;
    }
    if (nRead >=1 && pbuf == &buf[2]) {
      cmd.reqId = buf[2];
      pbuf = &buf[0];
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

void commsInit(void) {
  commsThdp = chThdCreate(&commsThdDesc);
}
