/*
 * kxtj3_1157_drv.c
 *
 *  Created on: 6 aug. 2021
 *      Author: fredrikjohansson
 */

// this module implements a driver for the accelerometer KXTJ3_1157

// based of driver for kxtj3_1157 in os/ex/ST dir

#include <ch.h>
#include <hal.h>
#include "kxtj3_1157.h"

#define HAS_INTERRUPT(config)                               \
  (config->wakeupdatafreq != KXTJ3_1157_wakeup_datarate_OFF)

#define IS_8BIT_MODE(devp)                                  \
  (devp->lowpower)

#define IS_12BIT_MODE(devp)                                 \
  (!devp->lowpower &&                                       \
    devp->accfullscale != KXTJ3_1157_gselection_8G &&       \
    devp->accfullscale != KXTJ3_1157_gselection_16G)

#define IS_14BIT_MODE(devp)                                 \
  (!devp->lowpower && !IS_12BIT_MODE(devp))

#define VLU_BIT_SHIFT_CNT(devp)                             \
  IS_14BIT_MODE(devp) ? 2 : IS_8BIT_MODE(devp) ? 8 : 4

/*===========================================================================*/
/* Driver local definitions.                                                 */
/*===========================================================================*/

/*===========================================================================*/
/* Driver exported variables.                                                */
/*===========================================================================*/

/*===========================================================================*/
/* Driver local variables and types.                                         */
/*===========================================================================*/


/*===========================================================================*/
/* Driver local functions.                                                   */
/*===========================================================================*/

/**
 * @brief  Gets the GSEL (G-selection) bits based on config
 *         Can differ if we are at lowpower mode
 */
uint8_t kxtj3_1157GSelbits(bool lowpower, kxtj3_1157_gselection_t gsel)
{
  if (!lowpower) {
    if (gsel == KXTJ3_1157_gselection_8G)
      return KXTJ3_1157_GSEL_8G_14bit;
    else if (gsel == KXTJ3_1157_gselection_16G)
      return KXTJ3_1157_GSEL_16G_14bit;
  }
  return gsel;
}

/**
 * @brief builds the CTRL_REG1 register based on driver and config
 */
void kxtj3_1157BuildReg1(KXTJ3_1157Driver *devp,
                         uint8_t *cr, bool on)
{
  cr[0] = KXTJ3_1157_CTRL_REG1;
  cr[1] = on ? KXTJ3_1157_CTRL_REG1_PC1 : 0;
  cr[1] |= KXTJ3_1157_CTRL_REG1_GSEL(
             kxtj3_1157GSelbits(devp->lowpower,
                                devp->config->accfullscale));
  if (!devp->lowpower)
    cr[1] |= KXTJ3_1157_CTRL_REG1_RES;
  if (HAS_INTERRUPT(devp->config))
    cr[1] |= KXTJ3_1157_CTRL_REG1_DRDYE | KXTJ3_1157_CTRL_REG1_WUFE;
}


/**
 * @brief   Reads registers value using I2C.
 * @pre     The I2C interface must be initialized and the driver started.
 * @note    IF_ADD_INC bit must be 1 in CTRL_REG8.
 *
 * @param[in] i2cp       pointer to the I2C interface.
 * @param[in] sad        slave address without R bit.
 * @param[in] reg        first sub-register address.
 * @param[in] rxbuf      receiving buffer.
 * @param[in] n          size of rxbuf.
 * @return               the operation status.
 */
static msg_t kxtj3_1157I2CReadRegister(I2CDriver *i2cp, uint8_t sad,
                                       uint8_t reg, uint8_t *rxbuf, size_t n) {

  uint8_t txbuf = reg | KXTJ3_1157_MS;
  return i2cMasterTransmitTimeout(i2cp, sad, &txbuf, 1, rxbuf, n,
                                  TIME_INFINITE);
}

