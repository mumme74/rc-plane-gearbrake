"use strict";

if (!window.isSecureContext) {
  let tr = {
    en: `This page is not considered safe by the browser, usb communication is dispabled.\n
         Try to serve as top level page from a https: server.`,
    sv: `Denna sida anses inte var säker av webbläsaren, usb kommunikation är inaktiverad.\n
        Försök med att serva sidan som Top sida från en https: webbserver`
  }
  alert(tr[document.querySelector("html").lang]);
} else if (!("usb" in navigator) || ! ('serial' in navigator)) {
  let tr = {
    en: `This browser does not have webusb/serial interface activated, try with Google chrome/Microsoft Edge version 89 or later.`,
    sv: `Denna webbläsare har inte websusb/serial interfaceet aktiverat, försök med Google Chrome/Microsoft Edge version 89 eller senare.`
  }
  alert(tr[document.querySelector("html").lang]);
}

// inspired by https://spin.atomicobject.com/2018/09/10/javascript-concurrency/
class Mutex {
  _mutex = Promise.resolve();
  lock() {
    let begin = () => {};
    this._mutex = this._mutex.then(()=>{
      return new Promise(begin);
    });

    return new Promise(res=>{
      begin = res;
      return null;
    });
  }

  async dispatch(fn) {
    const unlock = await this.lock();
    try {
      return await Promise.resolve(fn())
    } finally {
      unlock()
    }
  }
}

class ProgressSend {
  endPos = 0;
  curPos = 0;
  onUpdate = null;

  constructor() {
    this.onUpdate = new EventDispatcher(this);
  }

  updatePos(curPos, endPos = null) {
    if (endPos !== null)
      this.endPos = endPos;
    this.curPos = curPos;

    let percent = this.curPos / this.endPos;
    percent = Math.min(Math.round(percent*100)/100, 1.0);
    percent = isNaN(percent) ? 0 : percent;
    this.onUpdate.emit(percent);
  }
}

class CommunicationBase {
    static LatestVersionSubClass = CommunicationBase;
    static Cmds = {
        Error:               0x00,
        Ping:                0x01,
        Pong:                0x02,
        Reset:               0x03,
        SettingsSetDefault:  0x07,
        SettingsSaveAll:     0x08,
        SettingsGetAll:      0x09,
        LogGetAll:           0x10,
        LogNextAddr:         0x11,
        LogClearAll:         0x12,
        DiagReadAll:         0x18,
        DiagSetVlu:          0x19,
        DiagClearVlu:        0x1A,
        Version:             0x20,
        FwHash:              0x21,
        OK:                  0x7F,
    }
    static IDError = 0xFF;
    static progress = new ProgressSend();
    static _mutex = new Mutex();

    vendorId = 0x0483;
    productId = 0x5740;//0x5722;
    baudRate = 115200;
    packetSize = 64;


    device = null;
    //oep = null;
    //iep = null;
    onConnect = null;
    onDisconnect = null;
    _unlock = null;
    _reqId = 0;
    _opened = false;

    errorLog = console.error;
    infoLog = console.info;
    okLog = console.log;

    constructor () {
        this.onConnect = new EventDispatcher(this);
        this.onDisconnect = new EventDispatcher(this);

        navigator.serial.addEventListener('connect', (e) => {
          const nfo = e.target.getInfo();
          if (nfo.usbVendorId === this.vendorId &&
              nfo.usbProductId === this.productId)
          {
            this.device = e.target;
            this._reopenPort();
          }
        });

        navigator.serial.addEventListener('disconnect', (e) => {
          const nfo = e.target.getInfo();
          if (nfo.usbVendorId === this.vendorId &&
              nfo.usbProductId === this.productId)
          {
            this.closeDevice();
            this.onDisconnect.emit();
          }
        });
    }

    static instance() {
        if (!CommunicationBase._instance)
            CommunicationBase._instance = new CommunicationBase.LatestVersionSubClass();
        return CommunicationBase._instance;
    }

