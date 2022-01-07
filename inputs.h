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
  /// ie the value that gets feed from receiver
  uint8_t brakeForce;

  /// how many revolutions per second the wheels are doing
  uint8_t wheelRPS[3];
} Inputs_t;

extern volatile const Inputs_t inputs;

/**
 * @brief initialize inputs module
 */
void inputsInit(void);

void inputsStart(void);

/**
 * @brief gets called whenever a setting has changed
 */
void inputsSettingsChanged(void);

/**
 * @brief turns off vs on inputs tmr check and DMA write
 */
void inputsStop(void);
void inputsStart(void);


#endif /* INPUTS_H_ */
