// Trial log records and their saved form. Pure functions, no DOM.
// A trial: { trial, pumps, air (m^3), dist (m), time (s), vmax (m/s), pred (m or null), end (bool) }.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

const STORE_KEY = 'balloonRocket.v1';

function nextTrialNumber(trials) {
  return trials.length ? trials[trials.length - 1].trial + 1 : 1;
}

// Build the logged trial from a finished simulate() run. predM is the prediction in meters, or null.
function makeTrial(trials, run, pumpL, predM) {
  return {
    trial: nextTrialNumber(trials),
    pumps: run.pumps,
    air: run.pumps * pumpL / 1000,
    dist: run.distance,
    time: run.duration,
    vmax: run.vmax,
    pred: (typeof predM === 'number' && isFinite(predM) && predM >= 0) ? predM : null,
    end: !!run.reachedEnd
  };
}

// Keep only well-formed trials from saved data, so a damaged save cannot break the page.
function sanitizeTrials(raw) {
  if (!Array.isArray(raw)) return [];
  const num = (v) => typeof v === 'number' && isFinite(v) && v >= 0;
  return raw.filter((r) => r && typeof r === 'object' &&
      Number.isInteger(r.trial) && r.trial > 0 && Number.isInteger(r.pumps) && r.pumps > 0 &&
      num(r.air) && num(r.dist) && num(r.time) && num(r.vmax) && (r.pred === null || num(r.pred)))
    .map((r) => ({ trial: r.trial, pumps: r.pumps, air: r.air, dist: r.dist, time: r.time, vmax: r.vmax, pred: r.pred, end: !!r.end }));
}

function serializeLog(trials, name) {
  return JSON.stringify({ trials, name: name || '' });
}

function parseLog(text) {
  try {
    const s = JSON.parse(text || 'null');
    if (!s || typeof s !== 'object') return { trials: [], name: '' };
    return { trials: sanitizeTrials(s.trials), name: typeof s.name === 'string' ? s.name.slice(0, 40) : '' };
  } catch (e) {
    return { trials: [], name: '' };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORE_KEY, nextTrialNumber, makeTrial, sanitizeTrials, serializeLog, parseLog };
}
