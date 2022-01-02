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
#include <ch.h>
#include <hal.h>
#include <hal_usb.h>
#include "usbcfg.h"

/*
 * Endpoints to be used for USBD1.
 */
#define USBD1_DATA_REQUEST_EP           1U
#define USBD1_DATA_AVAILABLE_EP         1U
#define USBD1_INTERRUPT_REQUEST_EP      2U

// ----------------------------------------------------------------------
// private to this file
static usbpkg_t *rcvpkg, *sndpkg, rcvbuf;
static thread_reference_t waitThdp = NULL;

/**
 * @brief   Default data received callback.
 * @details The application must use this function as callback for the OUT
 *          data endpoint.
 *
 * @param[in] usbp      pointer to the @p USBDriver object
 * @param[in] ep        OUT endpoint number
 */
static void dataReceived(USBDriver *usbp, usbep_t ep) {
  if (rcvbuf.onefrm.len <= usbp->epc[ep]->out_state->rxcnt) {
    osalSysLockFromISR();

    if (waitThdp != NULL) {
      uint32_t *rcv32buf = (uint32_t*)rcvbuf.u8buf,
               *rcv32pkg = (uint32_t*)rcvpkg->u8buf;
      for(size_t i = 0; i < sizeof(rcvbuf.u8buf) / sizeof(*rcv32buf); ++i)
        rcv32pkg[i] = rcv32buf[i];
      chThdResumeI(&waitThdp, MSG_OK);
    }

    osalSysUnlockFromISR();
  }
}

/**
 * @brief   Default data transmitted callback.
 * @details The application must use this function as callback for the IN
 *          data endpoint.
 *
 * @param[in] usbp      pointer to the @p USBDriver object
 * @param[in] ep        IN endpoint number
 */
static void dataTransmitted(USBDriver *usbp, usbep_t ep) {
  (void)usbp;
  (void)ep;

  osalSysLockFromISR();

  if (waitThdp != NULL)
    chThdResumeI(&waitThdp, MSG_OK);

  osalSysUnlockFromISR();
}

/**
 * @brief   USB device configured handler.
 *
 * @param[in] sdup      pointer to a @p SerialUSBDriver object
 *
 * @iclass
 */
void configureHookI(void) {
  usbStartReceiveI(&USBD1, 1, rcvbuf.u8buf, sizeof(rcvbuf.u8buf));
}

/*
 * USB Device Descriptor.
 */
static const uint8_t usb_device_descriptor_data[18] = {
  USB_DESC_DEVICE       (0x0110,        /* bcdUSB (1.1).                    */
                         0xFF,          /* bDeviceClass (DEVICE).              */
                         0x00,          /* bDeviceSubClass.                 */
                         0x00,          /* bDeviceProtocol.                 */
                         0x40,          /* bMaxPacketSize.                  */
                         0x0483,        /* idVendor (ST).                   */
                         0x5722,        /* idProduct.                       */
                         0x0100,        /* bcdDevice.                       */
                         1,             /* iManufacturer.                   */
                         2,             /* iProduct.                        */
                         3,             /* iSerialNumber.                   */
                         1)             /* bNumConfigurations.              */
};

/*
 * Device Descriptor wrapper.
 */
static const USBDescriptor usb_device_descriptor = {
  sizeof usb_device_descriptor_data,
  usb_device_descriptor_data
};

