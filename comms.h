/*
 * comms.h
 *
 *  Created on: 4 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef COMMS_H_
#define COMMS_H_


#include <stdint.h>
#include <stddef.h>

#define COMMS_BUFF_SZ 256

typedef enum {
  commsCmd_Error = 0x00u,
  commsCmd_Ping = 0x01u,
  commsCmd_Pong = 0x02u,
  commsCmd_Reset = 0x03u,
  commsCmd_SettingsSetDefault = 0x07u,
  commsCmd_SettingsSaveAll = 0x08u,
  commsCmd_SettingsGetAll  = 0x09u,
  commsCmd_LogGetAll = 0x10u,
  commsCmd_LogNextAddr = 0x11u,
  commsCmd_LogClearAll = 0x12u,
  commsCmd_version = 0x20u,
  commsCmd_OK = 0x7F,
} CommsCmdType_e;

typedef struct {
  CommsCmdType_e type; /* what type of cmd to use */
  uint8_t       size; /* how many bytes in this request, including this byte*/
  uint8_t       reqId; /* A reqId used to differentiate  */
} CommsReq_t;

void commsInit(void);

void commsStart(void);

size_t commsSendHeader(CommsCmdType_e type, uint32_t len);

size_t commsSendPayload(size_t len);


#endif /* COMMS_H_ */
