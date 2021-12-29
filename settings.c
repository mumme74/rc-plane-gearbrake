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
#include "brake_logic.h"
#include "logger.h"
#include "usbcfg.h"
#include "threads.h"

// this version should be bumped on each breaking ABI change to EEPROM storage
#define STORAGE_VERSION 0x01

#define SETTINGS_SIZE   (sizeof(Settings_t) - sizeof(settings.header))

// -----------------------------------------------------------------

// private stuff to this module
static thread_t *settingsp = 0;
thread_reference_t saveThdRef;

/**
 * @brief notify other modules about the changes
 */
static void notify(void) {
  pwmoutSettingsChanged();
  //accelSettingsChanged();
  inputsSettingsChanged();
  brakeLogicSettingsChanged();
  loggerSettingsChanged();
}


/**
 * @brief load settings from EEPROM memory
 */
static msg_t settingsLoad(void) {
  uint8_t *buf = (uint8_t*)&settings;
  const size_t hdrSz = sizeof(Settings_header_t);
  Settings_header_t header;

  msg_t res;
  do {
    res = ee24m01r_read(&settings_ee, 0, (uint8_t*)&header, hdrSz);

    if (res != MSG_OK) break;

     // ensure header version match with STORAGE_VERSION
    // if not bail out
    if (!settingsValidateHeader(header)) {
      res = MSG_RESET;
      break;
    }

    res = ee24m01r_read(&settings_ee, hdrSz, buf+hdrSz,
                        sizeof(settings) - hdrSz );
  } while(false);


  // notify subscribers that settings has loaded
  notify();
  return res;
}

static THD_WORKING_AREA(waSettingsThd, 128);
static THD_FUNCTION(SettingsThd, arg) {
  (void)arg;

  // load values from EEPROM
  settingsLoad();

  while(true) {
    chThdSuspendTimeoutS(&saveThdRef, TIME_INFINITE);

    // save values to EEPROM when we wakeup
    settingsValidateValues();
    const uint8_t *buf = (uint8_t*)&settings;
    ee24m01r_write(&settings_ee, 0, buf, sizeof(settings));
    //if (res == MSG_OK)
      //notify();
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
  50,
  0,
  0,
  freq1kHz,
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
  0,
  0,
  SETTINGS_LOG_20MS,
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
}

void settingsSave(void) {
  if (saveThdRef)
    chThdResume(&saveThdRef, MSG_OK);
}

void settingsGetAll(uint8_t obuf[], CommsReq_t *cmd)
{
  sendHeader(cmd->type, sizeof(settings));

  obuf[0] = (settings.header.storageVersion & 0xFF00) >> 8;
  obuf[1] = (settings.header.storageVersion & 0xFF);
  obuf[2] = (settings.header.size & 0xFF00) >> 8;
  obuf[3] = (settings.header.size & 0xFF);

  for (size_t i = 4; i < sizeof(settings); ++i)
    obuf[i] = ((uint8_t *)&settings)[i];

  sendPayload(sizeof(settings));
}



void settingsSetAll(uint8_t obuf[], CommsReq_t *cmd) {
  // -3 due to header bytes
  const size_t sz = cmd->size -3;

  static size_t nRead = 0;
  static systime_t tmo;
  tmo = chVTGetSystemTimeX() + TIME_MS2I(100);

  // first read in all settings from serial buffer
  while (serusbcfg.usbp->state == USB_ACTIVE &&
         chVTGetSystemTimeX() < tmo &&
         nRead < sz)
  {
    nRead += ibqReadTimeout(&SDU1.ibqueue, obuf + nRead, sz - nRead, TIME_US2I(750));
  }

  CommsCmdType_e res = commsCmd_Error;
  do {
    // incomplete or mismatched
    if (sz != nRead) break;

    Settings_header_t header;
    header.storageVersion = obuf[0] << 8 | obuf[1];
    header.size = obuf[2] << 8 | obuf[3];

    if (!settingsValidateHeader(header)) break;

    // set settings
    for (size_t i = 4; i < settings.header.size; ++i)
      ((uint8_t*)&settings)[i] = obuf[i];

    settingsValidateValues();

    // save settings
    settingsSave();

    // all ok
    res = commsCmd_OK;

  } while(false);

  sendHeader(res, 0);
}

bool settingsValidateHeader(Settings_header_t header) {
  return header.size == SETTINGS_SIZE &&
         header.storageVersion == STORAGE_VERSION;
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
