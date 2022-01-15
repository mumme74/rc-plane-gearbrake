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
   * @param {*} forcedVlu
   */
  async forceValue(forcedVlu) {
    if (!this.forced) {
      let res = await this.parent._forceValue(this, forcedVlu);
      if (res)
        this._setForced(true);
      return res;
    }
    return true;
  }

  /**
   * @brief release this forced value
   *        (and potential other in the same group)
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
   */
  isForceable() {
    return this.parent._forceItemBuildArr(this).byteArr.length > 1;
  }

  _setForced(forced) {
    if (forced === this.forced) return;
    this.forced = forced;
    this.onForcedChanged.emit(this)
  }

  setValue(newValue) {
    if (newValue !== this.value) {
      this.value = newValue;
      this.onUpdated.emit(this);
    }
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
    InputsWsRcv: 1 << 3,
    InputsAccel: 1 << 4
  }

  dataItems = [];
  onRefresh = [];

  freq = 0;

  _fetchTmr = null;

  static instance() {
    if (!DiagnoseBase._instance)
        DiagnoseBase._instance = new DiagnoseBase.DiagnoseBaseVersions[
          DiagnoseBase.DiagnoseBaseVersions.length - 1
        ];
    return DiagnoseBase._instance;
  }

  constructor() {
    this.onRefresh = new EventDispatcher(this);
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
    }

    if (freq > 0) {
      const comms = CommunicationBase.instance();

      if (!comms.isOpen() && !(await comms.openDevice()))
        return false;

      this._fetchTmr = setInterval(async ()=>{
        if (!this._fetchTmr) return; // stopped during timeout
        const data = await comms.poolDiagData();
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

  async _forceValue(itm, forcedVlu) {
    let {byteArr, together} = this._forceItemBuildArr(itm);
    if (byteArr.length > 1) {
      // it is a forceable item
      itm._setForced(true);
      itm.value = forcedVlu;
      together.forEach(itm=>itm._setForced(true));
      let ret = await CommunicationBase.instance().setDiagVlu(byteArr);
      if (!ret)
        together.forEach(itm=>itm._setForced(false));
      return ret;
    }
    return false;
  }

  async _unForceVlu(itm) {
    let {byteArr, together} = this._forceItemBuildArr(itm);
    if (byteArr.length > 1) {
      // it is a forceable item
      itm._setForced(false);
      together.forEach(itm=>itm._setForced(false));
      let ret = await CommunicationBase.instance().setDiagVlu(byteArr);
      if (!ret)
        together.forEach(itm=>itm._forced(true));
      return ret;
    }
    return false;
  }

  _forceItemBuildArr(itm) {
    let byteArr = [], together = [];
    if (this._forceTogether.inputs.indexOf(itm.type) > -1) {
      byteArr[0] = 6; // bytes
      byteArr[1] = DiagnoseBase.SetVluPkgTypes.InputsWsRcv;
      together = this._forceTogether.inputItms;
      together.forEach(itm=>itm.save(byteArr, byteArr.length));

    } else if (this._forceTogether.accel.indexOf(itm.type) > -1) {
      byteArr[0] = 8; // bytes
      byteArr[1] = DiagnoseBase.SetVluPkgTypes.InputsAccel;
      together = this._forceTogether.accelItms;
      together.forEach(itm=>itm.save(byteArr, byteArr.length));

    } else {
      byteArr[0] = 3; // bytes
      switch (itm.type) {
      case ItemBase.Types.brakeForce0_out:
        byteArr[1] = DiagnoseBase.SetVluPkgTypes.Output0; break;
      case ItemBase.Types.brakeForce1_out:
        byteArr[1] = DiagnoseBase.SetVluPkgTypes.Output1; break;
      case ItemBase.Types.brakeForce2_out:
        byteArr[1] = DiagnoseBase.SetVluPkgTypes.Output2; break;
      default:
        return {byteArr, together}; // itm is not forceable
      }

      itm.save(byteArr, byteArr.length);
    }

    // when reached here we have a itm that is and should be enforcable
    return {byteArr, together};
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

    this._forceTogether = {
      inputs: [
        ItemBase.Types.wantedBrakeForce, ItemBase.Types.wheelRPS_0,
        ItemBase.Types.wheelRPS_1,       ItemBase.Types.wheelRPS_2,
      ],
      accel: [
        ItemBase.Types.accelX, ItemBase.Types.accelY, ItemBase.Types.accelZ
      ]
    };

    this._forceTogether.inputItms =
      this._forceTogether.inputs.map(tp=>this.getItem(tp));
    this._forceTogether.accelItms =
      this._forceTogether.accel.map(tp=>this.getItem(tp));
  }

  _refreshDataArrived(data) {
    let pos = 0;
    this.dataItems.forEach(itm=>pos+=itm.restore(data, pos));
  }
}
DiagnoseBase.DiagnoseBaseVersions.push(Diagnose_v1);
