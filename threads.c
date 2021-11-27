/*
 * threads.c
 *
 *  Created on: 8 aug. 2021
 *      Author: fredrikjohansson
 */


#include "threads.h"
#include <ch.h>

// ----------------------------------------------------------------
// Private stuff to this module
/*
static thread_descriptor_t idleThdDesc = {
  .name  = "idle",
  .wbase = NULL,//&__main_thread_stack_base__,
  .wend  = NULL, //&__main_thread_stack_end__,
  .prio  = CH_CFG_MAX_THREADS,
  .funcp = NULL,
  .arg  = NULL
};*/

// ----------------------------------------------------------------
// public stuff to this module

// save in RAM to be able to fill threads on init
//const thread_descriptor_t __attribute__((section(".ram0")))
//      nil_thd_configs[CH_CFG_MAX_THREADS + 1] = {0};

/*thread_t *addThdAndCreate(thread_descriptor_t *thdDesc) {
  thread_descriptor_t *thd =
       (thread_descriptor_t*)&nil_thd_configs[thdDesc->prio];
  thd->name = thdDesc->name;
  thd->wbase = thdDesc->wbase;
  thd->wend = thdDesc->wend;
  thd->prio = thdDesc->prio;
  thd->arg = thdDesc->arg;
  return chThdCreate(thdDesc);
}*/
