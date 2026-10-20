import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../src/data.js');
const { simulate } = require('../src/physics.js');

test('makeTrial logs the run, numbered from 1', () => {
  const run = simulate(3, { variation: false });
  const t1 = D.makeTrial([], run, 0.5, 4);
  assert.deepEqual(t1, { trial: 1, pumps: 3, air: 0.0015, dist: run.distance, time: run.duration, vmax: run.vmax, pred: 4, end: false });
  const t2 = D.makeTrial([t1], run, 0.5, null);
  assert.equal(t2.trial, 2);
  assert.equal(t2.pred, null);
});

test('a blank or invalid prediction is stored as null', () => {
  const run = simulate(1, { variation: false });
  for (const p of [null, undefined, NaN, -1, Infinity, '4']) assert.equal(D.makeTrial([], run, 0.5, p).pred, null);
  assert.equal(D.makeTrial([], run, 0.5, 0).pred, 0);
});

test('numbering continues after delete last, and restarts after clear', () => {
  const run = simulate(2, { variation: false });
  let log = [];
  for (let i = 0; i < 3; i++) log.push(D.makeTrial(log, run, 0.5, null));
  log.pop();
  assert.equal(D.nextTrialNumber(log), 3);
  assert.equal(D.nextTrialNumber([]), 1);
});

test('saved log round-trips', () => {
  const run = simulate(4, { variation: false });
  const log = [D.makeTrial([], run, 0.5, 5.5)];
  const back = D.parseLog(D.serializeLog(log, 'Team 1'));
  assert.deepEqual(back, { trials: log, name: 'Team 1' });
});

test('damaged saves load as empty or drop bad rows instead of throwing', () => {
  assert.deepEqual(D.parseLog(null), { trials: [], name: '' });
  assert.deepEqual(D.parseLog('{not json'), { trials: [], name: '' });
  assert.deepEqual(D.parseLog('"x"'), { trials: [], name: '' });
  const good = { trial: 1, pumps: 2, air: 0.001, dist: 3.5, time: 1.1, vmax: 6.3, pred: null, end: false };
  const mixed = JSON.stringify({ trials: [good, { trial: 'x' }, null, { ...good, dist: -1 }, { ...good, trial: 2, extra: 1 }], name: 5 });
  const out = D.parseLog(mixed);
  assert.equal(out.trials.length, 2);
  assert.equal(out.trials[1].extra, undefined);
  assert.equal(out.name, '');
});
