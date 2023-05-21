"use strict";

class DiagnoseItem extends ItemBase {
  forced = false; // if we have set this value in device
  onForcedChanged = null;
  onUpdated = null

  constructor({
    parent,
    value = null,
    valueBytes = [],
    type = ItemBase.Types.uninitialized
  }) {
      const size = ItemBase.Types.info(type).bytes;
      super({value, size, type, valueBytes})

      this.parent = parent;

      this.onForcedChanged = new EventDispatcher(this);
      this.onUpdated = new EventDispatcher(this)
  }

  /**
   * @brief force a value onto this device
   * @param {number} forcedVlu
   * @returns {boolean} True on success
   */
  async forceValue(forcedVlu) {
    let res = await this.parent._forceValue(this, forcedVlu);
    if (res)
      this._setForced(true);
    return res;
  }

  /**
   * @brief release this forced value
   *        (and potential other in the same group)
   * @returns {boolean} True on success
   */
  async unForceValue() {
    if (this.forced) {
      let res = await this.parent._unForceVlu(this);
      if (res)
        this._setForced(false);
      return res;
    }
    return true;
  }

  /**
   * @brief Checks if This item is forcable,
   *        not every item is able to be set set in device
   * @returns {boolean} True if it is forceable
   */
  isForceable() {
    return this.parent._forceableTypes
            .find(itm=>itm.itmType === this.type) !== undefined;
  }

  _setForced(forced) {
    if (forced === this.forced) return;
    this.forced = forced;
    this.onForcedChanged.emit(this)
  }

  /**
   * Set value of this item
   * @param {number} newValue
   */
  setValue(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      this.onUpdated.emit(this);
    }
  }

  /**
   * Returns the diagvalue type for this item, or 0
   * @returns {number} the SetVluDiagType for this item
   */
  getSetDiagValueType() {
    let o = this.parent._forceableTypes
              .find(itm=>itm.itmType===this.type);
    return o ? o.diagType : 0;
  }
}

// used to store diagdata in a log, to be used by chart wgt
class DiagDataAtTime {
  constructor(data) {
    this.children = data;
  }
  getChild(type) {
    return this.children.find(c=>c.type===type);
  }
}

// handles diagnose stuff
class DiagnoseBase {
  static DiagnoseBaseVersions = [];
  static _instance = null;
  static SetVluPkgTypes = {
    Invalid: 0,
    // these must be in this order, with bitmask values
    Output0:     1 << 0,
    Output1:     1 << 1,
    Output2:     1 << 2,
    InputRcv:    1 << 3,
    InputWhl0:   1 << 4,
    InputWhl1:   1 << 5,
    InputWhl2:   1 << 6,
    InputAcc0:   1 << 7,
    InputAcc1:   1 << 8,
    InputAcc2:   1 << 9,
  }

  dataItems = [];
  onRefresh = null;

  freq = 0;

  _fetchTmr = null;
  _poolInFlight = false;

  static instance() {
    if (!DiagnoseBase._instance)
        DiagnoseBase._instance = new DiagnoseBase.DiagnoseBaseVersions[
          DiagnoseBase.DiagnoseBaseVersions.length - 1
        ];
    return DiagnoseBase._instance;
  }

  constructor(logsize = 30) {
    this.onRefresh = new EventDispatcher(this);
    this.logsize = logsize;
    this.logPoints = [];
  }

  /**
   * @breif Sets up a refresh interval to refetch Diagnose data
   * @param {*} freq frequency in Hz
   *            for how often we poll for new data
   *            0 = off
   */
  async setFetchRefreshFreq(freq = 0) {
    this.freq = freq;
    if (this._fetchTmr) {
      clearTimeout(this._fetchTmr);
      this._fetchTmr = null;
      this._poolInFlight = false;
    }

    if (freq > 0) {
      const comms = CommunicationBase.instance();

      if (!comms.isOpen() && !(await comms.openDevice()))
        return false;

      this._fetchTmr = setInterval(async ()=>{
        if (this._poolInFlight)
          return;
        if (!this._fetchTmr) return; // stopped during timeout
        this._poolInFlight = true;
        const data = await comms.poolDiagData();
        this._poolInFlight = false;
        if (data?.length > 3) {
            try {
              this._refreshDataArrived(data);
              this.onRefresh.emit();
              return; // return here
            } catch(e) {
              console.error(e);
            }
        }
        // if we get here we have an error
        //clearInterval(this._fetchTmr);
      }, 1000 / freq);
    }

    return this._fetchTmr !== null;
  }

  getItem(type) {
    return this.dataItems.find(itm=>itm?.type===type);
  }

  getColumnTypes() {
    return this.dataItems.map(itm=>{
      return {
        entry:itm,
        tr:itm.translatedType()
      }
    });
  }