/**
 * @brief   Writes a value into a register using I2C.
 * @pre     The I2C interface must be initialized and the driver started.
 *
 * @param[in] i2cp      pointer to the I2C interface.
 * @param[in] sad       slave address without R bit.
 * @param[in] txbuf     buffer containing sub-address value in first position
 *                      and values to write.
 * @param[in] n         size of txbuf less one (not considering the first
 *                      element).
 * @return              the operation status.
 */
static msg_t kxtj3_1157I2CWriteRegister(I2CDriver *i2cp, uint8_t sad,
                                        uint8_t *txbuf, size_t n) {
  if (n != 1)
    *txbuf |= KXTJ3_1157_MS;
  return i2cMasterTransmitTimeout(i2cp, sad, txbuf, n + 1, NULL, 0,
                                  TIME_INFINITE);
}


#if defined(EX_ACCELEROMETER_INTERFACE) || defined(__DOXYGEN__)

/**
 * @brief   Return the number of axes of the BaseAccelerometer.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 *
 * @return              the number of axes.
 */
static size_t acc_get_axes_number(void *ip) {
  (void)ip;

  return KXTJ3_1157_ACC_NUMBER_OF_AXES;
}

#endif

/**
 * @brief   Retrieves raw data from the BaseAccelerometer.
 * @note    This data is retrieved from MEMS register without any algebraical
 *          manipulation.
 * @note    The axes array must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 * @param[out] axes     a buffer which would be filled with raw data.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    if one or more I2C errors occurred, the errors can
 *                      be retrieved using @p i2cGetErrors().
 * @retval MSG_TIMEOUT  if a timeout occurred before operation end.
 */

#if defined(EX_ACCELEROMETER_INTERFACE) || defined(__DOXYGEN__)
 static msg_t acc_read_raw(void *ip, int32_t axes[]) {
  KXTJ3_1157Driver* devp;
  osalDbgCheck((ip != NULL) && (axes != NULL));

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);
#else
 msg_t kxtj3_1157AccelerometerReadRaw(KXTJ3_1157Driver *devp, int32_t axes[]) {
#endif

  uint8_t buff [KXTJ3_1157_ACC_NUMBER_OF_AXES * 2], i;
  int16_t tmp;
  msg_t msg;

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_read_raw(), invalid state");
  osalDbgAssert((devp->config->i2cp->state == I2C_READY),
                "acc_read_raw(), channel not ready");

#if KXTJ3_1157_SHARED_I2C
  i2cAcquireBus(devp->config->i2cp);
  i2cStart(devp->config->i2cp,
           devp->config->i2ccfg);
#endif /* KXTJ3_1157_SHARED_I2C */

  msg = kxtj3_1157I2CReadRegister(devp->config->i2cp, devp->sad,
                                  KXTJ3_1157_XOUT_L, buff,
                                  KXTJ3_1157_ACC_NUMBER_OF_AXES * 2);

#if KXTJ3_1157_SHARED_I2C
  i2cReleaseBus(devp->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */

  if(msg == MSG_OK) {
    uint32_t shft = VLU_BIT_SHIFT_CNT(devp);
    for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++) {
      tmp = buff[2 * i] + (buff[2 * i + 1] << 8);
      axes[i] = (int32_t)(tmp >> shft);
    }
  }
  return msg;
}

#if defined(EX_ACCELEROMETER_INTERFACE) || defined(__DOXYGEN__)

/**
 * @brief   Retrieves cooked data from the BaseAccelerometer.
 * @note    This data is manipulated according to the formula
 *          cooked = (raw * sensitivity) - bias.
 * @note    Final data is expressed as milli-G.
 * @note    The axes array must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 * @param[out] axes     a buffer which would be filled with cooked data.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    if one or more I2C errors occurred, the errors can
 *                      be retrieved using @p i2cGetErrors().
 * @retval MSG_TIMEOUT  if a timeout occurred before operation end.
 */
