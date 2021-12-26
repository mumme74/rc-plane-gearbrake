"use strict";

if (!window.isSecureContext) {
  let tr = {
    en: `This page is not considered safe by the browser, serial communication is dispabled.\n
         Try to serve as top level page from a https: server.`,
    sv: `Denna sida anses inte var säker av webbläsaren, seriel kommunikation är inaktiverad.\n
        Försök med att serva sidan som Top sida från en https: webbserver`
  }
  alert(tr[document.querySelector("html").lang]);
} else if (!("serial" in navigator)) {
  let tr = {
    en: `This browser does not have webserial interface activated, try with Google chrome/Microsoft Edge version 89 or later.`,
    sv: `Denna webbläsare har inte webserial interfaceet aktiverat, försk med Google Chrome/Microsoft Edge version 89 eller senare.`
  }
  alert(tr[document.querySelector("html").lang]);
}

/**
 * A class that reads a complete msg response before it forwards it down the pipe
 * Use as a middleware to Serial interface before device data is released to User code.
 * Ensures that User code sees complete msg responses and not chunks.
 */
const transformContent = {
  start: (controller)=> {
    // A container for holding stream data until a new line.
    controller._buffer = new Uint8Array(128*1024+256); // 128kb should be enough but add 256 to be safe (EEPROM is 128kb)
    controller._bufferRcvd =  0;
    controller._msglen  = -1;
  },

  transform: (chunk, controller)=> {
    // Copy over bytes to our buffer
    for (let i = 0; i < chunk.length; ++i) {
        controller._buffer[controller._bufferRcvd++] = chunk[i];
    }


    // it can be a new response, check the length of the response (first byte in msg should be response length 1-256)
    if (controller._msglen < 0) {
        controller._msglen = SerialBase._readResponseHeader(chunk).len;
    }
    console.log("recieved",controller._bufferRcvd, "of", controller._msglen);

    // notify progress bar
    SerialBase.progress.updatePos(controller._bufferRcvd, controller._msglen);

    if (controller._bufferRcvd >= controller._msglen) {
      controller.enqueue(controller._buffer.subarray(0, controller._msglen));
      // we have a trailing fraction of a response after the completed msg
      if (controller._bufferRcvd > controller._msglen && controller._msglen > 0) {
        // move to beginning
        for (let i = 0, j = controller._msglen; j < controller._bufferRcvd; ++i, ++j)
          controller._buffer[i] = controller._buffer[j];

        controller._bufferRcvd -= controller._msglen;
        controller._msglen = SerialBase._readResponseHeader(controller._buffer).len;
        // fraction might be a complete msg, call recursively
        transformContent.transform(new Uint8Array(0), controller);
      } else {
        // complete msg, with no trailing fraction
        controller._msglen = -1;
        controller._bufferRcvd = 0;
      }
    }

  },

  flush:(controller)=> {
    // When the stream is closed, flush any remaining chunks out.
    controller.enqueue(controller._buffer.subarray(0, controller._bufferIter));
   }
}

class MsgStreamReader extends TransformStream {
  constructor() {
    super({...transformContent, textencoder: new TextEncoder()});
  }
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

class SerialBase {
    static LatestVersionSubClass = SerialBase;
    static Cmds = {
        Error: 0x00,
        Ping: 0x01,
        Pong:0x02,
        Reset: 0x03,
        SettingsSetAll: 0x08,
        SettingsGetAll: 0x09,
        LogGetAll: 0x10,
        LogNextAddr: 0x11,
        LogClearAll: 0x12,
        Version: 0x20,
        OK: 0xFF,
    }
    static IDError = 0xFF;

    static progress = new ProgressSend();

    port = null;
    _encoder = null;
    _decoder = null;
    _msgQueue = [];
    _reqId = 0;
    _responseMsgs = [];
    _onConnectCallbacks = [];
    _onDisconnectCallbacks = [];

