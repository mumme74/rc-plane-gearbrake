/*
 * brake_logic.h
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef BRAKE_LOGIC_H_
#define BRAKE_LOGIC_H_

#include <stdint.h>

typedef struct {
  /* as wheel rotations per sec. */
  uint8_t speedOnGround;
  /* as sway acceleration from normal line
   * negative is left, positive right*/
  int16_t acceleration;
  /* wanted brake force, might differ from inputs
   * due min/max and invert settings */
  uint8_t brakeForce;
} Values_t;

extern const Values_t values;

void initBrakeLogic(void);


#endif /* BRAKE_LOGIC_H_ */
