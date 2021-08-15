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
  itm.size = sizeof(thing) &0x03;                       \
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
static systime_t logTimeout = 0;

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
  msg_t res = ee24m01r_read(&log_ee, LOG_NEXT_OFFSET,
                            (uint8_t*)&offsetNext, sizeof(offsetNext));
  if (res != MSG_OK) {
    chThdExit(res);
    return;
  }

  // log a cold start
  log.size = 3u;
  log.length = 1u;
  log.items[0].size = 1;
  log.items[0].type = log_coldStart;
  res = ee24m01r_write(&log_ee, offsetNext, (uint8_t*)&log, log.size);
  if (res != MSG_OK) {
    chThdExit(res);
    return;
  }
  offsetNext += log.size;

  // start thread loop
  while (true) {
    chThdSleepMilliseconds(logTimeout);
    if (serusbcfg.usbp->state == USB_ACTIVE)
      continue; // don't log when USB is plugged in

    buildLog();

    // at end, flip around
    if (offsetNext >= LOG_NEXT_OFFSET)
      offsetNext = 0;
    // store it
    res = ee24m01r_write(&log_ee, offsetNext, (uint8_t*)&log, log.size);
    if (res != MSG_OK) {
      chThdExit(res);
      return;
    }

    // update nextOffset in memory
    res = ee24m01r_write(&log_ee, LOG_NEXT_OFFSET,
                         (uint8_t*)&offsetNext, sizeof(offsetNext));
    if (res != MSG_OK) {
      chThdExit(res);
      return;
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
  logthdp = chThdCreate(&loggerThdDesc);
  logTimeout =  TIME_MS2I(settings.logPeriodicity);
}

void loggerSettingsChanged(void) {
  logTimeout =  TIME_MS2I(settings.logPeriodicity);
}

void loggerClearAll(uint8_t obuf[], const size_t bufSz) {
  chThdSuspendTimeoutS(&logthdp, TIME_INFINITE);
  size_t offset = 0;
  for(size_t i = 0; i < bufSz; ++i)
    obuf[i] = 0xFF;

  do {
    size_t len =  offset + bufSz < EEPROM_LOG_SIZE ?
                    bufSz : EEPROM_LOG_SIZE - offset;
    ee24m01r_write(&log_ee, offset, obuf, len);
    offset += bufSz;
  } while(offset < EEPROM_LOG_SIZE);

  chThdResume(&logthdp, MSG_OK);


}

void loggerReadAll(uint8_t obuf[], CommsCmd_t *cmd,
                   const size_t bufSz, systime_t sendTimeout)
{
  chThdSuspendTimeoutS(&logthdp, TIME_INFINITE);
  size_t offset = 0;

  // send header build up size bytes...
  static const uint32_t logSize = EEPROM_LOG_SIZE + 3u; // +3 to include header
  uint8_t pos = 0;
  for (uint32_t i = 5u; i < 0xFFFFFFFFu; --i) {
    uint8_t vlu = (logSize & (0xFFu << i * 7u)) >> i*7u;
    if (vlu != 0u || pos > 0) {
      obuf[pos++] = 0x80u | vlu; // store Big end first
    }
  }
  // set type and reqId and send header to host
  obuf[pos++] = cmd->type;
  obuf[pos++] = cmd->reqId;
  if (obqWriteTimeout(&SDU1.obqueue, obuf, pos, sendTimeout) < pos)
    return;

  do {
    // -4 due to last 4 bytes is logNextAddr
    size_t len = offset + bufSz < EEPROM_LOG_SIZE - 4 ?
                   bufSz : EEPROM_LOG_SIZE - offset - 4;
    // read page into buffer
    ee24m01r_read(&log_ee, offset, obuf, len);
    // send buffer to host
    if (obqWriteTimeout(&SDU1.obqueue, obuf, len, sendTimeout) < len)
      break;
    offset += bufSz;
  } while(offset < EEPROM_LOG_SIZE -4);

  chThdResume(&logthdp, MSG_OK);
}

void loggerNextAddr(uint8_t obuf[], CommsCmd_t *cmd, systime_t sendTimeout)
{
  obuf[0] = 3 + sizeof(offsetNext);
  obuf[1] = cmd->type;
  obuf[2] = cmd->reqId;
  // little endian should be default for cortex ?
  obuf[3] = offsetNext & 0xFF;
  obuf[4] = (offsetNext & 0xFF00) >> 8;
  obuf[5] = (offsetNext & 0xFF0000) >> 16;
  obuf[6] = (offsetNext & 0xFF000000) >> 24;

  obqWriteTimeout(&SDU1.obqueue, obuf, 7, sendTimeout);
}