    constructor () {
        navigator.serial.addEventListener('connect', (e) => {
            this.port = e.target;
            this._reopenPort();
        });

        navigator.serial.addEventListener('disconnect', (e) => {
            if (e.target === this.port) {
                this.port = null;
                for (let cb of this._onDisconnectCallbacks)
                    cb();
            }
        });

        this._encoder = new TextEncoder();
        this._decoder = new TextDecoder();
    }

    static instance() {
        if (!Serial._instance)
            Serial._instance = new SerialBase.LatestVersionSubClass();
        return Serial._instance;
    }

    static _readResponseHeader(byteArr) {
        // a bit in 8th pos means length occupies next byte too
        let nthByte = 0, len = 0;
        while((byteArr[nthByte] & 0x80)) { // count how many bytes that are the length
            if (byteArr.length === ++nthByte)
             return -1; // not recieved all bytes yet
        }

        // set the length
        for (let i = 0; i < nthByte; ++i) {
            let bits = (byteArr[i] & 0x7F);
            len |= bits << ((nthByte -1 - i) * 7);
        }

        return {
            len /* response complete length */,
            lenNBytes: nthByte, /* response length nr of bytes */
            payloadStart: nthByte + 2, /* where the repsonse payload starts */
            cmd: byteArr.length >= nthByte ? byteArr[nthByte] : SerialBase.Cmds.Error,
            id: byteArr.length >= nthByte +1 ? byteArr[nthByte+1] : SerialBase.IDError,
        };
    }

    onConnect(callback) {
        this._onConnectCallbacks.push(callback);
    }

    onDisconnect(callback) {
        this._onDisconnectCallbacks.push(callback);
    }

    async _reopenPort() {
        try {
            await this.port.open({baudRate: 115200});
            this._writer = await this.port.writable.getWriter();
            this._reader = await this.port.readable
                                .pipeThrough(new MsgStreamReader())
                                .getReader();
        } catch(e) {
            console.log("There was an error opening port: " + e);
            return false;
        };

        // notify that we are connected (outside of try block)
        for (let cb of this._onConnectCallbacks)
            cb();
        return true;
    }

    async openPort() {
        const usbVendorId = 0x0483;
        try {
          this.port = await navigator.serial.requestPort({ filters: [{ usbVendorId }]});
          // Connect to `port` or add it to the list of available ports.
          return await this._reopenPort();

        } catch(e) {
          // The user didn't select a port.
          console.log("User did not select a port");
        };
        return false;
    }

    togglePort() {
        if (!this.port)
            return this.openPort();

        // port open, close it
        this.port.close();
        this.port = null;
        return false;
    }

    toInt(arrBuff) {
        let res = 0;
        for(let i = 0; i < arrBuff.length; ++i)
            res |= arrBuff[i] << arrBuff.length -1 - i;
        return res;
    }

    /**
     * @brief Write to device on serial interface
     * @param {cmd} the command to send to device
     * @param {byteArr} optional the data to send to device, Uint8Array
     * @returns the request id associated with this write
     */
    async write({cmd, byteArr = null}) {
        if (!this.port)
            if (!await this.openPort()) return;
        let data = new Uint8Array(byteArr ? byteArr.length + 3 : 3);
        let i = 0, id = this._getId();
        data[i++] = data.length;
        data[i++] = cmd;
        data[i++] = id;
        for (let j = 0; i < data.length -3; ++i, ++j)
           data[i] = byteArr[j];

        await this._writer.write(data);

        return id; // id of this request
    }

    /**
     * @brief Read form serial interface, user code must poll to recieve
     * @param {id} = the request id we want to recieve, or undefined for no filter
     * @param {cmd} = the command we want the response to have, or undefined for no filter
     * @param {includeHeader} = include header bytes in response
     * @returns the found response matching param filters
     */
    async read({id = -1, cmd = -1, includeHeader = false}) {
      if (!this.port)
        if (!await this.openPort()) return;

      // we might have this message in our cache
      let msgIdx = this._responseMsgs.findIndex(m=>((id===m[2] || id < 0) && (cmd === m[1] || cmd < 0)));
      if (msgIdx > -1) return this._responseMsgs.splice(msgIdx);

      // get from device
      let exit = false, msg;
      while(!exit) {

        const {value: msg, done: exit} = await this._reader.read();
        const header = SerialBase._readResponseHeader(msg);
        if (header.len > -1 &&
            (id === -1 || id === header.id) &&
            (cmd === -1 || cmd === header.cmd))
        {
            return includeHeader ? msg : msg.subarray(header.payloadStart);
        }
        this._responseMsgs.push(msg);
      }
    }

