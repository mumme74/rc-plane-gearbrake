/*
 * i2c_bus.h
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef I2C_BUS_H_
#define I2C_BUS_H_

#include <stdint.h>
#include <hal.h>

extern const I2CConfig i2ccfg;

#define I2C_CLOCK  1000000

void i2c_busInit(void);

#endif /* I2C_BUS_H_ */
