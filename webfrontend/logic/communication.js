"use strict";

if (!window.isSecureContext) {
  let tr = {
    en: `This page is not considered safe by the browser, usb communication is dispabled.\n
         Try to serve as top level page from a https: server.`,
    sv: `Denna sida anses inte var säker av webbläsaren, usb kommunikation är inaktiverad.\n
        Försök med att serva sidan som Top sida från en https: webbserver`
  }
  alert(tr[document.querySelector("html").lang]);
} else if (!("usb" in navigator)) {
  let tr = {
    en: `This browser does not have webusb interface activated, try with Google chrome/Microsoft Edge version 89 or later.`,
    sv: `Denna webbläsare har inte websusb interfaceet aktiverat, försk med Google Chrome/Microsoft Edge version 89 eller senare.`
  }
  alert(tr[document.querySelector("html").lang]);
}

class ProgressSend {
  endPos = 0;
  curPos = 0;
  _callbacks = [];
  updatePos(curPos, endPos = null) {
    if (endPos !== null)
      this.endPos = endPos;
    this.curPos = curPos;

    let percent = this.curPos / this.endPos;
    percent = Math.min(Math.round(percent*100)/100, 1.0);
    percent = isNaN(percent) ? 0 : percent;
    for (let cb of this._callbacks)
      cb(percent);
  }
  registerCallback(cb) {
    this._callbacks.push(cb)
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
        OK:                  0x7F,
    }
    static IDError = 0xFF;

    vendorId = 0x0483;
    productId = 0;

    static progress = new ProgressSend();

    device = null;
    oep = null;
    iep = null;
    _reqId = 0;
    _onConnectCallbacks = [];
    _onDisconnectCallbacks = [];

    errorLog = console.error;
    infoLog = console.info;
    okLog = console.log;

    constructor () {
        navigator.usb.addEventListener('connect', (e) => {
            if (e.device.vendorId === this.vendorId &&
                e.device.productId === this.productId)
            {
                this.device = e.device;
                this._reopenPort();
            }
        });

        navigator.usb.addEventListener('disconnect', (e) => {
            if (e.device.vendorId === this.vendorId &&
                e.device.productId === this.productId)
            {
                this.closeDevice();
                for (let cb of this._onDisconnectCallbacks)
                    cb();
            }
        });
    }

    static instance() {
        if (!CommunicationBase._instance)
            CommunicationBase._instance = new CommunicationBase.LatestVersionSubClass();
        return CommunicationBase._instance;
    }

    onConnect(callback) {
        this._onConnectCallbacks.push(callback);
    }

    onDisconnect(callback) {
        this._onDisconnectCallbacks.push(callback);
    }

    async _reopenPort() {
        try {
            await this.device.open();
            if (this.device.configuration === null)
                await this.device.selectConfiguration(1);

        } catch(e) {
            this.errorLog("There was an error opening port: ", e);
            return false;
        };

        for(let intf of this.device.configuration.interfaces) {
            for (let ep of intf.alternates[0].endpoints) {
                if (ep.type === 'bulk') {
                    switch (ep.direction) {
                    case 'out': this.oep = ep; break;
                    case 'in': this.iep = ep; break;
                    default: break;
                    }
                }
            }
        }

        // notify that we are connected (outside of try block)
        for (let cb of this._onConnectCallbacks) {
            try {
                cb();
            } catch(e) {
                // error not in this class, special case callback errors
                console.error(e);
            }
        }
        return true;
    }

    async openDevice() {
        this.closeDevice();

        try {
          this.device = await navigator.usb.requestDevice({ filters: [{ vendorId: this.vendorId}]});
          this.productId = this.device.productId;

          // Connect to `port` or add it to the list of available ports.
          return await this._reopenPort();

        } catch(e) {
          // The user didn't select a device.
          this.infoLog("User did not select a device");
        };
        return false;
    }

