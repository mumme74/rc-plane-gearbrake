/*
 * brake_logic.c
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */


#include "brake_logic.h"
#include <ch.h>
#include "settings.h"
#include "accelerometer.h"
#include "pwmout.h"
#include "threads.h"
#include "inputs.h"

/* it should only be possible to brake this much every 10ms loop
 * else its that all wheels have locked up
 *
 * Calculate retardation:
 * v-u / t -> initial value - final value divided by time taken
 *
 * so 130km/h - 0km/h / 5sec = 26km/h per sec.
 *    36m/s - 0m/s / 3s = 12m/s per sec.
 *
 * lets assume a wheel with 0.05m diameter (5cm)
 * it travels about 15cm per revolution.
 * Lets say it has a ABS tooth wheel with 20 pulses / rev.
 * At 200km/h it should have a freq. of 36m/0.15m *20pulses = 4,8kHz
 * input driver takes care of 20 pulses so this logic only sees
 * complete revolutions (based of the last 5 pulses)
 * So 130km/h gives 240 revs/sec. 240/3s = 80 / sec.
 * Ie allowed to decrement by 1 every 12,5ms
 */
#define MIN_TIME_BETWEEN_PULSE_DEC_MS 12
#define SLIP_RELESE_FACTOR 2.0

// un-const values
#define VALUES ((Values_t*)&values)

// -----------------------------------------------------------------
// public
const Values_t values;

// ------------------------------------------------------------------
// private stuff to this module
static thread_t *brklogicp = 0;

static systime_t sleepTime = TIME_MS2I(20),
                 timeAtLastSpeedDecrement = 0;
static uint8_t lastspeed = 0;

static int8_t leftPosBrake = -1,
              rightPosBrake = -1;

