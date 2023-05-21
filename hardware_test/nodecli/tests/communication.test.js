/**
 * Attempts to test RC-gearbrake communication utilities
 */

const {
  sendBuf, CommsCmdType_e,
  fetchDiagValues, setDiag,
  clearDiag, fetchSettings,
  saveSettings
} = require('../RC_talk_layer');

const {setupRc, closeRc} = require('../test_setup');

// to be sure that setup is run before tests
beforeAll(async ()=>{
  await setupRc();
});

afterAll(async ()=>{
  await closeRc();
});

test('PING', async ()=>{
  const res = await sendBuf([], CommsCmdType_e.commsCmd_Ping, true);
  const frm = res.onefrm();
  expect(frm.cmd).toBe(CommsCmdType_e.commsCmd_Pong);
  expect(frm.len).toBe(3);
  expect(frm.reqId).toBe(0);
});

test('VERSION', async ()=>{
  const res = await sendBuf([], CommsCmdType_e.commsCmd_version, true);
  const frm = res.onefrm();
  expect(frm.cmd).toBe(CommsCmdType_e.commsCmd_version);
  expect(frm.len).toBe(4);
  expect(frm.data[0]).toBe(1);
});

test('ERROR', async ()=>{
  const res = await sendBuf([], CommsCmdType_e.commsCmd_Error, true);
  const frm = res.onefrm();
  expect(frm.cmd).toBe(CommsCmdType_e.commsCmd_Error);
  expect(frm.len).toBe(3);
});

test('OK_IS_ERROR', async ()=>{
  const res = await sendBuf([], CommsCmdType_e.commsCmd_OK, true);
  const frm = res.onefrm();
  expect(frm.cmd).toBe(CommsCmdType_e.commsCmd_Error);
  expect(frm.len).toBe(3);
});

test('FW_HASH', async ()=>{
  const res = await sendBuf([], CommsCmdType_e.commsCmd_fwHash, true);
  const frm = res.onefrm();
  expect(frm.cmd).toBe(CommsCmdType_e.commsCmd_fwHash);
  expect(frm.len).toBe(10);
  expect(frm.data.map(c=>String.fromCharCode(c)).join('')).toBeAlphaNumeric();
});