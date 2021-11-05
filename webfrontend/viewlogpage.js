'use strict';

const LogItemTypesTranslated = {
  uninitialized: {
    txt: {en: "Unintialized", sv: "Oinitialiserad"},
    title: {en: "Not valid", sv: "Ej gilltig"}
  },

  // speed as in wheel revs / sec
  speedOnGround: {
    txt: {en: "Wheel revs on ground", sv: "Hjul rotation på marken"},
    title: {en: "Calculated speed on the ground", sv: "Beräknad hastighet på marken"}
  },
  wheelRPS_0: {
    txt: {en: "Wheel sensor 0", sv: "Hjulsensor 0"},
    title: {en: "Measured value", sv: "Uppmätt värde"}
  },
  wheelRPS_1: {
    txt: {en: "Wheel sensor 1", sv: "Hjulsensor 1"},
    title: {en: "Measured value", sv: "Uppmätt värde"}
  },
  wheelRPS_2: {
    txt: {en: "Wheel sensor 2", sv: "Hjulsensor 2"},
    title: {en: "Measured value", sv: "Uppmätt värde"}
  },
  // brake force
  wantedBrakeForce: {
    txt: {en: "Requested brakeforce", sv: "Begärd bromskraft"},
    title: {en: "Brakeforce from reciever", sv: "Bromskraft från mottagaren"}
  },
  brakeForce0_out: {
    txt: {en: "Brake 0 output force", sv: "Broms 0 utkraft"},
    title: {
      en: "Brake 0 force sent to wheel brake 0-100%",
      sv: "Broms 0 kraft sänt till hjulbroms"
    }
  },
  brakeForce1_out: {
    txt: {en: "Brake 1 output force", sv: "Broms 1 utkraft"},
    title: {
      en: "Brake 1 force sent to wheel brake 0-100%",
      sv: "Broms 1 kraft sänt till hjulbroms"
    }
  },
  brakeForce2_out: {
    txt: {en: "Brake 2 output force", sv: "Broms 2 utkraft"},
    title: {
      en: "Brake 2 force sent to wheel brake 0-100%",
      sv: "Broms 2 kraft sänt till hjulbroms"
    }
  },
  // wheel slip
  slip0: {
    txt: {en: "Brake 0 wheel slip", sv: "Broms 0 hjulsläpp"},
    title: {
      en: "Brake 0 calculated wheel slippage", 
      sv: "Broms 0 beräknat hjulsläpp"
    }
  },
  slip1: {
    txt: {en: "Brake 1 wheel slip", sv: "Broms 1 hjulsläpp"},
    title: {
      en: "Brake 1 calculated wheel slippage", 
      sv: "Broms 1 beräknat hjulsläpp"
    }
  },
  slip2: {
    txt: {en: "Brake 2 wheel slip", sv: "Broms 2 hjulsläpp"},
    title: {
      en: "Brake 2 calculated wheel slippage", 
      sv: "Broms 2 beräknad hjulsläpp"
    }
  },
  // steering brakes
  accelSteering: {
    txt: {en: "Accelerometer steering",  sv: "Accelerometer styrning"},
    title: {
      en: "How much steeringbrake due to accelerometer sensing",
      sv: "Hur mycket styrbroms från accelerometern"
    }
  },
  wsSteering: {
    txt: {en: "Wheel brake steering", sv: "Hjulbroms styrning"},
    title: {
      en: "Wheel brake differential steering based of different sheel speed", 
      sv: "Hjulbroms styrning baserat på olika hjulhatighet"
    }
  },
  // accelerometer
  accel: {
    txt: {en: "Accel. control axis", sv: "Accel. kontroll axel"},
    title: {
      en: "Accelerometer control axis value\nThe value form the axis used to steer brake",
      sv: "Accelerometer kontrol axel värde\nDet värde som används för att styrbromsa"
    }
  },
  accelX: {
    txt: {en: "Accelerometer X", sv: "Accelerometer X"},
    title: {
      en: "Accelerometer value for X-axis",
      sv: "Accelerometer värde för X-axeln"
    }
  },
  accelY: {
    txt: {en: "Accelerometer Y", sv: "Accelerometer Y"},
    title: {
      en: "Accelerometer value for Y-axis",
      sv: "Accelerometer värde för Y-axeln"
    }
  },
  accelZ: {
    txt: {en: "Accelerometer Z", sv: "Accelerometer Z"},
    title: {
      en: "Accelerometer value for Z-axis",
      sv: "Accelerometer värde för Z-axeln"
    }
  },
  
  // must be last of items from board, indicates end of log items
  log_end: {txt: {en: "Log end", sv: "Log slut"}},

  invalid: {
    txt:{en: "Invalid/test", sv: "Ogilltig/test"},
    title: {en: "Invalid, can be test header", sv: "Ogilltig, kan vara test rubrik"}
  },

  logIndex: {
    txt: {en: "index", sv: "index"},
    title: {
      en: "Index from session start, starts at 1 and counts upward for each logpoint",
      sv: "Index från sessions start, börjar räkna up från 1 varje logpunkt"
    }
  },

  // special         
  log_coldStart: {
    txt: {en: "Start from reset", sv: "Uppstart från reset"},
    title: {
      en: "A special log point to mark a device restart.\nUse to find out when a new flying session started",
      sv: "En speciell log punkt för att markera en omstart.\nAnvänd för att se när en ny flygsession börjar"
    },
  },
}

