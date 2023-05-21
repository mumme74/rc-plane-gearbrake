// diag packages for RC-gearbrake

function asInt8(vlu) {
  if (vlu & 0x08) vlu = ((~vlu & 0xFF) + 1) * -1;
  return vlu;
}

function asInt16(vlu) {
  if (vlu & 0x8000) vlu = ((~vlu & 0xFFFF) + 1) * -1;
  return vlu
}

function fromBigEnd16(buf) {
  return (buf[0] << 8) |
         (buf[1] << 0);
}

function fromBigEnd32(buf) {
  return (buf[0] << 24) |
         (buf[1] << 16) |
         (buf[2] << 8) |
         (buf[0] << 0);
}

function toBigEnd16(num) {
  return [
    (num & 0xff00) >> 8,
    (num & 0x00ff) >> 0
  ];
}

function toBigEnd32(num) {
  return [
    (num & 0xff000000) >> 24,
    (num & 0x00ff0000) >> 16,
    (num & 0x0000ff00) >> 8
    (num & 0x000000ff) >> 0
  ];
}

const CommsCmdType_e = {
  commsCmd_Error                 : 0x00,
  commsCmd_Ping                  : 0x01,
  commsCmd_Pong                  : 0x02,
  commsCmd_Reset                 : 0x03,

  commsCmd_SettingsSetDefault    : 0x07,
  commsCmd_SettingsSaveAll       : 0x08,
  commsCmd_SettingsGetAll        : 0x09,

  commsCmd_LogGetAll             : 0x10,
  commsCmd_LogNextAddr           : 0x11,
  commsCmd_LogClearAll           : 0x12,

  commsCmd_DiagReadAll           : 0x18,
  commsCmd_DiagSetVlu            : 0x19,
  commsCmd_DiagClearVlu          : 0x1A,

  commsCmd_version               : 0x20,
  commsCmd_fwHash                : 0x21,
  commsCmd_OK                    : 0x7F,
};
module.exports.CommsCmdType_e = CommsCmdType_e;

class usbpkg_t {
  u8buf = [];
  len = -1;
  cmd = -1;
  static parse(data) {
    if (data.length < data[0])
      return false;
    const pkg = new usbpkg_t();
    pkg.u8buf.push(...data);
    pkg.len = data[0];
    pkg.cmd = data[1];
    pkg.reqId = data[2];
    return pkg;
  }

  onefrm() {
    return {
      len: this.u8buf[0],
      cmd: this.u8buf[1],
      reqId: this.u8buf[2],
      data: this.u8buf.slice(3)
    };
  }

  headerfrm() {
    return {
      len: this.u8buf[0],
      cmd: this.u8buf[1],
      reqId: this.u8buf[2],
      pkgNr: fromBigEnd16(this.u8buf.slice(2,3)),
      totalSize: fromBigEnd32(this.u8buf.slice(4,7)),
      logNextAddress: fromBigEnd32(this.u8buf.slice(8,11)),
    };
  }

  datafrm() {
    return {
      len: this.u8buf[0],
      cmd: this.u8buf[1],
      reqId: this.u8buf[2],
      pkgNr: fromBigEnd16(this.u8buf.slice(3,4)),
      data: this.u8buf.slice(5)
    }
  }
}

// initialize talklayer
let port;
function initComms(serialPort) {
  port = serialPort;
  return onRecieve;
}
module.exports.initComms = initComms;

