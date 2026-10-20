import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CONFIG, simulate, gaugePressure, pressureK, unstretchedVolume } = require('../src/physics.js');

const OFF = { variation: false };

// Seeded PRNG (mulberry32) so variation tests are repeatable.
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// CLAUDE.md "Expected physics results": defaults, variation off.
const EXPECTED = [
  { pumps: 1, distance: 1.65, time: 0.74, vmax: 4.41, widthCm: 10.9 },
  { pumps: 2, distance: 3.51, time: 1.11, vmax: 6.36, widthCm: 13.1 },
  { pumps: 3, distance: 4.76, time: 1.39, vmax: 6.84, widthCm: 14.7 },
  { pumps: 4, distance: 5.74, time: 1.67, vmax: 6.94, widthCm: 16.1 },
  { pumps: 5, distance: 6.54, time: 1.94, vmax: 6.97, widthCm: 17.2 },
  { pumps: 6, distance: 7.21, time: 2.22, vmax: 6.98, widthCm: 18.2 },
  { pumps: 7, distance: 7.78, time: 2.50, vmax: 6.98, widthCm: 19.2 },
  { pumps: 8, distance: 8.24, time: 2.78, vmax: 6.98, widthCm: 20.0 }
];

function within(actual, expected, frac, label) {
  const err = Math.abs(actual - expected) / expected;
  assert.ok(err <= frac, `${label}: got ${actual.toFixed(3)}, expected ${expected} (${(err * 100).toFixed(2)}% off)`);
}

test('CONFIG applies the teacher decisions', () => {
  assert.equal(CONFIG.maxPumps, 6);
  assert.equal(CONFIG.maxPumpsLimit, 8);
  assert.equal(CONFIG.pumpL, 0.5);
  assert.equal(CONFIG.R0, 0.035);
  assert.equal(CONFIG.dryMass, 0.0045);
  assert.equal(CONFIG.variation, true);
});

test('pressure curve peaks at peakP near stretch 1.42', () => {
  const K = pressureK(CONFIG);
  const V0 = unstretchedVolume(CONFIG);
  let best = 0, bestL = 0;
  for (let l = 1.01; l < 3; l += 0.001) {
    const p = gaugePressure(V0 * l ** 3, CONFIG, K);
    if (p > best) { best = p; bestL = l; }
  }
  within(best, CONFIG.peakP, 0.001, 'peak pressure');
  assert.ok(Math.abs(bestL - 1.42) < 0.03, `peak stretch ${bestL.toFixed(3)}`);
  assert.equal(gaugePressure(V0, CONFIG, K), 0);
});

for (const e of EXPECTED) {
  test(`${e.pumps} pump(s) match the expected results within 3%`, () => {
    const r = simulate(e.pumps, OFF);
    within(r.distance, e.distance, 0.03, 'distance');
    within(r.duration, e.time, 0.03, 'time moving');
    within(r.vmax, e.vmax, 0.03, 'top speed');
    within(r.startWidth * 100, e.widthCm, 0.03, 'balloon width');
    assert.equal(r.reachedEnd, false);
  });
}

test('trajectory arrays are complete and consistent', () => {
  const r = simulate(3, OFF);
  const n = r.t.length;
  assert.ok(n > 1000 && n < 3000, `step count ${n}`);
  for (const k of ['x', 'v', 'vol', 'thrust', 'drag', 'fric']) assert.equal(r[k].length, n, k);
  assert.equal(r.x[n - 1], r.distance);
  assert.equal(r.v[n - 1], 0);
  for (let i = 1; i < n; i++) assert.ok(r.x[i] >= r.x[i - 1], 'position never goes backward');
  assert.ok(r.burn > 0 && r.burn < r.duration, 'air runs out before the car stops');
  assert.equal(r.airAddedL, 1.5);
});

test('peak thrust is about 0.17 N for every pump count', () => {
  for (let p = 1; p <= 8; p++) {
    const peak = Math.max(...simulate(p, OFF).thrust);
    within(peak, 0.17, 0.05, `peak thrust at ${p} pumps`);
  }
});

test('distance strictly increases with pumps, with diminishing returns', () => {
  const d = EXPECTED.map(e => simulate(e.pumps, OFF).distance);
  for (let i = 1; i < d.length; i++) assert.ok(d[i] > d[i - 1], `pump ${i + 1} beats pump ${i}`);
  // Gains shrink from the 2nd pump on. The 1st pump gains less than the 2nd because
  // a nearly empty balloon spends its short burn near the bottom of the pressure curve.
  for (let i = 2; i < d.length; i++) {
    assert.ok(d[i] - d[i - 1] < d[i - 1] - d[i - 2], `gain at pump ${i + 1} is smaller than at pump ${i}`);
  }
});

test('variation off: same pumps always give the same distance', () => {
  const first = simulate(3, OFF).distance;
  for (let i = 0; i < 10; i++) assert.equal(simulate(3, OFF).distance, first);
});

test('variation on: 10 repeats at 3 pumps stay within 10% and actually vary', () => {
  const base = simulate(3, OFF).distance;
  const rand = seeded(42);
  const runs = Array.from({ length: 10 }, () => simulate(3, { variation: true }, rand).distance);
  for (const d of runs) within(d, base, 0.10, 'varied distance');
  assert.ok(new Set(runs).size > 1, 'repeats differ');
});

test('variation on: 2,000 runs at 3 pumps stay within 10%', () => {
  const base = simulate(3, OFF).distance;
  const rand = seeded(7);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 2000; i++) {
    const d = simulate(3, { variation: true }, rand).distance;
    lo = Math.min(lo, d); hi = Math.max(hi, d);
  }
  within(lo, base, 0.10, 'shortest');
  within(hi, base, 0.10, 'longest');
});

test('a run that reaches the string end stops there and flags it', () => {
  const r = simulate(6, { variation: false, stringM: 3 });
  assert.equal(r.reachedEnd, true);
  assert.equal(r.distance, 3);
  assert.equal(r.x[r.x.length - 1], 3);
  assert.ok(r.duration < simulate(6, OFF).duration);
});

test('zero pumps does not move', () => {
  const r = simulate(0, OFF);
  assert.equal(r.distance, 0);
  assert.equal(r.vmax, 0);
});

test('simulate does not mutate CONFIG', () => {
  const before = JSON.stringify(CONFIG);
  simulate(4, { variation: false, stringM: 2, pumpL: 1 });
  assert.equal(JSON.stringify(CONFIG), before);
});
