"use strict";

/*
typedef struct {
  uint8_t size: 2;  // size of data
  uint8_t type: 6;  // log type
  uint8_t data[4]; // maximum 4 bytes data is possible to log
} LogItem_t;

typedef struct {
  uint8_t length; // number of items
  uint8_t size;   // number of bytes
  LogItem_t items[log_end];
} LogBuf_t;
*/
/**
 * @brief LogItem is a single item, such value of accelerometer
 */
class LogItem {
    static Types = {
        uninitialized: -1,

        // speed as in wheel revs / sec
        speedOnGround: 0,
        wheelRPS_0: 1,
        wheelRPS_1: 2,
        wheelRPS_2: 3,
        // brake force
        wantedBrakeForce: 4,
        brakeForce0_out: 5,
        brakeForce1_out: 6,
        brakeForce2_out: 7,
        // wheel slip
        slip0: 8,
        slip1: 9,
        slip2: 10,
        // steering brakes
        accelSteering: 11,
        wsSteering: 12,
        // accelerometer
        accel: 13,
        accelX: 14,
        accelY: 15,
        accelZ: 16,
        
        // must be last, indicates end of log items
        log_end: 17,  
        // special         
        log_coldStart: 0x3F,

        // only for testing purposes
        test_int32_1: 0x30,
        test_int32_2: 0x31

    }

    static FloatTypes = [
        LogItem.Types.slip0, LogItem.Types.slip1, LogItem.Types.slip2
    ];

    static Int8Types = [];

    static Int16Types = [
        LogItem.Types.accelSteering, LogItem.Types.wsSteering,
        LogItem.Types.accelX, LogItem.Types.accel,
        LogItem.Types.accelY, LogItem.Types.accelZ,
    ];

    static Int32Types = [
        LogItem.Types.test_int32_1, LogItem.Types.test_int32_2
    ];

    startPos = -1;
    endPos = -1;
    parent = null;
    type = LogItem.Types.uninitialized;
    size = -1;
    value = null;

    constructor(startPos, parent) {
        this.startPos = startPos;
        this.parent = parent;
        let headerByte = parent.parent.byteArray[startPos];
        this.size = (headerByte & 0x03) +1; // 0 is 1 byte, 3 is 4 bytes
        this.type = (headerByte & 0xFC) >> 2;
        this.endPos = this.startPos + 1 + this.size;

        let vlu = 0, pos = 0;
        while(1 + startPos + pos < this.endPos)
          vlu |= (this.parent.parent.byteArray[1 + startPos + pos] << (8 * pos++));

        if (LogItem.FloatTypes.indexOf(this.type) > -1) {
            // convert to float
            // inspired by http://cstl-csm.semo.edu/xzhang/Class%20Folder/CS280/Workbook_HTML/FLOATING_tut.htm
            // and https://en.wikipedia.org/wiki/Single-precision_floating-point_format
            let sign = ((vlu & 0x80000000) >> 31) ? -1 : 1;
            let exponent = ((vlu & 0x7F800000) >> 23) -127; // 0=127
            let mantissa = (vlu & 0x007FFFFF) | 0x00800000; // the 1 from the mantissa is always excluded
            vlu = sign * Math.pow(2, exponent) *  mantissa * Math.pow(2,-23);
            //console.log(vlu)

        } else if (LogItem.Int8Types.indexOf(this.type) > -1) {
            if (vlu & 0x80) vlu = ((~vlu & 0xFF) +1) * -1;
        } else if (LogItem.Int16Types.indexOf(this.type) > -1) {
            if (vlu & 0x8000) vlu = ((~vlu & 0xFFFF) + 1) * -1;
        } else if (LogItem.Int32Types.indexOf(this.type) > -1) {
            // 32 bits is so big that the value implicitly goes negative on 32th bit
            //if (vlu & 0x80000000) vlu = (vlu & 0x7FFFFFFF) -1;
        }
        this.value = vlu;
    }

