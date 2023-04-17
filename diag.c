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

volatile const uint8_t diagSetValues = 0;

#define VALUES ((Values_t*)&values)
#define INPUTS ((Inputs_t*)&inputs)
#define ACCEL ((Accel_t*)&accel)


// --------------------------------------------------------------
// private stuff to this module




// ---------------------------------------------------------------
// public stuff to this module




void diagInit(void) {
  *(uint8_t*)&diagSetValues = 0;
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
  commsSendNow(sndpkg);
}

/**
 * @brief starts a session where we output data
 */
void diagSetVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg) {
  CommsCmdType_e cmd = commsCmd_Error;

  if (rcvpkg->onefrm.len >= 6) {
    DiagSetVluPkg_t *setPkg = (DiagSetVluPkg_t*)rcvpkg->onefrm.data;

    switch((_setVluPkgType_e)setPkg->type) {
    case diag_Set_Output0:
    case diag_Set_Output1:
    case diag_Set_Output2: // fallthrough
      if (setPkg->size == 3) {
        (*(uint8_t*)&diagSetValues) |= setPkg->type;
        // setPkg->type is 1 << 0, 1 << 1 or 1 << 2
        // 0100 >> 1 = 0010, 0010 = 0001 and 0001 = 000
        VALUES->brakeForce_out[setPkg->type >> 1] = setPkg->outputs.outVlu;
        cmd = commsCmd_OK;
      }
      break;
    case diag_Set_InputsWsRcv:
      if (setPkg->size == 6) {
        inputsStop();
        (*(uint8_t*)&diagSetValues) |= setPkg->type;
        INPUTS->brakeForce = setPkg->inputs.brakeForce;
        INPUTS->wheelRPS[0] = setPkg->inputs.wheelRPS[0];
        INPUTS->wheelRPS[1] = setPkg->inputs.wheelRPS[1];
        INPUTS->wheelRPS[2] = setPkg->inputs.wheelRPS[2];
        cmd = commsCmd_OK;
      }
      break;
    case diag_Set_InputsAccel:
      if (setPkg->size == 8) {
        (*(uint8_t*)&diagSetValues) |= setPkg->type;
        ACCEL->axis[0] = setPkg->accel.accel[0];
        ACCEL->axis[1] = setPkg->accel.accel[1];
        ACCEL->axis[2] = setPkg->accel.accel[2];
        cmd = commsCmd_OK;
      }
      break;
    default:
      cmd = commsCmd_Error;
    }
  }

  commsSendNowWithCmd(sndpkg, cmd);
}

void diagClearVlu(usbpkg_t *sndpkg, usbpkg_t *rcvpkg) {
  CommsCmdType_e cmd = commsCmd_Error;
  DiagClrVluPkg_t *clrpkg = (DiagClrVluPkg_t*)rcvpkg->onefrm.data;

  if (rcvpkg->onefrm.len == 4) {
    switch ((_setVluPkgType_e)clrpkg->type) {
    case diag_Set_Output0:
    case diag_Set_Output1:
    case diag_Set_Output2: // fallthrough
      cmd = commsCmd_OK;
      (*(uint8_t*)&diagSetValues) &= ~clrpkg->type;
        // setPkg->type is 1 << 0, 1 << 1 or 1 << 2
        // 0100 >> 1 = 0010, 0010 = 0001 and 0001 = 000
      VALUES->brakeForce_out[clrpkg->type >> 1] = 0;
      break;
    case diag_Set_InputsWsRcv:
      cmd = commsCmd_OK;
      (*(uint8_t*)&diagSetValues) &= ~clrpkg->type;
      INPUTS->brakeForce = INPUTS->wheelRPS[0] =
          INPUTS->wheelRPS[1] = INPUTS->wheelRPS[2] = 0;
      inputsStart();
      break;
    case diag_Set_InputsAccel:
      cmd = commsCmd_OK;
      (*(uint8_t*)&diagSetValues) &= ~clrpkg->type;
      ACCEL->axis[0] = ACCEL->axis[1] = ACCEL->axis[2] = 0;
      break;
    default:
      cmd = commsCmd_Error;
    }
  }

  commsSendNowWithCmd(sndpkg, cmd);
}