///* Configuration Descriptor tree for a CDC.*/
//static const uint8_t usb_configuration_descriptor_data[67] = {
//  /* Configuration Descriptor.*/
//  USB_DESC_CONFIGURATION(67,            /* wTotalLength.                    */
//                         0x02,          /* bNumInterfaces.                  */
//                         0x01,          /* bConfigurationValue.             */
//                         0,             /* iConfiguration.                  */
//                         0xC0,          /* bmAttributes (self powered).     */
//                         50),           /* bMaxPower (100mA).               */
//  /* Interface Descriptor.*/
//  USB_DESC_INTERFACE    (0x00,          /* bInterfaceNumber.                */
//                         0x00,          /* bAlternateSetting.               */
//                         0x01,          /* bNumEndpoints.                   */
//                         0x02,          /* bInterfaceClass (Communications
//                                           Interface Class, CDC section
//                                           4.2).                            */
//                         0x02,          /* bInterfaceSubClass (Abstract
//                                         Control Model, CDC section 4.3).   */
//                         0x01,          /* bInterfaceProtocol (AT commands,
//                                           CDC section 4.4).                */
//                         0),            /* iInterface.                      */
//  /* Header Functional Descriptor (CDC section 5.2.3).*/
//  USB_DESC_BYTE         (5),            /* bLength.                         */
//  USB_DESC_BYTE         (0x24),         /* bDescriptorType (CS_INTERFACE).  */
//  USB_DESC_BYTE         (0x00),         /* bDescriptorSubtype (Header
//                                           Functional Descriptor.           */
//  USB_DESC_BCD          (0x0110),       /* bcdCDC.                          */
//  /* Call Management Functional Descriptor. */
//  USB_DESC_BYTE         (5),            /* bFunctionLength.                 */
//  USB_DESC_BYTE         (0x24),         /* bDescriptorType (CS_INTERFACE).  */
//  USB_DESC_BYTE         (0x01),         /* bDescriptorSubtype (Call Management
//                                           Functional Descriptor).          */
//  USB_DESC_BYTE         (0x00),         /* bmCapabilities (D0+D1).          */
//  USB_DESC_BYTE         (0x01),         /* bDataInterface.                  */
//  /* ACM Functional Descriptor.*/
//  USB_DESC_BYTE         (4),            /* bFunctionLength.                 */
//  USB_DESC_BYTE         (0x24),         /* bDescriptorType (CS_INTERFACE).  */
//  USB_DESC_BYTE         (0x02),         /* bDescriptorSubtype (Abstract
//                                           Control Management Descriptor).  */
//  USB_DESC_BYTE         (0x02),         /* bmCapabilities.                  */
//  /* Union Functional Descriptor.*/
//  USB_DESC_BYTE         (5),            /* bFunctionLength.                 */
//  USB_DESC_BYTE         (0x24),         /* bDescriptorType (CS_INTERFACE).  */
//  USB_DESC_BYTE         (0x06),         /* bDescriptorSubtype (Union
//                                           Functional Descriptor).          */
//  USB_DESC_BYTE         (0x00),         /* bMasterInterface (Communication
//                                           Class Interface).                */
//  USB_DESC_BYTE         (0x01),         /* bSlaveInterface0 (Data Class
//                                           Interface).                      */
//  /* Endpoint 2 Descriptor.*/
//  USB_DESC_ENDPOINT     (USBD1_INTERRUPT_REQUEST_EP|0x80,
//                         0x03,          /* bmAttributes (Interrupt).        */
//                         0x0008,        /* wMaxPacketSize.                  */
//                         0xFF),         /* bInterval.                       */
//  /* Interface Descriptor.*/
//  USB_DESC_INTERFACE    (0x01,          /* bInterfaceNumber.                */
//                         0x00,          /* bAlternateSetting.               */
//                         0x02,          /* bNumEndpoints.                   */
//                         0x0A,          /* bInterfaceClass (Data Class
//                                           Interface, CDC section 4.5).     */
//                         0x00,          /* bInterfaceSubClass (CDC section
//                                           4.6).                            */
//                         0x00,          /* bInterfaceProtocol (CDC section
//                                           4.7).                            */
//                         0x00),         /* iInterface.                      */
//  /* Endpoint 3 Descriptor.*/
//  USB_DESC_ENDPOINT     (USBD1_DATA_AVAILABLE_EP,       /* bEndpointAddress.*/
//                         0x02,          /* bmAttributes (Bulk).             */
//                         0x0040,        /* wMaxPacketSize.                  */
//                         0x00),         /* bInterval.                       */
//  /* Endpoint 1 Descriptor.*/
//  USB_DESC_ENDPOINT     (USBD1_DATA_REQUEST_EP|0x80,    /* bEndpointAddress.*/
//                         0x02,          /* bmAttributes (Bulk).             */
//                         0x0040,        /* wMaxPacketSize.                  */
//                         0x00)          /* bInterval.                       */
//};

