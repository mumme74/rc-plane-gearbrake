const SerialPort = require("serialport").SerialPort;

let port, recieveCb;

function parse(data) {
  //console.log("Recieved from RC-gearbrake", data);
  if (recieveCb)
    recieveCb(data);
}

module.exports = {
  connect: async (talkLayer, path) =>{
    if (port)
      return;

    if (!path) {
      path = ((await SerialPort.list())
        .find(p=>p.manufacturer?.toLowerCase()
                  .indexOf('stmicroelectronics')>-1))?.path;
    }
    if (!path) {
      console.error("No port given, and no rc-gearbrake attached");
      return false;
    }

    console.log(`Connecting RC-gearbrake to: ${path}`);
    let resolve, reject;
    const res = new Promise((res, rej)=>{
      resolve = res;
      reject = rej;
    });
    port = new SerialPort({path, baudRate:115200}, (err)=>{
      if (!err)
        recieveCb = talkLayer.initComms(port);
      else
        console.error(`Error opening port ${path}`, err);
      resolve(!err);
    });
    port.on('data', (data)=>{
      parse(data);
    });
    port.on('error', (err)=>{
      console.error('RC-Gearbrake error', err);
      if (port.isOpen)
        port.close();
    });
    return res;
  },

  close: async ()=>{
    if (port?.isOpen)
      await port.close();
    port = null;
  },

  isOpen: ()=>{
    return port !== null && port.isOpen();
  }
};