static msg_t acc_read_cooked(void *ip, float axes[]) {
  KXTJ3_1157Driver* devp;
  uint32_t i;
  int32_t raw[KXTJ3_1157_ACC_NUMBER_OF_AXES];
  msg_t msg;

  osalDbgCheck((ip != NULL) && (axes != NULL));

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_read_cooked(), invalid state");

  msg = acc_read_raw(ip, raw);
  for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++) {
    axes[i] = (raw[i] * devp->accsensitivity[i]) - devp->accbias[i];
  }
  return msg;
}

/**
 * @brief   Set bias values for the BaseAccelerometer.
 * @note    Bias must be expressed as milli-G.
 * @note    The bias buffer must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 * @param[in] bp        a buffer which contains biases.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 */
static msg_t acc_set_bias(void *ip, float *bp) {
  KXTJ3_1157Driver* devp;
  uint32_t i;
  msg_t msg = MSG_OK;

  osalDbgCheck((ip != NULL) && (bp != NULL));

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_set_bias(), invalid state");

  for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++) {
    devp->accbias[i] = bp[i];
  }
  return msg;
}

/**
 * @brief   Reset bias values for the BaseAccelerometer.
 * @note    Default biases value are obtained from device datasheet when
 *          available otherwise they are considered zero.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 */
static msg_t acc_reset_bias(void *ip) {
  KXTJ3_1157Driver* devp;
  uint32_t i;
  msg_t msg = MSG_OK;

  osalDbgCheck(ip != NULL);

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_reset_bias(), invalid state");

  for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++)
    devp->accbias[i] = KXTJ3_1157_ACC_BIAS;
  return msg;
}

/**
 * @brief   Set sensitivity values for the BaseAccelerometer.
 * @note    Sensitivity must be expressed as milli-G/LSB.
 * @note    The sensitivity buffer must be at least the same size of the
 *          BaseAccelerometer axes number.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 * @param[in] sp        a buffer which contains sensitivities.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 */
static msg_t acc_set_sensivity(void *ip, float *sp) {
  KXTJ3_1157Driver* devp;
  uint32_t i;
  msg_t msg = MSG_OK;

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);

  osalDbgCheck((ip != NULL) && (sp != NULL));

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_set_sensivity(), invalid state");

  for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++) {
    devp->accsensitivity[i] = sp[i];
  }
  return msg;
}

/**
 * @brief   Reset sensitivity values for the BaseAccelerometer.
 * @note    Default sensitivities value are obtained from device datasheet.
 *
 * @param[in] ip        pointer to @p BaseAccelerometer interface.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    otherwise.
 */
static msg_t acc_reset_sensivity(void *ip) {
  KXTJ3_1157Driver* devp;
  uint32_t i;

  osalDbgCheck(ip != NULL);

  /* Getting parent instance pointer.*/
  devp = objGetInstance(KXTJ3_1157Driver*, (BaseAccelerometer*)ip);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_reset_sensivity(), invalid state");

  float sensitivity;

  switch (devp->config->accfullscale) {
  case KXTJ3_1157_gselection_2G:
    sensitivity = KXTJ3_1157_ACC_SENS_2G; break;
  case KXTJ3_1157_gselection_4G:
    sensitivity = KXTJ3_1157_ACC_SENS_4G; break;
  case KXTJ3_1157_gselection_8G:
    sensitivity = KXTJ3_1157_ACC_SENS_8G; break;
  case KXTJ3_1157_gselection_16G:
    sensitivity = KXTJ3_1157_ACC_SENS_16G; break;
  default:
    osalDbgAssert(FALSE, "acc_reset_sensivity(), accelerometer full scale issue");
    return MSG_RESET;
  }

  for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++)
    devp->accsensitivity[i] = sensitivity;

  return MSG_OK;
}

#if KXTJ3_1157_USE_ADVANCED || defined(__DOXYGEN__)

/**
 * @brief   Changes the KXTJ3_1157Driver accelerometer fullscale value.
 * @note    This function also rescale sensitivities and biases based on
 *          previous and next fullscale value.
 * @note    A recalibration is highly suggested after calling this function.
 *
 * @param[in] devp      pointer to @p KXTJ3_1157Driver interface.
 * @param[in] fs        new fullscale value.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    otherwise.
 */
