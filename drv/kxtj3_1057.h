/*
 * KXTJ3_1057_drv.h
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

#ifndef KXTJ3_1057_DRV_H_
#define KXTJ3_1057_DRV_H_

// compile switches for this module
//#define KXTJ3_1057_EXTENDED_INTERFACE TRUE
//#define KXTJ3_1057_USE_ADVANCED TRUE

#include <stdint.h>

// this module implements a driver for the accelerometer KXTJ3_1057

/**
 * @brief   Extended interface configurations switch.
 * @details If set to @p TRUE it has interface from hal EX.
 * @note    The default is @p FALSE.
 */
#if !defined(KXTJ3_1057_EXTENDED_INTERFACE) || defined(__DOXYGEN__)
#define KXTJ3_1057_EXTENDED_INTERFACE             FALSE
#endif
/** @} */


#if KXTJ3_1057_EXTENDED_INTERFACE || defined(__DOXYGEN__)
// based of driver for KXTJ3_1057 in os/ex/ST dir
#include "ex_accelerometer.h"

/*===========================================================================*/
/* Driver constants.                                                         */
/*===========================================================================*/

/**
 * @name    Version identification
 * @{
 */
/**
 * @brief   LSM303DLHC driver version string.
 */
#define EX_KXTJ3_1057_VERSION               "0.1.0"

/**
 * @brief   LSM303DLHC driver version major number.
 */
#define EX_KXTJ3_1057_MAJOR                 0

/**
 * @brief   LSM303DLHC driver version minor number.
 */
#define EX_KXTJ3_1057_MINOR                 1

/**
 * @brief   LSM303DLHC driver version patch number.
 */
#define EX_KXTJ3_1057_PATCH                 0
/** @} */
#endif
/**
 * @brief   KXTJ3_1057 accelerometer subsystem characteristics.
 * @note    Sensitivity is expressed as milli-G/LSB whereas
 *          1 milli-G = 0.00980665 m/s^2.
 * @note    Bias is expressed as milli-G.
 *
 * @{
 */
/* the SAD of this device */
#define KXTJ3_1057_SLAVE_ADDR               0x0EU
#define KXTJ3_1057_SLAVE_ADDR_HIGH          0x0FU

#define KXTJ3_1057_ACC_NUMBER_OF_AXES       3U

#define KXTJ3_1057_ACC_2G                   2.0f
#define KXTJ3_1057_ACC_4G                   4.0f
#define KXTJ3_1057_ACC_8G                   8.0f
#define KXTJ3_1057_ACC_16G                  16.0f

#define KXTJ3_1057_ACC_SENS_2G              0.0610f
#define KXTJ3_1057_ACC_SENS_4G              0.1221f
#define KXTJ3_1057_ACC_SENS_8G              0.2442f
#define KXTJ3_1057_ACC_SENS_16G             0.4884f

#define KXTJ3_1057_ACC_BIAS                 0.0f
/** @} */

/**
 * @name   KXTJ3_1057 communication interfaces related bit masks
 * @{
 */
#define KXTJ3_1057_DI_MASK                  0xFF
#define KXTJ3_1057_DI(n)                    (1 << n)
#define KXTJ3_1057_AD_MASK                  0x7F
#define KXTJ3_1057_AD(n)                    (1 << n)
#define KXTJ3_1057_MS                       (1 << 7)
/** @} */

/**
 * @name    KXTJ3_1057 register addresses
 * @{
 */
#define KXTJ3_1057_XOUT_L               0x06U /* aligned to left, 8bit mode this is empty */
#define KXTJ3_1057_XOUT_H               0x07U
#define KXTJ3_1057_YOUT_L               0x08U
#define KXTJ3_1057_YOUT_H               0x09U
#define KXTJ3_1057_ZOUT_L               0x0AU
#define KXTJ3_1057_ZOUT_H               0x0BU
#define KXTJ3_1057_DCST_RESP            0x0CU
#define KXTJ3_1057_WHO_AM_I             0x0F
#define KXTJ3_1057_INT_SOURCE1          0x16
#define KXTJ3_1057_INT_SOURCE2          0x17
#define KXTJ3_1057_STATUS_REG           0x18
#define KXTJ3_1057_INT_REL              0x1A
/**
 * @brief   writing to these below require clearing PC1 bit in CTRL_REG1 first
 * @{
 **/
