/*
 * logger.h
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef LOGGER_H_
#define LOGGER_H_

#include <stdint.h>

enum LogType {
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
};

typedef struct {
  uint8_t size: 2;  // size of data
  uint8_t type: 6;  // log type
  uint8_t data[4]; // maximum 4 bytes data is possible to log
} LogItem_t;

typedef struct {
  uint8_t size; // number of items
  LogItem_t items[log_end];
} LogBuf_t;

void loggerInit(void);

void loggerSettingsChanged(void);

#endif /* LOGGER_H_ */
