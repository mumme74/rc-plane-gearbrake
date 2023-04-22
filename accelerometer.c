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
#include "diag.h"


volatile const Accel_t accel;

//----------------------------------------------------------------
// private stuff for this module
static Accel_t* ACCEL = (Accel_t*)&accel;

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

  KXTJ3_1057Start(&accd, &acccfg);

  int16_t values[3] = {0,0,0};

  // block first startup, wait for msg

  while (true) {
    chThdSleep(TIME_US2I(10000));
    if (settings.accelerometer_active) {
      KXTJ3_1057AccelerometerReadRaw(&accd, values);
      if ((diagSetValues & diag_Set_InputAcc0) == 0)
        ACCEL->axis[0] = values[0];
      if ((diagSetValues & diag_Set_InputAcc1) == 0)
        ACCEL->axis[1] = values[1];
      if ((diagSetValues & diag_Set_InputAcc2) == 0)
        ACCEL->axis[2] = values[2];
    }
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


void accelInit(void) {
  KXTJ3_1057ObjectInit(&accd);
}

void accelStart(void) {
  // create a thread
  accelThd = chThdCreate(&accelThdDesc);
}

void accelSettingsChanged(void) { }
