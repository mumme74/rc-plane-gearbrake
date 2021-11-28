/*
 * comms.h
 *
 *  Created on: 4 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef COMMS_H_
#define COMMS_H_


#include <stdint.h>

typedef enum {
  commsCmd_Error = 0x00u,
  commsCmd_Ping = 0x01u,
  commsCmd_Pong = 0x02u,
  commsCmd_Reset = 0x03u,
  commsCmd_SettingsSetDefault = 0x07u,
  commsCmd_SettingsSetAll = 0x08u,
  commsCmd_SettingsGetAll  = 0x09u,
  commsCmd_LogGetAll = 0x10u,
  commsCmd_LogNextAddr = 0x11u,
  commsCmd_LogClearAll = 0x12u,
  commsCmd_version = 0x20u,
  commsCmd_OK = 0xFF,
} CommsCmdType_e;

typedef struct {
  uint8_t        size; /* how many bytes in this request, including this byte*/
  CommsCmdType_e type; /* what type of cmd to use */
  uint8_t        reqId; /* A reqId used to differentiate  */
} CommsCmd_t;

void commsInit(void);

void commsStart(void);


#endif /* COMMS_H_ */
