"use strict";

class SelectTypesDropDownWgt extends WidgetBaseCls {
  trObj = {};
  _eventSubscribers = {change:[], selectall:[]};
  _selectAllChkbox = null;

  constructor(shownColumns, parentElement, trObj) {
    super(shownColumns);
    this.trObj = trObj;
    this.rootNode = document.createElement("div");
    this.rootNode.className = "w3-dropdown-content w3-bar-block w3-card-4";
    parentElement.appendChild(this.rootNode);
  }

  render() {
    super.clear();
    super.render();

    const checkAll = this._makeSelectAll();

    this._makeTypeCheckboxes(checkAll);
  }

  addEventListener(event, cb, scope = window) {
    if (event in this._eventSubscribers)
      this._eventSubscribers[event].push({cb, scope})
  }

  _makeSelectAll() {
    // checkall is only checked if all possible types are shown
    const checkAll = this._isAllChecked();

    this._selectAllChkbox = this._createChkBox({value:'selectall', checkAll,
      changeCb: ((evt)=>{
        this._selectAll(evt.target.checked);
      }).bind(this)})

    const lang = document.documentElement.lang;
    const chooseAll = this.trObj[lang].chooseAll;
    const lbl = this._createLabel({
      childNode:this._selectAllChkbox,
      txt: chooseAll,
       title: chooseAll
    });
    this.rootNode.appendChild(lbl);
    return checkAll;
  }

  _makeTypeCheckboxes(checkAll) {
    const lang = document.documentElement.lang;

    for (const col of this.colData.values()) {
      const chkbox = this._createChkBox({value:col.entry.type, checkAll,
        changeCb:this._checkBoxChanged.bind(this)
      });
      const lbl = this._createLabel({
        childNode:chkbox,
        txt:col.tr.txt[lang],
        title: col.tr.title[lang]
      })
      this.rootNode.appendChild(lbl);
    }
  }

  _createLabel({childNode, txt, title}) {
    const lbl = document.createElement("label");
    lbl.className = "w3-bar-item w3-button";
    lbl.title = title;
    lbl.appendChild(childNode);
    lbl.appendChild(document.createTextNode(txt));
    return lbl;
  }

  _createChkBox({value, changeCb, checkAll}) {
    const chkbox = document.createElement("input");
    chkbox.type = "checkbox";
    chkbox.className = "w3-button w3-margin-right";
    chkbox.value = value;
    chkbox.checked = this.shownColumns.indexOf(value) < 0 ? checkAll : true;
    chkbox.addEventListener("change", changeCb);
    return chkbox;
  }

  _selectAll(checked) {
    this.shownColumns.splice(0, this.shownColumns.length);

    const inputs = this.rootNode.querySelectorAll("input");
    for (const chkbox of inputs.values()) {
      chkbox.checked = checked;
      if (checked) {
        const vlu = parseInt(chkbox.value.trim());
        if (!isNaN(vlu))
          this.shownColumns.push(vlu);
      }
    }

    // notify event subscribers
    for(const sub of this._eventSubscribers.selectall.values())
      sub.cb.call(sub.scope);
  }

  _checkBoxChanged(evt) {
    const onchange = (idx)=> {
      this._selectAllChkbox.checked = this._isAllChecked();

      // notify event subscribers
      for(const sub of this._eventSubscribers.change.values())
        sub.cb.call(sub.scope, idx);
    }
    let vlu = parseInt(evt.target.value.trim());
    const idx = this.shownColumns.indexOf(vlu);
    if (idx < 0 && evt.target.checked) {
      this.shownColumns.push(vlu);
      onchange(idx);
    } else if (idx > -1 && !evt.target.checked) {
      this.shownColumns.splice(idx, 1);
      onchange(idx);
    }
  }

  _isAllChecked() {
    const unchecked = this.colData.find(col=>this.shownColumns.indexOf(col.entry.type)<0);
    return unchecked === undefined;
  }
}