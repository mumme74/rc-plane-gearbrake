"use strict";

let ChartWidget;
{
const stepFactor = 15,
      headerHeight = 50,
      horizBarHeight = 50,
      vertBarWidth = 20,
      canvasMinWidth = 50,
      canvasHeight = 600,
      origoAt = {x: vertBarWidth, y: canvasHeight / 2 -1};
const axisColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
    '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
    '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
    '#ffffff', '#000000'];

class ChartWidgetCls extends WidgetBaseCls {
  selectedType = -1;
  contex = null;

  constructor(shownColumns, parentNode) {
    super(shownColumns);

    // the header of the chart
    this.headerNode = document.createElement("div");
    this.headerNode.style.cssText = `position:sticky;left:0px;text-align:center;padding:5px;border-radius:5px;background-color:#FFF`;
    this.headerColor = document.createElement("div");
    this.headerColor.style.cssText = "display:inline-block;min-height: 30px;min-width:60px;background-color:#FFF;margin: 5px;";
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
    console.time("render")
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

    console.timeEnd("render")
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
    const factor = origoAt.y / info.max;
    this.contex.beginPath();
    this.contex.lineWidth = itm.type === this.selectedType ? "4" : "2";
    this.contex.moveTo(origoAt.x, origoAt.y - factor * itm.realVlu());
    for(let i = 1; i < this.data.length; ++i) {
      itm = this.data[i].children[axelIdx];
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
    this.contex.lineTo(this.rootNode.width, origoAt.y);
    // do the small lines for each entry
    for(let i = 0; i < this.data.length; ++i) {
        this.contex.moveTo(vertBarWidth + i * stepFactor, origoAt.y-2);
        this.contex.lineTo(vertBarWidth + i * stepFactor, origoAt.y+4);
    }
    this.contex.stroke();
  }

  _renderVerticalBar() {
    this.contex.fillStyle = '#FFF';
    this.contex.fillRect(0, 0, vertBarWidth, this.rootNode.height);
    this.contex.beginPath();
    this.contex.lineWidth = "5";
    this.contex.moveTo(vertBarWidth - 2, 0);
    this.contex.strokeStyle = "#999";
    this.contex.lineTo(vertBarWidth - 2, this.rootNode.height);
    this.contex.stroke();
  }

  _selectAType(selectType) {
    const reRender = this.selectedType !== selectType;
    this.selectedType = selectType;

    if (reRender) {
      this.render();

      if (selectType > -1) {
          const types = Object.keys(LogItem.Types).slice(1);
          console.log("match start", types[selectType]);
        this.headerSpan.innerText = types[selectType];
        this.headerColor.style.backgroundColor = axisColors[selectType];
      } else
        this.headerColor.style.backgroundColor = "#FFF";



      // hide/show
      this.headerNode.style.backgroundColor = selectType < 0 ? "#FFF" : "#CCC";
    }
  }

  _touchmove(evt) {
    const logItm = this._mapPointToLogItem({x: evt.clientX, y: evt.clientY});
    if (logItm) {
      const types = Object.keys(LogItem.Types).slice(1);
      console.log("match move", types[logItm.type]);
    }
  }

  _touchstart(evt) {
    const logItm = this._mapPointToLogItem({x: evt.clientX, y: evt.clientY});
    this._selectAType(logItm ? logItm.type : -1);
  }

  _mapPointToLogItem(pnt) {
    const rect = this.rootNode.getBoundingClientRect();
    const realX = pnt.x- rect.left,
          realY = pnt.y - rect.top;
    const x = Math.round((realX - vertBarWidth) / stepFactor),
          y = Math.floor(origoAt.y - realY);

    for(const itm of this.data[x].children.values()) {
      const info = LogItem.Types.info(itm.type);
      const factor = origoAt.y / info.max;
      const itmY = Math.round(factor * itm.realVlu());
      if (y <= itmY + 2 && y >= itmY -2) {
        return itm;
      }
    }
  }
}
ChartWidget = ChartWidgetCls;
} // namespace block
