/*
 * settings.c
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */

#include <ch.h>
#include "settings.h"
#include "pwmout.h"
#include "eeprom.h"
#include "accelerometer.h"
#include "inputs.h"

// this version should be bumped on each breaking ABI change to EEPROM storage
#define STORAGE_VERSION 0x01

#define SETTINGS_SIZE   (sizeof(Settings_t) - sizeof(settings.header))


// -----------------------------------------------------------------

// private stuff to this module

/**
 * @brief ensures values are within allowed window (before save)
 */
static void validateValues(void) {
  if (settings.lower_threshold > 100)
    settings.lower_threshold = 100;
  if (settings.upper_threshold > 100)
    settings.upper_threshold = 100;
  if (settings.max_brake_force > 100)
    settings.max_brake_force = 100;
  if (settings.ws_steering_brake_authority > 100)
    settings.ws_steering_brake_authority = 25;
  if (settings.acc_steering_brake_authority > 100)
    settings.acc_steering_brake_authority = 20;
  if (settings.PwmFreq > freqHighest)
    settings.PwmFreq = freq10Hz;
  if (settings.Brake0_dir > 2)
    settings.Brake0_dir = 0;
  if (settings.Brake1_dir > 2)
    settings.Brake2_dir = 0;
  if (settings.Brake2_dir > 2)
    settings.Brake2_dir = 0;
  if (settings.accelerometer_axis > 2) {
    // error, turn off
    settings.accelerometer_axis = 0;
    settings.accelerometer_active = 0;
  }
}

/**
 * @brief notify other modules about the changes
 */
void notify(void) {
  pwmoutSettingsChanged();
  accelSettingsChanged();
  inputsSettingsChanged();
}


// -----------------------------------------------------------------

// public stuff

Settings_t settings = {
  {
    STORAGE_VERSION,
    SETTINGS_SIZE
  },
  0,
  100,
  100,
  25,
  20,
  0,
  0,
  freq10Hz,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
};

msg_t settingsInit(void) {
  settingsDefault();
  return settingsLoad();
}

void settingsDefault(void) {
  settings.lower_threshold = 0;
  settings.upper_threshold = 100;
  settings.max_brake_force = 100;
  settings.ws_steering_brake_authority = 25;
  settings.acc_steering_brake_authority = 20;
  settings.reverse_input = 0;
  settings.ABS_active = 0;
  settings.PwmFreq = freq10Hz;
  settings.Brake0_active = 1;
  settings.Brake1_active = 1;
  settings.Brake2_active = 0;
  settings.Brake0_dir = 0;
  settings.Brake1_dir = 0;
  settings.Brake2_dir = 0;
  settings.WheelSensor0_pulses_per_rev = 0;
  settings.WheelSensor1_pulses_per_rev = 0;
  settings.WheelSensor2_pulses_per_rev = 0;
  settings.accelerometer_active = 0;
  settings.accelerometer_axis = 0;
  settings.accelerometer_axis_invert = 0;
}


msg_t settingsLoad(void) {
  uint8_t *buf = (uint8_t*)&settings;

  msg_t res = fileStreamSetPosition(settings_fs, 0);
  if (res != MSG_OK) return res;

  // load header
  res = fileStreamRead(settings_fs, buf, sizeof(Settings_header_t));
  if (res != MSG_OK) return res;

  // ensure header version match with STORAGE_VERSION
  // if not bail out
  if (settings.header.size != SETTINGS_SIZE ||
      settings.header.storageVersion != STORAGE_VERSION)
  {
    return MSG_RESET;
  }

  // set the rest of the settings
  res = fileStreamRead(settings_fs,
                       buf + sizeof(Settings_header_t),
                       sizeof(Settings_header_t) - sizeof(Settings_header_t));
  if (res != MSG_OK) return res;


  // notify subscribers that settings has loaded
  notify();
  return MSG_OK;
}

msg_t settingsSave(void) {
  validateValues();
  size_t res = fileStreamSetPosition(settings_fs, 0);
  if (res != MSG_OK) return res;

  res =fileStreamWrite(settings_fs, (uint8_t*)&settings, sizeof(Settings_t));
  if (res != MSG_OK) return res;

  notify();
  return res;
}
