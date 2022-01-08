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
 * @brief LogItem is a single item, such as the value of accelerometer at single point in time
 */
class LogItem extends ItemBase {

    constructor(startPos = -1, parent = null) {
        const headerByte = parent.parent.byteArray[startPos];
        const size = (headerByte & 0x03) +1; // 0 is 1 byte, 3 is 4 bytes
        const type = (headerByte & 0xFC) >> 2;
        const byteArray = parent?.parent?.byteArray
                             .slice(startPos, startPos + size) || null;

        // call baseclass
        super({size, type, byteArray})

        // after baseclass call we can use *this* keyword
        this.startPos = startPos;
        this.parent = parent;
        this.size = size;
        this.type = type;
        this.endPos = this.startPos + 1 + this.size;
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
        pos += super.save(byteArray, pos);
        return pos - startPos;
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
    this.size = this.parent.byteArray[this.startPos];
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
    return this.parent.byteArray[this.startPos+1]; // first byte is number of items
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
    const typeKeys = Object.keys(ItemBase.Types); // is offset by 1, ie: -1 -> 0
    let items = [];
    for (const entry of this.getSession(coldStartIdx).values()) {
      entry.scanChildren();
      for (const itm of entry.children.values()) {
        if (items.findIndex(item=>item.entry.type===itm.type) === -1) {
          if (itm.type === ItemBase.Types.log_coldStart)
            continue; // no use to have this as a column
          else if (itm.type < ItemBase.Types.log_end) {
            // +1 due to typeKeys is offset by 1
            items.push({entry: itm});
          } else
            items.push({entry: itm});
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
                    entry.getChild(ItemBase.Types.log_coldStart))
                {
                  this.coldStarts.push(this.logEntries.length-1);
                }
                pos += entry.size;
            }
        }

        // read in the entries from startAddrs up to eof
        readLogEntries(startAddr, byteArray.length);

        // read in the entries from 0 upt to startAddr
        let pos = 0;
        while (pos < startAddr && byteArray[pos] === 0) ++pos;
        readLogEntries(pos, this.startPos);
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
        4, 1,
        (ItemBase.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 10 items
        43, 10,
        // first logitem uin8_t, 2 bytes long, positive 64
        (ItemBase.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (ItemBase.Types.wsSteering << 2) | 1, 0x01, 0x32,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (ItemBase.Types.accelSteering << 2) | 1,0xFE, 0xAC,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (ItemBase.Types.test_int32_1 << 2) | 3, 0x01, 0x15, 0x54, 0x05,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (ItemBase.Types.test_int32_2 << 2) | 3, 0x80, 0x43, 0x21, 0x0F,
        // logitem 6 int32_t 3 bytes long negative 0xE000 (-8192) 14bits resolution
        (ItemBase.Types.accelZ << 2) | 1, 0xE0, 0x00,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x3E, 0x80, 0x00, 0x00,
        // logitem 7 float 5 bytes long negative -2.0 (0xC0000000)
        (ItemBase.Types.slip1 << 2) | 3, 0xC0, 0x00, 0x00, 0x00,
        // logitem 8 float 5 bytes long positive pi (0x40490FDB)
        (ItemBase.Types.slip2 << 2) | 3, 0x40, 0x0F, 0x49, 0xDB,
        // logitem 9 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x00, 0x80, 0x00, 0x00,
        // trailing stuff at end, should halt the parse
        0,0,


        // a cold start entry
        4, 1,
        (ItemBase.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 14 items
        51, 14,
        // first logitem uin8_t, 2 bytes long, positive 64
        (ItemBase.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (ItemBase.Types.wsSteering << 2) | 1, 0x01, 0x32,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (ItemBase.Types.accelSteering << 2) | 1, 0xFE, 0xAC,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (ItemBase.Types.test_int32_1 << 2) | 3, 0x01, 0x15, 0x54, 0x05,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (ItemBase.Types.test_int32_2 << 2) | 3, 0x80, 0x43, 0x34, 0x0F,
        // logitem 6 int32_t 3 bytes long negative 0xE000 (-8192) 14bits resolution
        (ItemBase.Types.accelZ << 2) | 1, 0xE0, 0x00,
        // logitem 7 float 5 bytes long positive 0.25 (0x3E800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x3E, 0x80, 0x00, 0x00,
        // logitem 8 float 5 bytes long negative -2.0 (0xC0000000)
        (ItemBase.Types.slip1 << 2) | 3, 0xC0, 0x00, 0x00, 0x00,
        // logitem 9 float 5 bytes long positive pi (0x40430FDB)
        (ItemBase.Types.slip2 << 2) | 3, 0x40, 0x43, 0x0F, 0xDB,
        // logitem 10 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x00, 0x80, 0x00, 0x00,
        // logitem 11 uint8_t 2 bytes long positive 25
        (ItemBase.Types.wantedBrakeForce << 2) | 0, 0x19,
        // logitem 12 uint8_t 2 bytes long positive 25
        (ItemBase.Types.brakeForce0_out << 2) | 0, 0x19,
        // logitem 13 uint8_t 2 bytes long positive 16
        (ItemBase.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem 14 uint8_t 2 bytes long positive 20
        (ItemBase.Types.brakeForce2_out << 2) | 0, 0x14,

        // log entry with 14 items
        5, 14,
        // first logitem uin8_t, 2 bytes long, positive 64
        (ItemBase.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (ItemBase.Types.wsSteering << 2) | 1, 0x01, 0x32,
        // logitem 3 int16_t 3bytes long, negative 0xFEAC (-340)
        (ItemBase.Types.accelSteering << 2) | 1, 0xFE, 0xAC,
        // logitem 4 int32_t 5bytes long positive 0x01815405 (25252869)
        (ItemBase.Types.test_int32_1 << 2) | 3, 0x01, 0x15, 0x54, 0x05,
        // logitem 5 int32_t 5 bytes long negative 0x8043210F (-4399376)
        (ItemBase.Types.test_int32_2 << 2) | 3, 0x80, 0x43, 0x34, 0x0F,
        // logitem 6 int32_t 3 bytes long positive 0x6000 (8191) 14bits resolution
        (ItemBase.Types.accelZ << 2) | 1, 0x1F, 0xFF,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x3E, 0x80, 0x00, 0x00,
        // logitem 6 float 5 bytes long negative -2.0 (0xC0000000)
        (ItemBase.Types.slip1 << 2) | 3, 0xC0, 0x00, 0x00, 0x00,
        // logitem 6 float 5 bytes long positive pi (0x40430FDB)
        (ItemBase.Types.slip2 << 2) | 3, 0x40, 0x43, 0x0F, 0xDB,
        // logitem 6 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x00, 0x80, 0x00, 0x00,
        // logitem uint8_t 2 bytes long positive 75
        (ItemBase.Types.wantedBrakeForce << 2) | 0, 0x4B,
        // logitem uint8_t 2 bytes long positive 75
        (ItemBase.Types.brakeForce0_out << 2) | 0, 0x4B,
        // logitem uint8_t 2 bytes long positive 16
        (ItemBase.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem uint8_t 2 bytes long positive 20
        (ItemBase.Types.brakeForce2_out << 2) | 0, 0x14,

        // a cold start entry
        4, 1,
        (ItemBase.Types.log_coldStart << 2) | 0, 0x5A,

        // log entry with 13 items
        44, 13,
        // first logitem uin8_t, 2 bytes long, positive 64
        (ItemBase.Types.speedOnGround << 2) | 0, 0x40,
        // logitem 2 int16_t, 3bytes long, positive 0x0132 (306)
        (ItemBase.Types.wsSteering << 2) | 1, 0x00, 0x32,
        // logitem 3 int16_t 3bytes long, negative 0xFEAD (-341)
        (ItemBase.Types.accelSteering << 2) | 1, 0xFF, 0xAD,
        // logitem 4 int16_t 3bytes long positive 0x03F0 (1008)
        (ItemBase.Types.accel << 2) | 1, 0xF0, 0x03,
        // logitem 5 int16_t 3bytes long negative 0xFCCF (-817)
        (ItemBase.Types.accelX << 2) | 1, 0xFC, 0xCF,
        // logitem 6 float 5 bytes long positive 0.25 (0x3E800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x3E, 0x80, 0x00, 0x00,
        // logitem 6 float 5 bytes long negative -2.0 (0xC0000000)
        (ItemBase.Types.slip1 << 2) | 3, 0xC0, 0x00, 0x00, 0x00,
        // logitem 6 float 5 bytes long positive pi (0x40430FDB)
        (ItemBase.Types.slip2 << 2) | 3, 0x40, 0x43, 0x0F, 0xDB,
        // logitem 6 float 5 bytes long positive smallest number 2^-126 (0x00800000)
        (ItemBase.Types.slip0 << 2) | 3, 0x00, 0x80, 0x00, 0x00,
        // logitem uint8_t 2 bytes long positive 99
        (ItemBase.Types.wantedBrakeForce << 2) | 0, 0x63,
        // logitem uint8_t 2 bytes long positive 96
        (ItemBase.Types.brakeForce0_out << 2) | 0, 0x60,
        // logitem uint8_t 2 bytes long positive 16
        (ItemBase.Types.brakeForce1_out << 2) | 0, 0x10,
        // logitem uint8_t 2 bytes long positive 20
        (ItemBase.Types.brakeForce2_out << 2) | 0, 0x14,
    ]);

    logRoot.parseLog(bArr, 2);
    let itm = logRoot.logEntries[0].getChild(ItemBase.Types.log_coldStart);
    test(itm.size, 1);
    test(itm.type, ItemBase.Types.log_coldStart);

    test(logRoot.logEntries[1].itemCnt(), 10);

    test(logRoot.logEntries.length, 2)

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.speedOnGround);
    test(itm.value, 64);
    test(itm.type, ItemBase.Types.speedOnGround);
    test(itm.size, 1);
    test(itm.endPos, 6+4)

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.wsSteering);
    test(itm.value, 306);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.accelSteering);
    test(itm.value, -340);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.test_int32_1);
    test(itm.value, 18174981);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.test_int32_2);
    test(itm.value, -2143084273);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.accelZ);
    test(itm.value, -8192);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.slip0);
    test(itm.value, 0.25);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.slip1);
    test(itm.value, -2.0);

    itm = logRoot.logEntries[1].getChild(ItemBase.Types.slip2);
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
            speed.push(entry.getChild(ItemBase.Types.speedOnGround).realVlu());
            accelX.push(entry.getChild(ItemBase.Types.accelX).realVlu());
            wheel0.push(entry.getChild(ItemBase.Types.brakeForce0_out).realVlu());
            wheel1.push(entry.getChild(ItemBase.Types.brakeForce1_out).realVlu())
        }

        console.log("times",JSON.stringify(times))
        console.log("speed", JSON.stringify(speed))
        console.log("accelX", JSON.stringify(accelX))
        console.log("brake0", JSON.stringify(wheel0))
        console.log("brake1", JSON.stringify(wheel1))
    }

    console.log(`have runned ${testCnt} tests`);
}