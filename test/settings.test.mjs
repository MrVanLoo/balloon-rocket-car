import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const S = require('../src/settings.js');
const { SOURCES } = require('../src/sources.js');

test('defaults follow the teacher decisions', () => {
  assert.deepEqual(S.defaultSettings(), { pumpL: 0.5, maxPumps: 6, stringM: 10, variation: true });
});

test('max pumps is limited to 1 to 8 and rounded', () => {
  assert.equal(S.sanitizeSettings({ maxPumps: 0 }).maxPumps, 1);
  assert.equal(S.sanitizeSettings({ maxPumps: 12 }).maxPumps, 8);
  assert.equal(S.sanitizeSettings({ maxPumps: 4.6 }).maxPumps, 5);
});

test('out-of-range and junk values are clamped or fall back to defaults', () => {
  const s = S.sanitizeSettings({ pumpL: 99, stringM: 1, variation: 'yes', maxPumps: 'x' });
  assert.deepEqual(s, { pumpL: 5, maxPumps: 6, stringM: 3, variation: true });
  assert.deepEqual(S.sanitizeSettings(null), S.defaultSettings());
  assert.deepEqual(S.sanitizeSettings({ pumpL: NaN, stringM: Infinity }), S.defaultSettings());
  assert.equal(S.sanitizeSettings({ variation: false }).variation, false);
});

test('dialog shows metric values as stored', () => {
  assert.deepEqual(S.settingsToForm(S.defaultSettings(), 'metric'), { pump: 0.5, max: 6, len: 10, variation: true });
});

test('dialog shows imperial values in fl oz and ft, and reads them back', () => {
  const f = S.settingsToForm(S.defaultSettings(), 'imperial');
  assert.equal(f.pump, 16.91);
  assert.equal(f.len, 32.8);
  const back = S.formToSettings(f, 'imperial');
  assert.ok(Math.abs(back.pumpL - 0.5) < 0.001);
  assert.ok(Math.abs(back.stringM - 10) < 0.02);
  assert.equal(back.maxPumps, 6);
});

test('typed imperial values convert to SI', () => {
  const s = S.formToSettings({ pump: '10', max: '8', len: '20', variation: false }, 'imperial');
  assert.equal(s.pumpL, 0.296);
  assert.equal(s.stringM, 6.1);
  assert.equal(s.maxPumps, 8);
  assert.equal(s.variation, false);
});

test('blank inputs keep defaults instead of becoming 0', () => {
  const s = S.formToSettings({ pump: '', max: '', len: '', variation: true }, 'metric');
  assert.deepEqual(s, S.defaultSettings());
});

test('input limits match the stored limits in each unit system', () => {
  const m = S.settingsInputLimits('metric');
  assert.deepEqual([m.pump.min, m.pump.max, m.max.min, m.max.max, m.len.min, m.len.max], [0.05, 5, 1, 8, 3, 20]);
  const i = S.settingsInputLimits('imperial');
  assert.equal(i.len.min, 9.8);
  assert.equal(i.len.max, 65.6);
});

test('Sources dialog lists every source in SPEC.md, same URLs, same order', () => {
  const spec = readFileSync(new URL('../SPEC.md', import.meta.url), 'utf8');
  const section = spec.slice(spec.indexOf('## Sources'));
  const urls = [...section.matchAll(/^\| \[[^\]]+\]\((https?:[^)]+)\)/gm)].map((m) => m[1]);
  assert.equal(urls.length, 15);
  assert.deepEqual(SOURCES.map((s) => s[1]), urls);
  for (const [cite, url, use] of SOURCES) {
    assert.ok(cite.length > 10 && use.length > 10, `entry for ${url} has text`);
  }
});
