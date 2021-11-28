/*
 * acclerometer.c
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

#include <ch.h>
#include <hal.h>
#include "accelerometer.h"

#include "drv/kxtj3_1057.h"
#include "settings.h"
#include "i2c_bus.h"
#include "threads.h"

//----------------------------------------------------------------
// private stuff for this module
static thread_t *accelThd = 0;
static KXTJ3_1057Driver accd;

static KXTJ3_1057Config acccfg = {
   &I2CD1,
   &i2ccfg,
   0,
   0,
   KXTJ3_1057_datarate_25Hz,
   KXTJ3_1057_gselection_16G,
   KXTJ3_1057_wakeup_datarate_OFF,
   {{
    KXTJ3_1057_motion_interrupt_off,
    KXTJ3_1057_motion_interrupt_off,
    KXTJ3_1057_motion_interrupt_off
   }},
   0,
   false,
   false
};

THD_WORKING_AREA(waAccelThd, 128);
THD_FUNCTION(AccelThd, arg) {
  (void)arg;

  // block first startup, wait for msg
  sysinterval_t timeout = TIME_INFINITE;

  while (true) {
    thread_t *tp = chMsgWaitTimeout(timeout);
    if (tp) {
      timeout = settings.accelerometer_active ? TIME_MS2I(25) : TIME_INFINITE;
      chMsgRelease(tp, MSG_OK);
    } else
      KXTJ3_1057AccelerometerReadRaw(&accd, (int32_t*)accel.axis);
  }
}

static thread_descriptor_t accelThdDesc = {
   "accel",
   THD_WORKING_AREA_BASE(waAccelThd),
   THD_WORKING_AREA_END(waAccelThd),
   PRIO_ACCEL_THD,
   AccelThd,
   NULL
};

// ---------------------------------------------------------------

// public stuff

const Accel_t accel;

void accelInit(void) {
  KXTJ3_1057ObjectInit(&accd);
}

void accelStart(void) {
  accelThd = chThdCreate(&accelThdDesc);
}

void accelSettingsChanged(void) {
  chMsgSend(accelThd, MSG_OK);
  if (settings.accelerometer_active) {
    KXTJ3_1057Start(&accd, &acccfg);
  } else {
    KXTJ3_1057Stop(&accd);
  }
}
