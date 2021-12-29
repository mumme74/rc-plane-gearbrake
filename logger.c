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
#include "usbcfg.h"
#include "comms.h"
#include <ch.h>

/*
 * Memory structure for Logger:
 * log .. many Log_Items
 * log .. many Log_Items
 * ....
 * last 4 bytes: offset to next LogItem
 */

#define LOG_ITEM(thing, typ) {                          \
  itm.size = (sizeof(thing) -1) & 0x03;                 \
  itm.type = typ;                                       \
  *pos++ = (uint8_t)((uint8_t*)(&itm))[0];              \
  *pos++ = (uint8_t)(&thing)[0];                        \
  if (sizeof(thing) > 1) *pos++ = (uint8_t)(&thing)[1]; \
  if (sizeof(thing) > 2) *pos++ = (uint8_t)(&thing)[2]; \
  if (sizeof(thing) > 3) *pos++ = (uint8_t)(&thing)[3]; \
  ++log.length;                                         \
}
/*#define LOG_ITEM(thing, typ) \
  logItem(&pos, ((uint32_t*)&thing), sizeof(thing), typ, &cnt)
*/

// ---------------------------------------------------------------
// private stuff for this file
static systime_t logTimeout = 20;

static LogBuf_t log;
static LogItem_t itm;
static uint32_t offsetNext = 0;

/*
void logItem(uint8_t *pos[], uint32_t *thing, size_t sz,
             LogType_e typ, uint8_t *cnt)
{
  uint8_t idx = 0;
  itm.size = sz & 0x03;
  itm.type = typ;
  (*pos)[idx++] = (uint8_t)((uint8_t*)(&itm))[0];
  (*pos)[idx++] = (uint8_t)((uint8_t*)(&thing))[0];
  if (sz > 1) (*pos)[idx++] = (uint8_t)((uint8_t*)(&thing))[1];
  if (sz > 2) (*pos)[idx++] = (uint8_t)((uint8_t*)(&thing))[2];
  if (sz > 3) (*pos)[idx++] = (uint8_t)((uint8_t*)(&thing))[3];
  *pos += idx;
  ++(*cnt);

}*/

static systime_t logPeriodicityMS(void) {
  uint16_t factor = 2;
  for(uint8_t i = 0; i < settings.logPeriodicity; ++i)
    factor *= 2;
  return TIME_MS2I(10 * factor);
}

static void buildLog(void) {
  uint8_t *pos = ((uint8_t*)&log)+2;
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
  log.size = pos - (uint8_t*)&log;
}

THD_WORKING_AREA(waLoggerThd, 128);
THD_FUNCTION(LoggerThd, arg) {
  (void)arg;

  // read start pos of low address
  msg_t res = ee24m01r_read(&log_ee, EEPROM_LOG_NEXT_ADDR_LOC,
                            (uint8_t*)&offsetNext, sizeof(offsetNext));
  if (res != MSG_OK) {
    chThdExit(res);
    return;
  }

  // log a cold start
  log.size = 4u;
  log.length = 1u;
  log.items[0].size = 0;
  log.items[0].type = log_coldStart;
  log.items[0].data[0] = 0x5A; // bit twiddle to easily find during debug
  res = ee24m01r_write(&log_ee, offsetNext, (uint8_t*)&log, log.size);
  if (res != MSG_OK) {
    chThdExit(res);
    return;
  }
  offsetNext += log.size;


  // start thread loop
  while (true) {
    chThdSleep(logTimeout);
    if (serusbcfg.usbp->state == USB_ACTIVE)
      continue; // don't log when USB is plugged in

    buildLog();

    // at end, flip around
    if (offsetNext >= EEPROM_LOG_NEXT_ADDR_LOC)
      offsetNext = 0;
    // store it
    res = ee24m01r_write(&log_ee, offsetNext, (uint8_t*)&log, log.size);
    if (res != MSG_OK) {
      chThdExit(res);
      return;
    }

    // don't wear ot EEPROM, only save the nextadresspointer each 5s.
    static systime_t nextWrite = 0, curTime;
    chSysLock();
    curTime = chVTGetSystemTimeX();
    chSysUnlock();
    if (nextWrite < curTime) {
      nextWrite = curTime + TIME_MS2I(5000);
      // update nextOffset in memory
      res = ee24m01r_write(&log_ee, EEPROM_LOG_NEXT_ADDR_LOC,
                           (uint8_t*)&offsetNext, sizeof(offsetNext));
      if (res != MSG_OK) {
        chThdExit(res);
        return;
      }
    }
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

thread_t *logthdp = 0;

void loggerInit(void) {
  logTimeout = logPeriodicityMS();
}

void loggerStart(void) {
  logthdp = chThdCreate(&loggerThdDesc);
}

void loggerSettingsChanged(void) {
  logTimeout = logPeriodicityMS();
}

void loggerClearAll(uint8_t buf[]) {
  //chThdSuspendTimeoutS(&logthdp, TIME_INFINITE);
  logTimeout = logPeriodicityMS(); // when USB is attached we stop logging

  size_t offset = 0;
  for(size_t i = 0; i < COMMS_BUFF_SZ; ++i)
    buf[i] = 0xFF;

  do {
    size_t len =  offset + COMMS_BUFF_SZ < EEPROM_LOG_SIZE ?
                    COMMS_BUFF_SZ : EEPROM_LOG_SIZE - offset;
    ee24m01r_write(&log_ee, offset, buf, len);
    offset += COMMS_BUFF_SZ;
  } while(offset < EEPROM_LOG_SIZE);

  //chThdResume(&logthdp, MSG_OK);
  logTimeout = logPeriodicityMS();
}

void loggerReadAll(uint8_t buf[], CommsReq_t *cmd)
{
  //chThdSuspendTimeoutS(&logthdp, TIME_INFINITE);
  logTimeout =  TIME_MS2I(TIME_INFINITE); // when USB is attached we stop logging
  size_t offset = 0;

  // send header build up size bytes...
  if (commsSendHeader(cmd->type, EEPROM_LOG_SIZE) > 0) {

    do {
      // -4 due to last 4 bytes is logNextAddr
      size_t len = offset + COMMS_BUFF_SZ < EEPROM_LOG_SIZE ?
                      COMMS_BUFF_SZ : EEPROM_LOG_SIZE - offset;
      // read page into buffer
      if (ee24m01r_read(&log_ee, offset, buf, len) != MSG_OK)
        break;

      // send buffer to host
      if (commsSendPayload(len) < len)
        break;
      offset += COMMS_BUFF_SZ;

    } while(offset < EEPROM_LOG_SIZE);

  }

  //chThdResume(&logthdp, MSG_OK);
  logTimeout = logPeriodicityMS();
}

void loggerNextAddr(uint8_t buf[], CommsReq_t *cmd)
{
  commsSendHeader(cmd->type, sizeof(offsetNext));
  // big endian
  buf[3] = offsetNext & 0xFF;
  buf[2] = (offsetNext & 0xFF00) >> 8;
  buf[1] = (offsetNext & 0xFF0000) >> 16;
  buf[0] = (offsetNext & 0xFF000000) >> 24;
  commsSendPayload(4);
}


