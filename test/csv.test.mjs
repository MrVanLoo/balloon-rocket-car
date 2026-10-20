import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../src/csv.js');
const D = require('../src/data.js');
const { simulate } = require('../src/physics.js');

// SPEC.md example rows (in SI, as stored).
const TRIALS = [
  { trial: 1, pumps: 1, air: 0.0005, dist: 1.65, time: 0.74, vmax: 4.41, pred: null, end: false },
  { trial: 2, pumps: 3, air: 0.0015, dist: 4.76, time: 1.39, vmax: 6.84, pred: 4, end: false },
  { trial: 3, pumps: 5, air: 0.0025, dist: 6.54, time: 1.94, vmax: 6.97, pred: 8, end: false }
];

// Strict RFC 4180 parser: fails on anything malformed.
function parseRFC4180(text) {
  const rows = [];
  let row = [], field = '', i = 0, quoted = false, startOfField = true;
  while (i < text.length) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i++; assert.ok(text[i] === ',' || text[i] === '\r', `junk after quote at ${i}`); continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { assert.ok(startOfField, `stray quote at ${i}`); quoted = true; startOfField = false; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; startOfField = true; i++; continue; }
    if (ch === '\r') {
      assert.equal(text[i + 1], '\n', `bare CR at ${i}`);
      row.push(field); rows.push(row); row = []; field = ''; startOfField = true; i += 2; continue;
    }
    assert.notEqual(ch, '\n', `bare LF at ${i}`);
    field += ch; startOfField = false; i++;
  }
  assert.ok(!quoted, 'unterminated quote');
  assert.equal(field, '', 'file must end with CRLF');
  assert.equal(row.length, 0);
  return rows;
}

test('metric CSV matches the SPEC.md example, plus the name column', () => {
  const csv = C.toCSV(TRIALS, 'metric', '');
  assert.equal(csv,
    'Trial,Pumps,Air added (L),Distance (m),Time moving (s),Top speed (m/s),Prediction (m),Reached end of string,Name or group\r\n' +
    '1,1,0.50,1.65,0.74,4.41,,no,\r\n' +
    '2,3,1.50,4.76,1.39,6.84,4,no,\r\n' +
    '3,5,2.50,6.54,1.94,6.97,8,no,\r\n');
});

test('CSV passes a strict RFC 4180 parse with equal-length rows', () => {
  const rows = parseRFC4180(C.toCSV(TRIALS, 'metric', 'Team "Rocket", Period 3'));
  assert.equal(rows.length, 4);
  assert.ok(rows.every((r) => r.length === 9));
  assert.equal(rows[1][8], 'Team "Rocket", Period 3');
});

test('a name containing a comma or quote is quoted, with inner quotes doubled', () => {
  const csv = C.toCSV(TRIALS.slice(0, 1), 'metric', 'Ana, Ben');
  assert.ok(csv.includes(',"Ana, Ben"\r\n'));
  assert.equal(C.csvField('say "hi"'), '"say ""hi"""');
  assert.equal(C.csvField('plain'), 'plain');
});

test('no byte-order mark', () => {
  assert.notEqual(C.toCSV(TRIALS, 'metric', '').charCodeAt(0), 0xFEFF);
});

test('columns 2 to 7 are plain numbers (or blank prediction) so Sheets can SUM them', () => {
  for (const sys of ['metric', 'imperial']) {
    const rows = parseRFC4180(C.toCSV(TRIALS, sys, ''));
    for (const r of rows.slice(1)) {
      for (let c = 1; c <= 6; c++) {
        if (c === 6 && r[c] === '') continue;
        assert.match(r[c], /^\d+(\.\d+)?$/, `${sys} column ${c + 1}: "${r[c]}"`);
      }
    }
  }
});

test('imperial CSV uses the units in the headers and converts values', () => {
  const rows = parseRFC4180(C.toCSV(TRIALS, 'imperial', ''));
  assert.deepEqual(rows[0].slice(2, 7), ['Air added (fl oz)', 'Distance (ft)', 'Time moving (s)', 'Top speed (ft/s)', 'Prediction (ft)']);
  assert.equal(rows[2][2], '50.72');  // 1.5 L
  assert.equal(rows[2][3], '15.62');  // 4.76 m
  assert.equal(rows[2][4], '1.39');   // seconds unchanged
  assert.equal(rows[2][6], '13.12');  // 4 m prediction
});

test('prediction round-trips without float noise', () => {
  const predFt = 13;
  const t = { ...TRIALS[0], pred: predFt * 0.3048 };
  assert.equal(C.exportRow(t, 'imperial', '')[6], '13');
});

test('reached end of string logs yes', () => {
  const run = simulate(6, { variation: false, stringM: 3 });
  const tr = D.makeTrial([], run, 0.5, null);
  assert.equal(C.exportRow(tr, 'metric', '')[7], 'yes');
  assert.equal(C.exportRow(tr, 'metric', '')[3], '3.00');
});

test('TSV has the same cells, tab-separated, with no stray tabs from the name', () => {
  const tsv = C.toTSV(TRIALS, 'metric', 'Ana\tBen');
  const lines = tsv.trimEnd().split('\n');
  assert.equal(lines.length, 4);
  assert.ok(lines.every((l) => l.split('\t').length === 9));
  assert.equal(lines[2].split('\t')[8], 'Ana Ben');
});

test('file name follows balloon-rocket-<name>-YYYY-MM-DD.csv', () => {
  const d = new Date(2026, 9, 5); // Oct 5, local time
  assert.equal(C.fileName('', d), 'balloon-rocket-data-2026-10-05.csv');
  assert.equal(C.fileName('  Team Rocket 3 ', d), 'balloon-rocket-Team-Rocket-3-2026-10-05.csv');
  assert.equal(C.fileName('Ana, Ben & Cy!', d), 'balloon-rocket-Ana-Ben-Cy-2026-10-05.csv');
  assert.equal(C.fileName('???', d), 'balloon-rocket-data-2026-10-05.csv');
});
