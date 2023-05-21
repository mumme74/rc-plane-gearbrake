'use strict';

{ // namespace block
const PwmFreqOptionsTranslated = {
  off: {en: "Off", sv: "Av"},
  freq1Hz: "1hz",
  freq10Hz: "10hz",
  freq100Hz: "100hz",
  freq1kHz: "1khz",
  freq10kHz: "10khz"
}

const WheelDirTranslated = {
  center: {en: "Center", sv: "Mitten"},
  left: {en: "Left", sv: "Vänster"},
  right: {en: "Right", sv: "Höger"}
}

// FIXME cleanup these render function to be oop

function renderBase(tag, {key, rdonly = false, txt, title}) {
  const readonly = rdonly ? " readonly" : "";
  return {
    lbl: `<label for="${key}">${txt}</label>`,
    part: `<${tag} ${readonly} name="${key}" title="${title}"`
  }
}

function renderTextbox({key, vlu, txt, title, rdonly = false}) {
  const {lbl, part} = renderBase("input", {key, txt, title, rdonly});
  return `${lbl}\n${part} type="text" value="${vlu}"
          onchange="ConfigBase.changeVlu('${key}', event.target.value)" />`;
}

function renderSpinbox({key, vlu, txt, title, rdonly = false, min = 0, max = 100}) {
  const {lbl, part} = renderBase("input", {key, txt, title, rdonly});
  return `${lbl}\n${part} type="number" value="${vlu}" min="${min}" max="${max}"
          onchange="ConfigBase.changeVlu('${key}', event.target.value)"/>`;
}

function renderCheckbox({key, vlu, txt, title, rdonly = false}) {
  const checked = vlu ? "checked" : "";
  const {lbl, part} = renderBase("input", {key, txt, title, rdonly});
  return `${lbl}\n${part} type="checkbox" ${checked}
         onchange="ConfigBase.changeVlu('${key}', event.target.checked)"/>`;
}

function renderSelect({key, vlu, txt, title, rdonly = false,
               selections, lang}) {
  const {lbl, part} = renderBase("select", {key, txt, title, rdonly});
  const lan = document.querySelector("html").lang;
  const options = Object.keys(selections).map(sel=>{
    const str = (!lang || !lang[sel]) ? sel :
                  typeof lang[sel] === 'string' ? lang[sel]: lang[sel][lan];
    const selected = vlu === selections[sel] ? "selected" : "";
    return `<option value="${selections[sel]}" ${selected}
            >${str}</option>`;
  });
  return `${lbl}\n${part}
    onchange="ConfigBase.changeVlu('${key}', event.target.value)"
    >${options}</select>`;
}

class ConfigureHtmlCls {
  warnOverWrite = true;

  async setDefault() {
    console.log("defaultValues")
    try {
      if (!await CommunicationBase.instance().setSettingsDefault())
        throw "Could not set settings to default";
      await this.fetchSettings();
    } catch (err) {
      console.error(err);
      notifyUser({msg: err?.message || err, type: notifyTypes.Warn});
    }
  }

  async fetchSettings() {
    try {
      const byteArr = await CommunicationBase.instance().getAllSettings();
      if (!byteArr) throw "Could't get settings from device";
      this.warnOverWrite = false;
      ConfigBase.deserialize(byteArr);
      router.routeMain(); // for refresh values
    } catch(err) {
      console.error(err);
      notifyUser({msg: err?.message || err, type: notifyTypes.Warn});
    }
  }

  async pushSettings() {
    console.log("save settings")
    const t = this.translationObj[document.documentElement.lang];
    if (this.warnOverWrite) {
      notifyUser({msg: t.warnOverWrite, type: notifyUser.Warn});
      this.warnOverWrite = false;
      return;
    }

    try {
      const byteArr = ConfigBase.instance().serialize();
      const res = CommunicationBase.instance().saveAllSettings(byteArr);
      if (!res) throw "Could not save settings to device";
    } catch (err) {
      console.error(err);
      notifyUser({msg: err?.message || err, type: notifyTypes.Warn});
    }
  }

  async saveSettingsToFile() {
    const date = new Date().toISOString();
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `myconf-${date}.rcconf`,
      types: [{
      description: 'Configure file *.rcconf',
      accept: {'application/octet-stream': ['.rcconf']},
    }]});
    const fileStream = await fileHandle.createWritable();
    const byteArr = ConfigBase.instance().serialize();
    await fileStream.write(new Blob([byteArr],
                {type: "application/octet-stream"}));
    await fileStream.close();
  }

  async openSettingsFromFile() {
    const [fileHandle] = await window.showOpenFilePicker({types: [{
      description: 'Configure file *.rcconf',
      accept: {'application/octet-stream': ['.rcconf']},
    }]});
    const file = await fileHandle.getFile();
    this.warnOverWrite = false;
    const byteArr = new Uint8Array(await file.arrayBuffer());
    ConfigBase.deserialize(byteArr);
    router.routeMain(); // for refresh values
  }

  formItems = {
    key: "formRoot",
    txt: {en: "Config settings", sv: "Konfigurering inställningar"},
    children: [
      {
        key: "header.storageVersion",
        txt:{en: "Config version", sv: "Lagringsversion"},
        title: {en: "Which version in device firmware", sv: "Vilken version i device firmware"},
        render: renderTextbox,
        renderOptions: {rdonly: true},
      },
      {
        key: "servoInput",
        txt: {en: "Input from Reciever", sv: "Ingång från mottagare"},
        children: [
          {
            key: "lower_threshold",
            txt: {en: "Start threshold", sv: "Starttröskel"},
            title: {en: "At what point brakes begin to activate",
              sv: "Vid vilken punkt som bromsar börjar aktiveras"},
            render: renderSpinbox
          },
          {
            key: "upper_threshold",
            txt: {en: "Upper threshold", sv: "Övre tröskel"},
            title: {en: "At what point brakes are at maximum",
                  sv: "Vid vilken punkt som bromsarna är max ansatta"},
            render: renderSpinbox
          },
          {
            key: "reverse_input",
            txt: {en: "Reverse input", sv: "Omvänd ingång"},
            title: {en: "Invert input so low value becomes high", sv: "Invertera ingång så att ett låg värde blir högt"},
            render: renderCheckbox
          },
        ]
      },
      {
        key: "outputs",
        txt: {en: "Output settings", sv: "Utgångs inställningar"},
        children: [
          {
            key: "max_brake_force",
            txt: {en: "Max brakeforce", sv: "Max bromsverkan"},
            title: {en: "What is the maximum value of brakes",
                    sv: "Max värde för bromsar"},
            render: renderSpinbox
          },
          {
            key: "PwmFreq",
            txt: {en: "PWM frequency", sv: "PWM frekvens"},
            title: {en: "How often it should cycle on/off", sv: "Hur ofta den cyklar av/på"},
            render: renderSelect,
            renderOptions: {
              selections: ConfigBase.PwmFreqOptions,
              lang: PwmFreqOptionsTranslated
            }
          },
          {
            key: "Brake0_active",
            txt: {en: "Use brake 0", sv: "Använd broms 0"},
            title: {en: "If brake output 0 is wired/used", sv: "Om broms 0 är inkopplad"},
            render: renderCheckbox
          },
          {
            key: "Brake0_dir",
            txt: {en: "Brake 0 placement", sv: "Broms 0 placering"},
            title: {
              en: "How brake 0 is positioned from centerline, seen from above. Used for steeringbrake",
              sv: "Hur broms 0 år positionerad från centerline sedd från ovan. Används vid styrbromsning"
            },
            render: renderSelect,
            renderOptions: {
              selections: ConfigBase.WheelDir,
              lang: WheelDirTranslated
            }
          },
          {
            key: "Brake1_active",
            txt: {en: "Use brake 1", sv: "Använd broms 1"},
            title: {en: "If brake outpt 1 is wired/used", sv: "Om broms 1 är inkopplad"},
            render: renderCheckbox
          },
          {
            key: "Brake1_dir",
            txt: {en: "Brake 1 placement", sv: "Broms 1 placering"},
            title: {
              en: "How brake 1 is positioned from centerline, seen from above. Used for steeringbrake",
              sv: "Hur broms 1 år positionerad från centerline sedd från ovan. Används vid styrbromsning"
            },
            render: renderSelect,
            renderOptions: {
              selections: ConfigBase.WheelDir,
              lang: WheelDirTranslated
            }
          },
          {
            key: "Brake2_active",
            txt: {en: "Use brake 2", sv: "Använd broms 2"},
            title: {en: "If brake outpt 2 is wired/used", sv: "Om broms 2 är inkopplad"},
            render: renderCheckbox
          },
          {
            key: "Brake2_dir",
            txt: {en: "Brake 2 placement", sv: "Broms 2 placering"},
            title: {
              en: "How brake 2 is positioned from centerline, seen from above. Used for steeringbrake",
              sv: "Hur broms 2 år positionerad från centerline sedd från ovan. Används vid styrbromsning"
            },
            render: renderSelect,
            renderOptions: {
              selections: ConfigBase.WheelDir,
              lang: WheelDirTranslated
            }
          },
        ]
      },
      {
        key: "wheelSensors",
        txt: {en: "Wheel sensors", sv: "Hjulsensorer"},
        children: [
          {
            key: "WheelSensor0_pulses_per_rev",
            txt: {en: "Wheel sensor 0 pulses", sv: "Hjulsensor 0 pulser"},
            title: {
              en: "How many pulses from wheel sensor that makes 1 revolution\n0 is off",
              sv: "Hur många pulser från hjulsensorn som blir 1 varv.\n0 är av."
            },
            render: renderSpinbox,
            renderOptions: {max: 30}
          },
          {
            key: "WheelSensor1_pulses_per_rev",
            txt: {en: "Wheel sensor 1 pulses", sv: "Hjulsensor 1 pulser"},
            title: {
              en: "How many pulses from wheel sensor that makes 1 revolution\n0 is off",
              sv: "Hur många pulser från hjulsensorn som blir 1 varv.\n0 är av."
            },
            render: renderSpinbox,
            renderOptions: {max: 30}
          },
          {
            key: "WheelSensor2_pulses_per_rev",
            txt: {en: "Wheel sensor 2 pulses", sv: "Hjulsensor 2 pulser"},
            title: {
              en: "How many pulses from wheel sensor that makes 1 revolution\n0 is off",
              sv: "Hur många pulser från hjulsensorn som blir 1 varv.\n0 är av."
            },
            render: renderSpinbox,
            renderOptions: {max: 30}
          },
          {
            key: "ABS_active",
            txt: {en: "ABS active", sv: "ABS aktiv"},
            title: {
              en: "Use ABS logic, requires wheelsensors setup correctly",
              sv: "Använd ABS logik, kräver att hjulsensorer korrekt konfigurerade"
            },
            render: renderCheckbox
          },
          {
            key: "ws_steering_brake_authority",
            txt: {en: "Steer authority wheel sen.", sv: "Styrauktoritet hjul sen."},
            title: {
              en: "Steering brake can influence by this amount based of wheel sensors\n0 is no steeringbrake",
              sv: "Styrbroms kan påverka med detta i procent, baserat på hjulsensorer\n0 är ingen styrbroms"
            },
            render: renderSpinbox
          },
        ]
      },
      {
        key: "accelerometer",
        txt: {en: "Accelerometer", sv: "Accelerometer"},
        children: [
          {
            key: "accelerometer_active",
            txt: {en: "Accelerometer active", sv: "Accelerometer aktiv"},
            title: {en: "Use accelerometer input", sv: "Använd accelerometer värde"},
            render: renderCheckbox
          },
          {
            key: "accelerometer_axis",
            txt: {en: "Accelerometer control axis", sv: "Accelerometer kontroll axel"},
            title: {
              en: "Which axis represent Yaw. Used for steering brakes.",
              sv: "Vilken axel som är sväng. Används för styrbromsning."
            },
            render: renderSelect,
            renderOptions: {selections: ConfigBase.AccelControlAxis}
          },
          {
            key: "accelerometer_axis_invert",
            txt: {en: "Invert control axis", sv: "Invertera kontroll axel"},
            title: {
              en: "Invert signal for control axis, instead of putting brake PCB upside down",
              sv: "Invertera signalen för kontrol axel. Använd istället för att lägga kretskortet upp och ned."
            },
            render: renderCheckbox
          },
          {
            key: "acc_steering_brake_authority",
            txt: {en: "Steer authority acc.sen.", sv: "Styrauktoritet acc.sen."},
            title: {en: "Steering brake can influence by this amount based of accelerometer\n0 is no steeringbrake",
                    sv: "Styrbroms kan påverka med detta i procent, baserat på accelerometer\n0 är ingen styrbroms"},
            render: renderSpinbox
          },

        ]
      },
      {
        key: "logsettings",
        txt: {en: "Log settings", sv: "Log inställningar"},
        children: [
          {
            key: "dontLogWhenStill",
            txt: {en: "Only log when wheel rotates", sv: "Logga bara när hjul snurrar"},
            title: {
              en: "Stop logging when wheels arent moving",
              sv: "Stoppa loggning när hjulen inte snurrar"
            },
            render: renderCheckbox
          },
          {
            key: "logPeriodicity",
            txt: {en: "Log each", sv: "Logga varje"},
            title: {en: "How often we should log", sv: "Hur ofta en den skall logga"},
            render: renderSelect,
            renderOptions: {
              selections: ConfigBase.LogPeriodicity
            }
          }
        ]
      }
    ],
  }

  translationObj = {
      en: {
          header: "Configure your device",
          p1: `HTML frontend must be loaded by chrome version 89 or later or the latest Edge browser.
                This is due to the Use of WebUSB to "talk" to the microcontroller via USB`,
          fetchConfigureBtn: "Fetch settings from device",
          pushConfigureBtn: "Save settings into device",
          saveConfigureToFileBtn: "Save settings to file",
          openConfigureFromFileBtn: "Open settings from file",
          setDefaultConfigureBtn: "Set device default values",
          curSettings: "Settings:",
          warnOverWrite: "Warning! Press again if you want to overwrite changes without fecthing from device"
      },
      sv: {
          header: "Konfigurera din device",
          p1: `HTML framände måste ladddas med chrome version 89 eller senare, eller senaste Edge webbläsaren.
                Detta beror på att WebUSB interfacet för att "prata" med mikrocontrollern via USB.`,
          fetchConfigureBtn: "Hämta inställningar från enhet",
          pushConfigureBtn: "Spara inställningar i enhet",
          saveConfigureToFileBtn: "Spara inställningar till fil",
          openConfigureFromFileBtn: "Öppna inställningar från fil",
          setDefaultConfigureBtn: "Sätt default värden i enheten",
          curSettings: "Inställningar:",
          warnOverWrite: "Varning! Tryck igen för att skriva över inställningar utan att ha hämtat från"
      },
  }

  html(parentNode, lang) {
    function renderFormItem(frmItem) {
      if (frmItem.children) {
        // its a form group
        let childs = frmItem.children.map(child=>{
          if (child.children)
            return renderFormItem(child); // its a sub fieldset

          // map sub properties such as header.storageVersion
          let vluRoot = ConfigBase.instance();
          let keys = child.key.split('.');
          while (keys.length > 1) {
            vluRoot = vluRoot[keys.shift()];
          }

          return child.render({
            ...child.renderOptions,
            key: child.key,
            txt: child.txt[lang],
            title: child.title[lang],
            vlu: vluRoot[keys[0]],
          })
        })
        return `
                <fieldset>
                  <legend>${frmItem.txt[lang]}</legend>
                  ${childs.join("<br/>\n")}
                </fieldset>`;
      }
    }
    const tr = this.translationObj[lang];

    parentNode.innerHTML = `
      <div class="w3-row-padding w3-padding-64 w3-container">
      <div class="w3-content">
        <div class="w3-twothird">
          <h1>${tr.header}</h1>

          <button class="w3-button w3-blue w3-padding-large w3-large w3-margin-top"
                  onclick="this.fetchSettings();">
            ${tr.fetchConfigureBtn}
          </button>
          <button class="w3-button w3-blue w3-padding-large w3-large w3-margin-top"
                  onclick="this.pushSettings()">
            ${tr.pushConfigureBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top"
                  onclick="this.openSettingsFromFile()">
            ${tr.openConfigureFromFileBtn}
          </button>
          <button class="w3-button w3-gray w3-padding-large w3-large w3-margin-top"
                  onclick="this.saveSettingsToFile()">
            ${tr.saveConfigureToFileBtn}
          </button>
          <h5 class="w3-padding-8">${tr.curSettings}</h5>
          <form id="config">
            ${renderFormItem(this.formItems)}
          </form>
          <button class="w3-button w3-red w3-padding-large w3-large w3-margin-top" onclick="this.setDefault()">
            ${tr.setDefaultConfigureBtn}
          </button>
          <p class="w3-text-grey">${tr.p1}</p>
        </div>

        <div class="w3-third w3-center">
          <i class="fa fa-anchor w3-padding-64 w3-text-red"></i>
        </div>
      </div>
    </div>`;
  }

  afterHook(parentNode, lang) {
    if (CommunicationBase.instance().isOpen())
      this.fetchSettings();
  }
};

router.registerPage(new ConfigureHtmlCls, "conf");

} // end namespace block