#define KXTJ3_1057_CTRL_REG1            0x1B
#define KXTJ3_1057_CTRL_REG2            0x1D
#define KXTJ3_1057_INT_CTRL_REG1        0x1E
#define KXTJ3_1057_INT_CTRL_REG2        0x1F
#define KXTJ3_1057_DATA_CTRL_REG        0x21
#define KXTJ3_1057_WAKEUP_COUNTER       0x29
#define KXTJ3_1057_NA_COUNTER           0x2A
#define KXTJ3_1057_SELF_TEST            0x3A
#define KXTJ3_1057_WAKEUP_THRESHOLD_H   0x6A
#define KXTJ3_1057_WAKEUP_THRESHOLD_L   0x6B
/** @} */
/** @} */


/**
 * @name interrupt register bits
 * @{
 */
#define KXTJ3_1057_INT_SOURCE1_DRDY     (1U << 4)
#define KXTJ3_1057_INT_SOURCE1_WUFS     (1U << 1)
#define KXTJ3_1057_INT_SOURCE2_XNWU     (1U << 5)
#define KXTJ3_1057_INT_SOURCE2_XPWU     (1U << 4)
#define KXTJ3_1057_INT_SOURCE2_YNWU     (1U << 3)
#define KXTJ3_1057_INT_SOURCE2_YPWU     (1U << 2)
#define KXTJ3_1057_INT_SOURCE2_ZNWU     (1U << 1)
#define KXTJ3_1057_INT_SOURCE2_ZPWU     (1U << 0)
#define KXTJ3_1057_STATUS_REG_INT       (1U << 4)
/** @} */

/**
 * @name G-select config for CTRL_REG1_SEL
 * {@
 */
#define KXTJ3_1057_GSEL_2G               0U
#define KXTJ3_1057_GSEL_4G               2U
#define KXTJ3_1057_GSEL_8G               4U
#define KXTJ3_1057_GSEL_8G_14bit         6U
#define KXTJ3_1057_GSEL_16G              1U
#define KXTJ3_1057_GSEL_16G_14bit        7U
/** @} */

/**
 * @name Wakeup frequency for CTRL_REG2_SEL
 * {@
 */
#define KXTJ3_1057_OWUF_0Hz781          0U
#define KXTJ3_1057_OWUF_1Hz563          1U
#define KXTJ3_1057_OWUF_3Hz125          2U
#define KXTJ3_1057_OWUF_6Hz25           3U
#define KXTJ3_1057_OWUF_12Hz5           4U
#define KXTJ3_1057_OWUF_25Hz            5U
#define KXTJ3_1057_OWUF_50Hz            6U
#define KXTJ3_1057_OWUF_100Hz           7U
/** @}*/

/**
 * @name Output data rate
 * {@
 */
#define KXTJ3_1057_ODR_0Hz781           0x8U
#define KXTJ3_1057_ODR_1Hz563           0x9U
#define KXTJ3_1057_ODR_3Hz125           0xAU
#define KXTJ3_1057_ODR_6Hz25            0xBU
#define KXTJ3_1057_ODR_12Hz5            0x0U
#define KXTJ3_1057_ODR_25Hz             0x1U
#define KXTJ3_1057_ODR_50Hz             0x2U
#define KXTJ3_1057_ODR_100Hz            0x3U
#define KXTJ3_1057_ODR_200Hz            0x4U
#define KXTJ3_1057_ODR_400Hz            0x5U
#define KXTJ3_1057_ODR_800Hz            0x6U
#define KXTJ3_1057_ODR_1600Hz           0x7U
/** @} */