static msg_t acc_set_full_scale(KXTJ3_1157Driver *devp,
                                kxtj3_1157_gselection_t gsel) {
  float newfs, scale;
  uint8_t i, buff[2];
  msg_t msg;

  osalDbgCheck(devp != NULL);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_set_full_scale(), invalid state");
  osalDbgAssert((devp->config->i2cp->state == I2C_READY),
                "acc_set_full_scale(), channel not ready");

  /* Computing new fullscale value.*/
  switch (gsel) {
  case KXTJ3_1157_gselection_2G:
    newfs = KXTJ3_1157_ACC_2G; break;
  case KXTJ3_1157_gselection_4G:
    newfs = KXTJ3_1157_ACC_4G; break;
  case KXTJ3_1157_gselection_8G:
    newfs = KXTJ3_1157_ACC_8G; break;
  case KXTJ3_1157_gselection_16G:
    newfs = KXTJ3_1157_ACC_16G; break;
  default:
    msg = MSG_RESET;
    return msg;
  }

  if(newfs != devp->accfullscale) {
    /* Computing scale value.*/
    scale = newfs / devp->accfullscale;
    devp->accfullscale = newfs;

#if KXTJ3_1157_SHARED_I2C
        i2cAcquireBus(devp->config->i2cp);
        i2cStart(devp->config->i2cp,
                         devp->config->i2ccfg);
#endif /* KXTJ3_1157_SHARED_I2C */

    /* Updating register.*/
    kxtj3_1157BuildReg1(devp, buff, true);
    msg = kxtj3_1157I2CWriteRegister(devp->config->i2cp,
                                   devp->sad,
                                   buff, 1);

#if KXTJ3_1157_SHARED_I2C
        i2cReleaseBus(devp->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */

    if(msg != MSG_OK)
      return msg;


    /* Scaling sensitivity and bias. Re-calibration is suggested anyway.*/
    for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++) {
      devp->accsensitivity[i] *= scale;
      devp->accbias[i] *= scale;
    }
  }
  return msg;
}

/**
 * @brief   Sets the KXTJ3_1157Driver accelerometer into selftest mode.
 * @note    This function also rescale sensitivities and biases based on
 *          previous and next fullscale value.
 *
 * @param[in] devp      pointer to @p KXTJ3_1157Driver interface.
 * @param[in] activate  true to activate, false to deactivate.
 *
 * @return              The operation status.
 * @retval MSG_OK       if the function succeeded.
 * @retval MSG_RESET    otherwise.
 */
