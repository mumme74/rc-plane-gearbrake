'use strict';

const welcomeObj = {
    lang: {
        en: {
            header: "Configure your device",
            p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
                 This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
            btn: "Get Started!",
        },
        sv: {
            header: "Konfigurera din device",
            p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren. 
                 Detta beror på att WebSerial interfacet för att "prata" med mikrocontrollern via virtuel COM port och USB.`,
            btn: "Börja nu!",
        },
    },
    html: (lang) => {
        return `
    <header class="w3-container w3-red w3-center" id="introInfo" style="padding:128px 16px">
      <h1 class="w3-margin w3-jumbo">RC-plane gearbrake</h1>
      <p class="w3-xlarge">${welcomeObj.lang[lang].header}</p>
      <p>${welcomeObj.lang[lang].p1}</p>
      <button class="w3-button w3-black w3-padding-large w3-large w3-margin-top" onclick="location.hash='conf'">${welcomeObj.lang[lang].btn}</button>
    </header>`
    }
};