// when we recieve data from RC-gearbrake board
function onRecieve(data) {
  const pkg = usbpkg_t.parse(data);
  if (pkg === false) return;

  const idx = promises.findIndex(p=>p.reqId===pkg.reqId);
  const prom = promises.splice(idx, 1)[0];
  if (!prom)
    return;

  clearTimeout(prom.tmr);

  const resolve = (data) =>prom.resolve(data),
        reject = (data) =>prom.reject(data);

  if (prom.returnRaw)
    return resolve(pkg);

  switch (pkg.cmd) {
  case CommsCmdType_e.commsCmd_OK:
    return resolve(true);
  case CommsCmdType_e.commsCmd_Error:
    return reject('Got error response');
  case CommsCmdType_e.commsCmd_Pong:
    return resolve('PONG');
  case CommsCmdType_e.commsCmd_Ping:
    return resolve('PING');
  case CommsCmdType_e.commsCmd_version:
    return resolve(pkg.onefrm().data[0]);
  case CommsCmdType_e.commsCmd_fwHash:
    return resolve(pkg.onefrm().data)
  case CommsCmdType_e.commsCmd_DiagClearVlu:
    console.error('Should not get command DiagClearVlu as response');
    return reject(pkg);
  case CommsCmdType_e.commsCmd_DiagReadAll:
    return resolve(DiagReadVluPkg_t.parse(pkg.onefrm().data));
  case CommsCmdType_e.commsCmd_DiagSetVlu:
    console.error('Should not get command DiagSetVlu as response');
    return reject(pkg);
  case CommsCmdType_e.commsCmd_LogClearAll:
  case CommsCmdType_e.commsCmd_LogGetAll:
  case CommsCmdType_e.commsCmd_LogNextAddr: // fallthrough
    console.info('Log not implemented');
    return reject(pkg);
  case CommsCmdType_e.commsCmd_Reset:
    console.error('Should not get command Reset as response');
    return reject(pkg);
  case CommsCmdType_e.commsCmd_SettingsGetAll:
    return resolve(Settings_t.parse(pkg.onefrm().data));
  case CommsCmdType_e.commsCmd_SettingsSaveAll:
    console.error('Should not get command SettingsSaveAll as response');
    return reject(pkg);
  case CommsCmdType_e.commsCmd_SettingsSetDefault:
    console.error('Should not get command SettingsSetDefault as response');
    return reject(pkg);
  default:
    console.error('Unrecognized command:',pkg.cmd);
    return reject(pkg);
  }
}
module.exports.onRecieve = onRecieve;

let reqId = 0;
const promises = [];
function sendBuf(buf, cmd, returnRaw = false) {
  const tmr = setTimeout(()=>{
    const cmds = Object.keys(CommsCmdType_e);
    console.log("Timeout, no response from gearbrake, CMD:", cmd,
      cmds[Object.values(CommsCmdType_e).indexOf(cmd)]);
    //process.exit(1);
  }, 2000);
  return new Promise((resolve, reject)=>{
    const pkg = usbpkg_t.parse([3+buf.length, cmd, reqId, ...buf]);
    promises.push({reqId, resolve, reject, tmr, returnRaw});
    if (++reqId > 255)
      reqId = 0;
    if (port && port.isOpen)
      port.write(pkg.u8buf);
    else {
      console.error("port to RC-gearbrake not open");
      process.exit(1);
    }
  });
}
module.exports.sendBuf = sendBuf;


// diag things
async function fetchDiagValues() {
  const diag = await sendBuf([], CommsCmdType_e.commsCmd_DiagReadAll);
  return diag;
}
module.exports.fetchDiagValues = fetchDiagValues;

async function setDiag(setDiagPkg) {
  const res = await sendBuf(setDiagPkg.serialize(), CommsCmdType_e.commsCmd_DiagSetVlu);
  return res;
}
module.exports.setDiag = setDiag;

async function clearDiag(diagType) {
  const pkg = new DiagClrVluPkg_t();
  pkg.type = diagType;
  const res = await sendBuf(pkg.serialize(), CommsCmdType_e.commsCmd_DiagClearVlu);
  return res;
}
module.exports.clearDiag = clearDiag;


// settings things
async function fetchSettings() {
  const settings = await sendBuf([], CommsCmdType_e.commsCmd_SettingsGetAll);
  return settings;
}
module.exports.fetchSettings = fetchSettings;

