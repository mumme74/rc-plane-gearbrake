const stim = require('./comms_stimulator'),
      rc   = require('./comms_rc_gearbrake'),
      rctalk = require('./RC_talk_layer');

const setupRc = async ()=>{
  if (!await rc.connect(rctalk))
    console.error("failed to connect to RC-gearbrake");
};

const setupStim = async ()=>{
  if (!await stim.connect())
    console.error("failed to connect to stimulator");
};

module.exports = {
  setupAll: async ()=>{
    await setupRcTalk();
    await setupStim();
  },
  setupRc,
  setupStim,
  closeAll: async ()=>{
    await rc.close();
    await stim.close();
  },
  closeRc: rc.close,
  closeStim: stim.close
};

