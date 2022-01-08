"use strict";

let ChartWidget;
{
const stepFactor = 15,
      headerHeight = 50,
      horizBarHeight = 50,
      vertBarWidth = 45,
      canvasMinWidth = 385,
      canvasHeight = 600,
      origoAt = {x: vertBarWidth, y: (canvasHeight - headerHeight) / 2 -1 + headerHeight},
      vertSteps = 10,
      showPointMargin = 5,
      showPointTimoeout = 300,
      showPointOffset = 10;

const axisColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
    '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
    '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
    '#ffffff', '#000000'];

class ChartWidgetCls extends WidgetBaseCls {
  selectedType = -1;
  contex = null;
  showPnt = null;

  constructor(shownColumns, parentNode) {
    super(shownColumns);

    // the header of the chart
    this.headerNode = document.createElement("div");
    this.headerNode.style.cssText = `position:sticky;left:0px;text-align:center;padding:5px;border-radius:5px;background-color:#FFF`;
    this.headerColor = document.createElement("div");
    this.headerColor.style.cssText = "display:inline-block;min-height: 30px;min-width:60px;background-color:#FFF;margin: 5px;vertical-align:middle;";
    this.headerNode.appendChild(this.headerColor);
    this.headerSpan = document.createElement("span");
    this.headerNode.appendChild(this.headerSpan);
    parentNode.appendChild(this.headerNode)

    // create a canvas to draw on
    this.rootNode = document.createElement("canvas");
    this.rootNode.height = canvasHeight;
    this.rootNode.width = canvasMinWidth;
    this.contex = this.rootNode.getContext('2d');
    parentNode.appendChild(this.rootNode);

    // attach mousemove/down
    this.rootNode.addEventListener("mousemove", this._touchmove.bind(this));
    this.rootNode.addEventListener("mousedown", this._touchstart.bind(this));
  }

  /**
   * @brief which axis and session to show in the chart
   * @param typeArr array wih types to show
   * @param logEntries array with each row of log entries
   */
  setData(colData, data) {
    this.rootNode.width =
      Math.max(canvasMinWidth, data.length * stepFactor + vertBarWidth);
    super.setData(colData, data);
  }

  render() {
    //console.time("render")
    this.clear();
    super.render();
    this._renderHorizontalBar();
    this._renderVerticalBar();
    if (!this.data.length) return;

    // render each axis
    for(const col of this.colData) {
      if (this.shownColumns.indexOf(col.entry.type) > -1) {
        const child = this.data[0].getChild(col.entry.type);
        if (!child) continue;
        this._renderAxel(this.data[0].children.indexOf(child), col);
      }
    }

    //console.timeEnd("render")
  }

  clear() {
    super.clear();
    this.contex.beginPath();
    this.contex.fillStyle = '#FFF';
    this.contex.fillRect(0, 0, this.rootNode.width, this.rootNode.height);
    this.contex.stroke();
  }

  downloadData() {
    const blob = this.rootNode.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = blob;
    a.innerText = "download";
    a.download = `loggraph_${new Date().toISOString()}.png`;
    this.rootNode.parentElement.appendChild(a);
    a.click();
    a.remove();
  }

  _renderAxel(axelIdx) {
    let itm = this.data[0].children[axelIdx];
    this.contex.strokeStyle = axisColors[itm.type];
    const info = LogItem.Types.info(itm.type);
    const factor = (origoAt.y-headerHeight) / info.max;
    this.contex.beginPath();
    this.contex.lineWidth = itm.type === this.selectedType ? "4" : "2";
    this.contex.moveTo(origoAt.x, origoAt.y - factor * itm.realVlu());
    for(let i = 1; i < this.data.length; ++i) {
      itm = this.data[i].children[axelIdx];
      if (itm)
        this.contex.lineTo(origoAt.x + i * stepFactor, origoAt.y - factor * itm.realVlu());
    }
    this.contex.stroke();
  }

  _renderHorizontalBar() {
    // render the horizontal bar
    this.contex.fillStyle = '#FFF';
    this.contex.fillRect(0, this.rootNode.height - horizBarHeight,
        this.rootNode.width, horizBarHeight);

    this.contex.beginPath();
    this.contex.lineWidth = "5";
    this.contex.moveTo(origoAt.x, origoAt.y);
    this.contex.strokeStyle = "#999";
    this.contex.lineTo(origoAt.x + this.data.length * stepFactor, origoAt.y);
    this.contex.stroke();
    this.contex.beginPath();
    this.contex.lineWidth = 1;
    this.contex.font = "10pt Sans serif";
    this.contex.fillStyle = "#CCC";
    this.contex.textBaseline = "top";
    this.contex.textAlign = "center";
    // do the small lines for each entry
    for(let i = 0; i < this.data.length; ++i) {
      const x = vertBarWidth + i * stepFactor;
      this.contex.moveTo(x, origoAt.y-2);
      this.contex.lineTo(x, origoAt.y+4);
      if (i && (i % 10 == 0)) {
        this.contex.fillText(i, x, origoAt.y + 6);
      }
    }
    this.contex.stroke();
  }

  _renderVerticalBar() {
    this.contex.fillStyle = '#FFF';
    this.contex.fillRect(0, headerHeight, vertBarWidth, this.rootNode.height);
    this.contex.beginPath();
    this.contex.lineWidth = "3";
    this.contex.moveTo(vertBarWidth - 2, headerHeight);
    this.contex.strokeStyle = "#999";
    this.contex.lineTo(vertBarWidth - 2, this.rootNode.height);
    this.contex.stroke();
    if (this.selectedType > -1)
      this._renderScaleAndGrid();
  }