async function saveSettings(settingsPkg) {
  const res = await sendBuf(settingsPkg.serialize(), CommsCmdType_e.commsCmd_SettingsSaveAll);
  return res;
}
module.exports.saveSettings = saveSettings;

async function defaultSettings() {
  const res = await sendBuf([], CommsCmdType_e.commsCmd_SettingsSetDefault);
  return res;
}
module.exports.defaultSettings = defaultSettings;

/*
// out as in USB host out, ie in to this device
typedef union {
  uint8_t u8buf[wMaxPacketSize];
  struct {
    uint8_t len; // length of data in this specific package
    uint8_t cmd;
    uint8_t reqId;
    uint8_t data[wMaxPacketSize -3];
  } onefrm;
  struct {
    // all types must be uint8_t to align properly without struct padding
    uint8_t len; // length of data in this specific package
    uint8_t cmd; // if cmd & 0x80 then its a part of many frames
    uint8_t reqId;
    uint8_t pkgNr[2]; // pkg nr 0 is a header byte for many frames
    uint8_t totalSize[4]; // size in bytes data which this multiframe sends
    uint8_t logNextAddress[4]; // the next address to store a log in EEPROM
  } headerfrm;
  struct {
    uint8_t len; // length of data in this specific package
    uint8_t cmd; // if cmd & 0x80 then its a part of many frames
    uint8_t reqId;
    uint8_t pkgNr[2]; // pkg nr 0 is a header byte for many frames
    uint8_t data[wMaxPacketSize -5];
  } datafrm;
} usbpkg_t;
*/


// -------------------------------------------------------------
// diag
// -------------------------------------------------------------



class DiagReadVluPkg_t {
  slip = [0, 0, 0];
  accelSteering = 0;
  wsSteering = 0;
  acceleration = 0;
  accelAxis = [0, 0, 1];
  speedOnGround = 0;
  brakeForceIn = 0;
  brakeForceCalc = 0;
  wheelRPS = [0, 0, 0];
  brakeForce_Out = [0,0,0];

  static parse(data) {
    const pkg = new DiagReadVluPkg_t();
    pkg.slip = [
      asInt16(fromBigEnd16(data.slice(0,1))),
      asInt16(fromBigEnd16(data.slice(2,3))),
      asInt16(fromBigEnd16(data.slice(4,5))),
    ];
    pkg.accelSteering = asInt16(fromBigEnd16(data.slice(6,7)));
    pkg.wsSteering = asInt16(fromBigEnd16(data.slice(8,9)));
    pkg.acceleration = asInt16(fromBigEnd16(data.slice(10,11)));
    pkg.accelAxis = [
      asInt16(fromBigEnd16(data.slice(12,13))),
      asInt16(fromBigEnd16(data.slice(14,15))),
      asInt16(fromBigEnd16(data.slice(16,17))),
    ];
    pkg.speedOnGround = data[18];
    pkg.brakeForceIn = data[19];
    pkg.brakeForceCalc = data[20];
    pkg.wheelRPS = [
      data[21], data[22], data[23]
    ];
    pkg.brakeForce_Out = [
      data[24], data[25], data[26]
    ];

    return pkg;
  }
}
module.exports.DiagReadVluPkg_t = DiagReadVluPkg_t;

/**
 * @brief this data package is returned to client when requesting realtime data
 */
/*
typedef struct __attribute__((__packed__)) {
  int16_t   slip[3]; // index as wheel sensors attached
          // 6 bytes here
  int16_t accelSteering,
          wsSteering,
          acceleration,
          // 12 bytes here
          accelAxis[3]; // 0=X, 1=Y, 2=Z
          // 18 bytes here
  uint8_t speedOnGround,
          brakeForceIn, // as in from receiver
          brakeForceCalc,
          wheelRPS[3], // index as wheel sensors attached
          brakeForce_Out[3];// index as brake outputs
          // 27 bytes here
          // should align to 28 bits
} DiagReadVluPkg_t ;
*/