// Types stored in this array will not be shown in the log
const hideLogItems = JSON.parse(localStorage.getItem('hideLogItems') || "[]");
window.addEventListener("beforeunload", (evt)=>{
  localStorage.setItem('hideLogItems', JSON.stringify(hideLogItems));
})

const viewlogHtmlObj = {
  currentSession: -1,
  fetchLog: async ()=>{
    console.log("Fetch log from device");
    let startAddr = await SerialBase.instance().getLogNextAddr();
    let log = await SerialBase.instance().readLog();
    if (isNaN(startAddr) || (!Array.isArray(log) || !(log instanceof Uint8Array)))
      return;

    const logRoot = LogRoot.instance();
    logRoot.clear();
    logRoot.parseLog(log, startAddr);
  },
  clearLog: async ()=>{
    console.log("Clear log in device");
    const res = await SerialBase.instance().clearLogEntries();
    if (res) {
      LogRoot.instance().clear();
    }
  },
  saveLog: async () => {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'mylog.rclog',
      types: [{
      description: 'Log file *.rclog',
      accept: {'application/octet-stream': ['.rclog']},
    }]});
    const fileStream = await fileHandle.createWritable();
    const logRoot = LogRoot.instance();
    let endPos = logRoot.byteArray.byteLength;
    const logWithStartAddr = new Uint8Array(endPos + 4);
    logWithStartAddr.set(logRoot.byteArray);
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x000000FF)>>0;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x0000FF00)>>8;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0x00FF0000)>>16;
    logWithStartAddr[endPos++] = (logRoot.startPos & 0xFF000000)>>24;
    await fileStream.write(new Blob([logWithStartAddr],
                {type: "application/octet-stream"}));
    await fileStream.close();
  },
  readLog: async () => {
    const [fileHandle] = await window.showOpenFilePicker({types: [{
      description: 'Log file *.rclog',
      accept: {'application/octet-stream': ['.rclog']},
    }]});
    const file = await fileHandle.getFile();
    LogRoot.instance().clear();
    const log = new Uint8Array(await file.arrayBuffer());
    const size = log.byteLength;
    const startAddr = log[size-1] << 24 | log[size-2] << 16 |
                      log[size-3] << 8 | log[size-4];
    LogRoot.instance().parseLog(log, startAddr);
    routeMainContent();
  },
  selectStart: (evt, sessionIdx) => {
    viewlogHtmlObj.currentSession = sessionIdx;
    // change text on dropdown btn
    const lang = document.querySelector("html").lang;
    const latest = viewlogHtmlObj.lang[lang].latestSession;
    const j = LogRoot.instance().coldStarts.length - 1 - sessionIdx;
    const txt = j === 0 ? latest : latest + " - " + j;
    evt.target.parentNode.previousElementSibling.innerText = txt;

    // build dropdown with items to show
    viewlogHtmlObj.buildItemDropdown(sessionIdx, lang);

    // build the actual table
    viewlogHtmlObj.rebuildLogTable(sessionIdx, lang);
  },

  _sessionItems: (sessionIdx, lang) => {
    // iterate over each entry and check if we have a new item
    let items = [];
    const typeKeys = Object.keys(LogItem.Types); // is offset by 1, ie: -1 -> 0
    const entries = LogRoot.instance().getSession(sessionIdx);
    entries.forEach(entry=>{
      entry.scanChildren();
      entry.children.forEach(itm=>{
        if (items.findIndex(item=>item.entry.type===itm.type) === -1) {
          let tr;
          if (itm.type < LogItem.Types.log_end) {
            // +1 due to typeKeys is offset by 1
            tr = LogItemTypesTranslated[typeKeys[itm.type +1]];
          } else if (itm.type === LogItem.Types.log_coldStart)
            return; // no use to have this as a column
          else
            tr = LogItemTypesTranslated.invalid;
          items.push({entry:itm, txt:tr.txt[lang], title:tr.title[lang]});
        } 
      })
    });
    return items;
  },

  buildItemDropdown: (sessionIdx, lang) => {
    // create dropdown to select what items to show

    // get items in this session
    let items = viewlogHtmlObj._sessionItems(sessionIdx, lang)
                    .sort((a, b) =>a.txt < b.txt);

    // remove old entres in dropdown
    const dropdown = document.getElementById("showLogItemDropdown");
    while(dropdown.lastElementChild != dropdown.firstElementChild)
      dropdown.removeChild(dropdown.lastElementChild);

    // global checked base on select all chkbox
    const checked = dropdown.firstElementChild.firstElementChild.checked

    // create all checkboxes
    items.forEach(itm=>{
      const lbl = document.createElement("label");
      lbl.className = "w3-bar-item w3-button";
      lbl.title = itm.title;
      const chkbox = document.createElement("input");
      chkbox.type = "checkbox";
      chkbox.className = "w3-button";
      chkbox.value = itm.entry.type;
      chkbox.checked = hideLogItems.indexOf(itm.entry.type) > -1 ? false : checked;
      chkbox.addEventListener("change", (evt)=>{
        let vlu = parseInt(evt.target.value.trim());
        const idx = hideLogItems.indexOf(vlu);
        if (idx < 0 && !evt.target.checked) {
          hideLogItems.push(vlu);
          viewlogHtmlObj.rebuildLogTable(sessionIdx, lang);
        } else if (idx > -1 && evt.target.checked) {
          hideLogItems.splice(idx, 1);
          viewlogHtmlObj.rebuildLogTable(sessionIdx, lang);
        }
      });
      lbl.appendChild(chkbox);
      lbl.appendChild(document.createTextNode(` ${itm.txt}`));
      dropdown.appendChild(lbl);
    })
  },
  selectAllClicked: (evt)=>{
    let lbl = evt.target.parentNode;
    while(lbl.nextElementSibling) {
      lbl = lbl.nextElementSibling;
      const chkBox = lbl.firstElementChild;
      chkBox.checked = evt.target.checked;
      if (chkBox.checked) hideLogItems.splice(0, hideLogItems.length);
      else hideLogItems.push(parseInt(chkBox.value.trim()));
    }
    if (viewlogHtmlObj.currentSession > -1) {
      const lang = document.querySelector("html").lang;
      viewlogHtmlObj.rebuildLogTable(viewlogHtmlObj.currentSession, lang);
    }
  },
  rebuildLogTable: (sessionIdx, lang) => {
    // create a new log table
    console.log("rebuildLogTable", lang);

    // get table remove from DOM to optimize
    let tbl = document.getElementById("logTableEntries");
    const parentNode = tbl.parentElement;
    tbl.remove();

    // delete old entries
    while (tbl.firstChild)
      tbl.removeChild(tbl.lastChild);

    // fetch all items (headers) for this log session
    let items = viewlogHtmlObj._sessionItems(sessionIdx, lang);

    // create a header
    let thead = document.createElement("thead");
    let tr = document.createElement("tr");

    let colTypes = [];

    items.forEach(itm => {
      if (hideLogItems.indexOf(itm.entry.type) < 0) {
        let th = document.createElement("th");
        // split to 2 strings to be able to ellide
        //<th><span>long text to be clipped</span>not clipped</th>
        let span = document.createElement("span")
        span.appendChild(document.createTextNode(
                    itm.txt.substr(0, itm.txt.length-2)));
        th.appendChild(span);
        th.appendChild(document.createTextNode(
                    itm.txt.substr(itm.txt.length-2)));
        th.title = itm.txt + "\n" +itm.title;
        tr.appendChild(th);
        colTypes.push(itm.entry.type);
      }
    });

    // specialcase counter column
    if (tr.firstChild) {
      const idxTh = document.createElement("th");
      idxTh.className = "index";
      idxTh.textContent = LogItemTypesTranslated.logIndex.txt[lang];
      idxTh.title = idxTh.textContent + "\n" +
                    LogItemTypesTranslated.logIndex.title[lang];
      tr.insertBefore(idxTh, tr.firstChild);
    }

    thead.appendChild(tr);
    tbl.appendChild(thead);

    // create table body
    let entries = LogRoot.instance().getSession(sessionIdx);
    let tbody = document.createElement("tbody");
    let counter = 1;
    entries.forEach(entry => {
      let tr = document.createElement("tr");
      entry.scanChildren();

      // create a row with all shown types
      let tdNodes = colTypes.map(type=>{
        let td = document.createElement("td");
        tr.appendChild(td);
        return td;
      });

      let showRow = false;
      entry.children.forEach(itm=>{
        if (hideLogItems.indexOf(itm.type) < 0) {
          let td = tdNodes[colTypes.indexOf(itm.type)];
          if (td && !td.firstChild) {
            td.appendChild(
              document.createTextNode(itm.realVlu() + itm.unit()));
            showRow = true;
          }
        }
      });

      if (showRow) {// only if we have any children
        let td = document.createElement("td");
        td.className = "index";
        td.textContent = counter++;
        tr.insertBefore(td, tr.firstChild);
        tbody.appendChild(tr);
      }
    });

    tbl.appendChild(tbody);

    // reattach tbl to DOM
    parentNode.appendChild(tbl);

  },
  lang: {
    en: {
      header: "View log",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
            This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
      fetchLogBtn: "Fetch log from device",
      clearLogBtn: "Clear log in device",
      saveLogBtn: "Save log to file",
      readLogBtn: "Read log from file",
      fetchedLogPoints: "Fetched log:",
      selectLog: "Select log",
      latestSession: "Latest session",
      showLogItem: "Show log items",
      chooseAll: "Choose all",
    },
    sv: {
      header: "Visa logg",
      p1: `HTML framände måste laddas med chrome version 89 eller senare, eller senaste Edge webbläsaren. 
            Detta beror på att WebSerial interfacet för att "prata" med mikrocontrollern via virtuel COM port och USB finns inte tillgänglig innan dessa`,
      fetchLogBtn: "Hämta logg från enhet",
      clearLogBtn: "Nollställ loggminne i enhet",
      saveLogBtn: "Spara logg till fil",
      readLogBtn: "Läs logg från fil",
      fetchedLogPoints: "Hämtad logg:",
      selectLog: "Välj logg",
      latestSession: "Senaste session",
      showLogItem: "Visa logg saker",
      chooseAll: "Välj alla",
    },
  },
  html: (lang) => {
    const tr = viewlogHtmlObj.lang[lang];

    const logRoot = LogRoot.instance();
    let starts = [];
    for (let i = logRoot.coldStarts.length -1, j = 0; i > -1 ; --i, ++j) {
      const latest = tr.latestSession;
      const txt = j === 0 ? latest : latest + " - " + j;
      starts.push(`<button class="w3-bar-item w3-button" onclick="viewlogHtmlObj.selectStart(event, ${i})">${txt}</button>`);
    }

    return `
      <div class="w3-row-padding w3-padding-64 w3-container">
      <div class="w3-content">
        <div class="">
          <h1>${tr.header}</h1>

          <button class="w3-button w3-blue w3-padding-large w3-large w3-margin-top" onclick="viewlogHtmlObj.fetchLog()">
            ${tr.fetchLogBtn}
          </button> 
          <button class="w3-button w3-orange w3-padding-large w3-large w3-margin-top" onclick="viewlogHtmlObj.clearLog()">
            ${tr.clearLogBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top" onclick="viewlogHtmlObj.saveLog()">
            ${tr.saveLogBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top" onclick="viewlogHtmlObj.readLog()">
            ${tr.readLogBtn}
          </button>
          <h5 class="w3-padding-8">${tr.fetchedLogPoints}</h5>
          <div class="w3-bar w3-light-grey">
            <div class="w3-dropdown-hover">
              <button class="w3-button">${tr.selectLog}</button>
              <div class="w3-dropdown-content w3-bar-block w3-card-4">
                ${starts.join("\n")}
              </div>
            </div>
            <div class="w3-dropdown-hover" id="showLogItm">
              <button class="w3-button">${tr.showLogItem}</button>
              <div class="w3-dropdown-content w3-bar-block w3-card-4" id="showLogItemDropdown">
                <label class="w3-bar-item w3-button">
                  <input type="checkbox" class="w3-button" onchange="viewlogHtmlObj.selectAllClicked(event)" checked/>
                  ${tr.chooseAll}
                </label>
              </div>
            </div>
          </div>
          
          <div class="w3-row">
            <table id="logTableEntries" class="w3-table w3-bordered w3-border w3-responsive">
            </table>
          </div>
          <p class="w3-text-grey">${viewlogHtmlObj.lang[lang].p1}</p>
        </div>

        <div class="w3-third w3-center">
          <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
        </div>
      </div>
    </div>`
  }
};