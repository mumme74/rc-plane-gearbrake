/*
 * inputs.h
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef INPUTS_H_
#define INPUTS_H_

#include <stdint.h>


typedef struct {
  ///this is the value 0-100 of the wanted brakeforce
  /// ie the value that gets feed from reciever
  uint8_t brakeForce;

  /// how many revolutions per second the wheels are doing
  uint8_t wheelRPS[3];

  /// How many G's each axis is feeling in the accelerometer
  /// updated at 20Hz
  uint8_t accAxis[3];
} Inputs_t;

extern const Inputs_t inputs;

/**
 * @brief initialize inputs module
 */
void inputsInit(void);

/**
 * @brief gets called whenever a setting has changed
 */
void inputsSettingsChanged(void);


#endif /* INPUTS_H_ */