  _renderScaleAndGrid() {
      // do the small lines for each entry
      this.contex.lineWidth = "1";
      this.contex.font = "10pt Sans serif";
      this.contex.fillStyle = "#CCC";
      this.contex.textBaseline = "middle";
      this.contex.textAlign = "start";

      const info = LogItem.Types.info(this.selectedType);
      const vluSteps = Math.max(info.max, -info.min) / vertSteps;
      const factor = (origoAt.y - headerHeight) / Math.max(info.max, -info.min);

      for(let i = info.min; i <= info.max; i+=vluSteps) {
        const y = origoAt.y - i * factor;
        this.contex.strokeStyle = "#333";
        this.contex.fillStyle = "#333";
        this.contex.beginPath();
        this.contex.moveTo(vertBarWidth -6, y);
        this.contex.lineTo(vertBarWidth, y);
		const vlu = Math.round(i);
		const txt = vlu != 0 ? vlu : vlu + " " + LogItem.unitFor(this.selectedType);
        this.contex.fillText(txt, 0, y);
        this.contex.stroke();

        this.contex.beginPath();
        this.contex.strokeStyle = "#CCC";
        this.contex.moveTo(vertBarWidth, y);
        this.contex.lineTo(this.rootNode.width, y);
        this.contex.stroke();
      }
  }

  _selectAType(selectType) {
    const reRender = this.selectedType !== selectType;
    this.selectedType = selectType;

    if (reRender) {
      this.render();

      if (selectType > -1) {
        const lang = document.documentElement.lang;
        const types = Object.keys(LogItem.Types).slice(1);
        const tr = LogItem.TypesTranslated[types[selectType]];
        this.headerSpan.innerText = tr.txt[lang] + ", " + tr.title[lang];
        this.headerColor.style.backgroundColor = axisColors[selectType];
      } else {
        this.headerColor.style.backgroundColor = "#FFF";
        this.headerSpan.innerText = "";
      }

      // hide/show
      this.headerNode.style.backgroundColor = selectType < 0 ? "#FFF" : "#CCC";
    }
  }

  _showPoint(pnt, logItm) {
    if (this.showPnt) return;
    this.showPnt = {pnt, logItm};
    const txt = logItm.translatedType().txt + ": " + logItm.realVlu() + logItm.unit() +
                  " (" + pnt.entry + ")";
    const textMetrix = this.contex.measureText(txt);
    const textHeight = textMetrix.actualBoundingBoxAscent +
                     textMetrix.actualBoundingBoxDescent;
    const rectWidth = showPointMargin*4 + 10 + textMetrix.width,
          rectHeight = showPointMargin*2 + textHeight,
          scrollLeft = this.rootNode.parentElement.scrollLeft,
          viewRect = this.rootNode.parentElement.getBoundingClientRect();

    // move if outside of visible bounds
    let x = pnt.x + showPointOffset, y = pnt.y + showPointOffset;
    if (x + rectWidth > scrollLeft + viewRect.width) x -= rectWidth +showPointOffset;
    if (y + rectHeight > canvasHeight) y -= rectHeight +showPointOffset;

    // containing rect
    this.contex.strokeStyle = "#999";
    this.contex.fillStyle = "#000";
    this.contex.fillRect(x, y, rectWidth, showPointMargin*2 + textHeight);
    // the color rect
    this.contex.fillStyle = axisColors[logItm.type];
    this.contex.fillRect(x+showPointMargin, y + showPointMargin, 10, 10);
    // the text
    this.contex.beginPath();
    this.contex.fillStyle = "#FFF";
    this.contex.textBaseline = "hanging";
    this.contex.textAlign = "start";
    this.contex.fillText(txt, x + 10 + showPointMargin*3, y + showPointMargin);
    this.contex.stroke();
  }

  _touchmove(evt) {
    const pnt = {evtX: evt.clientX, evtY: evt.clientY};
    this.pendingShowPoint = this._mapPointToLogItem(pnt);
    this.rootNode.style.cursor = this.pendingShowPoint ? "pointer" : "";
    clearTimeout(this._touchmove._tmr);

    if (this.pendingShowPoint) {
      this._touchmove._tmr = setTimeout(()=>this._showPoint(pnt, this.pendingShowPoint), showPointTimoeout);
    } else if (this.showPnt) {
      this.showPnt = null;
      this.render();
    }
  }

  _touchstart(evt) {
    const logItm = this._mapPointToLogItem({evtX: evt.clientX, evtY: evt.clientY});
    this._selectAType(logItm ? logItm.type : -1);
  }

  _mapPointToLogItem(pnt) {
    const rect = this.rootNode.getBoundingClientRect();
    pnt.x = pnt.evtX- rect.left;
    pnt.y = pnt.evtY - rect.top;
    const x = Math.round((pnt.x - vertBarWidth) / stepFactor),
          y = Math.floor(origoAt.y - pnt.y);

    if (!this.data[x]) return;

    for(const itm of this.data[x].children.values()) {
      if (this.shownColumns.indexOf(itm.type) < 0)
        continue;
      const info = LogItem.Types.info(itm.type);
      const factor = (origoAt.y-headerHeight) / info.max;
      const itmY = Math.round(factor * itm.realVlu());
      if (y <= itmY + 4 && y >= itmY -4) {
        pnt.entry = x;
        return itm;
      }
    }
  }
}
ChartWidget = ChartWidgetCls;
} // namespace block
