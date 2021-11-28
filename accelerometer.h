/*
 * accelerometer.h
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef ACCELEROMETER_H_
#define ACCELEROMETER_H_

#include <stdint.h>

typedef struct {
  union {
    int32_t axis[3];
    struct {
      int32_t pitch;
      int32_t roll;
      int32_t yaw;
    };
  };
} Accel_t;

/**
 * @brief global variable for the measured values
 */
extern const Accel_t accel;

/**
 * @brief initialize the accelerometer
 */
void accelInit(void);

void accelStart(void);

/**
 * @brief call whenever a setting has changed
 */
void accelSettingsChanged(void);


#endif /* ACCELEROMETER_H_ */
