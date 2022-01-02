"use strict";

class DeviceConfigBase {
  static DeviceConfigVersions = [];
  static _instance = null;

  static PwmFreqOptions = {
    off: 0,
    freq1Hz: 0x01,
    freq10Hz: 0x02,
    freq100Hz: 0x03,
    freq1kHz: 0x04,
    freq10kHz: 0x05,
  }
  // 1 for left, 2 for right, 0 for center wheel (no steering brake)
  static WheelDir = {
    center: 0,
    left: 1,
    right: 2
  }

  // which axis should be steeringbrake 0 = x, 1=y, 2=z
  static AccelControlAxis = {
    X: 0,
    Y: 1,
    Z: 2,
  }

  // how often we should log
  static LogPeriodicity = {
    Log_20ms: 0,
    Log_40ms: 1,
    Log_80ms: 2,
    Log_160ms: 3,
    Log_320ms: 4,
    Log_640ms: 5,
    Log_1280ms: 6,
    Log_2560ms: 7,
  }

  static instance() {
    if (!DeviceConfigBase._instance)
      DeviceConfigBase._instance =
        new DeviceConfigBase.DeviceConfigVersions[
            DeviceConfigBase.DeviceConfigVersions.length-1]();
    return DeviceConfigBase._instance;
  }

  /**
   * @brief callback from html onchange functions
   * @param key The key to change
   * @param vlu The value, is converted to correct data type implicitly
   */
  static changeVlu(key, vlu) {
    const instance = DeviceConfigBase.instance();
    if (typeof instance[key] === 'boolean') {
      instance[key] = Boolean(vlu);
    } else if (typeof instance[key] === 'number') {
      instance[key] = Number(vlu);
    }
  }

  header = {
    // which version of memory storage in EEPROM
    // version should be bumped on each ABI breaking change
    storageVersion: 0, /*uint16_t,*/
    // size of this settings storage in EEPROM (excluding 4bytes control)
    size: 0 /* uint16_t */
  };

  /**
   * @brief serialize data to a byte array to send via serial to device
   */
  serialize() {
    let buf = new Uint8Array(this.header.size + 4);
    buf[0] = (this.header.storageVersion & 0xFF00) >> 8;
    buf[1] = (this.header.storageVersion & 0xFF);
    buf[2] = (this.header.size & 0xFF00) >> 8;
    buf[3] = (this.header.size & 0xFF);

    return this._serialize(buf);
  }

  static deserialize(byteArr) {
    if (byteArr.length < 4)
      throw new Error("Can't deserialize, header malformed");

    let version = (byteArr[0] << 8) | byteArr[1];
    if (version > DeviceConfigBase.DeviceConfigVersions.length)
      throw new Error("Can't deserialize, device has a unsupported config version:" + version);

    const cls = DeviceConfigBase.DeviceConfigVersions.find(v=>{
      if ((new v()).header.storageVersion===version)
        return v;
    });
    if (!cls) throw new Error(`Can't deserialize version ${version}, not supported`);
    let instance = new cls();
    // read header
    instance.header.storageVersion = version;
    instance.header.size = (byteArr[2] << 8) | byteArr[3];
    // read in values for selected version
    instance._deserialize(byteArr);

    DeviceConfigBase._instance = instance;
  }
}

class DeviceConfig_v1 extends DeviceConfigBase {
  header = {
    storageVersion: 0x01,
    size: 16 - 4
  }

  // common
  // 0-100 value when brakes begin to activate
  lower_threshold = 0; /* uint8_t */

  // 0-100 value when brakes are at maximum
  upper_threshold = 0; /* uint8_t */

  // 0-100%  where 100% is full force, 0 is no brakes
  max_brake_force = 0; /* uint8_t */

  // how to try to influence steeringbrakes speed sensors should have 0-100
  ws_steering_brake_authority = 0; /* uint8_t */
  // how to try to influence steeringbrakes accelerometer should have 0-100
  acc_steering_brake_authority = 0; /* uint8_t */

  // reverse input low value becomes high,
  // more or less the same as inverting output in your transmitter
 reverse_input = false; /* uint8_t :1; */

  // 0=off, 1=on (requires wheelspeedsensors)
  ABS_active = false /*uint8_t :1;*/

  // outputs
  PwmFreq = DeviceConfigBase.PwmFreqOptions.freq10Hz;  /* uint16_t : 3; */// as in PwmFrequency_e
  Brake0_active = false; /*uint16_t : 1;*/
  Brake1_active = false; /*uint16_t : 1;*/
  Brake2_active = false; /*uint16_t : 1;*/
  Brake0_dir = DeviceConfigBase.WheelDir.center; /*uint16_t : 2; */ // if it is left, right or center used for steering brakes
  Brake1_dir = DeviceConfigBase.WheelDir.center; /*uint16_t : 2; */ // 1 for left, 2 for right, 0 for center wheel (no steering brake)
  Brake2_dir = DeviceConfigBase.WheelDir.center; /*uint16_t : 2; */ //

