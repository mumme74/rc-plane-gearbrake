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
  log_calcBrakeForce = 5,
  log_brakeForce0_out = 6,
  log_brakeForce1_out = 7,
  log_brakeForce2_out = 8,
  // wheel slip
  log_slip0 = 9,
  log_slip1 = 10,
  log_slip2 = 11,
  // steering brakes
  log_accelSteering = 11,
  log_wsSteering = 13,
  // accelerometer
  log_accel = 14,
  log_accelX = 15,
  log_accelY = 16,
  log_accelZ = 17,

  // must be last, indicates end of log items
  log_end,
#define LOGITEMS_CNT 18U
  // special type, last possible in 6bits
  log_coldStart = 0x3FU,
} LogType_e;

typedef struct {
  uint8_t size: 2;  // size of data
  uint8_t type: 6;  // log type
  uint8_t data[4]; // maximum 4 bytes data is possible to log
} LogItem_t;

typedef struct {
  uint8_t size;   // number of bytes
  uint8_t itemCnt; // number of items
  uint8_t buf[log_end * sizeof(LogItem_t)];
} LogBuf_t;

#if LOGITEMS_CNT * 5 + 1 >= EEPROM_PAGE_SIZE
# error "Log item size bigger than a page size"
#endif

void loggerInit(void);

void loggerStart(void);

void loggerSettingsChanged(void);

void loggerClearAll(usbpkg_t *sndpkg);

void loggerReadAll(usbpkg_t *sndpkg);


extern thread_t *logthdp;
// used to block logging
extern bool blockLog;

#endif /* LOGGER_H_ */