/* Configuration Descriptor tree */
static const uint8_t usb_configuration_descriptor_data[32] = { // 32 bytes - only 1 interface
  /* Configuration Descriptor. 9 byte macro */
  USB_DESC_CONFIGURATION(32,            /* wTotalLength.                    */
                         0x01,          /* bNumInterfaces.                  */
                         0x01,          /* bConfigurationValue.             */
                         0,             /* iConfiguration.                  */
                         0xC0,          /* bmAttributes (self powered).     */
                         50),           /* bMaxPower (100mA).               */
   /* Interface Descriptor. 9 byte macro */
   USB_DESC_INTERFACE    (0x00,          /* bInterfaceNumber.                */
                          0x00,          /* bAlternateSetting.               */
                          0x02,          /* bNumEndpoints.                   */
                          0xFF,          /* bInterfaceClass                  */
                          0x00,          /* bInterfaceSubClass               */
                          0x50,          /* bInterfaceProtocol               */
                          0x00),         /* iInterface.                      */
   /* Endpoint 3 Descriptor. 7 byte macro */
   USB_DESC_ENDPOINT     (USBD1_DATA_AVAILABLE_EP,       /* bEndpointAddress. */
                          0x02,                          /* bmAttributes (BULK). */
                          wMaxPacketSize,//0x0040,                        /* wMaxPacketSize.  */
                          0),            /* bInterval. */
   /* Endpoint 1 Descriptor.*/
   USB_DESC_ENDPOINT     (USBD1_DATA_REQUEST_EP|0x80,    /* bEndpointAddress.*/
                          0x02,                          /* bmAttributes (BULK).             */
                          wMaxPacketSize, //0x0040, // 0x3C for 60         /* wMaxPacketSize.                  */
                          0)             /* bInterval. In STM32F407 there's USB 2.0 Full Speed, so Interval is in [ms]. */
};

/*
 * Configuration Descriptor wrapper.
 */
static const USBDescriptor usb_configuration_descriptor = {
  sizeof usb_configuration_descriptor_data,
  usb_configuration_descriptor_data
};

/*
 * U.S. English language identifier.
 */
static const uint8_t usb_string0[] = {
  USB_DESC_BYTE(4),                     /* bLength.                         */
  USB_DESC_BYTE(USB_DESCRIPTOR_STRING), /* bDescriptorType.                 */
  USB_DESC_WORD(0x0409)                 /* wLANGID (U.S. English).          */
};

/*
 * Vendor string.
 */
static const uint8_t usb_string1[] = {
  USB_DESC_BYTE(38),                    /* bLength.                         */
  USB_DESC_BYTE(USB_DESCRIPTOR_STRING), /* bDescriptorType.                 */
  'S', 0, 'T', 0, 'M', 0, 'i', 0, 'c', 0, 'r', 0, 'o', 0, 'e', 0,
  'l', 0, 'e', 0, 'c', 0, 't', 0, 'r', 0, 'o', 0, 'n', 0, 'i', 0,
  'c', 0, 's', 0
};

/*
 * Device Description string.
 */
static const uint8_t usb_string2[] = {
  USB_DESC_BYTE(46),                    /* bLength.                         */
  USB_DESC_BYTE(USB_DESCRIPTOR_STRING), /* bDescriptorType.                 */
  'L', 0, 'a', 0, 'n', 0, 'd', 0, 'i', 0, 'n', 0, 'g', 0, 'g', 0,
  'e', 0, 'a', 0, 'r', 0, ' ', 0, 'b', 0, 'r', 0, 'a', 0, 'k', 0,
  'e', 0, 's', 0, ' ', 0, 'U', 0, 'S', 0, 'B', 0
};

/*
 * Serial Number string.
 */
static const uint8_t usb_string3[] = {
  USB_DESC_BYTE(8),                     /* bLength.                         */
  USB_DESC_BYTE(USB_DESCRIPTOR_STRING), /* bDescriptorType.                 */
  '0' + CH_KERNEL_MAJOR, 0,
  '0' + CH_KERNEL_MINOR, 0,
  '0' + CH_KERNEL_PATCH, 0
};

