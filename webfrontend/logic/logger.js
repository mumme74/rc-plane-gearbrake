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
    static TypesTranslated = {
        uninitialized: {
            txt: {en: "Unintialized", sv: "Oinitialiserad"},
            title: {en: "Not valid", sv: "Ej gilltig"}
        },

        // speed as in wheel revs / sec
        speedOnGround: {
            txt: {en: "Wheel revs on ground", sv: "Hjul rotation på marken"},
            title: {en: "Calculated speed on the ground", sv: "Beräknad hastighet på marken"}
        },
        wheelRPS_0: {
            txt: {en: "Wheel sensor 0", sv: "Hjulsensor 0"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        wheelRPS_1: {
            txt: {en: "Wheel sensor 1", sv: "Hjulsensor 1"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        wheelRPS_2: {
            txt: {en: "Wheel sensor 2", sv: "Hjulsensor 2"},
            title: {en: "Measured value", sv: "Uppmätt värde"}
        },
        // brake force
        wantedBrakeForce: {
            txt: {en: "Requested brakeforce", sv: "Begärd bromskraft"},
            title: {en: "Brakeforce from reciever", sv: "Bromskraft från mottagaren"}
        },
        brakeForce0_out: {
            txt: {en: "Brake 0 output force", sv: "Broms 0 utkraft"},
            title: {
            en: "Brake 0 force sent to wheel brake 0-100%",
            sv: "Broms 0 kraft sänt till hjulbroms"
            }
        },
        brakeForce1_out: {
            txt: {en: "Brake 1 output force", sv: "Broms 1 utkraft"},
            title: {
            en: "Brake 1 force sent to wheel brake 0-100%",
            sv: "Broms 1 kraft sänt till hjulbroms"
            }
        },
        brakeForce2_out: {
            txt: {en: "Brake 2 output force", sv: "Broms 2 utkraft"},
            title: {
            en: "Brake 2 force sent to wheel brake 0-100%",
            sv: "Broms 2 kraft sänt till hjulbroms"
            }
        },
        // wheel slip
        slip0: {
            txt: {en: "Brake 0 wheel slip", sv: "Broms 0 hjulsläpp"},
            title: {
            en: "Brake 0 calculated wheel slippage",
            sv: "Broms 0 beräknat hjulsläpp"
            }
        },
        slip1: {
            txt: {en: "Brake 1 wheel slip", sv: "Broms 1 hjulsläpp"},
            title: {
            en: "Brake 1 calculated wheel slippage",
            sv: "Broms 1 beräknat hjulsläpp"
            }
        },
        slip2: {
            txt: {en: "Brake 2 wheel slip", sv: "Broms 2 hjulsläpp"},
            title: {
            en: "Brake 2 calculated wheel slippage",
            sv: "Broms 2 beräknad hjulsläpp"
            }
        },
        // steering brakes
        accelSteering: {
            txt: {en: "Accelerometer steering",  sv: "Accelerometer styrning"},
            title: {
            en: "How much steeringbrake due to accelerometer sensing",
            sv: "Hur mycket styrbroms från accelerometern"
            }
        },
        wsSteering: {
            txt: {en: "Wheel brake steering", sv: "Hjulbroms styrning"},
            title: {
            en: "Wheel brake differential steering based of different sheel speed",
            sv: "Hjulbroms styrning baserat på olika hjulhatighet"
            }
        },
        // accelerometer
        accel: {
            txt: {en: "Accel. control axis", sv: "Accel. kontroll axel"},
            title: {
            en: "Accelerometer control axis value\nThe value form the axis used to steer brake",
            sv: "Accelerometer kontrol axel värde\nDet värde som används för att styrbromsa"
            }
        },
        accelX: {
            txt: {en: "Accelerometer X", sv: "Accelerometer X"},
            title: {
            en: "Accelerometer value for X-axis",
            sv: "Accelerometer värde för X-axeln"
            }
        },
        accelY: {
            txt: {en: "Accelerometer Y", sv: "Accelerometer Y"},
            title: {
            en: "Accelerometer value for Y-axis",
            sv: "Accelerometer värde för Y-axeln"
            }
        },
        accelZ: {
            txt: {en: "Accelerometer Z", sv: "Accelerometer Z"},
            title: {
            en: "Accelerometer value for Z-axis",
            sv: "Accelerometer värde för Z-axeln"
            }
        },

        // must be last of items from board, indicates end of log items
        log_end: {txt: {en: "Log end", sv: "Log slut"}},

        invalid: {
            txt:{en: "Invalid/test", sv: "Ogilltig/test"},
            title: {en: "Invalid, can be test header", sv: "Ogilltig, kan vara test rubrik"}
        },

        logIndex: {
            txt: {en: "index", sv: "index"},
            title: {
            en: "Index from session start, starts at 1 and counts upward for each logpoint",
            sv: "Index från sessions start, börjar räkna up från 1 varje logpunkt"
            }
        },

        // special
        log_coldStart: {
            txt: {en: "Start from reset", sv: "Uppstart från reset"},
            title: {
            en: "A special log point to mark a device restart.\nUse to find out when a new flying session started",
            sv: "En speciell log punkt för att markera en omstart.\nAnvänd för att se när en ny flygsession börjar"
            },
        },
    }

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
        test_int32_2: 0x31,

        info: (type) => {
            let min = 0, max = 0, mid = 0, groups = [];
            const t = LogItem.Types;
            if (type >= t.speedOnGround && type <= t.wheelRPS_2) {
                max = 255;
                groups = [t.speedOnGround,t.wheelRPS_0,
                          t.wheelRPS_1,t.wheelRPS_2];
            } else if (type >= t.wantedBrakeForce && type <= t.brakeForce2_out) {
                max = 100;
                groups = [t.wantedBrakeForce,t.brakeForce0_out,
                          t.brakeForce1_out,t.brakeForce2_out];
            } else if (type >= t.slip0 && type <= t.slip2) {
                max = 100;
                groups = [t.slip0,t.slip2,t.slip2];
            } else if (type >= t.accelSteering && type <= t.wsSteering) {
                min = -100; max = 100;
                groups = [t.slip0,t.slip2,t.slip2];
            } else if (type >= t.accel && type <= t.accelZ) {
                max = 16.0; min = -16.0;
                groups = [t.slip0,t.slip2,t.slip2];
            }
            return {min, max, mid, groups}
        }

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

    /**
     * @brief saves value to bytearray
     * @param byteArray = save to this buffer
     * @param startPos = at this pos
     * @returns number of bytes saved
     */
    save(byteArray = this.parent.parent.byteArray,
         startPos = this.startPos)
    {
        let headerByte = ((this.type & 0x3F) << 2) |
                         ((this.size - 1) & 0x03);
        let pos = startPos;
        byteArray[pos++] = headerByte;
        byteArray[pos++] = this.value & 0xFF;
        if (this.size > 1)
            byteArray[pos++] = (this.value & 0xFF00) >> 8;
        if (this.size > 2)
            byteArray[pos++] = (this.value & 0xFF0000) >> 16;
        if (this.size > 3)
            byteArray[pos++] = (this.value & 0xFF000000) >> 24;
        return pos - startPos;
    }

    /**
     * @brief Gets the unit for this type
     * @returns string with correct postfix
     */
    unit() {
        return LogItem.unitFor(this.type);
    }

    /**
     * @brief same as unit() but static
     * @param {Number} type
     * @returns string with correct postfix
     */
    static unitFor(type) {
        switch (type) {
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
        case LogItem.Types.accel:
        case LogItem.Types.accelX:
        case LogItem.Types.accelY:
        case LogItem.Types.accelZ:
            return "G";
        default:
            return "";
        }
    }

    /**
     * @brief returns rounded and converted value
     *         if applicable
     * @returns value based based of type
     */
    realVlu() {
        switch (this.type) {
            case LogItem.Types.slip0:
            case LogItem.Types.slip1:
            case LogItem.Types.slip2:
                return Number(this.value.toPrecision(3));
            case LogItem.Types.accel:
            case LogItem.Types.accelX:
            case LogItem.Types.accelY:
            case LogItem.Types.accelZ:
                return Number((this.value / 512).toPrecision(2));
            case LogItem.Types.speedOnGround:
            case LogItem.Types.wheelRPS_0:
            case LogItem.Types.wheelRPS_1:
            case LogItem.Types.wheelRPS_2:
            case LogItem.Types.wantedBrakeForce:
            case LogItem.Types.brakeForce0_out:
            case LogItem.Types.brakeForce1_out:
            case LogItem.Types.brakeForce2_out:
            case LogItem.Types.accelSteering:
            case LogItem.Types.wsSteering:
                return Number(this.value.toPrecision(2))//Math.round(this.value *100) / 100;
            default:
                return this.value;
            }
    }

    translatedType(lang = document.documentElement.lang) {
        const keys = Object.keys(LogItem.TypesTranslated).slice(1);
        const tr = LogItem.TypesTranslated[keys[this.type]];
        return {txt: tr.txt[lang], title: tr.title[lang]};
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

  /**
   * @brief Saves this log entry to given byteArray
   * @param {*} byteArray byte array to save to, default current
   * @param {*} startPos first byte pos in memory
   * @returns number of bytes written
   */
  save(byteArray = this.parent.byteArray,
       startPos = this.startPos)
  {
      this.scanChildren();
      byteArray[startPos] = this.children.length;
      let pos = startPos + 2;
      for (const child of this.children)
          pos += child.save(byteArray, pos);

      byteArray[startPos+1] = pos - startPos;
      return byteArray[startPos+1];
  }

  /**
   * @breif how many items this log entry contains
   * @returns number of children
   */
  itemCnt() {
    return this.parent.byteArray[this.startPos]; // first byte is number of items
  }

  /**
   * @param {*} type get the logitem in this entry with type
   * @returns the logItem found or undefined
   */
  getChild(type) {
    if (!this.children.length)
      this._generateChildren();
    return this.children.find(itm=>itm.type === type);
  }

  /**
   * @brief generte internal cache
   */
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

    /**
     * @param construct a new singleton
     * @returns the LogRoot singleton
     */
    static instance() {
        if (!LogRoot._instance)
            LogRoot._instance = new LogRoot();
        return LogRoot._instance;
    }

    constructor() {
        this.clear();
    }

    /**
     * @brief resets instance
     */
    clear() {
        this.byteArray = new Uint8Array(128 * 1024);
        this.logEntries = [];
        this.coldStarts = [];
        this.startPos = -1;
    }

//    byteArray = new Uint8Array(128 * 1024);
//    logEntries = [];
//    coldStarts = [];
//    startPos = -1;

    /**
     * @brief get all entries for coldtart index
     * @param coldStartIdx which coldstart we should return
     * @returns returns array with all entries
     */
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

   /**
   * @brief scans dataset to find all possible columns i the current data set
   * @param {Number} coldStartIndex The data from this coldStart
   * @returns {Array} object with all possible types and it tranlation obj {entry, trObj}
   */
   getColumnTypes(coldStartIdx) {
    // iterate over each entry and check if we have a new item
    const typeKeys = Object.keys(LogItem.Types); // is offset by 1, ie: -1 -> 0
    let items = [];
    for (const entry of this.getSession(coldStartIdx).values()) {
      entry.scanChildren();
      for (const itm of entry.children.values()) {
        if (items.findIndex(item=>item.entry.type===itm.type) === -1) {
          if (itm.type === LogItem.Types.log_coldStart)
            continue; // no use to have this as a column
          else if (itm.type < LogItem.Types.log_end) {
            // +1 due to typeKeys is offset by 1
            items.push({entry: itm, tr: LogItem.TypesTranslated[typeKeys[itm.type +1]]});
          } else
            items.push({entry: itm, tr: LogItem.TypesTranslated.invalid});
        }
      }
    }
    return items;
  }

    /**
     * @brief parse a new log or continued log,
     *         might be usefull if log contains null bytes
     * @param {*} byteArray the memory to start from
     * @param {*} startAddr the startAddr in byteArray
     */
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
        10, 43,
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
        // trailing stuff at end, should halt the parse
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
        13, 44,
        // first logitem uin8_t, 2 bytes long, positive 64
        (LogItem.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (LogItem.Types.wsSteering << 2) | 1, 0x32, 0x00,
        // logitem 3 int16_t 3bytes long, negative 0xFEAD (-341)
        (LogItem.Types.accelSteering << 2) | 1, 0xAD, 0xFF,
        // logitem 4 int16_t 3bytes long positive 0x03F0 (1008)
        (LogItem.Types.accel << 2) | 1, 0x03, 0xF0,
        // logitem 5 int16_t 3bytes long negative 0xFCCF (-817)
        (LogItem.Types.accelX << 2) | 1, 0xCF, 0xFC,
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

    test(logRoot.logEntries.length, 2)

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

    logRoot.parseLog(bArr, 51);
    test(logRoot.logEntries.length, 7);

    test(logRoot.logEntries[2].itemCnt(), 1);
    test(logRoot.logEntries[3].itemCnt(), 14);
    test(logRoot.logEntries[4].itemCnt(), 14);
    test(logRoot.logEntries[5].itemCnt(), 1);
    test(logRoot.logEntries[6].itemCnt(), 13);

    let btArr = new Uint8Array(128*1024);
    btArr.set(logRoot.byteArray);
    logRoot.clear();
    test(logRoot.logEntries.length, 0);

    logRoot.parseLog(btArr, 2);
    logRoot.parseLog(btArr, 51);

    // expand with more entries
    {
        const cloneItem = (orig, savePos) => {
            let itm = new LogItem(savePos, orig.parent);
            itm.size = orig.size;
            itm.type = orig.type;
            itm.endPos = savePos + itm.size +1;
            let rndVlu, newVlu, diff;
            // dont take a value to close to 0
            const info = LogItem.Types.info(itm.type);
            do {
                rndVlu = Math.random() * 0.5 - 0.25;
                newVlu = orig.value + orig.value * rndVlu;
                diff = (orig.value - newVlu) / orig.value;
            } while(diff > 10);
            itm.value = Math.max(Math.min(newVlu, info.max), info.min);
            itm.save();
            return itm;
        }

        const cloneEntry = (orig) => {
            orig.scanChildren();
            let entry = new LogEntry(orig.startPos + orig.size, orig.parent);
            entry.size = orig.size;
            let pos = orig.startPos +2;
            for (const child of orig.children) {
                const itm = cloneItem(child, pos);
                entry.children.push(itm);
                pos += itm.size +1;
            }
            entry.save();
            return entry;
        }

        let coldStart = logRoot.logEntries[logRoot.logEntries.length-2];
        coldStart.scanChildren();

        let lastEntry = logRoot.logEntries[logRoot.logEntries.length-1];
        lastEntry.scanChildren();

        /*coldStart = cloneEntry(coldStart);
        logRoot.logEntries.push(coldStart);
        logRoot.coldStarts.push(coldStart);*/

        while (lastEntry.startPos + lastEntry.size < 128 * 1024 -4 - lastEntry.size) {
            let entry = cloneEntry(lastEntry);
            logRoot.logEntries.push(entry);
            lastEntry = entry;
        }

        // dump some values to console for testing chart
        console.log(lastEntry.startPos + lastEntry.size)
        let speed= [], times = [], accelX = [], wheel0=[], wheel1=[];
        let entries = logRoot.getSession(3)
        for(let i = 1; i < Math.min(10, entries.length); ++i) {
            const entry = entries[i];
            times.push(i);
            speed.push(entry.getChild(LogItem.Types.speedOnGround).realVlu());
            accelX.push(entry.getChild(LogItem.Types.accelX).realVlu());
            wheel0.push(entry.getChild(LogItem.Types.brakeForce0_out).realVlu());
            wheel1.push(entry.getChild(LogItem.Types.brakeForce1_out).realVlu())
        }

        console.log("times",JSON.stringify(times))
        console.log("speed", JSON.stringify(speed))
        console.log("accelX", JSON.stringify(accelX))
        console.log("brake0", JSON.stringify(wheel0))
        console.log("brake1", JSON.stringify(wheel1))
    }

    console.log(`have runned ${testCnt} tests`);
}