import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const U = require('../src/units.js');

const close = (a, b, eps, label) => assert.ok(Math.abs(a - b) <= eps, `${label}: ${a} vs ${b}`);

test('metric display is SI scaled to m, m/s, cm, L', () => {
  assert.equal(U.fmt('dist', 4.7612, 'metric'), '4.76');
  assert.equal(U.fmt('speed', 6.84, 'metric'), '6.8');
  assert.equal(U.fmt('width', 0.147, 'metric'), '14.7');
  assert.equal(U.fmt('air', 0.0015, 'metric'), '1.50');
  assert.equal(U.unitLabel('air', 'metric'), 'L');
});

test('imperial display uses ft, ft/s, in, fl oz', () => {
  assert.equal(U.fmt('dist', 3.048, 'imperial'), '10.00');
  assert.equal(U.fmt('speed', 0.3048, 'imperial'), '1.0');
  assert.equal(U.fmt('width', 0.254, 'imperial'), '10.0');
  close(U.toDisplay('air', 0.0005, 'imperial'), 16.907, 0.001, '0.5 L in fl oz');
  assert.equal(U.fmt('air', 0.0005, 'imperial'), '16.9');
  assert.equal(U.unitLabel('dist', 'imperial'), 'ft');
  assert.equal(U.unitLabel('air', 'imperial'), 'fl oz');
  assert.equal(U.unitLabel('time', 'imperial'), 's');
});

test('fromDisplay inverts toDisplay', () => {
  for (const sys of ['metric', 'imperial']) {
    for (const kind of ['dist', 'speed', 'width', 'air', 'time']) {
      close(U.fromDisplay(kind, U.toDisplay(kind, 1.234, sys), sys), 1.234, 1e-12, `${sys} ${kind}`);
    }
  }
});

test('unknown unit system falls back to metric', () => {
  assert.equal(U.unitSystem('furlongs'), 'metric');
  assert.equal(U.unitLabel('dist', undefined), 'm');
});

test('metric tape: ticks every 0.1 m, labels every 1 m', () => {
  const marks = U.tapeMarks(10, 'metric');
  assert.equal(marks.length, 101);
  const labels = marks.filter(m => m.label !== null).map(m => m.label);
  assert.deepEqual(labels, ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  assert.equal(marks.filter(m => m.size === 'mid').length, 10);
  assert.equal(marks[marks.length - 1].m, 10);
});

test('imperial tape: tick every foot, label every 5 ft, stays on the string', () => {
  const marks = U.tapeMarks(10, 'imperial');
  assert.equal(marks.length, 33); // 0 to 32 ft on a 10 m (32.8 ft) string
  assert.deepEqual(marks.filter(m => m.label !== null).map(m => m.label), ['0', '5', '10', '15', '20', '25', '30']);
  assert.ok(marks.every(m => m.m <= 10));
  close(marks[5].m, 1.524, 1e-12, '5 ft');
});

test('niceStep keeps graph gridlines readable', () => {
  assert.equal(U.niceStep(10), 2);
  assert.equal(U.niceStep(32.8), 10);
  assert.equal(U.niceStep(20), 5);
  assert.equal(U.niceStep(3), 1);
});
