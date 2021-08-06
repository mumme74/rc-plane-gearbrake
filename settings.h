/*
 * settings.h
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef SETTINGS_H_
#define SETTINGS_H_

#include <stdint.h>


typedef struct {
  struct {
    // which version of memory storage in EEPROM
    // version should be bumped on each ABI breaking change
    uint16_t storageVersion;
    // size of this settings storage in EEPROM (excluding 4bytes control)
    uint16_t size;
  } header;

  // common
  // 0-100 value when brakes begin to activate
  uint8_t lower_threshold;

  // 0-100 value when brakes are at maximum
  uint8_t upper_threshold;


  // 0-100%  where 100% is full force, 0 is no brakes
  uint8_t max_brake_force;

  // how to try to influence steeringbrakes speed sensors should have 0-100
  uint8_t ws_steering_brake_authority;
  // how to try to influence steeringbrakes accelerometer should have 0-100
  uint8_t acc_steering_brake_authority;

  // reverse input low value becomes high,
  // more or less the same as inverting output in your transmitter
  uint8_t reverse_input:1;

  // 0=off, 1=on (requires wheelspeedsensors)
  uint8_t ABS_active:1;

  // outputs
  uint16_t PwmFreq: 3; // as in PwmFrequency_e
  uint16_t Brake0_active: 1;
  uint16_t Brake1_active: 1;
  uint16_t Brake2_active: 1;
  uint16_t Brake0_dir: 2; // if it is left, right or center used for steering brakes
  uint16_t Brake1_dir: 2; // 1 for left, 2 for right, 0 for center wheel (no steering brake)
  uint16_t Brake2_dir: 2; //

  // wheel speed inputs
  // how many pulses per revolution each wheel has, ie how many tooths
  // in your ABS tooth wheel, 0 deactivates
  uint8_t WheelSensor0_pulses_per_rev;
  uint8_t WheelSensor1_pulses_per_rev;
  uint8_t WheelSensor2_pulses_per_rev;

  // accelerometer
  uint8_t accelerometer_active: 1;
  // which axis should control steering brakes
  // 0 = x, 1=y, 2=z
  uint8_t accelerometer_axis: 2;
  // invert the input IE brake the other wheel
  uint8_t accelerometer_axis_invert: 1;
} Settings_t;

extern Settings_t settings;

/**
 * @brief initialize settings, set to default and then load from EEPROM
 */
int settingsInit(void);

/**
 * @brief reset to default settings
 */
void settingsDefault(void);

/**
 * @brief load settings from EEPROM memory
 */
int settingsLoad(void);

/**
 * @brief save settings into EEPROM memory
 */
void settingsSave(void);


/**
 * @brief user code can call this function to notify
 * all recievers that settings has changed.
 * broadcast to all...
 */
void settingsHasChanged(void);





#endif /* SETTINGS_H_ */
