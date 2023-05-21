const SerialPort = require("serialport").SerialPort;

let port = null;

function parse(data) {
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
      parse(data);
    });
    port.on('error', (err)=>{
      console.error('Stimulator error', err);
      if (port.isOpen)
        port.close();
    });
    return true;
  },

  close: async ()=>{
    if (port?.isOpen)
      await port.close();
    port = null;
  },

  isConnected: ()=>{
    return port !== null && port.isConnected();
  }
};