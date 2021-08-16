'use strict';

const configureObj = {
    lang: {
        en: {
            header: "Configure your device",
            p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
                 This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
            readConfigureBtn: "Fetch settings from device",
            curSettings: "Fetched settings:"
        },
        sv: {
            header: "Konfigurera din device",
            p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren. 
                 Detta beror på att WebSerial interfacet för att "prata" med mikrocontrollern via virtuel COM port och USB.`,
            readConfigureBtn: "Hämta inställningar från device",
            curSettings: "Hämtade inställningar:"
        },
    },
    html: (lang) => {
        return `
        <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div class="w3-twothird">
            <h1>${configureObj.lang[lang].header}</h1>

            <button class="w3-button w3-black w3-padding-large w3-large w3-margin-top" onclick="location.hash='conf'">
              ${configureObj.lang[lang].readConfigureBtn}
            </button>
            <h5 class="w3-padding-32">${configureObj.lang[lang].curSettings}</h5>
  
            <p class="w3-text-grey">${configureObj.lang[lang].p1}</p>
          </div>
  
          <div class="w3-third w3-center">
            <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
          </div>
        </div>
      </div>`
    }
};