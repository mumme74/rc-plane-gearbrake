/*
 * acclerometer.c
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

#include <ch.h>
#include <hal.h>
#include "accelerometer.h"
#include "settings.h"
#include "i2c_bus.h"
#include "drv/kxtj3_1157.h"

//----------------------------------------------------------------
// private stuff for this module
static thread_t *accelThd = 0;
static KXTJ3_1157Driver accd;

static KXTJ3_1157Config acccfg = {
   &I2CD1,
   &i2ccfg,
   0,
   0,
   KXTJ3_1157_datarate_25Hz,
   KXTJ3_1157_gselection_16G,
   KXTJ3_1157_wakeup_datarate_OFF,
   0,
   {{
    KXTJ3_1157_motion_interrupt_off,
    KXTJ3_1157_motion_interrupt_off,
    KXTJ3_1157_motion_interrupt_off
   }},
   false,
   false
};


THD_WORKING_AREA(waAccelThd, 128);
THD_FUNCTION(AccelThd, arg) {

  (void)arg;

  while (true) {
    chThdSleepMilliseconds(50);
  }
}

// ---------------------------------------------------------------

// public stuff

const Axis_t axis;

void accelInit(void) {
  if (settings.accelerometer_active) {
    kxtj3_1157ObjectInit(&accd);
    kxtj3_1157Start(&accd, &acccfg);
    accelThd = chThdCreate(&AccelThd);
  }
}

void accelSettingsChanged(void) {
  if (accd.state == KXTJ3_1157_READY)
    kxtj3_1157Stop(&accd);

  if (accelThd)
    chThdExit(accelThd);

  if (settings.accelerometer_active) {
    kxtj3_1157Start(&accd, &acccfg);
    accelThd = chThdCreate(AccelThd);
  }
}