static msg_t acc_set_selftest(KXTJ3_1157Driver *devp,
                                bool activate)
{
  uint8_t cr[2];
  msg_t msg;

  osalDbgCheck(devp != NULL);

  osalDbgAssert((devp->state == KXTJ3_1157_READY),
                "acc_set_selftest(), invalid state");
  osalDbgAssert((devp->config->i2cp->state == I2C_READY),
                "acc_set_selftest(), channel not ready");

  // first stop device;
  kxtj3_1157BuildReg1(devp, cr, false);

#if KXTJ3_1157_SHARED_I2C
  i2cAcquireBus(devp->config->i2cp);
  i2cStart(devp->config->i2cp,
                   devp->config->i2ccfg);
#endif /* KXTJ3_1157_SHARED_I2C */

  /* Updating register.*/
  msg = kxtj3_1157I2CWriteRegister(devp->config->i2cp,
                                   devp->sad, cr, 1);
  if (msg != MSG_OK)
    return msg;

  cr[0] = KXTJ3_1157_SELF_TEST;
  cr[1] = activate ? 0xCA : 0;
  msg = kxtj3_1157I2CWriteRegister(devp->config->i2cp,
                                   devp->sad, cr, 1);
  if (msg != MSG_OK)
    return msg;

  // start the device again
  kxtj3_1157BuildReg1(devp, cr, true);
  msg = kxtj3_1157I2CWriteRegister(devp->config->i2cp,
                                   devp->sad, cr, 1);

#if KXTJ3_1157_SHARED_I2C
  i2cReleaseBus(devp->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */

return msg;
}
#endif


static const struct KXTJ3_1157VMT vmt_device = {
  (size_t)0,
#if KXTJ3_1157_USE_ADVANCED
  acc_set_full_scale,
  acc_set_selftest
#endif
};

static const struct BaseAccelerometerVMT vmt_accelerometer = {
  sizeof(struct KXTJ3_1157VMT*),
  acc_get_axes_number, acc_read_raw, acc_read_cooked,
  acc_set_bias, acc_reset_bias, acc_set_sensivity, acc_reset_sensivity
};
#endif

/*===========================================================================*/
/* Driver exported functions.                                                */
/*===========================================================================*/

/**
 * @brief   Initializes an instance.
 *
 * @param[out] devp     pointer to the @p KXTJ3_1157Driver object
 *
 * @init
 */
void kxtj3_1157ObjectInit(KXTJ3_1157Driver *devp) {

#if defined(EX_ACCELEROMETER_INTERFACE) || defined(__DOXYGEN__)
  devp->vmt = &vmt_device;
  devp->acc_if.vmt = &vmt_accelerometer;
#endif

  devp->config = NULL;

  devp->accaxes = KXTJ3_1157_ACC_NUMBER_OF_AXES;

  devp->state = KXTJ3_1157_STOP;

  devp->sad = KXTJ3_1157_SLAVE_ADDR;

  devp->lowpower = false;
}

/**
 * @brief   Configures and activates KXTJ3_1157 Complex Driver peripheral.
 *
 * @param[in] devp      pointer to the @p KXTJ3_1157Driver object
 * @param[in] config    pointer to the @p KXTJ3_1157Config object
 *
 * @api
 */
void kxtj3_1157Start(KXTJ3_1157Driver *devp, const KXTJ3_1157Config *config) {
  uint32_t i;
  uint8_t cr[6];

  osalDbgCheck((devp != NULL) && (config != NULL));

  osalDbgAssert((devp->state == KXTJ3_1157_STOP) ||
                (devp->state == KXTJ3_1157_READY),
                "kxtj3_1157Start(), invalid state");

  devp->config = config;
  if (config->highAddress)
    devp->sad = KXTJ3_1157_SLAVE_ADDR_HIGH;

  if (config->lowpowermode) {
    devp->lowpower =
        (config->accfullscale < KXTJ3_1157_GSEL_8G_14bit &&
        config->dataoutfreq <= KXTJ3_1157_datarate_200Hz);
  }


  /* Configuring Accelerometer subsystem.
   * We must set CTRL_REG1 after other registers
   **/

  /* Multiple write starting address.*/
  cr[0] = KXTJ3_1157_CTRL_REG2;

  /* Control register 2 configuration block.*/
  cr[1] = KXTJ3_1157_CTRL_REG2_OWUF(config->dataoutfreq);

  /* Interrupt control register 1*/
  cr[2] = HAS_INTERRUPT(config) ?
            KXTJ3_1157_INT_CTRL_REG1_IEN |
                KXTJ3_1157_INT_CTRL_REG1_IEA :
            0;

  /*  Interrupt control register 2.*/
  cr[3] = KXTJ3_1157_INT_CTRL_REG2_XWUE(config->motion_interrupt.x)
         |KXTJ3_1157_INT_CTRL_REG2_YWUE(config->motion_interrupt.y)
         |KXTJ3_1157_INT_CTRL_REG2_ZWUE(config->motion_interrupt.z);
  if (cr[3] > 0)
    cr[3] |= KXTJ3_1157_INT_CTRL_REG2_ULMODE; // pulse interruptpin


#if KXTJ3_1157_SHARED_I2C
  i2cAcquireBus((devp)->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */
  i2cStart((devp)->config->i2cp, (devp)->config->i2ccfg);

  kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 3);

  // DATA_CTRL register, not in line with previous registers
  cr[0] = KXTJ3_1157_DATA_CTRL_REG;
  cr[1] = KXTJ3_1157_DATA_CTRL_ODR(config->dataoutfreq);
  kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 1);

  if (config->wakeupthreshold > 0) {
    cr[0] = KXTJ3_1157_WAKEUP_THRESHOLD_H;
    uint16_t threshold = config->wakeupthreshold << 4;
    cr[1] = (threshold & 0xFF00) >> 8;
    cr[2] = (threshold & 0x00F0);
    kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 2);
  }

  // CTRL_REG1 after other config registers
  kxtj3_1157BuildReg1(devp, cr, true);
  kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 1);