const setVluPkgType_e = {
  diag_Set_Invalid : 0,
  // these must be in this order, with bitmask values
  diag_Set_Output0       : 1 << 0,
  diag_Set_Output1       : 1 << 1,
  diag_Set_Output2       : 1 << 2,
  diag_Set_InputRcv      : 1 << 3,
  diag_Set_InputWhl0     : 1 << 4,
  diag_Set_InputWhl1     : 1 << 5,
  diag_Set_InputWhl2     : 1 << 6,
  diag_Set_InputAcc0     : 1 << 7,
  diag_Set_InputAcc1     : 1 << 8,
  diag_Set_InputAcc2     : 1 << 9,
};
module.exports.setVluPkgType_e = setVluPkgType_e;

/**
 * @brief client sends this package when activating a value
 */
class DiagSetVluPkg_t {
  size = -1;
  type = setVluPkgType_e.diag_Set_Invalid;
  data = [];
  setBrakeForceIn(vlu) {
    this.data[0] = vlu;
    this.type = setVluPkgType_e.diag_Set_InputRcv;
    this.size = 4;
  }
  setWheelBrakeForce(wheel, vlu) {
    this.data[0] = vlu;
    this.type = setVluPkgType_e.diag_Set_Output0 << wheel;
    this.size = 4;
  }
  setWheelRPSVlu(wheel, vlu) {
    this.data[0] = vlu;
    this.type = setVluPkgType_e.diag_Set_InputWhl0 << wheel;
    this.size = 4;
  }
  setAccelVlu(axis, vlu) {
    this.data.push(...toBigEnd16(vlu));
    this.type = setVluPkgType_e.diag_Set_InputAcc0 << axis;
    this.size = 5;
  }
  setOutValue(wheel, vlu) {
    this.data[0] = vlu;
    this.type = setVluPkgType_e.diag_Set_Output0 << wheel;
    this.size = 4;
  }
  serialize() {
    return [
      this.size,
      ...toBigEnd16(this.type),
      ...this.data
    ]
  }
}
module.exports.DiagSetVluPkg_t = DiagSetVluPkg_t;

/*
typedef struct __attribute__((__packed__)){
  uint8_t size; // in bytes, sizeof this package
  setVluPkgType_t type;
  union {
    union {
      uint8_t brakeForce; // input from receiver
      uint8_t wheelRPSVlu; // revs per second per wheel
    } inputs; // 4 bytes, 7 bytes total with 3 usb bytes

    struct {
      int16_t accelVlu; // valu to ste axis with
    } accel; // 5 bytes, 8 total with header bytes in usb

    struct {
      uint8_t outVlu; // 0-100 PWM value
    } outputs; // 4 bytes, 7 bytes total with usb 3 bytes

  };
  // should be 3 - 8 bytes depending on package
} DiagSetVluPkg_t;
*/

class DiagClrVluPkg_t {
  type = setVluPkgType_e.diag_Set_Invalid;
  setType(type) {
    this.type = type;
  }
  serialize() {
    return [...toBigEnd16(this.type)];
  }
}

/*
typedef struct __attribute__((__packed__)) {
  setVluPkgType_t type;
} DiagClrVluPkg_t;
*/

// --------------------------------------------------------
// settings
// --------------------------------------------------------

const PwmFrequency_e = {
  off : 0,
  freq1Hz: 0x01,
  freq10Hz: 0x02,
  freq100Hz: 0x03,
  freq1kHz: 0x04,
  freq10kHz: 0x05,
  freqHighest: 0x05
};
module.exports.PwmFrequency_e = PwmFrequency_e;