    async _reopenPort() {
        if (this._opened)
          await this.device.close();
        try {
          this._opened = true;
            await this.device.open({
              baudRate: this.baudRate,
              flowControl: 'none'
            });
            /*
            if (this.device.configuration === null)
                await this.device.selectConfiguration(1);*/

        } catch(e) {
            this.errorLog("There was an error opening port: ", e);
            return false;
        };
/*
        for(let intf of this.device.configuration.interfaces) {
            for (let ep of intf.alternates[0].endpoints) {
                if (ep.type === 'bulk') {
                    this.interfaceNumber = intf.interfaceNumber;
                    switch (ep.direction) {
                    case 'out': this.oep = ep; break;
                    case 'in': this.iep = ep; break;
                    default: break;
                    }
                }
            }
        }

        if (!this.oep || !this.iep) return false;

        await this.device.claimInterface(this.interfaceNumber);
        await this.device.selectAlternateInterface(this.interfaceNumber, 0);
*/

        // notify that we are connected (outside of try block)
        this.onConnect.emit();
        return true;
    }

    async openDevice() {
        this.closeDevice();

        try {
          //this.device = await navigator.usb.requestDevice({ filters: [{ vendorId: this.vendorId, productId:this.productId}]});
          this.device = await navigator.serial.requestPort({
            filters:[{
              usbVendorId: this.vendorId,
              usbProductId: this.productId
            }]
          });

          // Connect to `port` or add it to the list of available ports.
          return await this._reopenPort();

        } catch(e) {
          // The user didn't select a device.
          this.infoLog("User did not select a device", e);
        };
        return false;
    }

    async closeDevice() {
        if (this._opened) try {
          this.device.close();
        } catch (e) { /* squeslh */ }
        this._opened = false;

        this.device = null;

        if (this._unlock)
          this._unlock = this._unlock();
    }

    async toggleDevice() {
        if (!this.device || !this.device.opened)
            return this.openDevice();

        this.closeDevice();
        return false;
    }

    toInt(arrBuff) {
        if (!arrBuff?.length) return 0;
        let res = 0, max = Math.min(arrBuff.length, 4);
        for(let i = 0, shft = (max - 1) * 8; i < max; ++i, shft -= 8)
            res |= arrBuff[i] << shft;
        return res;
    }

    isOpen() {
      return this._opened;
    }

    /**
     * @brief Talk to device on usb interface
     * @param {cmd} the command to send to device
     * @param {byteArr} optional the data to send to device, Uint8Array
     * @param {includeHeader} optional include header bytes in response
     * @returns the request id associated with this write
     */
    async talk({cmd, byteArr = null, includeHeader = false}) {
        if (!this.isOpen())
            if (!await this.openDevice()) return;

        let data = new Uint8Array(byteArr ? byteArr.length + 3 : 3);
        if (data.length > this.packetSize) {
            this.errorLog(`data sent to device to long must be max ${this.packetSize}` +
                          `Is ${byteArr.length} long`);
            return;
        }

        let i = 0, id = this._getId();
        data[i++] = data.length;
        data[i++] = cmd;
        data[i++] = id;
        for (let j = 0; i < data.length; ++i, ++j)
           data[i] = byteArr[j];
        //console.log("write cmd", cmd, "data", data);

        // Request exclusive control over interface #1.
        const unlock = this._unlock = await CommunicationBase._mutex.lock();
        if (!this.device)
          return;

        // communicate
        let rcvd = false;
        if (await this._send(data)) {
            rcvd = await this._recieve(id);
            if (rcvd?.length) {
                if (rcvd[1] === CommunicationBase.Cmds.Error) {
                    this._unlock = unlock();
                    throw new Error(`cmd ${cmd} with send id ${id} failed`);
                }
                if (!includeHeader)
                    rcvd.splice(0, 3);
            }
        }

        this._unlock = unlock();

        return rcvd;
    }

