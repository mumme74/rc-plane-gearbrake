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
    txt: {en: "Accelerometer Y", sv: "Accelerometer Y"},
    title: {
      en: "Accelerometer value for Y-axis",
      sv: "Accelerometer värde för Y-axeln"
    }
  },
  
  // must be last, indicates end of log items
  log_end: {txt: {en: "Log end", sv: "Log slut"}},  
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
  fetchLog: ()=>{
    console.log("Fetch log from device")
  },
  clearLog: ()=>{
    console.log("Clear log in device")
  },
  selectStart: (evt, sessionIdx) => {
    console.log("view log " + sessionIdx);
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

  buildItemDropdown: (sessionIdx, lang) => {

    // create dropdown to select what items to show
    // iterate over each entry and check if we have a new item
    let items = [];
    const typeKeys = Object.keys(LogItem.Types); // is offset by 1, ie: -1 -> 0
    const entries = LogRoot.instance().getSession(sessionIdx);
    entries.forEach(entry=>{
      entry.scanChildren();
      entry.children.forEach(itm=>{
        if (items.findIndex(item=>item.entry.type===itm.type) === -1) {
          let idx = itm.type < LogItem.Types.log_end ?
                      // +1 due to typeKeys is offset by 1
                      itm.type +1 : typeKeys.length-1
          const tr = LogItemTypesTranslated[typeKeys[idx]];
          items.push({entry:itm, txt:tr.txt[lang], title:tr.title[lang]});
        } 
      })
    });

    // remove old entres in dropdown
    items = items.sort((a, b) =>a.txt < b.txt);
    const dropdown = document.getElementById("showLogItemDropdown");
    while(dropdown.lastElementChild != dropdown.firstElementChild)
      dropdown.removeChild(dropdown.lastElementChild);

    const checked = dropdown.firstElementChild.firstElementChild.checked

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
        if (idx < 0 && !evt.target.checked)
          hideLogItems.push(vlu);
        else if (idx > -1 && evt.target.checked)
          hideLogItems.splice(idx);
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
      lbl.firstElementChild.checked = evt.target.checked;
    }
  },
  rebuildLogTable: (sessionIdx, lang) => {
    console.log("rebuildLogTable", lang)
  },
  lang: {
    en: {
      header: "View log",
      p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser. 
            This is due to the Use of Webserial to "talk" to the microcontroller via virtual com port and USB`,
      fetchLogBtn: "Fetch log from device",
      clearLogBtn: "Clear log in device",
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
          <h5 class="w3-padding-8">${tr.fetchedLogPoints}</h5>
          <div class="w3-bar w3-light-grey">
            <!--<button class="w3-bar-item w3-button">Home</button>
            <button class="w3-bar-item w3-button">Link 1</button>-->
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
            <div class="w3-col s4">
              left
            </div>
            <div class="w3-col s8">
              
            </div>
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