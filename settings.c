/*
 * settings.c
 *
 *  Created on: 5 aug. 2021
 *      Author: fredrikjohansson
 */

#include <ch.h>
//#include <string.h>
#include "settings.h"
#include "pwmout.h"
#include "eeprom.h"
#include "accelerometer.h"
#include "inputs.h"
#include "brake_logic.h"
#include "logger.h"
#include "usbcfg.h"
#include "threads.h"

// this version should be bumped on each breaking ABI change to EEPROM storage
#define STORAGE_VERSION 0x01

#define SETTINGS_SIZE   (sizeof(Settings_t) - sizeof(settings.header))

#define VALIDATE_HEADER(header) \
   ((header).size == SETTINGS_SIZE && \
    (header).storageVersion == STORAGE_VERSION)

// -----------------------------------------------------------------

// private stuff to this module
static thread_t *settingsp = 0;
thread_reference_t saveThdRef;

static ee24_arg_t eeArg = {
  &settings_ee, 0, NULL, 0, 0, {0, 0}
};

/**
 * @brief notify other modules about the changes
 */
static void notify(void) {
  pwmoutSettingsChanged();
  accelSettingsChanged();
  inputsSettingsChanged();
  brakeLogicSettingsChanged();
  loggerSettingsChanged();
}


/**
 * @brief load settings from EEPROM memory
 */
static msg_t settingsLoad(void) {
  Settings_header_t header;
  msg_t res;

  do {
    eeArg.offset = 0;
    eeArg.buf = (uint8_t*)&header;
    eeArg.len = sizeof(Settings_header_t);
    res = ee24m01r_read(&eeArg);

    if (res != MSG_OK) break;

     // ensure header version match with STORAGE_VERSION
    // if not bail out
    if (!VALIDATE_HEADER(header)) {
      res = MSG_RESET;
      break;
    }

    eeArg.buf = (uint8_t*)&settings;
    eeArg.len = sizeof(settings);
    res = ee24m01r_read(&eeArg);

  } while(false);


  return res;
}

static THD_WORKING_AREA(waSettingsThd, 128);
static THD_FUNCTION(SettingsThd, arg) {
  (void)arg;

  // load values from EEPROM
  settingsLoad();
  // notify subscribers that settings has loaded
  notify();

  while(true) {
    chThdSuspendTimeoutS(&saveThdRef, TIME_INFINITE);

    // save values to EEPROM when we wakeup
    settingsValidateValues();
    eeArg.offset = 0;
    eeArg.len = sizeof(settings);
    eeArg.buf = (uint8_t*)&settings;
    ee24m01r_write(&eeArg);
    notify();
  }
}

static thread_descriptor_t settingsThdDesc = {
   "settings",
   THD_WORKING_AREA_BASE(waSettingsThd),
   THD_WORKING_AREA_END(waSettingsThd),
   PRIO_SETTINGS_I2C_THD,
   SettingsThd,
   NULL
};


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
  50, /*acc_steering_authority*/
  0,
  0,
  freq1kHz,
  1,
  1,
  0,
  1,
  0,
  2,
  0, // accelerometer axis
  0,
  0,
  0,
  SETTINGS_LOG_2560MS,
  0,
  0,
  0, // WheelSensor2_pulses_per_rev
};

void settingsInit(void) {
  settingsDefault();
}

void settingsStart(void) {
  settingsp = chThdCreate(&settingsThdDesc);
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
  settings.logPeriodicity = SETTINGS_LOG_2560MS;
}

void settingsSave(void) {
  if (saveThdRef)
    chThdResume(&saveThdRef, MSG_OK);
}

void settingsGetAll(usbpkg_t *sndpkg)
{
  PKG_PUSH_16(*sndpkg, settings.header.storageVersion);
  PKG_PUSH_16(*sndpkg, settings.header.size);

  for (size_t i = 4; i < sizeof(settings); ++i)
    PKG_PUSH(*sndpkg, ((uint8_t*)&settings)[i]);

  usbWaitTransmit(sndpkg);
}

void settingsSetAll(usbpkg_t *sndpkg, usbpkg_t *rcvpkg) {

  CommsCmdType_e res = commsCmd_Error;
  do {

    Settings_header_t header;

    header.storageVersion = FROM_BIG_ENDIAN_16(&rcvpkg->onefrm.data[0]);
    header.size =           FROM_BIG_ENDIAN_16(&rcvpkg->onefrm.data[2]);

    if (!VALIDATE_HEADER(header)) break;

    // set settings
    for (size_t i = 4; i < sizeof(settings); ++i)
      ((uint8_t*)&settings)[i] = rcvpkg->onefrm.data[i];

    settingsValidateValues();

    // save settings
    settingsSave();

    notify();

    // all ok
    res = commsCmd_OK;

  } while(false);

  commsSendWithCmd(sndpkg, res);
}

/**
 * @brief ensures values are within allowed window (before save)
 */
void settingsValidateValues(void) {
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