  _buildSetDiagPkg(itm) {
    const byteArr = [3 + itm.size]; // bytes in this pkg
    const diagType = itm.getSetDiagValueType();
    if (diagType < 1) return [];

    byteArr[1] = (diagType & 0xFF00) >> 8;
    byteArr[2] = (diagType & 0x00FF) >> 0;
    itm.save(byteArr, byteArr.length);
    return byteArr;
  }

  async _forceValue(itm, forcedVlu) {
    if (!itm.isForceable()) return false;
    itm.value = forcedVlu;

    const byteArr = this._buildSetDiagPkg(itm);
    if (byteArr.length < 4) return false;

    // is a forceable item
    itm._setForced(true);
    return await CommunicationBase.instance().setDiagVlu(byteArr);
  }

  async _unForceVlu(itm) {
    if (!itm.isForceable()) return false;
    const byteArr = this._buildSetDiagPkg(itm);
    if (byteArr.length < 4) return false;
    itm._setForced(false);
    const sndPkg = byteArr.slice(1, 3);
    return await CommunicationBase.instance().clearDiagVlu(sndPkg);
  }

  _refreshDataArrived(data) {
    if (this.logPoints.length > this.logsize)
      this.logPoints.splice(0, this.logPoints.length - this.logsize);
    const itms = this.dataItems.map(itm=>new ItemBase({
      type:itm.type, value: itm.value, size: itm.size}));
    this.logPoints.push(new DiagDataAtTime(itms));
  }
}

// communication protocol v1 implemented here
class Diagnose_v1 extends DiagnoseBase {
  constructor() {
    super();
    const t = ItemBase.Types;
    this.dataItems = [
      // construct in the order it arrives
      new DiagnoseItem({parent:this, type:t.slip0}),
      new DiagnoseItem({parent:this, type:t.slip1}),
      new DiagnoseItem({parent:this, type:t.slip2}),
      new DiagnoseItem({parent:this, type:t.accelSteering}),
      new DiagnoseItem({parent:this, type:t.wsSteering}),
      new DiagnoseItem({parent:this, type:t.accel}),
      new DiagnoseItem({parent:this, type:t.accelX}),
      new DiagnoseItem({parent:this, type:t.accelY}),
      new DiagnoseItem({parent:this, type:t.accelZ}),
      new DiagnoseItem({parent:this, type:t.speedOnGround}),
      new DiagnoseItem({parent:this, type:t.wantedBrakeForce}),
      new DiagnoseItem({parent:this, type:t.calcBrakeForce}),
      new DiagnoseItem({parent:this, type:t.wheelRPS_0}),
      new DiagnoseItem({parent:this, type:t.wheelRPS_1}),
      new DiagnoseItem({parent:this, type:t.wheelRPS_2}),
      new DiagnoseItem({parent:this, type:t.brakeForce0_out}),
      new DiagnoseItem({parent:this, type:t.brakeForce1_out}),
      new DiagnoseItem({parent:this, type:t.brakeForce2_out}),
    ];

    this._forceableTypes = [
      { itmType: ItemBase.Types.brakeForce0_out,
        diagType: DiagnoseBase.SetVluPkgTypes.Output0 },
      { itmType: ItemBase.Types.brakeForce1_out,
        diagType: DiagnoseBase.SetVluPkgTypes.Output1 },
      { itmType: ItemBase.Types.brakeForce2_out,
        diagType: DiagnoseBase.SetVluPkgTypes.Output2 },
      { itmType: ItemBase.Types.wantedBrakeForce,
        diagType: DiagnoseBase.SetVluPkgTypes.InputRcv },
      { itmType: ItemBase.Types.wheelRPS_0,
        diagType: DiagnoseBase.SetVluPkgTypes.InputWhl0 },
      { itmType: ItemBase.Types.wheelRPS_1,
        diagType: DiagnoseBase.SetVluPkgTypes.InputWhl1 },
      { itmType: ItemBase.Types.wheelRPS_2,
        diagType: DiagnoseBase.SetVluPkgTypes.InputWhl2 },
      { itmType: ItemBase.Types.accelX,
        diagType: DiagnoseBase.SetVluPkgTypes.InputAcc0 },
      { itmType: ItemBase.Types.accelY,
        diagType: DiagnoseBase.SetVluPkgTypes.InputAcc1 },
      { itmType: ItemBase.Types.accelZ,
        diagType: DiagnoseBase.SetVluPkgTypes.InputAcc2 }
    ];
  }

  _refreshDataArrived(data) {
    let pos = 0;
    this.dataItems.forEach(itm=>pos+=itm.restore(data, pos));
    super._refreshDataArrived(data);
  }
}
DiagnoseBase.DiagnoseBaseVersions.push(Diagnose_v1);
