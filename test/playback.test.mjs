import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../src/playback.js');
const { simulate } = require('../src/physics.js');

const run3 = simulate(3, { variation: false });

test('playback starts at the first sample and runs in real time', () => {
  assert.equal(P.frameIndex(run3, 0), 0);
  const i = P.frameIndex(run3, 0.5);
  assert.ok(Math.abs(run3.t[i] - 0.5) <= 0.0011, `t at 0.5 s is ${run3.t[i]}`);
});

test('playback ends on the logged result and holds there', () => {
  const n = run3.t.length;
  assert.equal(P.isPlaybackDone(run3, run3.duration - 0.05), false);
  assert.equal(P.isPlaybackDone(run3, run3.duration + 0.01), true);
  assert.equal(P.frameIndex(run3, 99), n - 1);
  const last = P.frameIndex(run3, 99);
  assert.equal(run3.x[last], run3.distance);
  assert.equal(run3.v[last], 0);
});

test('position shown never goes backward as time advances', () => {
  let prev = -1;
  for (let t = 0; t <= run3.duration + 0.1; t += 1 / 60) {
    const x = run3.x[P.frameIndex(run3, t)];
    assert.ok(x >= prev);
    prev = x;
  }
});

test('thrust points forward, air resistance and friction point back', () => {
  const a = P.arrowLayout(400, { thrust: 0.17, drag: 0.05, fric: 0.08 }, 0, 1000);
  const by = Object.fromEntries(a.map((r) => [r.key, r]));
  assert.ok(by.thrust.x2 > 400);
  assert.ok(by.drag.x2 < 400);
  assert.ok(by.fric.x2 < 400);
  assert.ok(Math.abs(by.thrust.len - 0.17 * P.ARROWS.k) < 1e-9, 'length scales with force');
  assert.equal(by.thrust.label, 'Thrust 0.17 N');
  assert.equal(by.drag.label, 'Air resistance 0.05 N');
  assert.equal(by.fric.label, 'Friction 0.08 N');
  assert.equal(new Set(a.map((r) => r.y)).size, 3, 'each arrow has its own row');
});

test('arrow labels stay inside the scene at both ends of the track', () => {
  const f = { thrust: 0.17, drag: 0.2, fric: 0.08 };
  for (const px of [170, 950]) {
    for (const r of P.arrowLayout(px, f, 0, 1000)) {
      const w = r.label.length * P.ARROWS.charW;
      const left = r.anchor === 'start' ? r.labelX : r.labelX - w;
      assert.ok(left >= 0 && left + w <= 1000, `${r.key} label at px ${px}: ${left.toFixed(0)}..${(left + w).toFixed(0)}`);
    }
  }
});

test('arrows never run off the scene', () => {
  const a = P.arrowLayout(950, { thrust: 0.17, drag: 0.1, fric: 0.08 }, 4, 996);
  assert.equal(a[0].x2, 996);
  assert.ok(a.every((r) => r.x2 >= 4 && r.x2 <= 996));
});

test('tiny or zero forces hide their arrow; small ones get a minimum length', () => {
  const a = P.arrowLayout(500, { thrust: 0, drag: 0.0001, fric: 0.005 }, 0, 1000);
  assert.equal(a[0].visible, false);
  assert.equal(a[1].visible, false);
  assert.equal(a[2].visible, true);
  assert.equal(a[2].len, P.ARROWS.minLen);
});

test('puffs appear while air flows, at most one per interval, and fade out', () => {
  let s = { puffs: [], lastEmit: -Infinity };
  const tip = { x: 100, y: 90 };
  for (let now = 0; now <= 200; now += 16) s = P.stepPuffs(s.puffs, s.lastEmit, now, true, tip);
  assert.ok(s.puffs.length >= 4 && s.puffs.length <= 5, `${s.puffs.length} puffs in 200 ms`);
  for (let now = 216; now <= 1000; now += 16) s = P.stepPuffs(s.puffs, s.lastEmit, now, false, tip);
  assert.equal(s.puffs.length, 0, 'all puffs gone after the air stops');
});

test('puff pool never exceeds its size', () => {
  let s = { puffs: [], lastEmit: -Infinity };
  for (let now = 0; now <= 3000; now += 5) {
    s = P.stepPuffs(s.puffs, s.lastEmit, now, true, { x: 0, y: 0 });
    assert.ok(s.puffs.length <= P.PUFFS.max);
  }
});

test('a puff drifts back, grows and fades', () => {
  const p = { x: 100, y: 90, born: 0, seed: 0.5 };
  const a = P.puffLook(p, 0), b = P.puffLook(p, 300), c = P.puffLook(p, 600);
  assert.ok(b.cx < a.cx && b.r > a.r && b.opacity < a.opacity);
  assert.equal(c.opacity, 0);
});
