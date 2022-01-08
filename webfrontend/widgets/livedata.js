"use strict";

let LiveDataWidget;
{ // namespace block

const trObj = {
  en: {
    select: "Select",
    name: "Name",
    value: "Value",
    state: "State",
    measured: "Measured",
    setvlu: "Set by you",
  },
  sv: {
    select: "Välj",
    name: "Namn",
    value: "Värde",
    state: "Status",
    measured: "Mätt",
    setvlu: "Satt av dig",
  }
}

class LiveDataRowWgt {
  constructor(owner, itm, parentNode) {
    this.owner = owner;
    this.itm = itm;

    this.rootNode = document.createElement("tr");
    parentNode.appendChild(this.rootNode);

    // create but hide row if not shown, easier to update values
    this.rootNode.style.display =
      (owner.shownColumns.indexOf(itm.type) < 0) ? "none" : "";

    this._createTd(itm.translatedType()); // name
    this.vluNode = this._createTd({txt:itm.realVlu() + itm.unit()}); // value
    const td = this._createTd({});  // select
    const chkbox = document.createElement("input");
    chkbox.type = "checkbox";
    chkbox.checked = owner.selected.indexOf(itm.type) > -1;
    chkbox.addEventListener("change", (evt)=>{
      this.owner._selectClicked(evt, this.itm);
    });
    this.rootNode.appendChild(chkbox);

    // set/remove forced display class
    this._forcedChanged();

    // subscribe to changes
    this.itm.onForcedChanged.subscribe(this, this._forcedChanged.bind(this));
    this.itm.onUpdated.subscribe(this, this._updated.bind(this));
  }

  _createTd({txt = "", title = ""}) {
    let td = document.createElement("td");
    td.innerText = txt;
    td.title = title;
    this.rootNode.appendChild(td);
    return td;
  }

  // callback for when we have force a value upon the device
  _forcedChanged() {
    this.rootNode.className = this.itm.forced ? "forced" : "";
  }

  _updated() {
    this.vluNode.innerTxt = this.itm.realVlu() + this.itm.unit();
  }
}

class LiveDataWidgetCls extends WidgetBaseCls {
  selected = [];
  rows = [];

  onSelected = null;

  constructor({shownColumns, parentNode, translationObj = trObj})
  {
    super(shownColumns);
    this.rootNode = document.createElement("table");
    this.rootNode.className = "liveData w3-table w3-bordered w3-border w3-responsive";
    parentNode.appendChild(this.rootNode);
    this.translationObj = translationObj;
    this.setParentNode(parentNode);
    this.onSelected = new EventDispatcher(this, this.rootNode);
  }

  render() {
    super.render();
    this.clear();
    this._buildHeader();
    this._buildBody();
  }

  _buildHeader() {
    const lang = document.documentElement.lang;
    const t = this.translationObj[lang];

    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    this.rootNode.appendChild(thead);
    thead.appendChild(tr);

    // create columns
    for (let str of [t.name, t.value, t.state, t.select]) {
      let th = document.createElement("th");
      th.innerText = str;
      thead.appendChild(th);
    }
  }

  _buildBody() {
    const lang = document.documentElement.lang;
    const t = this.translationObj[lang];

    const tbody = document.createElement("tbody");
    this.rootNode.appendChild(tbody);

    // create each row
    for (let itm of this.data)
      this.rows.push(new LiveDataRowWgt(this, itm, tbody));
  }

  _selectClicked(event, itm) {
    const idx = this.selected.indexOf(itm.type);
    if (idx > -1 && !event.target.checked)
      this.selected.splice(idx, 1);
    else if (idx < 0 && event.target.checked)
      this.selected.push(itm.type);

    // notify subscribers
    this.onSelected.forEach(cb=>cb(itm));
  }
}

LiveDataWidget = LiveDataWidgetCls;
} // end namespace block