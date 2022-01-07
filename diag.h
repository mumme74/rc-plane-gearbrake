/*
 * diag.h
 *
 *  Created on: 6 jan. 2022
 *      Author: fredrikjohansson
 */

#ifndef DIAG_H_
#define DIAG_H_

#include <stdint.h>
#include "usbcfg.h"

// block flags that tells threads
// to not intervene when we have faked a value
typedef enum {
  diag_Set_Invalid = 0,
  // these must be in this order, with this value
  diag_Set_Output0       = 1 << 0,
  diag_Set_Output1       = 1 << 1,
  diag_Set_Output2       = 1 << 2,
  diag_Set_InputsWsRcv   = 1 << 3,
  diag_Set_InputsAccel   = 1 << 4
} _setVluPkgType_e;
typedef uint8_t setVluPkgType_t;

/**
 * @brief this data package is returned to client when requesting realtime data
 */
typedef struct {
  int16_t   slip[3]; // index as wheel sensors attached
          // 6 bytes here
  int16_t accelSteering,
          wsSteering,
          acceleration,
          // 12 bytes here
          accelAxis[3]; // 0=X, 1=Y, 2=Z
          // 18 bytes here
  uint8_t speedOnGround,
          brakeForceIn, // as in from receiver
          brakeForceCalc,
          wheelRPS[3], // index as wheel sensors attached
          brakeForce_Out[3];// index as brake outputs
          // 27 bytes here
          // should align to 28 bits
} DiagReadVluPkg_t;


/**
 * @brief client sends this package when activating a value
 */
typedef struct {
  uint8_t size; // in bytes, sizeof this package
  setVluPkgType_t type;
  union {
    struct {
      uint8_t brakeForce, // input from receiver
              wheelRPS[3]; // revs per second per wheel
    } inputs; // 6 bytes, 9 bytes total with 3 usb bytes

    struct {
      int16_t accel[3]; // 14 bits signed int, X, Y, Z
    } accel; // 8 bytes, 11 total with header bytes in usb

    struct {
      uint8_t outVlu; // 0-100 PWM value
    } outputs; // 3 bytes, 6 bytes total with usb 3 bytes

  };
  // should be 3 - 8 bytes depending on package
} DiagSetVluPkg_t;


typedef struct {
  setVluPkgType_t type;
} DiagClrVluPkg_t;


extern volatile const uint8_t diagSetValues;

void diagInit(void);

void diagStart(void);

/**
 * @brief responds with current data as it is seen now
 */
void diagReadData(usbpkg_t *sndpkg);

void diagSetVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg);

void diagClearVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg);

#endif /* DIAG_H_ */
