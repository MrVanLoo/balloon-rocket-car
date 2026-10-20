// Teacher settings: limits, cleanup, and conversion to and from the dialog's display units. Pure, no DOM.
// Stored in SI-style CONFIG units (pumpL in liters, stringM in meters); the dialog shows the selected units.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

const SETTINGS_KEY = 'balloonRocket.settings';

const settingsUnitLib = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
  ? require('./units.js')
  : { toDisplay, fromDisplay };
const settingsDefaults = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
  ? require('./physics.js').CONFIG
  : CONFIG;

const SETTINGS_LIMITS = {
  pumpL:    { min: 0.05, max: 5 },  // L. Spans small party pumps to one large pump stroke (Balloons Wiki, Balloon Pumps).
  maxPumps: { min: 1, max: 8 },     // Teacher decision (CLAUDE.md #1).
  stringM:  { min: 3, max: 20 }     // m. 3 m (Science World) up to a long hallway; 20 m is an estimate.
};

function clampSetting(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// Clean a settings object from storage or the dialog. Bad or missing values fall back to defaults.
function sanitizeSettings(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : NaN;
  const pick = (key, round) => {
    const v = num(raw[key]);
    if (isNaN(v)) return settingsDefaults[key];
    return round(clampSetting(v, SETTINGS_LIMITS[key].min, SETTINGS_LIMITS[key].max));
  };
  return {
    pumpL: pick('pumpL', (v) => Math.round(v * 1000) / 1000),
    maxPumps: pick('maxPumps', Math.round),
    stringM: pick('stringM', (v) => Math.round(v * 100) / 100),
    variation: typeof raw.variation === 'boolean' ? raw.variation : settingsDefaults.variation
  };
}

function defaultSettings() {
  return sanitizeSettings({});
}

// Values for the dialog's inputs in the selected units, rounded for display.
function settingsToForm(s, system) {
  return {
    pump: Number(settingsUnitLib.toDisplay('air', s.pumpL / 1000, system).toFixed(2)),
    max: s.maxPumps,
    len: Number(settingsUnitLib.toDisplay('dist', s.stringM, system).toFixed(1)),
    variation: s.variation
  };
}

// Read the dialog's inputs (strings or numbers in the selected units) back into settings.
function formToSettings(f, system) {
  const n = (v) => (v === '' || v === null || v === undefined) ? NaN : Number(v);
  return sanitizeSettings({
    pumpL: settingsUnitLib.fromDisplay('air', n(f.pump), system) * 1000,
    maxPumps: n(f.max),
    stringM: settingsUnitLib.fromDisplay('dist', n(f.len), system),
    variation: !!f.variation
  });
}

// Limits for the dialog's number inputs, in the selected units.
function settingsInputLimits(system) {
  const air = (L) => Number(settingsUnitLib.toDisplay('air', L / 1000, system).toFixed(2));
  const len = (m) => Number(settingsUnitLib.toDisplay('dist', m, system).toFixed(1));
  return {
    pump: { min: air(SETTINGS_LIMITS.pumpL.min), max: air(SETTINGS_LIMITS.pumpL.max), step: system === 'imperial' ? 0.1 : 0.05 },
    max: { min: SETTINGS_LIMITS.maxPumps.min, max: SETTINGS_LIMITS.maxPumps.max, step: 1 },
    len: { min: len(SETTINGS_LIMITS.stringM.min), max: len(SETTINGS_LIMITS.stringM.max), step: system === 'imperial' ? 1 : 0.5 }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SETTINGS_KEY, SETTINGS_LIMITS, sanitizeSettings, defaultSettings, settingsToForm, formToSettings, settingsInputLimits };
}