static THD_WORKING_AREA(waBrakeLogicThd, 128);
static THD_FUNCTION(BrakeLogicThd, arg) {
  (void)arg;

  while (true) {
    chThdSleep(sleepTime);

    VALUES->brakeForce = (settings.reverse_input) ?
              100 - inputs.brakeForce : inputs.brakeForce;
    if (VALUES->brakeForce < settings.lower_threshold) {
      sleepTime = TIME_MS2I(20); // wait for next pulse from reciver
      timeAtLastSpeedDecrement = 0;
      VALUES->brakeForce_out[0] = 0;
      VALUES->brakeForce_out[1] = 0;
      VALUES->brakeForce_out[2] = 0;
      continue; // next loop, no brake wanted
    }

    sleepTime = TIME_MS2I(5); // recalculate every 5ms now (200 times a sec)

    if (VALUES->brakeForce > settings.max_brake_force)
      VALUES->brakeForce = settings.max_brake_force;

    // do accelerometer
    if (settings.accelerometer_active) {
      switch (settings.accelerometer_axis) {
      default: // fallthrough
      case SETTINGS_ACCEL_USE_X:
        VALUES->acceleration = (int16_t)(settings.accelerometer_axis_invert ?
                                -accel.axis[0] : accel.axis[0]);
        break;
      case SETTINGS_ACCEL_USE_Y:
        VALUES->acceleration = (int16_t)(settings.accelerometer_axis_invert ?
                                -accel.axis[1] : accel.axis[1]);
        break;
      case SETTINGS_ACCEL_USE_Z:
        VALUES->acceleration = (int16_t)(settings.accelerometer_axis_invert ?
                                -accel.axis[2] : accel.axis[2]);
        break;
      }
    }

    // calculate vehicle speed
    if (settings.WheelSensor0_pulses_per_rev > 0 ||
        settings.WheelSensor1_pulses_per_rev > 0 ||
        settings.WheelSensor2_pulses_per_rev > 0)
    {
      uint8_t speed = inputs.wheelRPS[0];
      if (speed < inputs.wheelRPS[1])
        speed = inputs.wheelRPS[1];
      if (speed < inputs.wheelRPS[2])
        speed = inputs.wheelRPS[2];

      if (speed > lastspeed) {
        // wheels spin up ie touch down
        VALUES->speedOnGround = speed;
        lastspeed = speed;
        timeAtLastSpeedDecrement = chVTGetSystemTimeX();
      } else if (speed < lastspeed) {
        // we have lost some speed
        if ((timeAtLastSpeedDecrement + MIN_TIME_BETWEEN_PULSE_DEC_MS)
             < chVTGetSystemTimeX())
        {
          // valid decrement
          timeAtLastSpeedDecrement = chVTGetSystemTimeX();
          if (VALUES->speedOnGround > 0)
            // we use decrement here as we can't really rely
            // on wheel speed sensor as those might have locked up
            --VALUES->speedOnGround;
        }
      }
    }

    // the ABS logic
    if (settings.ABS_active && VALUES->speedOnGround > 0) {
      if (inputs.wheelRPS[0] < VALUES->speedOnGround) {
        VALUES->slip[0] =
            (VALUES->speedOnGround - inputs.wheelRPS[0]) / VALUES->speedOnGround;
        VALUES->brakeForce_out[0] =
            VALUES->brakeForce * VALUES->slip[0] * SLIP_RELESE_FACTOR;
      }
      if (inputs.wheelRPS[1] < VALUES->speedOnGround) {
        VALUES->slip[1] =
            (VALUES->speedOnGround - inputs.wheelRPS[1]) / VALUES->speedOnGround;
        VALUES->brakeForce_out[1] =
            VALUES->brakeForce * VALUES->slip[1] * SLIP_RELESE_FACTOR;
      }
      if (inputs.wheelRPS[2] < VALUES->speedOnGround) {
        VALUES->slip[2] =
            (VALUES->speedOnGround - inputs.wheelRPS[2]) / VALUES->speedOnGround;
        VALUES->brakeForce_out[2] =
            VALUES->brakeForce * VALUES->slip[2] * SLIP_RELESE_FACTOR;
      }
    } else {
      VALUES->brakeForce_out[0] =
          VALUES->brakeForce_out[1] =
              VALUES->brakeForce_out[2] = VALUES->brakeForce;
    }

    // steering brakes accelerometer
    if (settings.accelerometer_active && VALUES->acceleration != 0 &&
        leftPosBrake > -1 && rightPosBrake > -1)
    {
      int32_t vlu = VALUES->acceleration * settings.acc_steering_brake_authority;
      VALUES->accelSteering = vlu / (64 * 100); // 14bit -> 8bit and 100%

      if (VALUES->accelSteering < 0) {
        if (VALUES->brakeForce_out[leftPosBrake] > (uint8_t)(-VALUES->accelSteering))
          VALUES->brakeForce_out[leftPosBrake] = (uint8_t)(-VALUES->accelSteering);
      } else if (VALUES->accelSteering > 0) {
        if (VALUES->brakeForce_out[rightPosBrake] > (uint8_t)VALUES->accelSteering)
          VALUES->brakeForce_out[rightPosBrake] = (uint8_t)VALUES->accelSteering;
      }
    }

    // steering brakes speed sensors
    if (settings.ws_steering_brake_authority > 0 &&
        VALUES->speedOnGround > 0 &&
        leftPosBrake > -1 && rightPosBrake > -1)
    {
      uint8_t leftSpeed = inputs.wheelRPS[leftPosBrake],
              rightSpeed = inputs.wheelRPS[rightPosBrake];

      int32_t vlu = (leftSpeed - rightSpeed) * settings.ws_steering_brake_authority;
      VALUES->wsSteering = vlu / 100; // remove 100% from authority

      if (VALUES->wsSteering < 0) {
        if (VALUES->brakeForce_out[leftPosBrake] > (uint8_t)(-VALUES->wsSteering))
          VALUES->brakeForce_out[leftPosBrake] = (uint8_t)(-VALUES->wsSteering);
      } else if (VALUES->wsSteering > 0) {
        if (VALUES->brakeForce_out[rightPosBrake] > (uint8_t)VALUES->wsSteering)
          VALUES->brakeForce_out[rightPosBrake] = (uint8_t)VALUES->wsSteering;
      }
    }

    // set PWM value to outputs
    if (settings.Brake0_active)
      pwmoutSetDuty(brake0, VALUES->brakeForce_out[0]);
    if (settings.Brake1_active)
      pwmoutSetDuty(brake1, VALUES->brakeForce_out[1]);
    if (settings.Brake2_active)
      pwmoutSetDuty(brake2, VALUES->brakeForce_out[2]);

  } // while loop
}

static thread_descriptor_t brakeLogicThdDesc = {
   "accel",
   THD_WORKING_AREA_BASE(waBrakeLogicThd),
   THD_WORKING_AREA_END(waBrakeLogicThd),
   PRIO_BRAKE_LOGIC_THD,
   BrakeLogicThd,
   NULL
};



// ------------------------------------------------------------------
// public stuff for this module

void brakeLogicInit(void) {
  pwmoutInit();
}

void brakeLogicStart(void) {
  brklogicp = chThdCreate(&brakeLogicThdDesc);
}

void brakeLogicSettingsChanged(void) {
 // which brake are at the left position of center line
  if (settings.Brake0_dir == SETTINGS_BRAKE_POS_LEFT)
    leftPosBrake = 0;
  else if (settings.Brake1_dir == SETTINGS_BRAKE_POS_LEFT)
    leftPosBrake = 1;
  else if (settings.Brake2_dir == SETTINGS_BRAKE_POS_LEFT)
    leftPosBrake = 2;
  else
    leftPosBrake = -1;

  // which brake are at the right position of center line
  if (settings.Brake0_dir == SETTINGS_BRAKE_POS_RIGHT)
    rightPosBrake = 0;
  else if (settings.Brake1_dir == SETTINGS_BRAKE_POS_RIGHT)
    rightPosBrake = 1;
  else if (settings.Brake2_dir == SETTINGS_BRAKE_POS_RIGHT)
    rightPosBrake = 2;
  else
    rightPosBrake = -1;
}