  // wheel speed inputs
  // how many pulses per revolution each wheel has, ie how many tooths
  // in your ABS tooth wheel, 0 deactivates
  WheelSensor0_pulses_per_rev = 0; /*uint8_t;*/
  WheelSensor1_pulses_per_rev = 0; /*uint8_t;*/
  WheelSensor2_pulses_per_rev = 0; /*uint8_t;*/

  // which axis should control steering brakes
  // 0 = x, 1=y, 2=z
  accelerometer_axis = DeviceConfigBase.AccelControlAxis.X; /* uint8_t: 2;*/ // 0 = x, 1=y, 2=z
  // accelerometer
  accelerometer_active = false/* uint8_t: 1; */
  // invert the input IE brake the other wheel
  accelerometer_axis_invert = false /*uint8_t: 1;*/
  // stop Log when wheel speed0
  dontLogWhenStill = true /* uint8_t : 1;*/
  // how often we should log
  logPeriodicity = 7 /*uint8_t : 3;*/

  _serialize(byteArr) {
    let byteVlu = 0;
    let idx = 4;
    byteArr[idx++] = this.lower_threshold;
    byteArr[idx++] = this.upper_threshold;
    byteArr[idx++] = this.max_brake_force;
    byteArr[idx++] = this.ws_steering_brake_authority;
    byteArr[idx++] = this.acc_steering_brake_authority;
    // bit field for 10th byte
    byteVlu  = (this.reverse_input ? 1 : 0) << 0;
    byteVlu |= (this.ABS_active ? 1 : 0) << 1;
    byteVlu |= (this.PwmFreq & 0x07) << 2;
    byteVlu |= (this.Brake0_active ? 1 : 0) << 5;
    byteVlu |= (this.Brake1_active ? 1 : 0) << 6;
    byteVlu |= (this.Brake2_active ? 1 : 0) << 7;
    byteArr[idx++] = byteVlu
    // bit field for 11th
    byteVlu  = (this.Brake0_dir & 0x03) << 0;
    byteVlu |= (this.Brake1_dir & 0x03) << 2;
    byteVlu |= (this.Brake2_dir & 0x03) << 4;
    byteVlu |= (this.accelerometer_axis & 0x03) << 6;
    byteArr[idx++] = byteVlu;
    // bit field byte 12th
    byteVlu  = (this.accelerometer_active ? 1 : 0) << 0;
    byteVlu |= (this.accelerometer_axis_invert ? 1 : 0) << 1;
    byteVlu |= (this.dontLogWhenStill ? 1 : 0) << 2;
    byteVlu |= (this.logPeriodicity & 0x07) << 3;
    byteArr[idx++] = byteVlu;
    // how many pulses each wheel has / 1 revolution
    byteArr[idx++] = this.WheelSensor0_pulses_per_rev;
    byteArr[idx++] = this.WheelSensor1_pulses_per_rev;
    byteArr[idx++] = this.WheelSensor2_pulses_per_rev;

    return byteArr;
  }

  _deserialize(byteArr) {
    let idx = 4;
    let byteVlu;
    this.lower_threshold = byteArr[idx++];
    this.upper_threshold = byteArr[idx++];
    this.max_brake_force = byteArr[idx++];
    this.ws_steering_brake_authority = byteArr[idx++];
    this.acc_steering_brake_authority = byteArr[idx++];
    // first bitfield byte
    byteVlu = byteArr[idx++];
    this.reverse_input = Boolean(byteVlu & 0x01);
    this.ABS_active = Boolean(byteVlu & 0x02);
    this.PwmFreq = (byteVlu & 0x1C) >> 3;
    this.Brake0_active = Boolean(byteVlu & 0x20);
    this.Brake1_active = Boolean(byteVlu & 0x40);
    this.Brake2_active = Boolean(byteVlu & 0x80);
    // next bitfield byte
    byteVlu = byteArr[idx++];
    this.Brake0_dir = (byteVlu & 0x03) >> 0;
    this.Brake1_dir = (byteVlu & 0x0C) >> 2;
    this.Brake2_dir = (byteVlu & 0x30) >> 4;
    this.accelerometer_axis = (byteVlu & 0xC0) >> 6;
    // bit field byte 3
    byteVlu = byteArr[idx++];
    this.accelerometer_active = Boolean(byteVlu & 0x01);
    this.accelerometer_axis_invert = Boolean(byteVlu & 0x02);
    this.dontLogWhenStill = Boolean(byteVlu & 0x04);
    this.logPeriodicity = (byteVlu & 0x38) >> 3;
    // wheelsensors
    this.WheelSensor0_pulses_per_rev = byteArr[idx++];
    this.WheelSensor1_pulses_per_rev = byteArr[idx++];
    this.WheelSensor2_pulses_per_rev = byteArr[idx++];
  }
}
DeviceConfigBase.DeviceConfigVersions.push(DeviceConfig_v1);