    _getId() {
        if (this._reqId > 0xFD) // 0xFF is a error
            return this._reqId = 0;
        return this._reqId++;
    }
}

// add new version protocols
class Serial_v1 extends SerialBase {
    /**
     * @brief send a ping to device, expect a pong response
     * @returns the complete message from device
     */
     async sendPing() {
        const cmd = SerialBase.Cmds.Ping;
        try {
            let id = await this.write({cmd});
            return await this.read({id, cmd: SerialBase.Cmds.Pong, includeHeader: true});
        } catch(err) {
            console.log(err);
        }
    }

    /**
     * @brief send a version request to device
     * @returns the version as responsed from device
     */
    async getVersion() {
        const cmd = SerialBase.Cmds.Version;
        try {
            let id = await this.write({cmd});
            return await this.read({id, cmd});
        } catch(err) {
            console.error(err);
        }
    }

    /**
     * @brief send a reset request to device
     */
    async sendReset() {
        const cmd = SerialBase.Cmds.Reset;
        try {
            // we don't expect any response here
            await this.write({cmd});
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @brief set Settings to default values
     * @returns true/false depending on success
     */
    async setSettingsDefault() {
        const cmd = SerialBase.Cmds.SettingsSetAll;
        try {
            let id = await this.write({cmd});
            let resp = await this.read({id, includeHeader: true});
            return resp && SerialBase._readResponseHeader(resp).cmd === SerialBase.Cmds.OK;
        } catch(err) {
            console.error(err);
        }
    }

    /**
     * @brief get All settings stored in device including the settings version
     * @returns a Uint8Array with the device settings struct serialized
     */
    async getAllSettings() {
        const cmd = SerialBase.Cmds.SettingsGetAll;
        try {
            let id = await this.write({cmd});
            return await this.read({id, cmd});
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @brief Sets configuration struct in device
     * @param byteArr Uint8Array, must be aligned as the struct in device
     * @returns true/false depending on success
     */
    async setAllSettings(byteArr) {
        const cmd = SerialBase.Cmds.SettingsSetAll;

        try {
            let id = await this.write({byteArr, cmd});
            let resp = await this.read({id, includeHeader: true});
            return resp && SerialBase._readResponseHeader(resp).cmd === SerialBase.Cmds.OK;

        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @brief gets the next storage address for the next log input in device
     * @returns the address in the EEPROM where next log is stored
     */
    async getLogNextAddr() {
        const cmd = SerialBase.Cmds.LogNextAddr;
        try {
            let id = await this.write({cmd});
            return this.toInt(await this.read({id, cmd}));
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @breif clears all logg enties in device EEPROM
     * @returns true/false depending on success
     */
    async clearLogEntries() {
        const cmd = SerialBase.Cmds.LogClearAll;
        try {
            let id = await this.write({cmd});
            let resp = await this.read({id, includeHeader: true});
            return resp && SerialBase._readResponseHeader(resp).cmd === SerialBase.Cmds.OK;
        } catch(err) {
            console.error(err);
        }
    }

    /**
     * @brief reads log entries from the device
     * @returns the complete log
     */
    async readLog() {
        const cmd = SerialBase.Cmds.LogGetAll;
        try {
            let id = await this.write({cmd});
            let res = await this.read({id, cmd});
            return res;
        } catch (err) {
            console.error(err.message);
            console.log(err.data);
        }
    }
}

SerialBase.LatestVersionSubClass = Serial_v1;
