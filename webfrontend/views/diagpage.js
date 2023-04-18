' use strict';

{ // namespace scope

class DiagPageCls {
  showDiagItems = [];
  chartWgt = null;

  translationObj = {
    en: {
      header: "Diagnose page",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
           This is due to the Use of Webusb to "talk" to the microcontroller via USB`,
      showDiagItem: "Show values",
      chooseAll: "Select all",
      start: "Start",
      stop: "Stop",
      setVluExplain: "Double click on row to set a value",
    },
    sv: {
      header: "Diagnos sida",
      p1: `HTML framände måste laddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
           Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB finns inte tillgänglig innan dessa`,
      showDiagItem: "Visa värden",
      chooseAll: "Välj alla",
      start: "Start",
      stop: "Stop",
      setVluExplain: "Dubbelklicka på raden för att sätta ett värde"
    }
  }

  constructor() {
    this.showDiagItems = JSON.parse(localStorage.getItem("showDiagItems") || "[]");
    window.addEventListener("beforeunload", (evt)=>{
      localStorage.setItem("showDiagItems", JSON.stringify(this.showDiagItems));
    });
  }

  async startStop(evt) {
    const diagObj = DiagnoseBase.instance();
    const started = await DiagnoseBase.instance()
                    .setFetchRefreshFreq(diagObj.freq > 0 ? 0 : 5);
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
      this.liveDataWgt, this.liveDataWgt.shownItemsChanged.bind(this.liveDataWgt));
    this.showItemsWgt.onSelectAll.subscribe(
      this.liveDataWgt, this.liveDataWgt.shownItemsChanged.bind(this.liveDataWgt));

    // create a graph and have it updated each diagrefresh
    this.liveDataGraph = new ChartWidget(
      this.showDiagItems,
      document.getElementById("chartContainer"),
      false);
    this.liveDataGraph.setData(colTypes, diagObj.logPoints);
    this.liveDataGraph.setWidth(500);
    // show type in graph when click on row
    this.liveDataWgt.onSelectType.subscribe(
      this.liveDataGraph,
      this.liveDataGraph.selectAType.bind(this.liveDataGraph)
    );
    // re-render graph when new data arrives
    diagObj.onRefresh.subscribe(
      this.liveDataGraph,
      this.liveDataGraph.render.bind(this.liveDataGraph)
    );
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
              <span class="w3-small">${tr.setVluExplain}</span>
            </div>
            <div class="w3-border" id="diagViewContainer"
                 style="display:flex; flex-direction:row-reverse;">
              <div id="chartContainer"
                 style="min-width:53%"></div>
            </div>
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
