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
		ctx.beginPath();
		ctx.lineWidth = "2";
		ctx.moveTo(vertBarWidth, itm.realVlu());
		for(let i = 1; i < this.logEntries.length; ++i) {
			itm = this.logEntries[i].children[axelIdx];
			ctx.lineTo(vertBarWidth + i * stepFactor,
					   this.canvasNode.height - horizBarHeight - itm.realVlu());
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


/*
// a quick test, saved as template for future work
<!DOCTYPE html>
<html>
<body>

<div  style="border:1px solid #d3d3d3;max-width:300; overflow: auto;">
<canvas id="myCanvas" height="200">
Your browser does not support the HTML canvas tag.</canvas>
</div>

<script>
const stepFactor = 15;
var c = document.getElementById("myCanvas");
var values =  [96,93,82,95,78,90,94,71,76,85,93,100,110,120,99,96,87,76,87,71,86,84,89,92,100,93,75,74,82,71,58,67,69,76,75,87,87,67,68,52,39,41,43,51,45,49,50,61,73,72,76,86,77,89,77,92,70,59,59,70,81,67,72,55,61,70,59,68,81,91,100,89,78,97,90,84,68,85,81,79,71,54,63,78,66,68,61,64,51,52,55,44,55,42,35,44,37,45,36];
const height = c.height;
c.width = values.length * stepFactor;
var ctx = c.getContext("2d");
let x = stepFactor;
ctx.moveTo(x, height  - values[0]);
for(let i = 1; i < values.length; ++i) {
	x += stepFactor
	ctx.lineTo(x, height  - values[i])
}
ctx.stroke();
</script>

</body>
</html>
*/