#if KXTJ3_1157_SHARED_I2C
  i2cReleaseBus((devp)->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */

  /* Storing sensitivity according to user settings */
  float sensitivity;

  switch (config->accfullscale) {
  case KXTJ3_1157_gselection_2G:
    sensitivity = KXTJ3_1157_ACC_SENS_2G; break;
  case KXTJ3_1157_gselection_4G:
    sensitivity = KXTJ3_1157_ACC_SENS_4G; break;
  case KXTJ3_1157_gselection_8G:
    sensitivity = KXTJ3_1157_ACC_SENS_8G; break;
  case KXTJ3_1157_gselection_16G:
    sensitivity = KXTJ3_1157_ACC_SENS_16G; break;
  default:
    osalDbgAssert(FALSE, "lsm303dlhcStart(), accelerometer full scale issue");
  }

   devp->accfullscale = config->accfullscale;

   for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; ++i) {
     if(devp->config->accsensitivity == NULL)
       devp->accsensitivity[i] = sensitivity;
     else
       devp->accsensitivity[i] = devp->config->accsensitivity[i];
   }

   /* Storing bias information */
   if(devp->config->accbias != NULL)
     for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++)
       devp->accbias[i] = devp->config->accbias[i];
   else
     for(i = 0; i < KXTJ3_1157_ACC_NUMBER_OF_AXES; i++)
       devp->accbias[i] = KXTJ3_1157_ACC_BIAS;



  /* This is the MEMS transient recovery time */
  osalThreadSleepMilliseconds(5);

  devp->state = KXTJ3_1157_READY;
}

/**
 * @brief   Deactivates the KXTJ3_1157 Complex Driver peripheral.
 *
 * @param[in] devp       pointer to the @p KXTJ3_1157Driver object
 *
 * @api
 */
void kxtj3_1157Stop(KXTJ3_1157Driver *devp) {
  uint8_t cr[4];
  osalDbgCheck(devp != NULL);

  osalDbgAssert((devp->state == KXTJ3_1157_STOP) ||
                (devp->state == KXTJ3_1157_READY),
                "kxtj3_1157Stop(), invalid state");

  if (devp->state == KXTJ3_1157_READY) {
#if KXTJ3_1157_SHARED_I2C
    i2cAcquireBus((devp)->config->i2cp);
    i2cStart((devp)->config->i2cp, (devp)->config->i2ccfg);
#endif /* KXTJ3_1157_SHARED_I2C */

    /* Disabling accelerometer. */
    cr[0] = KXTJ3_1157_CTRL_REG1; // REG1 and REG2 are not adjasent
    cr[1] = 0; // CTRL_REG1
    kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 1);

    cr[0] = KXTJ3_1157_CTRL_REG2;
    cr[1] = 0; // CTRL_REG2
    cr[2] = 0; // INT_CTRL_REG1
    cr[3] = KXTJ3_1157_INT_CTRL_REG1_IEA; // INT_CTRL_REG2, reset value of device
    kxtj3_1157I2CWriteRegister(devp->config->i2cp, devp->sad, cr, 3);


    i2cStop((devp)->config->i2cp);
#if KXTJ3_1157_SHARED_I2C
    i2cReleaseBus((devp)->config->i2cp);
#endif /* KXTJ3_1157_SHARED_I2C */
  }
  devp->state = KXTJ3_1157_STOP;
}
/** @} */

