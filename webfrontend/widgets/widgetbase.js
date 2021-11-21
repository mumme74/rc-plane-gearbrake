"use strict";

class WidgetBaseCls {
  rootNode;
  redrawTimeout = 10;
  sessionIdx = -1; // the flight session
  data = [];
  colData = [];
  shownColumns = [];
  dirty = false;

  constructor(shownColumns) {
    this.shownColumns = shownColumns;
  }

  setParentNode(parent) {
    parent.appendChild(this.rootNode);
  }

  /**
   * @brief Hide/show widget
   * @param {Boolean} visible
   */
  setVisible(visible) {
    if (this.rootNode)
      this.rootNode.style.cssText = visible ? "" : "display:none";
    if (visible && this.dirty) {
      this.clear();
      this.render();
    }
  }

  /**
   * @brief Returns if widget is visible i DOM
   * @returns {Boolean} true if visible
   */
  isVisible() {
    if (this.rootNode)
      return !/display:\s*none/.test(this.rootNode.style.cssText);
    return false;
  }

  /**
   * @brief clear all html children to this node
   */
  clear() {
    if (this.rootNode) {
      while(this.rootNode.lastChild)
        this.rootNode.removeChild(this.rootNode.lastChild);
    }
  }

  /**
   * @brief render content, subclasses must implement
   */
  render() {
    this.dirty = false;
  }

  /**
   * @brief Schedule a redraw of the table, might be for eaxmple when we selected to hide a column
   */
  scheduleRedraw() {
    this.dirty = true;
    clearTimeout(this._redrawTmr);
    if (this.isVisible())
      this._redrawTmr = setTimeout(this.render.bind(this), this.redrawTimeout);
  }

  /**
   * @brief Sets new data, triggers re-render of content
   * @param {*} colData
   * @param {*} data
   */
  setData(colData, data) {
    this.colData = colData;
    this.data = data;
    this.dirty = true;
    if (this.isVisible()) {
      this.clear();
      this.render();
    }
  }

  onShownColumnsChanged() {
    this.dirty = true;
  }
}