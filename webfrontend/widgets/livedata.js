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
    editorBtn: "OK",
  },
  sv: {
    select: "Välj",
    name: "Namn",
    value: "Värde",
    state: "Status",
    measured: "Mätt",
    setvlu: "Satt av dig",
    editorBtn: "OK",
  }
}

class LiveDataEditorWgt {
  onAccept = null;
  onAbort = null;

  constructor(rowWgt) {
    this.row = rowWgt;
    this.origVlu = this.row.itm.value;

    // replace the 2 last tds in table with a new one with our editor
    const lastTd = rowWgt.rootNode.lastChild;
    this.origTds = [lastTd.previousSibling, lastTd];

    this.editorTd = document.createElement("td");
    this.editorTd.setAttribute("colspan", 2);
    this.origTds.forEach(td=>this.row.rootNode.removeChild(td));
    this.row.rootNode.appendChild(this.editorTd);

    // create a slider
    this.slider = document.createElement("input");
    this.slider.type = "range";
    const info = this.row.itm.info();
    this.slider.min = info.min;
    this.slider.max = info.max;
    this.slider.value = this.row.itm.realVlu();
    this.slider.steps = (info.max - info.min) / 100;
    this.slider.addEventListener("change", () => {
        this.row.itm.setRealValue(+this.slider.value)
    });
    this.editorTd.appendChild(this.slider);

    // create finished btn
    const btn = document.createElement("button");
    btn.innerText = trObj[document.documentElement.lang].editorBtn;
    btn.className = "w3-button";
    this.editorTd.appendChild(btn);
    btn.addEventListener("click", this.accept.bind(this));

    // hide when click outside of editor
    this.editorTd.addEventListener("click", this._stopClickEvent.bind(this));
    document.body.addEventListener("click", this._hideClickEvent.bind(this));

    // create a events
    this.onAccept = new EventDispatcher(this, this.editorTd);
    this.onAbort = new EventDispatcher(this, this.editorTd);
  }

  async accept() {
    const newValue = this.slider.value;
    this.row.itm.setRealValue(newValue);
    let res = await this.row.itm.forceValue(this.row.itm.value);
    if (!res) return await this.abort();
    this._restoreNodes();
    this.onAccept.emit(newValue);
  }

  async abort() {
    this.row.itm.setValue(this.origVlu);
    await this.row.itm.unForceValue();
    this._restoreNodes();
    this.onAbort.emit();
  }

  _restoreNodes() {
    if (this.editorTd?.parentNode)
      this.editorTd.parentNode.removeChild(this.editorTd);
    // restore tds
    this.origTds.forEach(td=>this.row.rootNode.appendChild(td));

    this.editorTd.removeEventListener("click", this._stopClickEvent);
    document.body.removeEventListener("click", this._hideClickEvent);
    this.onAbort.close();
    this.onAccept.close();
  }

  _stopClickEvent(evt) {
    // prevent events from propagating down in DOM to document.body
    // should prevent _hideClickEvent from beeing called
    evt.preventDefault();
    evt.stopPropagation();
  }

  _hideClickEvent(evt) {
    this.abort();
  }
}

class LiveDataRowWgt {
  onDblClicked = null;

  constructor(owner, itm, parentNode) {
    this.owner = owner;
    this.itm = itm;

    // create the table row element
    this.rootNode = document.createElement("tr");
    parentNode.appendChild(this.rootNode);

    // notify on dblclick
    this.onDblClicked = new EventDispatcher(this, this.rootNode);
    this.rootNode.addEventListener("dblclick", this._DblClicked.bind(this));

    // create but hide row if not shown, easier to update values
    this.rootNode.style.display =
      (owner.shownColumns.indexOf(itm.type) < 0) ? "none" : "";

    this._createTd(itm.translatedType()); // name
    this.vluNode = this._createTd({txt:itm.realVlu() + itm.unit()}); // value
    const td = this._createTd({});  // select
    const chkTd = this._createTd({}); // last td for our chkbox

    // and finally the checkbox
    const chkbox = document.createElement("input");
    chkbox.type = "checkbox";
    chkbox.checked = owner.selected.indexOf(itm.type) > -1;
    chkbox.addEventListener("change", (evt)=>{
      this.owner._selectClicked(evt, this.itm);
    });
    chkTd.appendChild(chkbox);

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
    this.vluNode.innerText = this.itm.realVlu() + this.itm.unit();
  }

  async _DblClicked() {
    this.onDblClicked.emit(this);

    //
    if (this.owner.editorWgt) {
      await this.owner.editorWgt.abort();
      this.owner.editorWgt = null;
    }

    // create a new editor widget for this row
    this.owner.editorWgt = new LiveDataEditorWgt(this);
    const clear = ()=> { this.owner.editorWgt = null;}
    this.owner.editorWgt.onAbort.subscribe(this, clear.bind(this));
    this.owner.editorWgt.onAccept.subscribe(this, clear.bind(this));
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
    this.onSelected.emit(itm);
  }
}

LiveDataWidget = LiveDataWidgetCls;
} // end namespace block