const settingDefines = {
  SETTINGS_ACCEL_USE_X:   0,
  SETTINGS_ACCEL_USE_Y:   1,
  SETTINGS_ACCEL_USE_Z:   2,

  SETTINGS_BRAKE_POS_CENTER:   0,
  SETTINGS_BRAKE_POS_LEFT:     1,
  SETTINGS_BRAKE_POS_RIGHT:    2,

  /* How often we should log */
  SETTINGS_LOG_20MS:           0,
  SETTINGS_LOG_40MS:           1,
  SETTINGS_LOG_80MS:           2,
  SETTINGS_LOG_160MS:          3,
  SETTINGS_LOG_320MS:          4,
  SETTINGS_LOG_640MS:          5,
  SETTINGS_LOG_1280MS:         6,
  SETTINGS_LOG_2560MS:         7,
}
module.exports.settingDefines = settingDefines;

class Settings_header_t {
  storageVersion = 0x0001;
  size = 0x000B;
  serialize() {
    return [
      ...toBigEnd16(this.storageVersion),
      ...toBigEnd16(this.size)
    ];
  }
  static parse(data) {
    const header = new Settings_header_t();
    header.storageVersion = fromBigEnd16(data.slice(0,2));
    header.size = fromBigEnd16(data.slice(2,4));
    return header;
  }
}

/*
typedef struct {
    // which version of memory storage in EEPROM
    // version should be bumped on each ABI breaking change
    uint16_t storageVersion;
    // size of this settings storage in EEPROM (excluding 4bytes control)
    uint16_t size;
  } Settings_header_t;
*/

class Settings_t {
  header = new Settings_header_t();
  lower_threshold = 0;
  upper_threshold = 100;
  max_brake_force = 100;
  ws_steering_brake_authority = 25;
  acc_steering_brake_authority = 20;
  // begin first bit field
  reverse_input = 0;
  ABS_active = 0;
  PwmFreq = PwmFrequency_e.off;
  Brake0_active = 1;
  Brake1_active = 1;
  Brake2_active = 0;

  // begin second bitfield
  Brake0_dir = 0;
  Brake1_dir = 0;
  Brake2_dir = 0;
  accelerometer_axis = 0; // x ha steering authorities

  // begin third bitfield
  accelerometer_active = 0;
  accelerometer_axis_invert = 0;
  dontLogWhenStill = 0;
  logPeriodicity = settingDefines.SETTINGS_LOG_2560MS;

  // normal values again
  WheelSensor0_pulses_per_rev = 0;
  WheelSensor1_pulses_per_rev = 0;
  WheelSensor2_pulses_per_rev = 0;

  static parse(data) {
    const pkg = new Settings_t();
    pkg.header = Settings_header_t.parse(data.slice(0,4));
    pkg.lower_threshold = data[4];
    pkg.upper_threshold = data[5];
    pkg.max_brake_force = data[6];
    pkg.ws_steering_brake_authority = data[7];
    pkg.acc_steering_brake_authority = data[8];
    // first bitfield
    pkg.reverse_input = (data[9] & 0x01);
    pkg.ABS_active    = (data[9] & 0x02) >> 1;
    pkg.PwmFreq       = (data[9] & 0x14) >> 2;
    pkg.Brake0_active = (data[9] & 0x20) >> 5;
    pkg.Brake1_active = (data[9] & 0x40) >> 6;
    pkg.Brake2_active = (data[9] & 0x80) >> 7;
    // second bitfield
    pkg.Brake0_dir         = (data[10] & 0x03);
    pkg.Brake1_dir         = (data[10] & 0x0C) >> 2;
    pkg.Brake2_dir         = (data[10] & 0x30) >> 4;
    pkg.accelerometer_axis = (data[10] & 0xC0) >> 6;
    // third bitfield
    pkg.accelerometer_active      = (data[11] & 0x01);
    pkg.accelerometer_axis_invert = (data[11] & 0x02) >> 1;
    pkg.dontLogWhenStill          = (data[11] & 0x04) >> 2;
    pkg.logPeriodicity            = (data[11] & 0x38) >> 3;
    // normal values
    pkg.WheelSensor0_pulses_per_rev = data[12];
    pkg.WheelSensor1_pulses_per_rev = data[13];
    pkg.WheelSensor2_pulses_per_rev = data[14];
    return pkg;
  }

