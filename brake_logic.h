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
  int16_t slip[3];

  /* as sway acceleration from normal line
   * negative is left, positive right*/
  int16_t acceleration;

  // how much accelerometer steering
  int16_t accelSteering;
  // how much wheel speed sensor steering
  int16_t wsSteering;

  // how much brake force we get out
  uint8_t brakeForce_out[3];
  /* as wheel rotations per sec. */
  uint8_t speedOnGround;
  /* wanted brake force, might differ from inputs
   * due min/max and invert settings */
  uint8_t brakeForce;

} Values_t;

extern volatile const Values_t values;

void brakeLogicInit(void);
void brakeLogicStart(void);

void brakeLogicSettingsChanged(void);


#endif /* BRAKE_LOGIC_H_ */
