"use strict";

class SelectMenuWgtCls {
    activeDisplayWgt = new WidgetBaseCls();
    chartWgt = null;
    tblWgt = null;
    typeDrpDwnWgt = null;
    buttons = [];
    rootNode = null;

    translationObj = {};
    constructor(parentNode, translationObj, showLogItems, colData, data) {
      this.translationObj = translationObj;
      this.rootNode = parentNode;


      this.typeDrpDwnWgt = new SelectTypesDropDownWgt(
        showLogItems,
        document.getElementById("showLogItm"),
        this.translationObj
      );

      this.tblWgt = new TableWidget(showLogItems,
                      document.getElementById("logViewContainer"));

      this.activeDisplayWgt = this.chartWgt =
                    new ChartWidget(showLogItems,
                                    document.getElementById("chartContainer"));

      // subscribe to changes and insert
      for (const wgt of [this.tblWgt, this.chartWgt].values()){
        this.typeDrpDwnWgt.addEventListener("change", wgt.scheduleRedraw, wgt);
        this.typeDrpDwnWgt.addEventListener("selectall", wgt.scheduleRedraw, wgt);
      }

      // create menu buttons and insert them to DOM
      this.buttons = [
        this._createBtn(true, this._chartSelected.bind(this), "chartTabHeader"),
        this._createBtn(false, this._tabSelected.bind(this), "tblTabHeader"),
        this._createBtn(false, this._downloadData.bind(this), "downloadData"),
      ];
      for (const btn of this.buttons.values())
        parentNode.appendChild(btn);
    }

    setData(colData, data) {
      for(const wgt of [this.tblWgt, this.chartWgt, this.typeDrpDwnWgt].values())
        wgt.setData(colData, data);
    }

    _createBtn(selected, clickCb, trId) {
      const lang = document.documentElement.lang;
      const btn = document.createElement("button");
      btn.className = "w3-bar-item w3-button" + (selected ? " w3-gray" : "");
      btn.addEventListener("click", clickCb.bind(this));
      btn.appendChild(document.createTextNode(this.translationObj[lang][trId]));
      return btn;
    }

    _tabSelected() {
      this._switchActive(true);
    }

    _chartSelected() {
      this._switchActive(false);
    }

    _switchActive(tblActive) {
      this.activeDisplayWgt = tblActive ? this.tblWgt : this.chartWgt;
      this.tblWgt.setVisible(tblActive);
      this.chartWgt.setVisible(!tblActive);
      for(let i = 0; i < 2; ++i)
        this.buttons[i].classList.toggle("w3-gray");
    }

    _downloadData() {
      this.activeDisplayWgt.downloadData();
    }
  }