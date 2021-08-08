/*
 * logger.c
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#include "logger.h"
#include "inputs.h"
#include "accelerometer.h"
#include "eeprom.h"
#include "threads.h"
#include "brake_logic.h"
#include <ch.h>

#define LOG_ITEM(thing, typ) {                              \
  uint32_t idx = 0;                                         \
  itm.size = sizeof(thing) &0x03;                           \
  itm.type = typ;                                           \
  pos[idx++] = (uint8_t)((uint8_t*)(&itm))[0];              \
  pos[idx++] = (uint8_t)(&thing)[0];                        \
  if (sizeof(thing) > 1) pos[idx++] = (uint8_t)(&thing)[1]; \
  if (sizeof(thing) > 2) pos[idx++] = (uint8_t)(&thing)[2]; \
  if (sizeof(thing) > 3) pos[idx++] = (uint8_t)(&thing)[3]; \
  ++cnt;                                                    \
}


// ---------------------------------------------------------------
// private stuff for this file
static thread_t *logthdp = 0;
static systime_t logTimeout = 0;

static LogBuf_t log;
static LogItem_t itm;
EepromFileStream *fs;
uint32_t currentAddr;

static void buildLog(void) {
  uint8_t *pos = ((uint8_t*)&log)+1;
  uint8_t cnt = 0;
  LOG_ITEM(inputs.brakeForce, log_wantedBrakeForce);

  if (settings.Brake0_active)
    LOG_ITEM(values.brakeForce_out[0], log_brakeForce0_out);
  if (settings.Brake1_active)
    LOG_ITEM(values.brakeForce_out[1], log_brakeForce1_out);
  if (settings.Brake2_active)
    LOG_ITEM(values.brakeForce_out[2], log_brakeForce2_out);

  if (settings.WheelSensor0_pulses_per_rev>0 ||
      settings.WheelSensor1_pulses_per_rev>0 ||
      settings.WheelSensor2_pulses_per_rev>0)
  {
    LOG_ITEM(values.speedOnGround, log_speedOnGround);
    if (settings.WheelSensor0_pulses_per_rev>0) {
      LOG_ITEM(inputs.wheelRPS[0], log_wheelRPS_0);
      if (settings.ABS_active)
        LOG_ITEM(values.slip[0], log_slip0);
    }
    if (settings.WheelSensor1_pulses_per_rev>0) {
      LOG_ITEM(inputs.wheelRPS[1], log_wheelRPS_1);
      if (settings.ABS_active)
        LOG_ITEM(values.slip[1], log_slip1);
    }
    if (settings.WheelSensor2_pulses_per_rev>0) {
      LOG_ITEM(inputs.wheelRPS[2], log_wheelRPS_2);
      if (settings.ABS_active)
        LOG_ITEM(values.slip[2], log_slip2);
    }

    if (settings.ws_steering_brake_authority>0)
      LOG_ITEM(values.wsSteering, log_wsSteering);
  }

  if (settings.accelerometer_active) {
    LOG_ITEM(accel.axis[0], log_accelX);
    LOG_ITEM(accel.axis[1], log_accelY);
    LOG_ITEM(accel.axis[2], log_accelZ);
    LOG_ITEM(values.acceleration, log_accel);
    if (settings.acc_steering_brake_authority>0)
      LOG_ITEM(values.accelSteering, log_accelSteering);
  }

  // last set the size off this log
  log.size = cnt;
}

THD_WORKING_AREA(waLoggerThd, 128);
THD_FUNCTION(LoggerThd, arg) {
  (void)arg;

  // read start pos of low address
  uint32_t lowAddrStart, highAddrStart,
           *addrStart;

  msg_t res = fileStreamSetPosition(log_bank1_fs, 0);
  if (res != MSG_OK) {
    chThdExit(MSG_RESET);
    return;
  }

  res = fileStreamRead(log_bank1_fs, (uint8_t*)&lowAddrStart,
                       sizeof(lowAddrStart));
  if (res != MSG_OK) {
    chThdExit(MSG_RESET);
    return;
  }

  // start log at pos high address
  res = fileStreamSetPosition(log_bank2_fs, 0);
  if (res != MSG_OK) {
    chThdExit(MSG_RESET);
    return;
  }

  res = fileStreamRead(log_bank2_fs, (uint8_t*)&highAddrStart,
                       sizeof(highAddrStart));
  if (res != MSG_OK) {
    chThdExit(MSG_RESET);
    return;
  }

  if (lowAddrStart > 0)
    currentAddr = (lowAddrStart > 0) ? lowAddrStart :
                  EEPROM_LOG_BANK1_START_ADDR + sizeof(lowAddrStart);
  fs = log_bank1_fs;
  addrStart = &lowAddrStart;

  // start thread loop
  while (true) {
    chThdSleepMilliseconds(logTimeout);

    buildLog();

    if (lowAddrStart + log.size > EEPROM_BANK1_END_ADDR &&
        fs == log_bank1_fs)
    {
      fs = log_bank2_fs;
      currentAddr = EEPROM_LOG_BANK1_START_ADDR + sizeof(highAddrStart);
      addrStart = &highAddrStart;
    } else if (highAddrStart + log.size > EEPROM_BANK2_END_ADDR &&
        fs == log_bank2_fs)
    {
      fs = log_bank1_fs;
      currentAddr = EEPROM_LOG_BANK1_START_ADDR + sizeof(lowAddrStart);
      addrStart = &lowAddrStart;
    }

    *addrStart += log.size;
    fileStreamWrite(fs, (uint8_t*)&log, log.size);
    fileStreamSetPosition(fs, 0);
    fileStreamWrite(fs, (uint8_t*)addrStart, sizeof(*addrStart));
    fileStreamSetPosition(fs, *addrStart);
  }
}

static thread_descriptor_t loggerThdDesc = {
   "accel",
   THD_WORKING_AREA_BASE(waLoggerThd),
   THD_WORKING_AREA_END(waLoggerThd),
   PRIO_LOGGER_THD,
   LoggerThd,
   NULL
};

// ---------------------------------------------------------------
// public stuff for this file

void loggerInit(void) {
  logthdp = chThdCreate(&loggerThdDesc);
  logTimeout =  TIME_MS2I(settings.logPeriodicity);
}

void loggerSettingsChanged(void) {
  logTimeout =  TIME_MS2I(settings.logPeriodicity);
}

