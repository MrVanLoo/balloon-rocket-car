// CSV / TSV export of the trial log (SPEC.md "Data log and CSV export"). Pure functions, no DOM.
// Trials are stored in SI; columns use the unit system selected at export time (CLAUDE.md #5).
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

const csvUnits = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
  ? require('./units.js')
  : { toDisplay, unitLabel };

function exportHeaders(system) {
  const u = (kind) => csvUnits.unitLabel(kind, system);
  return ['Trial', 'Pumps', `Air added (${u('air')})`, `Distance (${u('dist')})`, 'Time moving (s)',
    `Top speed (${u('speed')})`, `Prediction (${u('dist')})`, 'Reached end of string', 'Name or group'];
}

// Number with 2 decimals; prediction drops trailing zeros so "4" stays "4".
const fixed2 = (kind, si, system) => csvUnits.toDisplay(kind, si, system).toFixed(2);
const trimmed2 = (kind, si, system) => String(Number(csvUnits.toDisplay(kind, si, system).toFixed(2)));

function exportRow(r, system, name) {
  return [
    String(r.trial),
    String(r.pumps),
    fixed2('air', r.air, system),
    fixed2('dist', r.dist, system),
    r.time.toFixed(2),
    fixed2('speed', r.vmax, system),
    r.pred === null ? '' : trimmed2('dist', r.pred, system),
    r.end ? 'yes' : 'no',
    name || ''
  ];
}

// RFC 4180: quote a field containing a comma, quote, CR or LF; double inner quotes.
function csvField(v) {
  v = String(v);
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// Header row first, comma separators, CRLF line endings, trailing CRLF. No byte-order mark.
function toCSV(trials, system, name) {
  const rows = [exportHeaders(system), ...trials.map((r) => exportRow(r, system, name))];
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

// Tab-separated rows for pasting into a sheet. Tabs and line breaks inside a field become spaces.
function toTSV(trials, system, name) {
  const clean = (v) => String(v).replace(/[\t\r\n]+/g, ' ');
  const rows = [exportHeaders(system), ...trials.map((r) => exportRow(r, system, name))];
  return rows.map((row) => row.map(clean).join('\t')).join('\n') + '\n';
}

// balloon-rocket-<name>-YYYY-MM-DD.csv; spaces become hyphens, other symbols are dropped.
function fileName(name, date) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const slug = String(name || '').trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `balloon-rocket-${slug || 'data'}-${day}.csv`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exportHeaders, exportRow, csvField, toCSV, toTSV, fileName };
}
