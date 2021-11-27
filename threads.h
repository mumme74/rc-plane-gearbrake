/*
 * threads.h
 *
 *  Created on: 7 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef THREADS_H_
#define THREADS_H_

#include <ch.h>
#if !defined(THD_WORKING_AREA_BASE)
# define THD_WORKING_AREA_BASE(s) ((stkalign_t *)(s))
#endif

// the total number of threads in this app (excluding idle thread)
#ifndef CH_CFG_MAX_THREADS
#define CH_CFG_MAX_THREADS      5
#endif

#define PRIO_BRAKE_LOGIC_THD    0
#define PRIO_ACCEL_THD          1
#define PRIO_LOGGER_THD         2
#define PRIO_USB_CDC_THD        3
#define PRIO_SETTINGS_I2C_THD   4

//extern const thread_descriptor_t nil_thd_configs[];


/**
 * @brief add thdDesc to thdDesc table
 * Must be called before chSysInit
 *//*
thread_t *addThdAndCreate(thread_descriptor_t *thdDesc);
*/

#endif /* THREADS_H_ */
