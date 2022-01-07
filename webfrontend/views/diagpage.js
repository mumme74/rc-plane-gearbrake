' use strict';

{ // namespace scope

class DiagPageCls {
  translationObj = {
    en: {
      header: "Diagnose page",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
           This is due to the Use of Webusb to "talk" to the microcontroller via USB`,
      showDiagItem: "Show values",
    },
    sv: {
      header: "Diagnos sida",
      p1: `HTML framände måste laddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
           Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB finns inte tillgänglig innan dessa`,
      showDiagItem: "Visa värden",
    }
  }

  html(parentNode, lang) {
    const tr = this.translationObj[lang];

    parentNode.innerHTML = `
      <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div>
            <h1>${tr.header}</h1>

            <div id="diagmenubar">
              <div class="w3-dropdown-hover" id="showDiagItm">
                <button class="w3-button">${tr.showDiagItem}</button>
              </div>
            </div>

            <p class="w3-text-grey">${tr.p1}</p>
          </div>
         </div>
      </div>
    `;

  }

  afterHook(parentNode) {
    const selectNode = parentNode.querySelector("#showDiagItm");
    this.showItemsWgt =
        new SelectTypesDropDownWgt([], selectNode, this.translationObj);
    this.showItemsWgt.render();
  }
}

router.registerPage(new DiagPageCls(), "diag");

} // end namespace scope
