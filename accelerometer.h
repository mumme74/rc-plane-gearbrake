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
    int16_t axis[3];
    struct {
      int16_t pitch;
      int16_t roll;
      int16_t yaw;
    };
  };
} Axis_t;

/**
 * @brief global variable for the measured values
 */
extern const Axis_t axis;

/**
 * @brief initialize the accelerometer
 */
void accelInit(void);

/**
 * @brief call whenever a setting has changed
 */
void accelSettingsChanged(void);


#endif /* ACCELEROMETER_H_ */
