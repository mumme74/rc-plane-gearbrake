/*
 * logger.h
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef LOGGER_H_
#define LOGGER_H_

#include <stdint.h>
#include "eeprom.h"
#include "comms.h"
#include <chtypes.h>

#define LOG_OFFSET_SIZE     sizeof(uint32_t)
#define LOG_NEXT_OFFSET     (EEPROM_LOG_SIZE - LOG_OFFSET_SIZE)

typedef enum {
  // speed as in wheel revs / sec
  log_speedOnGround,
  log_wheelRPS_0,
  log_wheelRPS_1,
  log_wheelRPS_2,
  // brake force
  log_wantedBrakeForce,
  log_brakeForce0_out,
  log_brakeForce1_out,
  log_brakeForce2_out,
  // wheel slip
  log_slip0,
  log_slip1,
  log_slip2,
  // steering brakes
  log_accelSteering,
  log_wsSteering,
  // accelerometer
  log_accel,
  log_accelX,
  log_accelY,
  log_accelZ,

  // must be last, indicates end of log items
  log_end,
#define LOGITEMS_CNT 17U

  log_coldStart = 0x3FU,
} LogType_e;

typedef struct {
  uint8_t size: 2;  // size of data
  uint8_t type: 6;  // log type
  uint8_t data[4]; // maximum 4 bytes data is possible to log
} LogItem_t;

typedef struct {
  uint8_t length; // number of items
  uint8_t size;   // number of bytes
  LogItem_t items[log_end];
} LogBuf_t;

#if LOGITEMS_CNT * 5 + 1 >= EEPROM_PAGE_SIZE
# error "Log item size bigger than a page size"
#endif

void loggerInit(void);

void loggerSettingsChanged(void);

void loggerClearAll(uint8_t buf[], const size_t bufSz);

void loggerReadAll(uint8_t obuf[], CommsCmd_t *cmd,
                   const size_t bufSz, systime_t sendTimeout);

void loggerNextAddr(uint8_t obuf[], CommsCmd_t *cmd,
                    systime_t sendTimeout);


extern thread_t *logthdp;

#endif /* LOGGER_H_ */