    unit() {
        switch (this.type) {
        case LogItem.Types.speedOnGround:
        case LogItem.Types.wheelRPS_0:
        case LogItem.Types.wheelRPS_1:
        case LogItem.Types.wheelRPS_2:
            return "rps";
        case LogItem.Types.wantedBrakeForce:
        case LogItem.Types.brakeForce0_out:
        case LogItem.Types.brakeForce1_out:
        case LogItem.Types.brakeForce2_out:
        case LogItem.Types.accelSteering:
        case LogItem.Types.wsSteering:
        case LogItem.Types.slip0:
        case LogItem.Types.slip1:
        case LogItem.Types.slip2:
            return "%";
        case LogItem.Types.accelX:
        case LogItem.Types.accelY:
        case LogItem.Types.accelZ:
            return "G";
        default:
            return "";
        }
    }

    realVlu() {
        let roundMe = (vlu)=>{
            return Math.round(vlu*100) / 100;
        }
        switch (this.type) {
            case LogItem.Types.speedOnGround:
            case LogItem.Types.wheelRPS_0:
            case LogItem.Types.wheelRPS_1:
            case LogItem.Types.wheelRPS_2:
                return this.value;
            case LogItem.Types.wantedBrakeForce:
            case LogItem.Types.brakeForce0_out:
            case LogItem.Types.brakeForce1_out:
            case LogItem.Types.brakeForce2_out:
            case LogItem.Types.accelSteering:
            case LogItem.Types.wsSteering:
            case LogItem.Types.slip0:
            case LogItem.Types.slip1:
            case LogItem.Types.slip2:
                return roundMe(this.value);
            case LogItem.Types.accelX:
            case LogItem.Types.accelY:
            case LogItem.Types.accelZ:
                return roundMe(this.value / 512);
            default:
                return this.value;
            }
    }
}

/**
 * @brief LogEntry is a log entry, all LogItems that gets logged is contained within this
 */
class LogEntry {
  startPos = -1;
  parent = null;
  children = []
  size = -1;

  constructor(startPos, parent) {
    this.startPos = startPos;
    this.parent = parent;
    this.size = this.parent.byteArray[this.startPos+1];
  }

  itemCnt() {
    return this.parent.byteArray[this.startPos]; // first byte is number of items
  }

  getChild(type) {
    if (!this.children.length)
      this._generateChildren();
    return this.children.find(itm=>itm.type === type);
  }

  scanChildren() {
    if (!this.children.length)
      this._generateChildren();
  }

  _generateChildren() {
      this.children = [];
      let bytePos = this.startPos + 2;
      for(let i = 0; i < this.itemCnt(); ++i) {
        let itm = new LogItem(bytePos, this);
        this.children.push(itm);
        bytePos += itm.size +1; // +1 for a header byte
      }
  }
}

class LogRoot {
    static _instance = null;

    static instance() {
        if (!LogRoot._instance)
            LogRoot._instance = new LogRoot();
        return LogRoot._instance;
    }

    byteArray = new Uint8Array(128 * 1024);
    logEntries = [];
    coldStarts = [];
    startPos = -1;

    getSession(coldStartIdx) {
        let entries = [];
        const start = this.coldStarts[coldStartIdx];
        const end = this.coldStarts.length-1 > coldStartIdx ? 
                        this.coldStarts[coldStartIdx+1] : this.logEntries.length;
        for (let i = start; i < end; ++i) {
            entries.push(this.logEntries[i]);
        }

        return entries;
    }

    parseLog(byteArray, startAddr) {
        this.byteArray = byteArray;
        this.startPos = startAddr;

        const readLogEntries = (pos, endPos) => {
            while (pos < endPos) {
                let entry = new LogEntry(pos, this);
                if (entry.size < 1) break;
                this.logEntries.push(entry);
                if (entry.itemCnt() === 1 && 
                    entry.getChild(LogItem.Types.log_coldStart))
                {
                  this.coldStarts.push(this.logEntries.length-1);
                }
                pos += entry.size;
            }
        }

        // read in the entries from startAddrs up to eof
        readLogEntries(startAddr, byteArray.length);

        // read in the entries from 0 upt to startAddr
        readLogEntries(0, this.startPos);
    }
}

