"use strict";

class DiagnoseItem extends ItemBase {
  fiddled = false; // if we have set this value in device
  constructor({
    value = null,
    valueBytes = [],
    type = ItemBase.Types.uninitialized
  }) {
      const size = ItemBase.Types.info(type).bytes;
      super({value, size, type, valueBytes})
  }

  async setValue(value) {
    this.fiddled = await CommunicationBase.instance().setDiagVlu({
      byteArr: 0 // TODO call owner as DiagItems must be fiddled in grups
    });

    if (this.fiddled)
      this.value = value;
  }
}

// handles diagnose stuff
class DiagnoseBase {
  static DiagnoseBaseVersions = [];
  static _instance = null;

  dataItms = [];

  _fetchTmr = null;

  refreshCallbacks = [];

  static instance() {
    if (!DiagnoseBase._instance)
        DiagnoseBase._instance = new DiagnoseBase.DiagnoseBaseVersions[
          DiagnoseBase.DiagnoseBaseVersions.length - 1
        ];
    return DiagnoseBase._instance;
  }

  constructor() {}

  /**
   * @breif Sets up a refresh interval to refetch Diagnose data
   * @param {*} rate timeout in milliseconds
   *            for how often we poll for new data
   *            0 = off
   */
  setFetchRefreshRate(rate = 0) {
    if (this._fetchTmr)
      clearTimeout(this._fetchTmr);

    if (rate > 0) {
      this._fetchTmr = setInterval(async ()=>{
        const data = await CommunicationBase.instance().poolDiagData();
        if (data?.length > 3) {
            this._refreshDataArrived(data);
            for(let cb of this.refreshCallbacks)
              cb(data);
        }
      }, rate);
    }
  }

  getItem(type) {
    return this.dataItms.find(itm=>itm?.type===type);
  }
}

// communication protocol v1 implemented here
class Diagnose_v1 extends DiagnoseBase {
  constructor() {
    super();
    const t = ItemBase.Types;
    this.dataItms = [
        // construct in the order it arrives
        new DiagnoseBase({types:t.slip0}),
        new DiagnoseBase({types:t.slip1}),
        new DiagnoseBase({types:t.slip2}),
        new DiagnoseBase({types:t.accelSteering}),
        new DiagnoseBase({types:t.wsSteering}),
        new DiagnoseBase({types:t.accel}),
        new DiagnoseBase({types:t.accelX}),
        new DiagnoseBase({types:t.accelY}),
        new DiagnoseBase({types:t.accelZ}),
        new DiagnoseBase({types:t.speedOnGround}),
        new DiagnoseBase({types:t.wantedBrakeForce}),
        new DiagnoseBase({types:t.calcBrakeForce}),
        new DiagnoseBase({types:t.wheelRPS_0}),
        new DiagnoseBase({types:t.wheelRPS_1}),
        new DiagnoseBase({types:t.wheelRPS_2}),
        new DiagnoseBase({types:t.brakeForce0_out}),
        new DiagnoseBase({types:t.brakeForce1_out}),
        new DiagnoseBase({types:t.brakeForce2_out}),
    ];
  }

  _refreshDataArrived(data) {
    let pos = 0;
    for (let itm of this.dataItms) {
      pos += this.dataItms.restore(data, pos);
    }
  }
}
DiagnoseBase.DiagnoseBaseVersions.push(Diagnose_v1);