/**
 * @name control register bits
 * {@
 */
#define KXTJ3_1057_CTRL_REG1_PC1        (1 << 7)
#define KXTJ3_1057_CTRL_REG1_RES        (1 << 6)
#define KXTJ3_1057_CTRL_REG1_DRDYE      (1 << 5)
#define KXTJ3_1057_CTRL_REG1_GSEL(GSEL) ((GSEL & 7U) << 2)
#define KXTJ3_1057_CTRL_REG1_GSEL1      (1 << 4)
#define KXTJ3_1057_CTRL_REG1_GSEL0      (1 << 3)
#define KXTJ3_1057_CTRL_REG1_EN16G      (1 << 2)
#define KXTJ3_1057_CTRL_REG1_GSEL_MASK  (7U << 2)
#define KXTJ3_1057_CTRL_REG1_WUFE       (1 << 1)
#define KXTJ3_1057_CTRL_REG1_GSEL_MASK  (7U << 2)

#define KXTJ3_1057_CTRL_REG2_SRST       (1U << 7)
#define KXTJ3_1057_CTRL_REG2_DCST       (1U << 4)
#define KXTJ3_1057_CTRL_REG2_OWUF(WAKEUP_FREQ) ((WAKEUP_FREQ & 7U) << 0)
#define KXTJ3_1057_CTRL_REG2_OWUFA      (1U << 2)
#define KXTJ3_1057_CTRL_REG2_OWUFB      (1U << 1)
#define KXTJ3_1057_CTRL_REG2_OWUFC      (1U << 0)
#define KXTJ3_1057_CTRL_REG2_OWUF_MASK  (3U << 0)

#define KXTJ3_1057_DATA_CTRL_ODR(ODR_FREQ)  ((ODR_FREQ & 15U) << 0)
#define KXTJ3_1057_DATA_CTRL_OSAA       (1 << 3)
#define KXTJ3_1057_DATA_CTRL_OSAB       (1 << 2)
#define KXTJ3_1057_DATA_CTRL_OSAC       (1 << 1)
#define KXTJ3_1057_DATA_CTRL_OSAD       (1 << 0)
/** @} */

/**
 * @name INT control reg bits
 * {@
 */
#define KXTJ3_1057_INT_CTRL_REG1_IEN     (1 << 5)
#define KXTJ3_1057_INT_CTRL_REG1_IEA     (1 << 4)
#define KXTJ3_1057_INT_CTRL_REG1_IEL     (1 << 3)
#define KXTJ3_1057_INT_CTRL_REG1_STPOL   (1 << 1)

#define KXTJ3_1057_INT_CTRL_REG2_ULMODE  (1 << 7)
#define KXTJ3_1057_INT_CTRL_REG2_XNWUE   (1 << 5)
#define KXTJ3_1057_INT_CTRL_REG2_XPWUE   (1 << 4)
#define KXTJ3_1057_INT_CTRL_REG2_YNWUE   (1 << 3)
#define KXTJ3_1057_INT_CTRL_REG2_YPWUE   (1 << 2)
#define KXTJ3_1057_INT_CTRL_REG2_ZNWUE   (1 << 1)
#define KXTJ3_1057_INT_CTRL_REG2_ZPWUE   (1 << 0)
#define KXTJ3_1057_INT_CTRL_REG2_XWUE(WUE) ((WUE & 3U) << 4)
#define KXTJ3_1057_INT_CTRL_REG2_YWUE(WUE) ((WUE & 3U) << 2)
#define KXTJ3_1057_INT_CTRL_REG2_ZWUE(WUE) ((WUE & 3U) << 0)
#define KXTJ3_1057_INT_CTRL_REG2_XWUE_MASK (3U << 4)
#define KXTJ3_1057_INT_CTRL_REG2_YWUE_MASK (3U << 2)
#define KXTJ3_1057_INT_CTRL_REG2_ZWUE_MASK (3U << 0)


/** @} */

