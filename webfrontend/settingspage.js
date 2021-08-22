'use strict';

const appSettingsHtmlObj = {
    lang: {
        en: {
            header: "App settings",
            p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
                 This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
            chooseLang: `Choose language`
        },
        sv: {
            header: "App inställningar",
            p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren. 
                 Detta beror på att WebSerial interfacet för att "prata" med mikrocontrollern via virtuel COM port och USB.`,
            chooseLang: `Välj språk`
        },
    },
    html: (lang) => {
      let lngOptions = Object.keys(appSettingsHtmlObj.lang).map(lng=>{
        const selected = (lng === lang) ?  "selected" : "";
        return `<option value="${lng}" ${selected}>${lng}</option>`
      });
      return `
        <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div class="w3-twothird">
            <h1>${appSettingsHtmlObj.lang[lang].header}</h1>

            <h3>${appSettingsHtmlObj.lang[lang].chooseLang}</h3>
            <select onchange="appSettingsHtmlObj.selectLang(event)">${lngOptions.join()}</select>
  
            <p class="w3-text-grey">${appSettingsHtmlObj.lang[lang].p1}</p>
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