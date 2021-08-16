'use strict';

const settingsObj = {
    lang: {
        en: {
            header: "App settings",
            p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
                 This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
            readConfigureBtn: "Fetch settings from device",
            curSettings: "Fetched settings:"
        },
        sv: {
            header: "App inställningar",
            p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren. 
                 Detta beror på att WebSerial interfacet för att "prata" med mikrocontrollern via virtuel COM port och USB.`,
            readConfigureBtn: "Hämta inställningar från device",
            curSettings: "Hämtade inställningar:"
        },
    },
    html: (lang) => {
      let lngOptions = Object.keys(settingsObj.lang).map(lng=>{
        const selected = (lng === lang) ?  "selected" : "";
        return `<option value="${lng}" ${selected}>${lng}</option>`
      });
      return `
        <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div class="w3-twothird">
            <h1>${settingsObj.lang[lang].header}</h1>

            <select onchange="settingsObj.selectLang(event)">${lngOptions.join()}</select>
            <button class="w3-button w3-black w3-padding-large w3-large w3-margin-top" onclick="location.hash='conf'">
              ${settingsObj.lang[lang].readConfigureBtn}
            </button>
            <h5 class="w3-padding-32">${settingsObj.lang[lang].curSettings}</h5>
  
            <p class="w3-text-grey">${settingsObj.lang[lang].p1}</p>
          </div>
  
          <div class="w3-third w3-center">
            <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
          </div>
        </div>
      </div>`
    },
    selectLang: function (evt) {
      localStorage.setItem("lang", evt.target.value);
      location.reload();
    }
};