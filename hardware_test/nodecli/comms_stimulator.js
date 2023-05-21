const SerialPort = require("serialport").SerialPort;

let port = null;
const rcvBuf = [];

function parse() {
  console.log("Recieved from Stimulator");
}

module.exports = {
  connect: async (path) =>{
    if (!path) {
      path = ((await SerialPort.list())
        .find(p=>p.manufacturer?.toLowerCase()
                  .indexOf('arduino')>-1))?.path;
    }
    if (!path) {
      console.error("No port given, and no arduino attached");
      return false;
    }

    console.log(`Connecting stimulator to: ${path}`);
    port = new SerialPort({path, baudRate:115200});
    port.on('data', (data)=>{
      rcvBuf.push(...data);
      parse();
    });
    port.on('error', (err)=>{
      console.error('Stimulator error', err);
      if (port.isOpen)
        port.close();
    });
    return true;
  },

  isConnected: ()=>{
    return port !== null && port.isConnected();
  }
};