/**
 * @brief   KXTJ3_1057 I2C interface switch.
 * @details If set to @p TRUE the support for I2C is included.
 * @note    The default is @p TRUE.
 */
#if !defined(KXTJ3_1057_USE_I2C) || defined(__DOXYGEN__)
#define KXTJ3_1057_USE_I2C                  TRUE
#endif

/**
 * @brief   KXTJ3_1057 shared I2C switch.
 * @details If set to @p TRUE the device acquires I2C bus ownership
 *          on each transaction.
 * @note    The default is @p FALSE. Requires I2C_USE_MUTUAL_EXCLUSION.
 */
#if !defined(KXTJ3_1057_SHARED_I2C) || defined(__DOXYGEN__)
#define KXTJ3_1057_SHARED_I2C               FALSE
#endif

/**
 * @brief   KXTJ3_1057 advanced configurations switch.
 * @details If set to @p TRUE more configurations are available.
 * @note    The default is @p FALSE.
 */
#if !defined(KXTJ3_1057_USE_ADVANCED) || defined(__DOXYGEN__)
# define KXTJ3_1057_USE_ADVANCED             FALSE
#elif !KXTJ3_1057_EXTENDED_INTERFACE
# error KXTJ3_1057_USE_ADVANCED requires KXTJ3_1057_EXTENDED_INTERFACE
#endif
/** @} */

/*=============================================================*/
/* Derived constants and error checks.                         */
/*=============================================================*/

#if KXTJ3_1057_USE_I2C && !HAL_USE_I2C
#error "KXTJ3_1057_USE_I2C requires HAL_USE_I2C"
#endif

#if KXTJ3_1057_SHARED_I2C && !I2C_USE_MUTUAL_EXCLUSION
#error "KXTJ3_1057_SHARED_I2C requires I2C_USE_MUTUAL_EXCLUSION"
#endif

/*=============================================================*/
/* Driver data structures and types.                           */
/*=============================================================*/

/**
 * @name KXTJ3_1057 accelerometer subsystem data structures and types
 * {@
 */


/**
 * @brief Structure representing a KXTJ3_1057 driver
 */
