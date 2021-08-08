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
#define APP_NO_OF_THREADS       4

#define PRIO_BRAKE_LOGIC_THD    3
#define PRIO_ACCEL_THD          4
#define PRIO_LOGGER_THD         5
#define PRIO_USB_CDC_THD        6

extern const thread_descriptor_t nil_thd_configs[APP_NO_OF_THREADS +1];

#endif /* THREADS_H_ */
