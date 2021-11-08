"use strict";

let ChartWidget;
{
const stepFactor = 15,
	  horizBarHeight = 50,
	  vertBarWidth = 20,
	  canvasMinWidth = 50,
	  canvasHeight = 500;
const axisColors = [
	'#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
	'#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
	'#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
	'#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
	'#ffffff', '#000000'];

class ChartWidgetCls {
	canvasNode = null;
	showType = [];
	logEntries = [];
	selectedAxel = 0;

	constructor(parentNode) {
		this.canvasNode = document.createElement("canvas");
		this.canvasNode.height = canvasHeight;
		this.canvasNode.width = canvasMinWidth;
		parentNode.appendChild(this.canvasNode);
	}

	/**
	 * @brief which axis and session to show in the chart
	 * @param typeArr array wih types to show
	 * @param logEntries array with each row of log entries
	 */
	dataChange(typeArr, logEntries) {
		this.logEntries = logEntries;
		this.canvasNode.width =
			Math.max(canvasMinWidth, logEntries.length * stepFactor + vertBarWidth);
		this.showType = typeArr;
		this._renderHorizontalBar();
		this._renderVerticalBar();
		this.render();
	}

	render() {
		const ctx = this.canvasNode.getContext('2d');
		ctx.clearRect(vertBarWidth, 0, this.canvasNode.width,
					  this.canvasNode.height - horizBarHeight);
		if (!this.logEntries.length) return;

		// render each axis
		for(const type of this.showType) {
			const child = this.logEntries[0].getChild(type);
			if (!child) continue;
			this._renderAxel(ctx, this.logEntries[0].children.indexOf(child), type)
		}

	}

	_renderAxel(ctx, axelIdx) {
		ctx.strokeStyle = axisColors[axelIdx];
		let itm = this.logEntries[0].children[axelIdx];
		const info = LogItem.Types.info(itm.type);
		const bottom = this.canvasNode.height - horizBarHeight;
		const factor = bottom / info.max;
		ctx.beginPath();
		ctx.lineWidth = "2";
		ctx.moveTo(vertBarWidth, bottom - factor * itm.realVlu());
		for(let i = 1; i < this.logEntries.length; ++i) {
			itm = this.logEntries[i].children[axelIdx];
			ctx.lineTo(vertBarWidth + i * stepFactor, bottom - factor * itm.realVlu());
		}
		ctx.stroke();
	}

	_renderHorizontalBar() {
		// render the horizontal bar
		const ctx = this.canvasNode.getContext('2d');
		ctx.clearRect(0, this.canvasNode.height - horizBarHeight,
					  this.canvasNode.width, horizBarHeight);

		const top = this.canvasNode.height - horizBarHeight;
		ctx.beginPath();
		ctx.lineWidth = "5";
		ctx.moveTo(vertBarWidth, top + 2);
		ctx.strokeStyle = "#999";
		ctx.lineTo(this.canvasNode.width, top + 2);
		// do the small lines for each entry
		for(let i = 0; i < this.logEntries.length; ++i) {
			ctx.moveTo(vertBarWidth + i * stepFactor, top);
			ctx.lineTo(vertBarWidth + i * stepFactor, top +6);
		}
		ctx.stroke();
	}

	_renderVerticalBar() {
		const ctx = this.canvasNode.getContext('2d');
		ctx.clearRect(0, 0, vertBarWidth, this.canvasNode.height - horizBarHeight);
		ctx.beginPath();
		ctx.lineWidth = "5";
		ctx.moveTo(vertBarWidth - 2, 0);
		ctx.strokeStyle = "#999";
		ctx.lineTo(vertBarWidth - 2, this.canvasNode.height - horizBarHeight);
		ctx.stroke();
	}
}
ChartWidget = ChartWidgetCls;
} // namespace block