typedef struct KXTJ3_1057Driver KXTJ3_1057Driver;

 /**
  * @brief Driver state machine possible states.
  */
 typedef enum {
   KXTJ3_1057_UNINIT = 0,            /**< Not initialized.                   */
   KXTJ3_1057_STOP = 1,              /**< Stopped.                           */
   KXTJ3_1057_READY = 2,             /**< Ready.                             */
 } KXTJ3_1057_state_t;

 typedef enum {
   KXTJ3_1057_gselection_2G  = 2u,
   KXTJ3_1057_gselection_4G  = 4u,
   KXTJ3_1057_gselection_8G  = 8u,
   KXTJ3_1057_gselection_16G = 16u
 } KXTJ3_1057_gselection_t;

 typedef enum {
   KXTJ3_1057_datarate_0Hz781 = KXTJ3_1057_ODR_0Hz781,
   KXTJ3_1057_datarate_1Hz563 = KXTJ3_1057_ODR_1Hz563,
   KXTJ3_1057_datarate_3Hz125 = KXTJ3_1057_ODR_3Hz125,
   KXTJ3_1057_datarate_6Hz25  = KXTJ3_1057_ODR_6Hz25,
   KXTJ3_1057_datarate_12Hz5  = KXTJ3_1057_ODR_12Hz5,
   KXTJ3_1057_datarate_25Hz   = KXTJ3_1057_ODR_25Hz,
   KXTJ3_1057_datarate_50Hz   = KXTJ3_1057_ODR_50Hz,
   KXTJ3_1057_datarate_100Hz  = KXTJ3_1057_ODR_100Hz,
   KXTJ3_1057_datarate_200Hz  = KXTJ3_1057_ODR_200Hz,
   KXTJ3_1057_datarate_400Hz  = KXTJ3_1057_ODR_400Hz,
   KXTJ3_1057_datarate_800Hz  = KXTJ3_1057_ODR_800Hz,
   KXTJ3_1057_datarate_1600Hz = KXTJ3_1057_ODR_1600Hz
 } KXTJ3_1057_datarate_t;

 typedef enum {
   KXTJ3_1057_wakeup_datarate_OFF    = 0,
   KXTJ3_1057_wakeup_datarate_0Hz781 = 0x8 | KXTJ3_1057_OWUF_0Hz781,
   KXTJ3_1057_wakeup_datarate_1Hz563 = 0x8 | KXTJ3_1057_OWUF_1Hz563,
   KXTJ3_1057_wakeup_datarate_3Hz125 = 0x8 | KXTJ3_1057_OWUF_3Hz125,
   KXTJ3_1057_wakeup_datarate_6Hz25  = 0x8 | KXTJ3_1057_OWUF_6Hz25,
   KXTJ3_1057_wakeup_datarate_12Hz5  = 0x8 | KXTJ3_1057_OWUF_12Hz5,
   KXTJ3_1057_wakeup_datarate_25Hz   = 0x8 | KXTJ3_1057_OWUF_25Hz,
   KXTJ3_1057_wakeup_datarate_50Hz   = 0x8 | KXTJ3_1057_OWUF_50Hz,
   KXTJ3_1057_wakeup_datarate_100Hz  = 0x8 | KXTJ3_1057_OWUF_100Hz,
 } KXTJ3_1057_wakeup_datarate_t;

 typedef enum {
   KXTJ3_1057_motion_interrupt_off = 0U,
   KXTJ3_1057_motion_interrupt_neg = 1U, // only negative direction
   KXTJ3_1057_motion_interrupt_pos = 2U, // only in pos direction
   KXTJ3_1057_motion_interrupt_on  = 3U  // trigger on both directions
 } KXTJ3_1057_motion_interrupt_t;

 /**
  * @brief KXTJ3_1057 configuration structure.
  */
 typedef struct {
   /**
    * @brief I2C driver associated to this KXTJ3_1057.
    */
   I2CDriver                 *i2cp;
   /**
    * @brief I2C configuration associated to this KXTJ3_1057.
    */
   const I2CConfig           *i2ccfg;

#if defined(KXTJ3_1057_EXTENDED_INTERFACE) || defined(__DOXYGEN__)
   /**
    * @brief KXTJ3_1057 accelerometer subsystem initial sensitivity.
    */
   float                     *accsensitivity;

   /**
    * @brief KXTJ3_1057 accelerometer subsystem initial bias.
    */
   float                     *accbias;
#endif

   /**
    * @brief KXTJ3_1057 accelerometer subsystem output data rate.
    */
   KXTJ3_1057_datarate_t     dataoutfreq;

   /**
    * @brief KXTJ3_1057 accelerometer G-Selection
    */
   KXTJ3_1057_gselection_t      gselection;

   /*
    * Wakeup only generates interrupts on a physical pin
    * Does not change anything about powerlevel etc.
    */

   /**
    * @brief KXTJ3_1057 accelerometer subsystem wakeup rate
    * See KWXT3_1157_CTRL_REG2_OWUF
    */
   KXTJ3_1057_wakeup_datarate_t      wakeupdatafreq;

   /**
    * @brief KXTJ3_1057 accelerometer subsystem interrupt on motion
    */
   union {
     KXTJ3_1057_motion_interrupt_t axis[3];
     struct {
       KXTJ3_1057_motion_interrupt_t x;
       KXTJ3_1057_motion_interrupt_t y;
       KXTJ3_1057_motion_interrupt_t z;
     };
   } motion_interrupt;

   /**
    * @brief KXTJ3_1057 accelerometer subsystem wakeup threshold
    */
   uint16_t    wakeupthreshold;



   /**
    * @brief KXTJ3_1057 accelerometer subsystem
    * It is possible to address a second accelerometer
    * when ADDR pin to VDD, leave at false t get default SAD
    */
   bool     highAddress;

   /**
    * @brief KXTJ3_1057 accelerometer subsystem
    * Try to set device in low power mode, NOTE! gselection and datarate
    * can force device in high power mode.
    */
   bool     lowpowermode;

 } KXTJ3_1057Config;

 /**
  * @brief   @p KXTJ3_1057 specific methods.
  */
 #define _KXTJ3_1057_methods_alone                                           \
   /* Change full scale value of KXTJ3_1057 accelerometer subsystem.*/       \
   msg_t (*acc_set_set_full_scale)(KXTJ3_1057Driver *devp,                   \
                                   uint8_t fs);                              \
   msg_t (*acc_set_selftest)(KXTJ3_1057Driver *devp, bool activate);         \

 /**
  * @brief   @p KXTJ3_1057 specific methods with inherited ones.
  */
 #define _KXTJ3_1057_methods                                                 \
   _base_object_methods                                                      \
   _KXTJ3_1057_methods_alone

 /**
  * @extends BaseObjectVMT
  *
  * @brief @p KXTJ3_1057 virtual methods table.
  */
 struct KXTJ3_1057VMT {
   _KXTJ3_1057_methods
 };

