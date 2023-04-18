'use strict';

{ // namespace scope

class ViewLogCls {
  currentSession = -1;
  tblWgt = null;
  chartWgt = null;
  typeDrpDwnWgt = null;
  showLogItems = [];
  activeDisplayWgt = new WidgetBaseCls();
  selectMenuWgt = null;


  constructor() {
    // Types stored in this array will not be shown in the log
    this.showLogItems = JSON.parse(localStorage.getItem('showLogItems') || "[]");
    window.addEventListener("beforeunload", (evt)=>{
      localStorage.setItem('showLogItems', JSON.stringify(this.showLogItems));
    })
  }

  async fetchLog(evt) {
    evt.target.disabled = true;
    console.log("Fetch log from device");
    let {ok, data, totalSize, logNextAddr} = await CommunicationBase.instance().readLog();
    evt.target.disabled = false;

    if (!ok)
      return;

    const logRoot = LogRoot.instance();
    logRoot.clear();
    logRoot.parseLog(data, logNextAddr);
    this.updateLogControls(`Device, read ${totalSize} bytes`);
  }

  async clearLog(evt) {
    console.log("Clear log in device");
    evt.target.disabled = true;
    const res = await CommunicationBase.instance().clearLogEntries();
    if (res) {
      LogRoot.instance().clear();
      /*if (!await CommunicationBase.instance().sendReset())
        notifyUser({msg: "Culd not reset device",
                    type: notifyTypes.Warn});*/
    }
    evt.target.disabled = false;
  }

  async saveLog(){
    const date = new Date().toISOString();
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `mylog-${date}.rclog`,
      types: [{
      description: 'Log file *.rclog',
      accept: {'application/octet-stream': ['.rclog']},
    }]});
    const fileStream = await fileHandle.createWritable();
    const logRoot = LogRoot.instance();
    let endPos = logRoot.byteArray.byteLength;
    const logWithStartAddr = new Uint8Array(endPos + 4);
    logWithStartAddr.set(logRoot.byteArray);
    logWithStartAddr[endPos++] = (logRoot.startPos & 0xFF000000)>>24;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x00FF0000)>>16;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x0000FF00)>>8;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x000000FF)>>0;
    await fileStream.write(new Blob([logWithStartAddr],
                {type: "application/octet-stream"}));
    await fileStream.close();
  }

  async readLog() {
    const [fileHandle] = await window.showOpenFilePicker({types: [{
      description: 'Log file *.rclog',
      accept: {'application/octet-stream': ['.rclog']},
    }]});
    const file = await fileHandle.getFile();
    const logRoot = LogRoot.instance();
    logRoot.clear();
    const fileLog = new Uint8Array(await file.arrayBuffer());
    const log = new Uint8Array(fileLog.slice(0, fileLog.byteLength-4));
    let size = fileLog.byteLength;
    // read in big endian
    const startAddr = fileLog[--size] << 0 | fileLog[--size] << 8 |
                      fileLog[--size] << 16  | fileLog[--size] << 24;
    logRoot.parseLog(log, startAddr);
    this.updateLogControls(file.name);
  }

  updateLogControls(origin) {
    const sel = document.querySelector("#selectSessionBtn > div");
    sel.innerHTML = this.buildSessions().join("\n");
    router.fixEvents(this, sel);
    this.selectSession((LogRoot.instance().coldStarts.length || 1) -1);
    this.setLogOrigin(origin);
  }

  selectSession(sessionIdx) {
    this.currentSession = sessionIdx;
    // change text on dropdown btn
    const lang = document.documentElement.lang;
    const latest = this.translationObj[lang].latestSession;
    const j = LogRoot.instance().coldStarts.length - 1 - sessionIdx;
    const txt = j === 0 ? latest : latest + " - " + j;
    document.querySelector("#selectSessionBtn > button").innerText = txt;

    const data = LogRoot.instance().getSession(sessionIdx);
    if (data.length && data[0].children[0].type === LogItem.Types.log_coldStart)
      data.splice(0,1); // cut away cold startindex entry
    const colData = LogRoot.instance().getColumnTypes(sessionIdx);

    if (!this.selectMenuWgt) {
      this.selectMenuWgt = new SelectMenuWgtCls(
        document.getElementById("logViewMenuBar"),
        this.translationObj, this.showLogItems, colData, data
      );
    }

    this.selectMenuWgt.setData(colData, data);
  }

  selectActiveView(event, type) {
    let buttons = event.target.parentElement.querySelectorAll(":scope>button");
    buttons.forEach(btn=>{
      btn.classList[btn === event.target ? "add" : "remove"]("w3-gray");
    });

    this.activeDisplayWgt = type === 'tab' ? this.tblWgt : this.chartWgt;
    this.tblWgt.setVisible(type === 'tab');
    this.chartWgt.setVisible(type === 'chart');
  }

  buildSessions(lang = document.documentElement.lang) {
    const logRoot = LogRoot.instance();
    const tr = this.translationObj[lang];
    let starts = [];
    for (let i = logRoot.coldStarts.length -1, j = 0; i > -1 ; --i, ++j) {
      const latest = tr.latestSession;
      const txt = j === 0 ? latest : latest + " - " + j;
      starts.push(`<button class="w3-bar-item w3-button"
                          onclick="this.selectSession(${i})">${txt}
                  </button>`);
    }
    return starts;
  }

  setLogOrigin(origin) {
    const logOrigin = document.getElementById("logOrigin");
    if (logOrigin) logOrigin.innerText = origin;
  }

  translationObj = {
    en: {
      header: "View log",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
            This is due to the Use of WebUSB to "talk" to the microcontroller via USB`,
      fetchLogBtn: "Fetch log from device",
      clearLogBtn: "Clear log in device",
      saveLogBtn: "Save log to file",
      readLogBtn: "Read log from file",
      fetchedLogPoints: "Fetched log:",
      selectLog: "Select log",
      latestSession: "Latest session",
      showLogItem: "Show log items",
      chooseAll: "Choose all",
      tblTabHeader: "Show table",
      chartTabHeader: "Show chart",
      downloadData: "Download data",
    },
    sv: {
      header: "Visa logg",
      p1: `HTML framände måste laddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
            Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB finns inte tillgänglig innan dessa`,
      fetchLogBtn: "Hämta logg från enhet",
      clearLogBtn: "Nollställ loggminne i enhet",
      saveLogBtn: "Spara logg till fil",
      readLogBtn: "Läs logg från fil",
      fetchedLogPoints: "Hämtad logg:",
      selectLog: "Välj logg",
      latestSession: "Senaste session",
      showLogItem: "Visa logg saker",
      chooseAll: "Välj alla",
      tblTabHeader: "Visa tabell",
      chartTabHeader: "Visa graf",
      downloadData: "Ladda ned data",
    },
  }

  html(parentNode, lang) {
    const tr = this.translationObj[lang];
    const logOrigin = location.hash.indexOf("testingGui") ? "Testing" : "";
    this.selectMenuWgt = null;

    parentNode.innerHTML = `
      <div class="w3-row-padding w3-padding-64 w3-container">
      <div class="w3-content">
        <div>
          <h1>${tr.header}</h1>

          <button class="w3-button w3-blue w3-padding-large w3-large w3-margin-top"
                  onclick="this.fetchLog(event)">
            ${tr.fetchLogBtn}
          </button>
          <button class="w3-button w3-orange w3-padding-large w3-large w3-margin-top"
                  onclick="this.clearLog(event)">
            ${tr.clearLogBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top"
                  onclick="this.saveLog(event)">
            ${tr.saveLogBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top"
                  onclick="this.readLog(event)">
            ${tr.readLogBtn}
          </button>
          <h5 class="w3-padding-8">${tr.fetchedLogPoints}
            <span id="logOrigin" style="font-weight:bold;">${logOrigin}</span>
          </h5>
          <div class="w3-bar w3-light-grey" id="logViewMenuBar">
            <div class="w3-dropdown-hover" id="selectSessionBtn">
              <button class="w3-button">${tr.selectLog}</button>
              <div class="w3-dropdown-content w3-bar-block w3-card-4">
                ${this.buildSessions(lang).join("\n")}
              </div>
            </div>
            <div class="w3-dropdown-hover" id="showLogItm">
              <button class="w3-button">${tr.showLogItem}</button>
            </div>
          </div>

          <div class="w3-row" id="logViewContainer">
            <div style="overflow: auto; max-width: 80vw;" id="chartContainer"></div>
          </div>
          <p class="w3-text-grey">${tr.p1}</p>
        </div>

        <div class="w3-third w3-center">
          <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
        </div>
      </div>
    </div>`
  }
}

router.registerPage(new ViewLogCls(), "viewlog");

} // end namespace scope