  serialize() {
    const buf = [
      this.lower_threshold,
      this.upper_threshold,
      this.max_brake_force,
      this.ws_steering_brake_authority,
      this.acc_steering_brake_authority,
      // first bitfield
      this._firstBitfield(),
      this._secondBitfield(),
      this._thirdBitfield(),
      this.WheelSensor0_pulses_per_rev,
      this.WheelSensor1_pulses_per_rev,
      this.WheelSensor2_pulses_per_rev
    ];
    this.header.size = buf.length;
    buf.unshift(...this.header.serialize());
    return buf;
  }
  _firstBitfield() {
    return (
       (this.reverse_input & 0x01) |
      ((this.ABS_active & 0x01) << 1) |
      ((this.PwmFreq & 0x07) << 2) |
      ((this.Brake0_active & 0x01) << 5) |
      ((this.Brake1_active & 0x01) << 6) |
      ((this.Brake2_active & 0x01) << 7)
    );
  }
  _secondBitfield() {
    return (
      (this.Brake0_dir & 0x03) |
      ((this.Brake1_dir & 0x03) << 2) |
      ((this.Brake2_dir & 0x03) << 4) |
      ((this.accelerometer_axis & 0x03) << 6)
    );
  }
  _thirdBitfield() {
    return (
      (this.accelerometer_active & 0x01) |
      ((this.accelerometer_axis_invert & 0x01) << 1) |
      ((this.dontLogWhenStill & 0x01) << 2) |
      ((this.logPeriodicity & 0x07) << 3)
    );
  }
}
module.exports.Settings_t = Settings_t;

/*
typedef struct {
  // which version of memory storage in EEPROM
  Settings_header_t header;

  // common
  // 0-100 value when brakes begin to activate
  uint8_t lower_threshold;

  // 0-100 value when brakes are at maximum
  uint8_t upper_threshold;


  // 0-100%  where 100% is full force, 0 is no brakes
  uint8_t max_brake_force;

  // how to try to influence steeringbrakes speed sensors should have 0-100
  uint8_t ws_steering_brake_authority;
  // how to try to influence steeringbrakes accelerometer should have 0-100
  uint8_t acc_steering_brake_authority;

  // reverse input low value becomes high,
  // more or less the same as inverting output in your transmitter
  uint8_t reverse_input:1;

  // 0=off, 1=on (requires wheelspeedsensors)
  uint8_t ABS_active:1;

  // outputs
  uint8_t PwmFreq: 3; // as in PwmFrequency_e
  uint8_t Brake0_active: 1;
  uint8_t Brake1_active: 1;
  uint8_t Brake2_active: 1;

  // next byte
  uint8_t Brake0_dir: 2; // if it is left, right or center used for steering brakes
  uint8_t Brake1_dir: 2; // 1 for left, 2 for right, 0 for center wheel (no steering brake)
  uint8_t Brake2_dir: 2; //

  // which axis should control steering brakes
  // 0 = x, 1=y, 2=z
  uint8_t accelerometer_axis: 2;

  // next byte
  // accelerometer
  uint8_t accelerometer_active: 1;
  // invert the input IE brake the other wheel
  uint8_t accelerometer_axis_invert: 1;
  // stop Log when wheel speed0
  uint8_t dontLogWhenStill: 1;
  // how often we should log
  uint8_t logPeriodicity: 3;

  // wheel speed inputs
  // how many pulses per revolution each wheel has, ie how many tooths
  // in your ABS tooth wheel, 0 deactivates
  uint8_t WheelSensor0_pulses_per_rev;
  uint8_t WheelSensor1_pulses_per_rev;
  uint8_t WheelSensor2_pulses_per_rev;

} Settings_t;
*/
