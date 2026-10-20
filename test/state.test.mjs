import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../src/state.js');

// Pump once and let the stroke finish.
const pumpDone = (s, max) => S.strokeDoneState(S.pumpState(s, max));

test('Ready: can pump, cannot release', () => {
  const s = S.initialState();
  const c = S.controlStates(s, 6, false);
  assert.equal(s.phase, 'ready');
  assert.equal(c.pump, true);
  assert.equal(c.release, false);
  assert.equal(c.reset, true);
  assert.equal(c.counter, '0 of 6 pumps');
  assert.equal(S.releaseState(s), null);
});

test('a pump stroke locks every balloon control until it finishes', () => {
  const s = S.pumpState(S.initialState(), 6);
  assert.equal(s.phase, 'inflating');
  assert.equal(s.pumps, 1);
  const c = S.controlStates(s, 6, false);
  assert.equal(c.pump, false);
  assert.equal(c.release, false);
  assert.equal(c.reset, false);
  assert.equal(S.pumpState(s, 6), null);
  const done = S.controlStates(S.strokeDoneState(s), 6, false);
  assert.equal(done.pump, true);
  assert.equal(done.release, true);
  assert.equal(done.counter, '1 of 6 pumps');
});

test('pumping stops at the max, which follows the setting', () => {
  for (const max of [1, 6, 8]) {
    let s = S.initialState();
    for (let i = 0; i < max; i++) s = pumpDone(s, max);
    assert.equal(s.pumps, max);
    assert.equal(S.canPump(s, max), false);
    assert.equal(S.pumpState(s, max), null);
    assert.equal(S.canRelease(s), true);
  }
  assert.equal(S.controlStates(S.initialState(), 1, false).counter, '0 of 1 pump');
});

test('Moving locks all inputs; Stopped leaves only Start over and data tools', () => {
  let s = pumpDone(pumpDone(S.initialState(), 6), 6);
  s = S.releaseState(s);
  assert.equal(s.phase, 'moving');
  const m = S.controlStates(s, 6, true);
  assert.deepEqual([m.pump, m.release, m.reset, m.prediction, m.data], [false, false, false, false, false]);
  assert.equal(S.resetState(s), null);

  s = S.stopState(s);
  assert.equal(s.phase, 'stopped');
  const st = S.controlStates(s, 6, true);
  assert.deepEqual([st.pump, st.release, st.reset, st.prediction, st.data], [false, false, true, true, true]);
});

test('Start over returns to Ready with an empty balloon', () => {
  let s = pumpDone(S.initialState(), 6);
  assert.deepEqual(S.resetState(s), S.initialState());
  s = S.stopState(S.releaseState(s));
  assert.deepEqual(S.resetState(s), S.initialState());
});

test('stopState only applies while moving', () => {
  assert.equal(S.stopState(S.initialState()), null);
});

test('data tools need at least one trial', () => {
  assert.equal(S.controlStates(S.initialState(), 6, false).data, false);
  assert.equal(S.controlStates(S.initialState(), 6, true).data, true);
});

test('status messages after a pump', () => {
  assert.equal(S.pumpMessage(1, 6), '1 pump in. Pump more or press Release.');
  assert.equal(S.pumpMessage(3, 6), '3 pumps in. Pump more or press Release.');
  assert.equal(S.pumpMessage(6, 6), '6 pumps. That’s the most air allowed. Press Release.');
});
