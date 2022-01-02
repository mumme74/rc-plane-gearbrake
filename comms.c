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

#define COMMS_VERSION 0x01u // bump on every API change i USB communication

// ------------------------------------------------------------------
// module private stuff
static thread_t *commsThdp = 0;
//static CommsReq_t cmd;
static usbpkg_t rcvpkg, sndpkg;


static void routeCmd(void) {
  INIT_PKG(sndpkg, rcvpkg.onefrm.cmd, rcvpkg.onefrm.reqId);

  switch(rcvpkg.onefrm.cmd) {
  case commsCmd_Ping:
    commsSendWithCmd(&sndpkg, commsCmd_Pong);
    break;
  case commsCmd_Reset:
    commsSendWithCmd(&sndpkg, commsCmd_OK);
    NVIC_SystemReset();
    break;
  case commsCmd_SettingsSetDefault:
    settingsDefault();
    commsSendWithCmd(&sndpkg, commsCmd_OK);
    break;
  case commsCmd_SettingsSaveAll:
    settingsSetAll(&sndpkg, &rcvpkg);
    break;
  case commsCmd_SettingsGetAll:
    settingsGetAll(&sndpkg);
    break;
  case commsCmd_LogGetAll:
    loggerReadAll(&sndpkg);
    break;
  case commsCmd_LogNextAddr:
    loggerNextAddr(&sndpkg);
    break;
  case commsCmd_LogClearAll:
    loggerClearAll(&sndpkg);
    break;
  case commsCmd_version:
    PKG_PUSH(sndpkg, COMMS_VERSION);
    usbWaitTransmit(&sndpkg);
    break;
  default:
    commsSendWithCmd(&sndpkg, commsCmd_Error);
  }
}

static void reInitializeUsb(void) {
  /*
   * Activates the USB driver and then the USB bus pull-up on D+.
   * Note, a delay is inserted in order to not have to disconnect the cable
   * after a reset.
   */
  usbDisconnectBus(&USBD1);
  chThdSleep(TIME_MS2I(1500));
  usbStart(&USBD1, &usbcfg);
  usbConnectBus(&USBD1);
}

THD_WORKING_AREA(waCommsThd, 128);
THD_FUNCTION(CommsThd, arg) {
  (void)arg;

  // startup USB
  reInitializeUsb();

  while(true) {
    msg_t msg = usbWaitRecieve(&rcvpkg);
    if (msg == MSG_OK)
      routeCmd();
    else
      chThdSleep(TIME_MS2I(750));
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
