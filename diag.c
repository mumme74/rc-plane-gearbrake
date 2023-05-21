/*
 * diag.c
 *
 *  Created on: 6 jan. 2022
 *      Author: fredrikjohansson
 */

#include <ch.h>
#include "diag.h"
#include "comms.h"
#include "brake_logic.h"
#include "accelerometer.h"
#include "inputs.h"
#include "usbcfg.h"
#include "logger.h"


// this file contains logic to see real time data and steer output data

volatile const uint16_t diagSetValues = 0;


#define VALUES ((Values_t*)&values)
#define INPUTS ((Inputs_t*)&inputs)
#define ACCEL ((Accel_t*)&accel)

#define DIAG_SET_VALUES (*(uint16_t*)&diagSetValues)


// --------------------------------------------------------------
// private stuff to this module

// ---------------------------------------------------------------
// public stuff to this module

void diagInit(void) {
  DIAG_SET_VALUES = 0;
}

void diagStart(void) { }

/**
 * @brief responds with current data as it is seen now
 */
void diagReadData(usbpkg_t *sndpkg) {
  DiagReadVluPkg_t *diagPkg = (DiagReadVluPkg_t*)&sndpkg->onefrm.data[0];
  // these must be aligned to declaration in struct

  for(uint8_t i = 0; i < 3; ++i) {
    TO_BIG_ENDIAN_16(&diagPkg->accelAxis[i],
                     (int16_t)accel.axis[i]);
    diagPkg->brakeForce_Out[i] = values.brakeForce_out[i];
    diagPkg->wheelRPS[i]       = inputs.wheelRPS[i];
    TO_BIG_ENDIAN_16(&diagPkg->slip[i], values.slip[i]);
  }

  TO_BIG_ENDIAN_16(&diagPkg->acceleration, values.acceleration);
  TO_BIG_ENDIAN_16(&diagPkg->accelSteering, values.accelSteering);
  TO_BIG_ENDIAN_16(&diagPkg->wsSteering, values.wsSteering);

  diagPkg->speedOnGround    = values.speedOnGround;
  diagPkg->brakeForceIn     = inputs.brakeForce;
  diagPkg->brakeForceCalc   = values.brakeForce;

  sndpkg->onefrm.len += sizeof(*diagPkg);
  usbWaitTransmit(sndpkg); //commsSendNow(sndpkg);
}

/**
 * @brief starts a session where we output data
 */
void diagSetVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg) {
  CommsCmdType_e cmd = commsCmd_Error;

  if (rcvpkg->onefrm.len >= 7) {
    DiagSetVluPkg_t *setPkg = (DiagSetVluPkg_t*)rcvpkg->onefrm.data;

    if (setPkg->size >= 4 || setPkg->size <= 5) {
      cmd = commsCmd_OK;

      _setVluPkgType_e type =
          (_setVluPkgType_e)FROM_BIG_ENDIAN_16((uint8_t*)&setPkg->type);

      // we must set this before forcing a value, we might get preempted
      DIAG_SET_VALUES |= type;

      switch(type) {
      case diag_Set_Output0:
        VALUES->brakeForce_out[0] = setPkg->outputs.outVlu; break;
      case diag_Set_Output1:
        VALUES->brakeForce_out[1] = setPkg->outputs.outVlu; break;
      case diag_Set_Output2:
        VALUES->brakeForce_out[2] = setPkg->outputs.outVlu; break;
      case diag_Set_InputRcv:
        INPUTS->brakeForce = setPkg->inputs.u8value; break;
      case diag_Set_InputWhl0:
        INPUTS->wheelRPS[0] = setPkg->inputs.u8value; break;
      case diag_Set_InputWhl1:
        INPUTS->wheelRPS[1] = setPkg->inputs.u8value; break;
      case diag_Set_InputWhl2:
        INPUTS->wheelRPS[2] = setPkg->inputs.u8value; break;
      case diag_Set_InputAcc0:
        if (setPkg->size != 5) cmd = commsCmd_Error;
        else ACCEL->axis[0] = FROM_BIG_ENDIAN_16((uint8_t*)&setPkg->accel.accelVlu);
        break;
      case diag_Set_InputAcc1:
        if (setPkg->size != 5) cmd = commsCmd_Error;
        else ACCEL->axis[1] = FROM_BIG_ENDIAN_16((uint8_t*)&setPkg->accel.accelVlu);
        break;
      case diag_Set_InputAcc2:
        if (setPkg->size != 5) cmd = commsCmd_Error;
        else ACCEL->axis[2] = FROM_BIG_ENDIAN_16((uint8_t*)&setPkg->accel.accelVlu);
        break;
      default:
        cmd = commsCmd_Error;
      }
    }

    if (cmd != commsCmd_OK) // failed, reset blocking state
      DIAG_SET_VALUES &= ~setPkg->type;
  }

  commsSendNowWithCmd(sndpkg, cmd);
}

void diagClearVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg) {
  CommsCmdType_e cmd = commsCmd_Error;
  DiagClrVluPkg_t *clrpkg = (DiagClrVluPkg_t*)rcvpkg->onefrm.data;

  if (rcvpkg->onefrm.len == 5) {
    cmd = commsCmd_OK;
    _setVluPkgType_e type =
        (_setVluPkgType_e)FROM_BIG_ENDIAN_16((uint8_t*)&clrpkg->type);

    switch (type) {
    case diag_Set_Output0:
      VALUES->brakeForce_out[0] = 0; break;
    case diag_Set_Output1:
      VALUES->brakeForce_out[1] = 0; break;
    case diag_Set_Output2:
      VALUES->brakeForce_out[2] = 0; break;
    case diag_Set_InputRcv:
      INPUTS->brakeForce = 0; break;
    case diag_Set_InputWhl0:
      INPUTS->wheelRPS[0] = 0; break;
    case diag_Set_InputWhl1:
      INPUTS->wheelRPS[1] = 0; break;
    case diag_Set_InputWhl2:
      INPUTS->wheelRPS[2] = 0; break;
    case diag_Set_InputAcc0:
      ACCEL->axis[0] = 0; break;
    case diag_Set_InputAcc1:
      ACCEL->axis[1] = 0; break;
    case diag_Set_InputAcc2:
      ACCEL->axis[2] = 0; break;
    default:
      cmd = commsCmd_Error;
    }

    if (cmd == commsCmd_OK)
      DIAG_SET_VALUES &= ~type;
  }

  commsSendNowWithCmd(sndpkg, cmd);
}

void diagClearAllForced(void) {
  DIAG_SET_VALUES = 0;
}
