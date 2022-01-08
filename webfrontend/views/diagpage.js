' use strict';

{ // namespace scope

class DiagPageCls {
  showDiagItems = [];

  translationObj = {
    en: {
      header: "Diagnose page",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
           This is due to the Use of Webusb to "talk" to the microcontroller via USB`,
      showDiagItem: "Show values",
      chooseAll: "Select all",
      start: "Start",
      stop: "Stop",
    },
    sv: {
      header: "Diagnos sida",
      p1: `HTML framände måste laddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
           Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB finns inte tillgänglig innan dessa`,
      showDiagItem: "Visa värden",
      chooseAll: "Välj alla",
      start: "Start",
      stop: "Stop",
    }
  }

  constructor() {
    this.showDiagItems = JSON.parse(localStorage.getItem("showDiagItems") || "[]");
    window.addEventListener("beforeunload", (evt)=>{
      localStorage.setItem("showDiagItems", JSON.stringify(this.showDiagItems));
    })
  }

  async startStop(evt) {
    const diagObj = DiagnoseBase.instance();
    const started = await DiagnoseBase.instance()
                    .setFetchRefreshFreq(diagObj.freq > 0 ? 0 : 10);
    const t = this.translationObj[document.documentElement.lang];
    evt.target.innerText = started ? t.stop : t.start;
  }

  createWidgets() {
    // create dropdown
    const selectNode = this.parentNode.querySelector("#showDiagItm");
    const diagObj = DiagnoseBase.instance();
    const colTypes = diagObj.getColumnTypes()
    this.showItemsWgt =
      new SelectTypesDropDownWgt(this.showDiagItems,
            selectNode, this.translationObj);
    this.showItemsWgt.setData(colTypes, diagObj.dataItems);

    // create liveData
    this.liveDataWgt = new LiveDataWidget({
      shownColumns: this.showDiagItems,
      parentNode: document.getElementById("diagViewContainer")
    });
    this.liveDataWgt.setData(colTypes, diagObj.dataItems);

    // route show/hide event to widgets
    this.showItemsWgt.onChange.subscribe(
      this.liveDataWgt, this.liveDataWgt.render.bind(this.liveDataWgt));
    this.showItemsWgt.onSelectAll.subscribe(
      this.liveDataWgt, this.liveDataWgt.render.bind(this.liveDataWgt));


  }

  html(parentNode, lang) {
    const tr = this.translationObj[lang];
    this.parentNode = parentNode;

    parentNode.innerHTML = `
      <div class="w3-row-padding w3-padding-64 w3-container">
        <div class="w3-content">
          <div>
            <h1>${tr.header}</h1>

            <div id="diagmenubar" class="w3-bar w3-light-grey">
              <button class="w3-button" onclick="this.startStop(event)">
                ${this.started ? tr.stop : tr.start}
              </button>
              <div class="w3-dropdown-hover" id="showDiagItm">
                <button class="w3-button">${tr.showDiagItem}</button>
              </div>
            </div>
            <div class="w3-row" id="diagViewContainer"></div>
            <p class="w3-text-grey">${tr.p1}</p>
          </div>
         </div>
      </div>
    `;
  }

  afterHook(parentNode) {
    this.createWidgets();
  }
}

router.registerPage(new DiagPageCls(), "diag");

} // end namespace scope
