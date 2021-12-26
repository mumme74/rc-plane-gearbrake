/*
    ChibiOS - Copyright (C) 2006..2018 Giovanni Di Sirio

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

#include <stdint.h>
#include <hal.h>
#include <ch.h>

#include "eeprom.h"
#include "settings.h"
#include "inputs.h"
#include "accelerometer.h"
#include "i2c_bus.h"
#include "brake_logic.h"
#include "logger.h"
#include "comms.h"


/*
 * Application entry point.
 */
int main(void) {

  /*
   * System initializations.
   * - HAL initialization, this also initializes the configured device drivers
   *   and performs the board-specific initializations.
   * - Kernel initialization, the main() function becomes a thread and the
   *   RTOS is active.
   */
  halInit();
  i2c_busInit();
  eepromInit();
  settingsInit();
  inputsInit();
  loggerInit();
  brakeLogicInit();
  //accelInit();
  commsInit();
  // done last of the initializations as main(void) now becomes idle thread
  chSysInit();

  // chSysInit must be invoked before any threads are created
  settingsStart();
  //accelStart();
  loggerStart();
  brakeLogicStart();
  commsStart();

  /* This is now the idle thread loop, you may perform here a low priority
     task but you must never try to sleep or wait in this loop. Note that
     this tasks runs at the lowest priority level so any instruction added
     here will be executed after all other tasks have been started.*/
  volatile uint32_t idleCnt = 0;
  while (1) {
    ++idleCnt;
  }

  return 0;
}