    async closeDevice() {
        if (this.device?.opened)
            this.device.close();
        this.device = null;
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

    _checkTransfer(res) {
        if (res.status !== 'ok') {
            this.rcvCallback("Error in transfer");
            throw new Error("Error in usb transfer " +
                        (res instanceof USBInTransferResult ? " from" : "to") +
                        " device");
        }
        return res;
    }

    /**
     * @brief Talk to device on usb interface
     * @param {cmd} the command to send to device
     * @param {byteArr} optional the data to send to device, Uint8Array
     * @param {includeHeader} optional include header bytes in response
     * @returns the request id associated with this write
     */
    async talk({cmd, byteArr = null, includeHeader = false}) {
        if (!this.device?.opened || !this.oep || !this.iep)
            if (!await this.openDevice()) return;

        let data = new Uint8Array(byteArr ? byteArr.length + 3 : 3);
        if (data.length > this.oep.packetSize) {
            this.errorLog(`data sent to device to long must be max ${this.oep.packetSize}` +
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

        clearTimeout(this._resetTimeout);

        // Request exclusive control over interface #1.
        await this.device.claimInterface(0);

        // communicate
        let rcvd = false;
        if (await this._send(data)) {
            rcvd = await this._recieve(id);
            if (rcvd?.length) {
                if (rcvd[1] === CommunicationBase.Cmds.Error)
                    throw new Error(`cmd ${cmd} with send id ${id} failed`);
                if (!includeHeader)
                    rcvd.splice(0, 3);
            }
        }

        if (this.device) {
            await this.device.releaseInterface(0);
            await this.device.reset();
        }

        return rcvd;
    }

    /**
     * @brief talkSafe wraps talk() with a try catch
     * @param {*} param0
     * @returns
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
        }
    }

    async _send(data) {
        // send to device
        CommunicationBase.progress.updatePos(1, 100);
        try {
            let res = await this.device.transferOut(
                this.oep.endpointNumber, new Uint8Array(data))
            this._checkTransfer(res);
            return true;
        } catch(e) {
            this.errorLog("Error during send to device", e);
            return false;
        }
    }

    async _recieve(id) {
        // recieve from device
        let buf, rcvd = [], res, multibyte = false;

        try {
            do {
                // handle single and multiframe
                res = this._checkTransfer(await this.device.transferIn(
                            this.iep.endpointNumber, this.iep.packetSize));
                buf = new Uint8Array(res.data.buffer);
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
        if (buf.length < 3) throw new Error("Recieved to short response: " + JSON.stringify(buf));
        if (buf[2] !== id) throw new Error("Recieved wrong ID in response from device");
        // multiframe update progress
        if (buf[1] & 0x80) {
            let idx = 3;
            // sends big endian
            let pkgNr = buf[idx++] << 8 | buf[idx++];
            if (pkgNr === 0) {
                let totalSize = buf[idx++] << 24 | buf[idx++] << 16 |
                                buf[idx++] << 8  | buf[idx++];
                CommunicationBase.progress.endPos =  totalSize / this.iep.packetSize;
            }

            CommunicationBase.progress.updatePos(pkgNr);
        }
    }




    /**
     * @brief Read form usb interface, user code must poll to recieve
     * @param {id} = the request id we want to recieve, or undefined for no filter
     * @param {cmd} = the command we want the response to have, or undefined for no filter
     * @param {includeHeader} = include header bytes in response
     * @returns the found response matching param filters
     */
    /*async read({id = -1, cmd = -1, includeHeader = false}) {
      if (!this.device)
        if (!await this.openPort()) return;

      // we might have this message in our cache
      let msgIdx = this._responseMsgs.findIndex(m=>((id===m[2] || id < 0) && (cmd === m[1] || cmd < 0)));
      if (msgIdx > -1) return this._responseMsgs.splice(msgIdx);

      // get from device
      let exit = false, msg;
      while(!exit) {

        const {value: msg, done: exit} = await this._reader.read();
        const header = CommunicationBase._readResponseHeader(msg);
        if (header.len > -1) {
            if (header.cmd === CommunicationBase.Cmds.Error) {
                this._responseMsgs = [];
                throw new Error(`cmd ${header.cmd} with ${id} failed`);
            } else if ((id === -1 || id === header.id) &&
                       (cmd === -1 || cmd === header.cmd))
            {
                console.log("rcv cmd", cmd, "data", msg)
                return includeHeader ? msg : msg.subarray(header.payloadStart);
            }
        }
        this._responseMsgs.push(msg);
      }
    }*/

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
}

CommunicationBase.LatestVersionSubClass = Communication_v1;
