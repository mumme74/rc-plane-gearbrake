"use strict";

let ChartWidget;
{
const stepFactor = 15,
	  horizBarHeight = 50,
	  vertBarWidth = 20,
	  canvasMinWidth = 50,
	  canvasHeight = 800;
const axisColors = [
	'#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
	'#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
	'#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
	'#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
	'#ffffff', '#000000'];

class ChartWidgetCls extends WidgetBaseCls {
  selectedAxel = 0;
  contex = null;

  constructor(shownColumns, parentNode) {
    super(shownColumns);
    this.rootNode = document.createElement("canvas");
    this.rootNode.height = canvasHeight;
    this.rootNode.width = canvasMinWidth;
	this.contex = this.rootNode.getContext('2d');
    parentNode.appendChild(this.rootNode);
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
  }

  clear() {
    super.clear();
	this.contex.beginPath();
    this.contex.clearRect(0, 0, this.rootNode.width, this.rootNode.height);
	this.contex.stroke();
  }

  _renderAxel(axelIdx) {
    this.contex.strokeStyle = axisColors[axelIdx];
    let itm = this.data[0].children[axelIdx];
    const info = LogItem.Types.info(itm.type);
    const bottom = this.rootNode.height - horizBarHeight;
    const factor = bottom / info.max;
    this.contex.beginPath();
    this.contex.lineWidth = "2";
    this.contex.moveTo(vertBarWidth, bottom - factor * itm.realVlu());
    for(let i = 1; i < this.data.length; ++i) {
      itm = this.data[i].children[axelIdx];
	  this.contex.lineTo(vertBarWidth + i * stepFactor, bottom - factor * itm.realVlu());
    }
    this.contex.stroke();
  }

  _renderHorizontalBar() {
    // render the horizontal bar
    this.contex.clearRect(0, this.rootNode.height - horizBarHeight,
		this.rootNode.width, horizBarHeight);

    const top = this.rootNode.height - horizBarHeight;
    this.contex.beginPath();
    this.contex.lineWidth = "5";
    this.contex.moveTo(vertBarWidth -4, top + 2);
    this.contex.strokeStyle = "#999";
    this.contex.lineTo(this.rootNode.width, top + 2);
    // do the small lines for each entry
    for(let i = 0; i < this.data.length; ++i) {
		this.contex.moveTo(vertBarWidth + i * stepFactor, top);
		this.contex.lineTo(vertBarWidth + i * stepFactor, top +6);
    }
    this.contex.stroke();
  }

  _renderVerticalBar() {
    this.contex.clearRect(0, 0, vertBarWidth, this.rootNode.height - horizBarHeight);
    this.contex.beginPath();
    this.contex.lineWidth = "5";
    this.contex.moveTo(vertBarWidth - 2, 0);
    this.contex.strokeStyle = "#999";
    this.contex.lineTo(vertBarWidth - 2, this.rootNode.height - horizBarHeight);
    this.contex.stroke();
  }
}
ChartWidget = ChartWidgetCls;
} // namespace block
