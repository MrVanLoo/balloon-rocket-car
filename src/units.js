// Display units. Everything is stored in SI; these helpers convert only for display and export.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

const M_PER_FT = 0.3048;           // exact, international foot
const M_PER_IN = 0.0254;           // exact, international inch
const M3_PER_FLOZ = 29.5735295625e-6; // exact, US fluid ounce (teacher chose fl oz over cups)

// kind -> SI input, display factor, label and decimals per system.
// dist: m, speed: m/s, width: m, air: m^3, time: s.
const UNITS = {
  metric: {
    dist:  { f: 1,                label: 'm',    dp: 2 },
    speed: { f: 1,                label: 'm/s',  dp: 1 },
    width: { f: 100,              label: 'cm',   dp: 1 },
    air:   { f: 1000,             label: 'L',    dp: 2 },
    time:  { f: 1,                label: 's',    dp: 2 }
  },
  imperial: {
    dist:  { f: 1 / M_PER_FT,     label: 'ft',   dp: 2 },
    speed: { f: 1 / M_PER_FT,     label: 'ft/s', dp: 1 },
    width: { f: 1 / M_PER_IN,     label: 'in',   dp: 1 },
    air:   { f: 1 / M3_PER_FLOZ,  label: 'fl oz', dp: 1 },
    time:  { f: 1,                label: 's',    dp: 2 }
  }
};

function unitSystem(system) {
  return UNITS[system] ? system : 'metric';
}

function toDisplay(kind, si, system) {
  return si * UNITS[unitSystem(system)][kind].f;
}

function fromDisplay(kind, value, system) {
  return value / UNITS[unitSystem(system)][kind].f;
}

function unitLabel(kind, system) {
  return UNITS[unitSystem(system)][kind].label;
}

// Fixed-decimal display string, no unit. dp overrides the default decimals.
function fmt(kind, si, system, dp) {
  const u = UNITS[unitSystem(system)][kind];
  return (si * u.f).toFixed(dp === undefined ? u.dp : dp);
}

// Tape measure marks for a string of stringM meters.
// Metric: tick every 0.1 m, mid tick every 0.5 m, labeled major tick every 1 m.
// Imperial: tick every foot, labeled major tick every 5 ft (CLAUDE.md #5).
function tapeMarks(stringM, system) {
  const marks = [];
  if (unitSystem(system) === 'imperial') {
    const n = Math.floor(stringM / M_PER_FT + 1e-9);
    for (let i = 0; i <= n; i++) {
      const major = i % 5 === 0;
      marks.push({ m: i * M_PER_FT, size: major ? 'major' : 'minor', label: major ? String(i) : null });
    }
  } else {
    const n = Math.floor(stringM * 10 + 1e-9);
    for (let i = 0; i <= n; i++) {
      const size = i % 10 === 0 ? 'major' : i % 5 === 0 ? 'mid' : 'minor';
      marks.push({ m: i / 10, size, label: size === 'major' ? String(i / 10) : null });
    }
  }
  return marks;
}

// Axis gridline step for 0..max (display units) giving at most maxLines intervals.
function niceStep(max, maxLines) {
  maxLines = maxLines || 6;
  for (const mag of [1, 10, 100]) {
    for (const s of [1, 2, 5]) {
      if (max / (s * mag) <= maxLines) return s * mag;
    }
  }
  return 1000;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UNITS, M_PER_FT, M_PER_IN, M3_PER_FLOZ, unitSystem, toDisplay, fromDisplay, unitLabel, fmt, tapeMarks, niceStep };
}
