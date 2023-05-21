const stim = require('./comms_stimulator'),
      rc   = require('./comms_rc_gearbrake'),
      rctalk = require('./RC_talk_layer');


module.exports = {
  setup: async ()=>{
    if (!await rc.connect(rctalk)) {
      console.error("failed to connect to RC-gearbrake");
      return;
    }
    if (!await stim.connect()) {
      console.error("failed to connect to stimulator");
    }
  },
};

