const SerialPort = require("serialport").SerialPort;

let port, recieveCb;
const rcvBuf = [];

function parse() {
  console.log("Recieved from RC-gearbrake", rcvBuf);
  if (recieveCb)
    recieveCb(rcvBuf);
}

module.exports = {
  connect: async (talkLayer, path) =>{
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
    port = new SerialPort({path, baudRate:115200});
    port.on('data', (data)=>{
      rcvBuf.push(...data);
      parse();
    });
    port.on('error', (err)=>{
      console.error('RC-Gearbrake error', err);
      if (port.isOpen)
        port.close();
    });
    recieveCb = talkLayer.initComms(port)
    return true;
  },

  isOpen: ()=>{
    return port !== null && port.isOpen();
  }
};