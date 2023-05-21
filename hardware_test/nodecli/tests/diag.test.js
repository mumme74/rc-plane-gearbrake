/**
 * Tests RC-gearbrake diag functionality
 */

const {
  sendBuf, CommsCmdType_e,
  fetchDiagValues, setDiag,
  clearDiag,
  DiagReadVluPkg_t,
  DiagSetVluPkg_t,
  setVluPkgType_e,
} = require('../RC_talk_layer');

const {setupRc, closeRc} = require('../test_setup');

const forcedTypes = [];

// used to trace and aout disable forced values when testcase is over
const setDiagTrace = async (diagPkg) => {
  if (forcedTypes.indexOf(diagPkg.type) === -1)
    forcedTypes.push(diagPkg.type);
  return await setDiag(diagPkg);
}

beforeAll(async ()=>{
  await setupRc();
});

afterAll(async ()=>{
  // restore diag to not have forced values
  for (const tp of forcedTypes) {
    if (!await clearDiag(tp))
      console.error("failed to unset diagvalue " + tp);
  }

  await closeRc();
});

test('Get diagValues', async ()=>{
  const diag = await fetchDiagValues();
  const jsDiag = new DiagReadVluPkg_t();
  delete jsDiag.accelAxis;
  delete jsDiag.acceleration;
  expect(diag).toMatchObject(jsDiag);
});

test('Force brakeforce in', async ()=>{
  const diagPkg = new DiagSetVluPkg_t();
  diagPkg.setBrakeForceIn(50);
  const res = await setDiagTrace(diagPkg);
  expect(res).toBe(true);
  const diag = await fetchDiagValues();
  expect(diag.brakeForceIn).toBe(diagPkg.data[0]);
});

test('Force wheelSensor0', async ()=>{
  const diagPkg = new DiagSetVluPkg_t();
  diagPkg.setWheelRPSVlu(0, 50);
  const res = await setDiagTrace(diagPkg);
  expect(res).toBe(true);
  const diag = await fetchDiagValues();
  expect(diag.wheelRPS[0]).toBe(diagPkg.data[0]);
});

test('Force wheelSensor1', async ()=>{
  const diagPkg = new DiagSetVluPkg_t();
  diagPkg.setWheelRPSVlu(1, 60);
  const res = await setDiagTrace(diagPkg);
  expect(res).toBe(true);
  const diag = await fetchDiagValues();
  expect(diag.wheelRPS[1]).toBe(diagPkg.data[0]);
});

test('Force wheelSensor2', async ()=>{
  const diagPkg = new DiagSetVluPkg_t();
  diagPkg.setWheelRPSVlu(2, 70);
  const res = await setDiagTrace(diagPkg);
  expect(res).toBe(true);
  const diag = await fetchDiagValues();
  expect(diag.wheelRPS[2]).toBe(diagPkg.data[0]);
});

test('Force brakeOutput', async ()=>{
  for (let wheel = 0; wheel < 3; wheel++) {
    const diagPkg = new DiagSetVluPkg_t();
    diagPkg.setWheelBrakeForce(wheel, 50 + wheel * 10);
    const res = await setDiagTrace(diagPkg);
    expect(res).toBe(true);
    const diag = await fetchDiagValues();
    expect(diag.brakeForce_Out[wheel]).toBe(diagPkg.data[0]);
  }
});

test('Force acceleration', async ()=>{
  for (let axis = 0; axis < 3; axis++) {
    const diagPkg = new DiagSetVluPkg_t();
    diagPkg.setAccelVlu(axis, 50 + axis * 10);
    const res = await setDiagTrace(diagPkg);
    expect(res).toBe(true);
    const diag = await fetchDiagValues();
    expect(diag.accelAxis[axis]).toBe(diagPkg.data[0]);
  }
});
