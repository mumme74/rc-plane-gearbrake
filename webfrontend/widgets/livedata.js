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
    editorCloseBtn: "Cancel",
    dblClickEdit: "Double click to edit",
  },
  sv: {
    select: "Välj",
    name: "Namn",
    value: "Värde",
    state: "Status",
    measured: "Mätt",
    setvlu: "Satt av dig",
    editorCloseBtn: "Avbryt",
    dblClickEdit: "Dubbelklicka för att ändra",
  }
}

class LiveDataEditorWgt {
  onAccept = null;
  onAbort = null;

  constructor(rowWgt) {
    this.row = rowWgt;
    this.origVlu = this.row.itm.value;

    // replace the last td in table with a new one with our editor
    const lastTd = rowWgt.rootNode.lastChild;
    this.origTds = [lastTd];

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
      const newValue = + this.slider.value;
      this.row.itm.setRealValue(newValue);
      this.changed(newValue);
    });
    this.editorTd.appendChild(this.slider);

    // create cancel btn
    const btn = document.createElement("button");
    btn.innerText = trObj[document.documentElement.lang].editorCloseBtn;
    btn.className = "w3-button";
    this.editorTd.appendChild(btn);
    btn.addEventListener("click", this.abort.bind(this));

    // create a events
    this.onChanged = new EventDispatcher(this, this.editorTd);
    this.onAbort = new EventDispatcher(this, this.editorTd);
  }

  async changed(newValue) {
    this.row.itm.setRealValue(newValue);
    let res = await this.row.itm.forceValue(this.row.itm.value);
    if (res)
      this.onChanged.emit(newValue);
    else
      await this.abort();
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

    this.onAbort.close();
    this.onChanged.close();
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
    this.rootNode.addEventListener("click", this._clicked.bind(this));

    // create but hide row if not shown, easier to update values
    if (owner.shownColumns.indexOf(itm.type) < 0)
      this.rootNode.classList.add("hidden");

    this._createTd(itm.translatedType()); // name
    const title = this.itm.isForceable() ? trObj[document.documentElement.lang].dblClickEdit : "";
    this.vluNode = this._createTd({txt:itm.realVlu() + itm.unit(), title}); // value
    const chkTd = this._createTd({}); // last td for our chkbox

    // and finally the checkbox
    const chkbox = document.createElement("input");
    chkbox.type = "checkbox";
    chkbox.checked = owner.graphColumns.indexOf(itm.type) > -1;
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

  setHide(hide) {
    this.rootNode.classList[hide ? "add" : "remove"]("hidden");
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
    this.rootNode.classList[this.itm.forced ? "add" : "remove"]("forced");
  }

  _updated() {
    this.vluNode.innerText = this.itm.realVlu() + this.itm.unit();
  }

  async _DblClicked() {
    this.onDblClicked.emit(this);

    // check if we have an editor on this item openened already
    if (this.owner.editorWgts.find(e=>e.itm===this.itm))
      return;

    if (this.itm.isForceable()) {
      const edit = this.owner.editorWgts.find(e=>e.row===this);
      if (!edit) {
        // create a new editor widget for this row
        const editor = new LiveDataEditorWgt(this);
        this.owner.editorWgts.push(editor);
        const clear = ()=> {
          this.owner.editorWgts.splice(
            this.owner.editorWgts.indexOf(editor), 1);
        }
        editor.onAbort.subscribe(this, clear.bind(this));
        editor.onChanged.subscribe(this, clear.bind(this));
      }

    } else {
      this.rootNode.classList.add("error");
      setTimeout(()=>{
        this.rootNode.classList.remove("error");
      }, 1000);
    }
  }

  _clicked(evt) {
    if (evt.target.tagName !== 'INPUT' &&
        this.owner.shownColumns.indexOf(this.itm.type) > -1)
    {
      this.owner.onSelectType.emit(this.itm.type);
    }
  }
}

class LiveDataWidgetCls extends WidgetBaseCls {
  rows = [];
  editorWgts = [];
  graphColumns = [];

  onSelected = null;
  onSelectType = null;

  constructor({
    shownColumns, graphColumns, parentNode,
    translationObj = trObj,})
  {
    super(shownColumns);
    this.graphColumns = graphColumns;
    this.rootNode = document.createElement("table");
    this.rootNode.className = "liveData w3-table w3-bordered w3-responsive";
    parentNode.appendChild(this.rootNode);
    this.translationObj = translationObj;
    this.setParentNode(parentNode);
    this.onSelected = new EventDispatcher(this, this.rootNode);
    this.onSelectType = new EventDispatcher(this, this.rootNode);
  }

  render() {
    super.render();
    this.clear();
    this._buildHeader();
    this._buildBody();
  }

  shownItemsChanged() {
    for (let row of this.rows)
      row.setHide(this.shownColumns.indexOf(row.itm.type) < 0);
  }

  _buildHeader() {
    const lang = document.documentElement.lang;
    const t = this.translationObj[lang];

    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    this.rootNode.appendChild(thead);
    thead.appendChild(tr);

    // create columns
    for (let str of [t.name, t.value, t.select]) {
      let th = document.createElement("th");
      th.innerText = str;
      tr.appendChild(th);
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
    const idx = this.graphColumns.indexOf(itm.type);
    if (idx > -1 && !event.target.checked)
      this.graphColumns.splice(idx, 1);
    else if (idx < 0 && event.target.checked)
      this.graphColumns.push(itm.type);

    // notify subscribers
    this.onSelected.emit(itm);
  }
}

LiveDataWidget = LiveDataWidgetCls;
} // end namespace block