#if KXTJ3_1057_EXTENDED_INTERFACE || defined(__DOXYGEN__)
# define _BASE_SENSOR_DATA _base_sensor_data
#else
# define _BASE_SENSOR_DATA
#endif


 /**
  * @brief @p KXTJ3_1057Driver specific data.
  */

#define _KXTJ3_1057_base_data                                               \
  _BASE_SENSOR_DATA                                                         \
  /* Driver state.*/                                                        \
  KXTJ3_1057_state_t        state;                                          \
  /* Current configuration data.*/                                          \
  const KXTJ3_1057Config    *config;                                        \
  /* Accelerometer subsystem axes number.*/                                 \
  size_t                    accaxes;                                        \
  /* Slave address */                                                       \
  uint8_t                   sad;                                            \
  /* lowpower mode */                                                       \
  bool                      lowpower;

#if defined(KXTJ3_1057_EXTENDED_INTERFACE) || defined(__DOXYGEN__)
 #define _KXTJ3_1057_data                                                    \
   _KXTJ3_1057_base_data                                                     \
   float                     accsensitivity[KXTJ3_1057_ACC_NUMBER_OF_AXES];  \
   /* Accelerometer subsystem current bias .*/                               \
   float                     accbias[KXTJ3_1057_ACC_NUMBER_OF_AXES];         \
   /* Accelerometer subsystem current full scale value.*/                    \
   float                     accfullscale;
#else
 #define _KXTJ3_1057_data                                                    \
   _KXTJ3_1057_base_data
#endif

 /**
  * @brief KXTJ3_1057 6-axis accelerometer/compass class.
  */
 struct KXTJ3_1057Driver {
   /** @brief Virtual Methods Table.*/
#if KXTJ3_1057_EXTENDED_INTERFACE || defined(__DOXYGEN__)
   const struct KXTJ3_1057VMT  *vmt;
   /** @brief Base accelerometer interface.*/
   BaseAccelerometer           acc_if;
#endif
   _KXTJ3_1057_data
 };

 /** @} */

 /*===========================================================================*/
 /* Driver macros.                                                            */
 /*===========================================================================*/

#if KXTJ3_1057_EXTENDED_INTERFACE || defined(__DOXYGEN__)

