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

//#define LOG_OFFSET_SIZE     sizeof(uint32_t)

typedef enum {
  // use number here to prevent possible mismatch between
  // javascript front end and this firmware

  // speed as in wheel revs / sec
  log_speedOnGround = 0,
  log_wheelRPS_0 = 1,
  log_wheelRPS_1 = 2,
  log_wheelRPS_2 = 3,
  // brake force
  log_wantedBrakeForce = 4,
  log_brakeForce0_out = 5,
  log_brakeForce1_out = 6,
  log_brakeForce2_out = 7,
  // wheel slip
  log_slip0 = 8,
  log_slip1 = 9,
  log_slip2 = 10,
  // steering brakes
  log_accelSteering = 11,
  log_wsSteering = 12,
  // accelerometer
  log_accel = 13,
  log_accelX = 14,
  log_accelY = 15,
  log_accelZ = 16,

  // must be last, indicates end of log items
  log_end,
#define LOGITEMS_CNT 17U
  // special type, last possible in 6bits
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

void loggerStart(void);

void loggerSettingsChanged(void);

void loggerClearAll(uint8_t buf[], const size_t bufSz);

void loggerReadAll(uint8_t obuf[], CommsReq_t *cmd,
                   const size_t bufSz);

void loggerNextAddr(uint8_t obuf[], CommsReq_t *cmd);


extern thread_t *logthdp;

#endif /* LOGGER_H_ */