/*
 * Strings wrappers array.
 */
static const USBDescriptor usb_strings[] = {
  {sizeof usb_string0, usb_string0},
  {sizeof usb_string1, usb_string1},
  {sizeof usb_string2, usb_string2},
  {sizeof usb_string3, usb_string3}
};

/*
 * Handles the GET_DESCRIPTOR callback. All required descriptors must be
 * handled here.
 */
static const USBDescriptor *get_descriptor(USBDriver *usbp,
                                           uint8_t dtype,
                                           uint8_t dindex,
                                           uint16_t lang) {

  (void)usbp;
  (void)lang;
  switch (dtype) {
  case USB_DESCRIPTOR_DEVICE:
    return &usb_device_descriptor;
  case USB_DESCRIPTOR_CONFIGURATION:
    return &usb_configuration_descriptor;
  case USB_DESCRIPTOR_STRING:
    if (dindex < sizeof(usb_strings) / sizeof(usb_strings[0]))
      return &usb_strings[dindex];
    break;
  case USB_DESCRIPTOR_INTERFACE:
    return (USBDescriptor*)&usb_configuration_descriptor_data[usb_configuration_descriptor_data[0]];
  }
  return NULL;
}

/**
 * @brief   IN EP1 state.
 */
static USBInEndpointState ep1instate;

/**
 * @brief   OUT EP1 state.
 */
static USBOutEndpointState ep1outstate;

/**
 * @brief   EP1 initialization structure (both IN and OUT).
 */
static const USBEndpointConfig ep1config = {
  USB_EP_MODE_TYPE_BULK,
  NULL,
  dataTransmitted,
  dataReceived,
  0x0040,
  0x0040,
  &ep1instate,
  &ep1outstate,
  1,
  NULL
};

/*
 * Handles the USB driver global events.
 */
static void usb_event(USBDriver *usbp, usbevent_t event) {
  //extern SerialUSBDriver SDU1;

  switch (event) {
  case USB_EVENT_ADDRESS:
    return;
  case USB_EVENT_CONFIGURED:
    chSysLockFromISR();

    /* Enables the endpoints specified into the configuration.
       Note, this callback is invoked from an ISR so I-Class functions
       must be used.*/
    usbInitEndpointI(usbp, USBD1_DATA_REQUEST_EP, &ep1config);

    configureHookI();

    chSysUnlockFromISR();
    return;
  case USB_EVENT_RESET:
    /* Falls into.*/
  case USB_EVENT_UNCONFIGURED:
    /* Falls into.*/
  case USB_EVENT_SUSPEND:
    chSysLockFromISR();

    /* Disconnection event on suspend.*/
    //sduSuspendHookI(&SDU1);

    chSysUnlockFromISR();
    return;
  case USB_EVENT_WAKEUP:
    chSysLockFromISR();

    /* Connection event on wakeup.*/
    //sduWakeupHookI(&SDU1);

    chSysUnlockFromISR();
    return;
  case USB_EVENT_STALLED:
    return;
  }
  return;
}

/*
 * USB driver configuration.
 */
const USBConfig usbcfg = {
  usb_event,
  get_descriptor,
  NULL, //sduRequestsHook,
  NULL
};

msg_t usbWaitRecieve(usbpkg_t *pkg) {
  msg_t msg;

  osalSysLock();

  if (usbGetDriverStateI(&USBD1) != USB_ACTIVE) {
    osalSysUnlock();
    return MSG_RESET;
  }

  rcvpkg = pkg;
  msg = osalThreadSuspendS(&waitThdp);
  osalSysUnlock();

  return msg;
}

msg_t usbWaitTransmit(usbpkg_t *pkg) {
  msg_t msg;

  osalSysLock();

  if (usbGetDriverStateI(&USBD1) != USB_ACTIVE) {
    osalSysUnlock();
    return MSG_RESET;
  }

  sndpkg = pkg;
  usbStartTransmitI(&USBD1, 1, pkg->u8buf, pkg->onefrm.len);
  msg = osalThreadSuspendS(&waitThdp);
  osalSysUnlock();

  return msg;
}