    /**
     * @brief talkSafe wraps talk() with a try catch
     * @param {*} param0
     * @returns {boolean} True on success
     */
    async talkSafe({cmd, expectedResponseCmd = null, byteArr = null, includeHeader}) {
        includeHeader = includeHeader || expectedResponseCmd !== null;
        try {
            const res = await this.talk({cmd, includeHeader, byteArr});
            if (res?.length && expectedResponseCmd !== null)
                return res[1] === expectedResponseCmd;
            return res;
        } catch(err) {
            console.log(err);
            return false;
        }
    }

    /*_checkTransfer(res) {
        if (res.status !== 'ok') {
            this.rcvCallback("Error in transfer");
            throw new Error("Error in usb transfer " +
                        (res instanceof USBInTransferResult ? " from" : "to") +
                        " device");
        }
        return res;
    }*/

    async _send(data) {
        // send to device
        CommunicationBase.progress.updatePos(1, 100);
        let res = false;
        const writer = this.device.writable.getWriter();
        try {
            //let res = await this.device.transferOut(
            //    this.oep.endpointNumber, new Uint8Array(data))
            // this._checkTransfer(res);
            await writer.write(data);
            res = true;
        } catch(e) {
            this.errorLog("Error during send to device", e);
        } finally {
          writer.releaseLock();
        }

        return res;
    }

    async _recieve(id) {
        // recieve from device
        let rcvd = [], multibyte = false, buf,
            reader = this.device.readable.getReader(),
            unusedBytes = new Uint8Array(0);

        // chops up recive into pages based on len prop in recived
        const readPage = async ()=> {
          let pageLen = 0, tail = 0
              buf = new Uint8Array();

          // previously fetched more than that page needed, reuse now
          if (unusedBytes.length) {
            pageLen = unusedBytes[0];
            buf = unusedBytes.slice(0, pageLen);
            unusedBytes = unusedBytes.slice(pageLen);
          }

          if (pageLen < 1 || buf.byteLength < pageLen) {
            do {
              const {value, done} = await reader.read();
              if (done)
                throw new Error("Port error");
              else if (pageLen === 0)
                pageLen = value[0];

              const end = pageLen - buf.byteLength;
              buf = new Uint8Array([
                ...buf,
                ...value.slice(0, end)]);
              unusedBytes = value.slice(end);
            } while(buf.byteLength < pageLen); // might get a fraction, not a whole frame
          }
          return buf;
        }

        try {
            do {
                // handle single and multiframe in this loop
                buf = await readPage();
                this._validateResponse(buf, id);

                // multi frame response
                if (buf[1] & 0x80) {
                    // exclude 3 header bytes
                    let arr = buf[3] || buf[4] ? buf.slice(5) : buf;
                    rcvd = rcvd.concat(Array.from(arr));
                    multibyte = true;
                } else if (multibyte) {
                    // store trailing ok/error msg
                    rcvd = rcvd.concat(Array.from(buf));
                }

            } while (buf[1] & 0x80); // expects a OK or error cmd to finish response

            if (!multibyte) // if not multibyte, store the result
                rcvd = rcvd.concat(Array.from(buf));

        } catch(e) {
            this.errorLog("Error during recieve from device", e);
        } finally {
          reader.releaseLock();
        }

        // finalize progress indicator
        CommunicationBase.progress.updatePos(CommunicationBase.progress.endPos);
        return rcvd;
    }

    _removeMultiframeHdrs(arr) {
        const offset = 14;
        // remove from backend in multiples of 64 bytes
        for(let i = arr.length -3 -1; i >= 0; --i) {
            if ((i - offset % this.iep.packetSize) === 0) {
                arr.splice(i, 5);
            }
        }
    }

    _validateResponse(buf, id) {
        if (buf.byteLength < 3)
          throw new Error("Recieved to short response: " + JSON.stringify(buf));
        if (buf.byteLength != buf[0])
          throw new Error(`Recieved wrong page length in recieve frame expected ${buf[0]} got ${buf.byteLength}`);
        if (buf[2] !== id)
          throw new Error(`Recieved wrong ID in response from device, expected:${id} got:${buf[2]}`);
        // multiframe update progress
        if (buf[1] & 0x80) {
            let idx = 3;
            // sends big endian
            let pkgNr = buf[idx++] << 8 | buf[idx++];
            if (pkgNr === 0) {
                let totalSize = buf[idx++] << 24 | buf[idx++] << 16 |
                                buf[idx++] << 8  | buf[idx++];
                CommunicationBase.progress.endPos =  totalSize / this.packetSize;
            }
            CommunicationBase.progress.updatePos(pkgNr);
        }
    }

