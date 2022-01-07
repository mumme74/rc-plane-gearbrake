'use strict';

{ // begin namespace obj
class SettingsHtmlCls {
  _dfuUtil = null;

  translationObj = {
    en: {
        header: "App settings",
        p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
              This is due to the Use of WebUSB to "talk" to the microcontroller via USB`,
        chooseLang: `Choose language`,
        updateFirmware: `Update device firmware`,
        nofileSelected: "You must select a firmwre file first!",
        firmwareHelp: `You must push and hold the device boot button during power reset to go to bootloader mode.`,
        firmwareHelpStep1: "Disconnect power and USB from device",
        firmwareHelpStep2: "Push and hold boot button",
        firmwareHelpStep3: "While pushing button, connect USB",
        firmwareHelpStep4: "Release button after aprox. 1 sec",
        selectFile: "Choose firmware file",
        backupFirmware: "Backup device",
        downloadFirmware: "Download new firmware",
        connectButton: "Connect",
        disconnectButton: "Disconnect",
        resetButton: "Reset device"
    },
    sv: {
        header: "App inställningar",
        p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
              Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB.`,
        chooseLang: `Välj språk`,
        updateFirmware: `Uppdatera enhetens firmware`,
        nofileSelected: "Du måste välja en firmware fil först!",
        firmwareHelp: `Du måste trycka ned boot knappen på enheten under end strömreset för att gå till bootloader mode.`,
        firmwareHelpStep1: "Koppla från ström och USB från enheten",
        firmwareHelpStep2: "Tryck och håll boot knappen",
        firmwareHelpStep3: "När du trycker knappen, anslut USB",
        firmwareHelpStep4: "Släpp knappen efter ca 1 sek",
        selectFile: "Välj firmware fil",
        backupFirmware: "Backup enhet",
        downloadFirmware: "Ladda ned ny firmware",
        connectButton: "Koppla ihop",
        disconnectButton: "Koppa isär",
        resetButton: "Reset enhet"
      },
    }

    backupPushed() {
      console.log("backup pushed")
      this._dfuUtil.upload();
    }

    downloadPushed() {
      console.log("dl pushed");
      if (!document.querySelector('input[type="file"]').files.length) {
        const lang = document.documentElement.lang;
        notifyUser({msg: this.lang[lang].nofileSelected});
        return;
      }
      this._dfuUtil.download();
    }

    async connectPushed(event) {
      let btn = event.target;
      let lang = document.querySelector("html").lang;

      // split to separate functions to be able to use as callbacks for DfuUtil
      let connectFn = () => {
        menuCloseConnection();
        btn.innerText = this.lang[lang].disconnectButton;
        btn.classList.add("connected");
        for(const input of btn.parentNode.querySelectorAll("input"))
          input.disabled = false;
      }
      let disconnectFn = () => {
        btn.innerText = this.lang[lang].connectButton;
        btn.classList.remove("connected");
        for(const input of btn.parentNode.querySelectorAll("input"))
          input.disabled = true;
      }

      // create a DfuUtil classs
      if (!this._dfuUtil) {
        const file = btn.parentNode.querySelector('input[type="file"]');
        const log = document.getElementById("firmwareLog");
        this._dfuUtil =
          new DfuUtil(connectFn, disconnectFn, file, log, log);
        this._dfuUtil.setLogContext(log);
      }

      let connected = this._dfuUtil.device != null;
      await this._dfuUtil[connected ? "disconnect" : "connect"]();

    }

    async resetDevice() {
      CommunicationBase.instance().sendReset();
    }

    selectLang(evt) {
      localStorage.setItem("lang", evt.target.value);
      location.reload();
    }

    html(parentNode, lang) {
      const tr = this.translationObj[lang];

      let lngOptions = Object.keys(this.translationObj).map(lng=>{
        const selected = (lng === lang) ?  "selected" : "";
        return `<option value="${lng}" ${selected}>${lng}</option>`
      });

      parentNode.innerHTML = `
      <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div class="w3-twothird">
            <h1>${tr.header}</h1>

            <h3>${tr.chooseLang}</h3>
            <select onchange="this.selectLang(event)">${lngOptions.join()}</select>

            <p class="w3-text-grey">${tr.p1}</p>

            <div class="w3-border">
              <h3 class="w3-margin">${tr.updateFirmware}</h3>
              <p class="w3-margin-left">${tr.firmwareHelp}<p>
              <ol class="w3-margin-left">
                <li>${tr.firmwareHelpStep1}</li>
                <li>${tr.firmwareHelpStep2}</li>
                <li>${tr.firmwareHelpStep3}</li>
                <li>${tr.firmwareHelpStep4}</li>
              </ol>
              <button class="w3-margin w3-normal w3-button" style="display:block"
                onclick="this.connectPushed(event)">
                ${tr.connectButton}
              </button>
              <input type="button" onclick="this.backupPushed(event)"
                 class="w3-margin w3-small w3-button" disabled
                value="${tr.backupFirmware}"
              />
              <input type="file" class="w3-button w3-gray w3-margin w3-small"
                    id="firmwareFileInput" disabled
                    value="${tr.selectFile}"
              />
              <input type="button" onclick="this.downloadPushed(event)"
                class="w3-margin w3-small w3-button" disabled
                value="${tr.downloadFirmware}""
              />
              <div id="firmwareLog" class="w3-margin"><div>
            </div>
            <button class="w3-button w3-blue w3-padding-large w3-large w3-margin-top"
              onclick="this.resetDevice(event)">
              ${tr.resetButton}
            </button>
          </div>

          <div class="w3-third w3-center">
            <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
          </div>
        </div>
      </div>`
    }
};
router.registerPage(new SettingsHtmlCls, "settings");

} // end namespace