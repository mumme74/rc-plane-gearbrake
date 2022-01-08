"use strict";

let TableWidget;
{
  const REDRAWTIMOUT = 500;

class TableWidgetCls extends WidgetBaseCls {
  counterColumn = true;

  /**
   * @brief A class to create data in a simple html table
   * @param {Array} shownColumns a array with all table columns shown
   * @param {Element} parentNode a ref to to containing parent node
   */
  constructor(shownColumns, parentNode) {
    super(shownColumns);
    this.rootNode = document.createElement("table");
    this.rootNode.className = "logTableEntries w3-table w3-bordered w3-border w3-responsive";

    this.setVisible(false);
    this.setParentNode(parentNode);

    this.redrawTimeout = REDRAWTIMOUT;
  }

  /**
   * @brief Sets if we want to displat a counter column or not
   *      ie first row is index instead of data
   * @param {*} useCounter
   */
  setCounterColumn(useCounter) {
    this.counterColumn = useCounter;
    this.scheduleRedraw();
  }

  /**
   * Re-Render imidiatley
   */
  render() {
    super.render();
    this.clear();
    this._buildHeader();
    this._buildBody();
  }

  _buildHeader() {
    const lang = document.documentElement.lang;
    let thead = document.createElement("thead");
    let tr = document.createElement("tr");
    this._colTypes = [];

    for (const itm of this.colData.values()) {
      if (this.shownColumns.indexOf(itm.entry.type) > -1) {
        let th = document.createElement("th");
        // split to 2 strings to be able to ellide
        //<th><span>long text to be clipped</span>not clipped</th>
        let span = document.createElement("span");
        const t = itm.entry.translatedType();
        span.appendChild(document.createTextNode(
                            t.txt.substr(0, t.txt.length-2)));
        th.appendChild(span);
        th.appendChild(document.createTextNode(
                          t.txt.substr(t.txt.length-2)));
        th.title = t.txt + "\n" +t.title;
        tr.appendChild(th);
        this._colTypes.push(itm.entry.type);
      }
    };

    // specialcase counter column
    if (tr.firstChild) {
        const idxTh = document.createElement("th");
        idxTh.className = "index";
        idxTh.textContent = LogItem.TypesTranslated.logIndex.txt[lang];
        idxTh.title = idxTh.textContent + "\n" +
                      LogItem.TypesTranslated.logIndex.title[lang];
        tr.insertBefore(idxTh, tr.firstChild);
      }

      thead.appendChild(tr);
      this.rootNode.appendChild(thead);
  }

  _buildBody(lang) {
    // create table body
    let tbody = document.createElement("tbody");
    let counter = 1;
    for (const entry of this.data.values()) {
      let tr = document.createElement("tr");
      entry.scanChildren();

      // create a row with all shown types
      let tdNodes = this._colTypes.map(()=>{
        let td = document.createElement("td");
        tr.appendChild(td);
        return td;
      });

      let showRow = false;
      for (const itm of entry.children.values()) {
        if (this.shownColumns.indexOf(itm.type) > -1) {
          let td = tdNodes[this._colTypes.indexOf(itm.type)];
          if (td && !td.firstChild) {
            td.appendChild(
              document.createTextNode(itm.realVlu() + itm.unit()));
            showRow = true;
          }
        }
      };

      if (showRow) {// only if we have any children
        let td = document.createElement("td");
        td.className = "index";
        td.textContent = counter++;
        tr.insertBefore(td, tr.firstChild);
        tbody.appendChild(tr);
      }
    };

    this.rootNode.appendChild(tbody);
  }

  downloadData() {
    const html = this.rootNode.innerHTML;
    const blob = new Blob([html], {type:'data:application/vnd.ms-excel;base64'});
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.innerText = "download";
    a.download = `logtable_${new Date().toISOString()}.xlxs`;
    this.rootNode.parentElement.appendChild(a);
    a.click();
    a.remove();
  }
}

TableWidget = TableWidgetCls;
}// namespace block