    _getId() {
        if (this._reqId > 0xFD) // 0xFF is a error
            return this._reqId = 0;
        return this._reqId++;
    }
}

// add new version protocols
class Communication_v1 extends CommunicationBase {
    /**
     * @brief send a ping to device, expect a pong response
     * @returns the complete message from device
     */
    async sendPing() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.Ping,
            expectedResponseCmd: CommunicationBase.Cmds.Pong
        });
    }

    /**
     * @brief send a version request to device
     * @returns the version as responsed from device
     */
    async getVersion() {
        return await this.talkSafe({cmd: CommunicationBase.Cmds.Version});
    }

    /**
     * @brief send a reset request to device
     */
    async sendReset() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.Reset,
            expectedResponseCmd: CommunicationBase.Cmds.OK
        });
    }

    /**
     * @brief set Settings to default values
     * @returns true/false depending on success
     */
    async setSettingsDefault() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.SettingsSetDefault,
            expectedResponseCmd: CommunicationBase.Cmds.OK
        });
    }

    /**
     * @brief get All settings stored in device including the settings version
     * @returns a Uint8Array with the device settings struct serialized
     */
    async getAllSettings() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.SettingsGetAll
        });
    }

    /**
     * @brief Sets configuration struct in device
     * @param byteArr Uint8Array, must be aligned as the struct in device
     * @returns true/false depending on success
     */
    async saveAllSettings(byteArr) {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.SettingsSaveAll,
            expectedResponseCmd: CommunicationBase.Cmds.OK,
            byteArr
        });
    }

    /**
     * @brief gets the next storage address for the next log input in device
     * @returns the address in the EEPROM where next log is stored
     */
    async getLogNextAddr() {
        const res = await this.talkSafe({
            cmd: CommunicationBase.Cmds.LogNextAddr
        });

        return this.toInt(res);
    }

    /**
     * @breif clears all logg enties in device EEPROM
     * @returns true/false depending on success
     */
    async clearLogEntries() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.LogClearAll,
            expectedResponseCmd: CommunicationBase.Cmds.OK
        });
    }

    /**
     * @brief reads log entries from the device
     * @returns the complete log
     */
    async readLog() {
        const res = await this.talkSafe({
            cmd: CommunicationBase.Cmds.LogGetAll,
            includeHeader: true
        });
        const okCmd = CommunicationBase.Cmds.OK;
        return {
            ok: res?.length > 13 ? res[res.length -2] == okCmd : false,
            totalSize: res?.length > 13 ? this.toInt(res.slice(5, 9)) : 0,
            logNextAddr: res?.length > 13 ? this.toInt(res.slice(9, 13)) : 0,
            data: res?.length > 13 ? new Uint8Array(res.slice(13, res.length -3)) : []
        }
    }

    async poolDiagData() {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.DiagReadAll,
        });
    }

    async setDiagVlu(byteArr) {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.DiagSetVlu,
            expectedResponseCmd: CommunicationBase.Cmds.OK,
            byteArr,
        })
    }

    async clearDiagVlu(byteArr) {
        return await this.talkSafe({
            cmd: CommunicationBase.Cmds.DiagClearVlu,
            expectedResponseCmd: CommunicationBase.Cmds.OK,
            byteArr,
        });
    }

    async fetchFirmwareHash() {
      const byteArr =  await this.talkSafe({
        cmd: CommunicationBase.Cmds.FwHash,
      });

      return byteArr.map(n=>String.fromCharCode(n)).join('');
    }
}

CommunicationBase.LatestVersionSubClass = Communication_v1;
