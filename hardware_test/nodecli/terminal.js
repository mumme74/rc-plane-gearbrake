#!/usr/bin/env node
const SerialPort = require("serialport").SerialPort;
const getopts = require("getopts");
const readline = require("readline");

function completer(line) {
  const genGet = (name) => [0,1,2].map(i=>`${name}${i}`);
  const genSet = (name) => genGet(name).map(s=>s+'=');
  const gen = (name) => [...genGet(name), ...genSet(name)];
  const completions = [
    'rcv','rcv=','help',
    ...gen('out'),
    ...genGet('out-freq'),
    ...gen('wh-speed'),
    ...gen('wh-pulses')
  ];
  const hits = completions.filter(c=>c.startsWith(line));
  return [hits.length ? hits : completions, line];
}

async function listPorts() {
  const ports = await SerialPort.list();
  for (const port of ports.map(p=>{
    return {path:p.path, manufacturer:p.manufacturer};
  }))
    console.log(port);
}

async function connect(path, cmd) {
  if (cmd) cmd = cmd.replace(/(?:^['"]|['"]$)/,"");
  if (!path) {
    path = ((await SerialPort.list())
      .find(p=>p.manufacturer.toLocaleLowerCase()
                 .indexOf('arduino')>-1))?.path;
  }
  if (!path) {
    console.error("No port given, and no arduino attached");
    return;
  }

  console.log(`Connecting to: ${path}`);
  const port = new SerialPort({path, baudRate:115200});
  talkTo(port, cmd);
}

function isHexChar(ch) {
  return (ch >= '0' && ch <= '9') ||
         (ch >= 'a' && ch <= 'f') ||
         (ch >= 'A' && ch <= 'F')
}

function strToEscape(inStr) {
  let buf = [], hexIdx = 0, hexStr = "";
  const pushHexBuf = ()=> {
    if (hexStr) {
      buf.push(parseInt(hexStr, 16))
      hexStr = ""; hexIdx = 0;
    }
  }

  for (const ch of inStr.split('')) {
    if (ch === '\\') {
      pushHexBuf();
      hexIdx = 1;
    } else if(hexIdx === 1){
      if (ch === 'n') {
        hexIdx = 0; hexStr = "";
        buf.push('\n');
      } else if (ch === 'x') {
        hexIdx++;
      } else {
        console.error(`Expected \\x or \\n not ${ch}`);
      }
    } else if (hexIdx === 2) {
      if (!isHexChar(ch)) {
        console.error(`Expected a hexadecimal not ${ch}`);
        return;
      }
      hexStr = ch; hexIdx++;
    } else if (hexIdx === 3) {
      if (!isHexChar(ch)) {
        console.error((`Expected a hexadecimal not ${ch}`));
        return;
      }
      hexStr += ch; hexIdx++;
      pushHexBuf();
    } else {
      pushHexBuf();
      buf.push(ch);
    }
  }
  pushHexBuf();
  return buf;
}

async function talkTo(port, cmd) {
  let exitNow = false;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal:true, completer
  });
  const onCmd = (line)=>{
    if (line.trim() == 'quit')
      return rl.close();
    const buf = strToEscape(line);
    if (!buf?.length)
      return;
    console.log('sending', buf);
    port.write(buf.map(v=>typeof v=='string'?v.charCodeAt(0):v));//.join('')+'\n');
  };

  port.on('error', (err)=>{
    console.error(err);
  });
  port.on('data', (data)=>{
    let buf = data.map(n=>n.toString(16));
    process.stdout.write(`${data} data: \\x${buf.join("\\x")}\n`);
    if (exitNow) rl.close();
  });
  rl.on('line', onCmd);
  rl.on('close', ()=>{
    console.log("Quitting...");
    port.close();
  });

  if (cmd){
    onCmd(cmd);
    exitNow = true;
  }
}

function help() {
  const prgName = __filename.split('/').slice(-1);
  console.log(`
  Connect to stimulator:
    ${prgName} list\t\t\tList all ports
    ${prgName} connect <PORT>\t\tConnect to PORT
    ${prgName} help\t\t\t Show this help
  `);
}


const argOptions = getopts(process.argv.slice(2), {stopEarly: true});
const [command, subargv, cmd] = argOptions._;

switch (command) {
case 'list':
  listPorts();
  break;
case 'connect':
  connect(subargv, cmd);
  break;
case 'help':
  help(); break;
default:
  console.log(`**Unrecognized command ${command}`);
  help();
}