/**
  * @brief   Return the number of axes of the BaseAccelerometer.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 *
 * @return              the number of axes.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerGetAxesNumber(devp)                          \
        accelerometerGetAxesNumber(&((devp)->acc_if))

/**
 * @brief   Retrieves raw data from the BaseAccelerometer.
 * @note    This data is retrieved from MEMS register without any algebraical
 *          manipulation.
 * @note    The axes array must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 * @param[out] axes     a buffer which would be filled with raw data.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    if one or more I2C errors occurred, the errors can
 *                      be retrieved using @p i2cGetErrors().
 * @retval MSG_TIMEOUT  if a timeout occurred before operation end.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerReadRaw(devp, axes)                          \
        accelerometerReadRaw(&((devp)->acc_if), axes)

/**
 * @brief   Retrieves cooked data from the BaseAccelerometer.
 * @note    This data is manipulated according to the formula
 *          cooked = (raw * sensitivity) - bias.
 * @note    Final data is expressed as milli-G.
 * @note    The axes array must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 * @param[out] axes     a buffer which would be filled with cooked data.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    if one or more I2C errors occurred, the errors can
 *                      be retrieved using @p i2cGetErrors().
 * @retval MSG_TIMEOUT  if a timeout occurred before operation end.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerReadCooked(devp, axes)                       \
        accelerometerReadCooked(&((devp)->acc_if), axes)

/**
 * @brief   Set bias values for the BaseAccelerometer.
 * @note    Bias must be expressed as milli-G.
 * @note    The bias buffer must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 * @param[in] bp        a buffer which contains biases.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerSetBias(devp, bp)                            \
        accelerometerSetBias(&((devp)->acc_if), bp)

/**
 * @brief   Reset bias values for the BaseAccelerometer.
 * @note    Default biases value are obtained from device datasheet when
 *          available otherwise they are considered zero.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerResetBias(devp)                              \
        accelerometerResetBias(&((devp)->acc_if))

/**
 * @brief   Set sensitivity values for the BaseAccelerometer.
 * @note    Sensitivity must be expressed as milli-G/LSB.
 * @note    The sensitivity buffer must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 * @param[in] sp        a buffer which contains sensitivities.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerSetSensitivity(devp, sp)                     \
        accelerometerSetSensitivity(&((devp)->acc_if), sp)

/**
 * @brief   Reset sensitivity values for the BaseAccelerometer.
 * @note    Default sensitivities value are obtained from device datasheet.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    otherwise.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerResetSensitivity(devp)                       \
        accelerometerResetSensitivity(&((devp)->acc_if))


#if KXTJ3_1057_USE_ADVANCED || defined(__DOXYGEN__)
/**
 * @brief   Changes the KXTJ3_1057Driver accelerometer fullscale value.
 * @note    This function also rescale sensitivities and biases based on
 *          previous and next fullscale value.
 * @note    A recalibration is highly suggested after calling this function.
 *
 * @param[in] devp      pointer to @p KXTJ3_1057Driver.
 * @param[in] fs        new fullscale value.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    otherwise.
 *
 * @api
 */
#define KXTJ3_1057AccelerometerSetFullScale(devp, fs)                       \
        (devp)->vmt->acc_set_full_scale(devp, fs)

 /**
  * @brief   Sets the KXTJ3_1057Driver accelerometer into selftest mode.
  * @note    This function sets the device into selftest mode
  *
  * @param[in] devp      pointer to @p KXTJ3_1057Driver interface.
  * @param[in] activate  true to activate, false to deactivate.
  *
  * @return              The operation status.
  * @retval MSG_OK       if the function succeeded.
  * @retval MSG_RESET    otherwise.
  *
  * @api
  */
#define KXTJ3_1057AccelerometerSetSelftest(devp, activate)                       \
        (devp)->vmt->acc_set_selftest(devp, activate)

#endif

#else
  msg_t KXTJ3_1057AccelerometerReadRaw(KXTJ3_1057Driver *devp, int32_t axes[]);
#endif

 /*===========================================================================*/
 /* External declarations.                                                    */
 /*===========================================================================*/

 #ifdef __cplusplus
 extern "C" {
 #endif
   void KXTJ3_1057ObjectInit(KXTJ3_1057Driver *devp);
   void KXTJ3_1057Start(KXTJ3_1057Driver *devp, const KXTJ3_1057Config *config);
   void KXTJ3_1057Stop(KXTJ3_1057Driver *devp);
 #ifdef __cplusplus
 }
 #endif

#endif /* KXTJ3_1057_DRV_H_ */
