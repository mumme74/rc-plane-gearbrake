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
class MsgStreamReader {
  constructor() {
    // A container for holding stream data until a new line.
    this._buffer = Uint8Array(128*1024+256); // 128kb should be enough but add 256 to be safe (EEPROM is 128kb)
    this._bufferIter =  0;
    this._msglen  = -1;
  }

  transform(chunk, controller) {
    // Copy over bytes to our buffer
    for (let i = 0; i < chunk.length; ++i) {
        this._buffer[this._bufferIter++] = chunk[i];
    }
    // it can be a new response, check the length of the response (first byte in msg should be response length 1-256)
    if (this._msglen < 0) {
        this._msglen = SerialBase._readResponseHeader(chunk).len;
    }

    if (this._bufferIter >= this._msglen) {
        controller.enqueue(this._buffer.subarray(0, this._msglen));
        // we have a trailing fraction of a response after the completed msg
        if (this._bufferIter > this._msglen) {
            // move to beginning
            for (let i = 0, j = this._msglen; j < this._bufferIter; ++i, ++j)
                this._buffer[i] = this._buffer[j];

            this._bufferIter -= this._msglen;
            this._msglen = SerialBase._readResponseHeader(this._buffer).len;
            // fraction might be a complete msg, call recursively
            this.transform(Uint8Array(0), controller);
        } else {
            // complete msg, with no trailing fraction
            this._msglen = -1;
            this._bufferIter = 0;
        }
    }
  }

  flush(controller) {
    // When the stream is closed, flush any remaining chunks out.
    controller.enqueue(this._buffer.subarray(0, this._bufferIter));
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

    port = null;
    _reader = null;
    _writer = null;
    _encoder = null;
    _decoder = null;
    _msgQueue = [];
    _reqId = 0;
    _responseMsgs = [];

    constructor () {
        navigator.serial.addEventListener('connect', (e) => {
            this.port = e.target;
            document.querySelectorAll(".connectBtn").forEach(btn=>{
                btn.classList.add("connected");
            });
        });

        navigator.serial.addEventListener('disconnect', (e) => {
            if (e.target === this.port) {
                this.port = null;
                document.querySelectorAll(".connectBtn").forEach(btn=>{
                    btn.classList.remove("connected");
                });
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
        while((chunk[nthByte++] & 0x80)) { // count how many bytes that are the length
            if (byteArr.length === nthByte)
             return -1; // not recieved all bytes yet
        }

        // set the length
        for (let i = 0; i < nthByte; ++i) {
            len |= (byteArr[i] & 0x7F) << ((nthByte - 1) * 7);
        }

        return {
            len /* response complete length */,
            lenNBytes: nthByte, /* response length nr of bytes */
            payloadStart: nthByte + 2, /* where the repsonse payload starts */
            cmd: byteArr.length >= nthByte ? byteArr[nthByte] : SerialBase.Cmds.Error,
            id: byteArr.length >= nthByte +1 ? byteArr[nthByte+1] : SerialBase.IDError,
        };
    }


    async openPort() {
        const usbVendorId = 0x0483;
        try {
          await navigator.serial.requestPort({ filters: [{ usbVendorId }]});
          // Connect to `port` or add it to the list of available ports.
          this.port = port;
          try {
            await this.port.open({baudRate: 115200});
            this._reader = port.readable.getReader();
            this._writer = port.writable.getWriter();
            this._reader.pipeThrough(new MsgStreamReader());
            return true;
          } catch(e) {
              console.log("There was an error opening port: " + e);
          };

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

    /*
    async writeStr(data) {
      const dataArrayBuffer = this.encoder.encode(data);
      return await this.write(dataArrayBuffer);
    }

    async readStr() {
      try {
        const readerData = await this.read();
        return this.decoder.decode(readerData.value);
      } catch (err) {
        const errorMessage = `error reading data: ${err}`;
        console.error(errorMessage);
        return errorMessage;
      }
    }*/

    /**
     * @brief Write to device on serial interface
     * @param {cmd} the command to send to device
     * @param {byteArr} optional the data to send to device, Uint8Array
     * @returns the request id associated with this write
     */
    async write({cmd, byteArr = null}) {
        if (!this._writer || !this._writer.locked)
            if (!await this.openPort()) return;
        let data = new Uint8Array(byteArr ? byteArr.length + 3 : 3);
        let i = 0;
        data[i++] = data.length;
        data[i++] = cmd;
        data[i++] = this._getId();
        for (let j = 0; i < data.length -3; ++i, ++j)
           data[j] = byteArr[i];

        await this._writer.write(byteArr);
        return data[2]; // id of this request
    }

    /**
     * @brief Read form serial interface, user code must poll to recieve
     * @param {id} = the request id we want to recieve, or undefined for no filter
     * @param {cmd} = the command we want the response to have, or undefined for no filter
     * @param {includeHeader} = include header bytes in response
     * @returns the found response matching param filters
     */
    async read({id = -1, cmd = -1, includeHeader = false}) {
      if (!this._writer || !this._writer.locked)
        if (!this.openPort()) return;

      // we might have this message in our cache
      let msgIdx = this._responseMsgs.findIndex(m=>((id===m[2] || id < 0) && (cmd === m[1] || cmd < 0)));
      if (msgIdx > -1) return this._responseMsgs.splice(msgIdx);

      // get from device
      let exit = false;
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
        let msg = new Uint8Array([3, SerialBase.Cmds.Ping, this._getId()]);
        try {
            let id = await this.write(msg);
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
        let msg = new Uint8Array([3, SerialBase.Cmds.Version, this._getId()]);
        try {
            let id = await this.write(msg);
            return await this.read({id, cmd: SerialBase.Cmds.Version});
        } catch(err) {
            console.error(err);
        }
    }

    /**
     * @brief send a reset request to device
     */
    async sendReset() {
        let msg = new Uint8Array([3, SerialBase.Cmds.Reset, this._getId()]);
        try {
            // we don't expect any response here
            await this.write(msg);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @brief set Settings to default values
     * @returns true/false depending on success
     */
    async setSettingsDefault() {
        let msg = new Uint8Array([3, SerialBase.Cmds.SettingsSetAll, this._getId()]);
        try {
            let id = await this.write(msg);
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
        let msg = new Uint8Array([3, SerialBase.Cmds.SettingsGetAll, this._getId()]);
        try {
            let id = await this.write(msg);
            return await this.read({id, cmd: msg[1]});
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
        let msg = new Uint8Array([3 + byteArr.length, SerialBase.Cmds.SettingsSetAll, this._getId()]);
        for (let i = 0, j = 3; i < byteArr.length; ++i, ++j)
            msg[j] = byteArr[i];

        try {
            let id = await this.write(msg);
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
        let msg = new Uint8Array([3, SerialBase.Cmds.LogNextAddr, this._getId()]);
        try {
            let id = await this.write(msg);
            return await this.read({id, cmd: msg[1]});
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @breif clears all logg enties in device EEPROM
     * @returns true/false depending on success
     */
    async clearLogEntries() {
        let msg = new Uint8Array([3, SerialBase.Cmds.LogClearAll, this._getId()]);
        try {
            let id = await this.write(msg);
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
        let msg = new Uint8Array([3, SerialBase.Cmds.LogGetAll, this._getId()]);
        try {
            let id = await this.write(msg);
            return await this.read({id, cmd: msg[1]});

        } catch (err) {
            console.error(err.message);
            console.log(err.data);
        }
    }
}

SerialBase.LatestVersionSubClass = Serial_v1;
