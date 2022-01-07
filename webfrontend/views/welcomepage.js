'use strict';

{ // namespace block

class WelcomeHtmlCls {
    translationObj = {
        en: {
            header: "Configure your device",
            p1: `HTML frontend must be loaded by chrome version 89 or later
                 or the latest Edge browser.<br/>
                This is due to the Use of WebUSB to "talk" to the microcontroller via USB is only available in newer versions of those browsers.`,
            btn: "Get Started!",
        },
        sv: {
            header: "Konfigurera din device",
            p1: `HTML framände måste laddas med antingen Google Chrome v89 eller senare,
                eller Microsoft Edge v89 eller senare.<br/>
                Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via
                USB endast finns i nyare versioner av dessa webbläsare`,
            btn: "Börja nu!",
        },
    }

    html(parentNode, lang) {
        const tr = this.translationObj[lang];
        parentNode.innerHTML = `
            <header class="w3-container w3-red w3-center" id="introInfo"
                style="padding:128px 16px">
            <h1 class="w3-margin w3-jumbo">RC-plane gearbrake</h1>
            <p class="w3-xlarge">${tr.header}</p>
            <p>${tr.p1}</p>
            <button class="w3-button w3-black w3-padding-large w3-large w3-margin-top"
                onclick="location.hash='conf'">${tr.btn}</button>
            </header>`;
    }
};
router.registerPage(new WelcomeHtmlCls(), "");
} // end namespace
