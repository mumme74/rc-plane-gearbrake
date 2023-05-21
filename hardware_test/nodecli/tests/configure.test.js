/**
 * Tests RC-gearbrake configure functionality
 */

const {
  sendBuf, CommsCmdType_e,
  fetchDiagValues, setDiag,
  clearDiag, fetchSettings,
  saveSettings,
  Settings_t,
  defaultSettings
} = require('../RC_talk_layer');

const {setupRc, closeRc} = require('../test_setup');

let originalSetting;

beforeAll(async ()=>{
  await setupRc();
  originalSetting = await fetchSettings();
});

afterAll(async ()=>{
  // restore original settings
  if (!await saveSettings(originalSetting))
    console.error("failed to restore originalSettings");

  await closeRc();
});

test("Fetch settings", async ()=>{
  const sett = await fetchSettings();
  const cmp = new Settings_t;
  expect(sett.header).toEqual(cmp.header);
});

test("change one setting", async ()=>{
  const sett = await fetchSettings();
  sett.WheelSensor0_pulses_per_rev = 10;
  await saveSettings(sett);
  const sett2 = await fetchSettings();
  expect(sett2).toEqual(sett);
});

test("Invert all settings", async ()=>{
  const sett = await fetchSettings();
  for (const [k, vlu] of Object.entries(sett)) {
    if (typeof(vlu) === 'boolean') sett[k] = !vlu;
    else if (!isNaN(vlu)) {
      if (vlu > 1) vlu < 100 ? sett[k]++ : sett[k]--;
      else sett[k] = vlu ? 0 : 1;
    }
  }
  await saveSettings(sett);
  const sett2 = await fetchSettings();
  expect(sett2).toEqual(sett);
});

test("Set default settings", async ()=>{
  const res = await defaultSettings();
  expect(res).toBe(true);
  const sett = await fetchSettings();
  const jsDefault = new Settings_t();
  expect(sett).toEqual(jsDefault);
});