if (testing) {
    let testCnt = 0;
    let test = (vlu, expect)=> {
        if (vlu !== expect) 
            console.warn(`fail ${vlu} !== ${expect}`);
        testCnt++;
    }

    let logRoot = LogRoot.instance();
    let bArr = new Uint8Array([
        0,0,
        // a cold start entry
        1, 4,
        (LogItem.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 9 items
        10, 45,
        // first logitem uin8_t, 2 bytes long, positive 64
        (LogItem.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (LogItem.Types.wsSteering << 2) | 1, 0x32, 0x01,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (LogItem.Types.accelSteering << 2) | 1, 0xAC, 0xFE,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (LogItem.Types.test_int32_1 << 2) | 3, 0x05, 0x54, 0x15, 0x01,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (LogItem.Types.test_int32_2 << 2) | 3, 0x0F, 0x21, 0x43, 0x80,
        // logitem 6 int32_t 3 bytes long negative 0xE000 (-8192) 14bits resolution
        (LogItem.Types.accelZ << 2) | 1, 0x00, 0xE0,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x3E,
        // logitem 7 float 5 bytes long negative -2.0 (0xC0000000)
        (LogItem.Types.slip1 << 2) | 3, 0x00, 0x00, 0x00, 0xC0,
        // logitem 8 float 5 bytes long positive pi (0x40490FDB)
        (LogItem.Types.slip2 << 2) | 3, 0xDB, 0x0F, 0x49, 0x40,
        // logitem 9 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x00,
        // trailing stuff at end
        0,0,


        // a cold start entry
        1, 4,
        (LogItem.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 14 items
        14, 51,
        // first logitem uin8_t, 2 bytes long, positive 64
        (LogItem.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (LogItem.Types.wsSteering << 2) | 1, 0x32, 0x01,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (LogItem.Types.accelSteering << 2) | 1, 0xAC, 0xFE,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (LogItem.Types.test_int32_1 << 2) | 3, 0x05, 0x54, 0x15, 0x01,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (LogItem.Types.test_int32_2 << 2) | 3, 0x0F, 0x34, 0x43, 0x80,
        // logitem 6 int32_t 3 bytes long negative 0xE000 (-8192) 14bits resolution
        (LogItem.Types.accelZ << 2) | 1, 0x00, 0xE0,
        // logitem 7 float 5 bytes long positive 0.25 (0x3E800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x3E,
        // logitem 8 float 5 bytes long negative -2.0 (0xC0000000)
        (LogItem.Types.slip1 << 2) | 3, 0x00, 0x00, 0x00, 0xC0,
        // logitem 9 float 5 bytes long positive pi (0x40430FDB)
        (LogItem.Types.slip2 << 2) | 3, 0xDB, 0x0F, 0x43, 0x40,
        // logitem 10 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x00,
        // logitem 11 uint8_t 2 bytes long positive 25
        (LogItem.Types.wantedBrakeForce << 2) | 0, 0x19,
        // logitem 12 uint8_t 2 bytes long positive 25
        (LogItem.Types.brakeForce0_out << 2) | 0, 0x19,
        // logitem 13 uint8_t 2 bytes long positive 16
        (LogItem.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem 14 uint8_t 2 bytes long positive 20
        (LogItem.Types.brakeForce2_out << 2) | 0, 0x14,

        // log entry with 14 items
        14, 51,
        // first logitem uin8_t, 2 bytes long, positive 64
        (LogItem.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (LogItem.Types.wsSteering << 2) | 1, 0x32, 0x01,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (LogItem.Types.accelSteering << 2) | 1, 0xAC, 0xFE,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (LogItem.Types.test_int32_1 << 2) | 3, 0x05, 0x54, 0x15, 0x01,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (LogItem.Types.test_int32_2 << 2) | 3, 0x0F, 0x34, 0x43, 0x80,
        // logitem 6 int32_t 3 bytes long positive 0x6000 (8191) 14bits resolution
        (LogItem.Types.accelZ << 2) | 1, 0xFF, 0x1F,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x3E,
        // logitem 6 float 5 bytes long negative -2.0 (0xC0000000)
        (LogItem.Types.slip1 << 2) | 3, 0x00, 0x00, 0x00, 0xC0,
        // logitem 6 float 5 bytes long positive pi (0x40430FDB)
        (LogItem.Types.slip2 << 2) | 3, 0xDB, 0x0F, 0x43, 0x40,
        // logitem 6 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x00,
        // logitem uint8_t 2 bytes long positive 75
        (LogItem.Types.wantedBrakeForce << 2) | 0, 0x4B,
        // logitem uint8_t 2 bytes long positive 75
        (LogItem.Types.brakeForce0_out << 2) | 0, 0x4B,
        // logitem uint8_t 2 bytes long positive 16
        (LogItem.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem uint8_t 2 bytes long positive 20
        (LogItem.Types.brakeForce2_out << 2) | 0, 0x14,

        // a cold start entry
        1, 4,
        (LogItem.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 13 items
        13, 48,
        // first logitem uin8_t, 2 bytes long, positive 64
        (LogItem.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (LogItem.Types.wsSteering << 2) | 1, 0x32, 0x01,
        // logitem 3 int16_t 3bytes long, negative 0xFEAD (-341)
        (LogItem.Types.accelSteering << 2) | 1, 0xAD, 0xFE,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (LogItem.Types.test_int32_1 << 2) | 3, 0x05, 0x54, 0x15, 0x01,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (LogItem.Types.test_int32_2 << 2) | 3, 0x0F, 0x34, 0x43, 0x80,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x3E,
        // logitem 6 float 5 bytes long negative -2.0 (0xC0000000)
        (LogItem.Types.slip1 << 2) | 3, 0x00, 0x00, 0x00, 0xC0,
        // logitem 6 float 5 bytes long positive pi (0x40430FDB)
        (LogItem.Types.slip2 << 2) | 3, 0xDB, 0x0F, 0x43, 0x40,
        // logitem 6 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (LogItem.Types.slip0 << 2) | 3, 0x00, 0x00, 0x80, 0x00,
        // logitem uint8_t 2 bytes long positive 99
        (LogItem.Types.wantedBrakeForce << 2) | 0, 0x63,
        // logitem uint8_t 2 bytes long positive 96
        (LogItem.Types.brakeForce0_out << 2) | 0, 0x60,
        // logitem uint8_t 2 bytes long positive 16
        (LogItem.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem uint8_t 2 bytes long positive 20
        (LogItem.Types.brakeForce2_out << 2) | 0, 0x14,
    ]);

    logRoot.parseLog(bArr, 2);
    let itm = logRoot.logEntries[0].getChild(LogItem.Types.log_coldStart);
    test(itm.size, 1);
    test(itm.type, LogItem.Types.log_coldStart);

    test(logRoot.logEntries[1].itemCnt(), 10);

    //test(logRoot.logEntries.length, 2)

    itm = logRoot.logEntries[1].getChild(LogItem.Types.speedOnGround);
    test(itm.value, 64);
    test(itm.type, LogItem.Types.speedOnGround);
    test(itm.size, 1);
    test(itm.endPos, 6+4)

    itm = logRoot.logEntries[1].getChild(LogItem.Types.wsSteering);
    test(itm.value, 306);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.accelSteering);
    test(itm.value, -340);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.test_int32_1);
    test(itm.value, 18174981);
    
    itm = logRoot.logEntries[1].getChild(LogItem.Types.test_int32_2);
    test(itm.value, -2143084273);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.accelZ);
    test(itm.value, -8192);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.slip0);
    test(itm.value, 0.25);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.slip1);
    test(itm.value, -2.0);

    itm = logRoot.logEntries[1].getChild(LogItem.Types.slip2);
    test(itm.value.toPrecision(6), Math.PI.toPrecision(6));

    itm = logRoot.logEntries[1].children[9];
    test(itm.value, Math.pow(2, -126));

    logRoot.parseLog(bArr, 48);
    test(logRoot.logEntries.length, 7);

    test(logRoot.logEntries[2].itemCnt(), 1);
    test(logRoot.logEntries[3].itemCnt(), 14);
    test(logRoot.logEntries[4].itemCnt(), 14);
    test(logRoot.logEntries[5].itemCnt(), 1);
    test(logRoot.logEntries[6].itemCnt(), 13);

    console.log(`have runned ${testCnt} tests`)
}