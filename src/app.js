// Balloon rocket car: page logic. Depends on physics.js, units.js, state.js, playback.js, data.js, csv.js,
// settings.js and sources.js (all loaded first as classic scripts). (loaded first as classic scripts).

const $ = (id) => document.getElementById(id);
const UNITS_KEY = 'balloonRocket.units';
const cfg = Object.assign({}, CONFIG);
let units = loadUnits();
let trials = [];
// Reduced motion skips the pump easing, pump slide and air puffs (SPEC.md Accessibility). Follows OS changes live.
const motionQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
let reduceMotion = !!(motionQuery && motionQuery.matches);
if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', (e) => { reduceMotion = e.matches; });

// ---------- storage ----------
function loadUnits() {
  try { return unitSystem(localStorage.getItem(UNITS_KEY)); }
  catch (e) { return 'metric'; }
}
function saveUnits() {
  try { localStorage.setItem(UNITS_KEY, units); } catch (e) { /* storage blocked: units reset on reload */ }
}
function loadSettings() {
  try { Object.assign(cfg, sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'))); }
  catch (e) { Object.assign(cfg, defaultSettings()); }
}
function saveSettings() {
  const s = { pumpL: cfg.pumpL, maxPumps: cfg.maxPumps, stringM: cfg.stringM, variation: cfg.variation };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* storage blocked: settings last until reload */ }
}
function loadLog() {
  try {
    const log = parseLog(localStorage.getItem(STORE_KEY));
    trials = log.trials;
    $('nameIn').value = log.name;
  } catch (e) { /* storage blocked: start empty */ }
}
// Save the log after every change. If storage is blocked, the sim still works and warns once.
function saveLog() {
  try {
    localStorage.setItem(STORE_KEY, serializeLog(trials, $('nameIn').value));
    $('storeWarn').hidden = true;
  } catch (e) {
    $('storeWarn').hidden = false;
  }
}

// ---------- scene geometry ----------
// X0..XEND is the tape measure in SVG px. BS is balloon px per meter, drawn larger than the track scale.
const X0 = 170, XEND = 950, BS = 390;
const pxm = () => (XEND - X0) / cfg.stringM;
const X = (m) => X0 + m * pxm();
const radiusOf = (V) => Math.cbrt(3 * V / (4 * Math.PI));

function drawTape() {
  let s = `<rect class="tape" x="${X0 - 6}" y="158" width="${XEND - X0 + 12}" height="24" rx="3"/>`;
  const marks = tapeMarks(cfg.stringM, units);
  const unit = unitLabel('dist', units);
  marks.forEach((mk, i) => {
    const x = X(mk.m).toFixed(1);
    const h = mk.size === 'major' ? 12 : mk.size === 'mid' ? 8 : 4;
    s += `<line class="tick" x1="${x}" y1="158" x2="${x}" y2="${158 + h}" stroke-width="${mk.size === 'major' ? 1.6 : 1}"/>`;
    if (mk.label !== null) {
      const first = i === 0;
      s += `<text class="tlabel" x="${first ? X0 - 2 : x}" y="179" text-anchor="${first ? 'start' : 'middle'}">${mk.label}${first ? ' ' + unit : ''}</text>`;
    }
  });
  $('tapeG').innerHTML = s;
  $('scaleNote').textContent =
    `Balloon, straw and pump are drawn ${Math.round(BS / pxm())} times actual size so you can see them. Distances on the tape measure are true to scale.`;
}

// Draw the car at posM meters with balloon volume V (m^3). Returns the neck tip for puffs and the pump tube.
function drawCar(posM, V) {
  const r = radiusOf(V) * BS, rx = 1.3 * r, ry = 0.88 * r, cx = -4, cy = 75 + ry;
  const bal = $('bal'), hi = $('balHi');
  bal.setAttribute('rx', rx.toFixed(1)); bal.setAttribute('ry', ry.toFixed(1));
  bal.setAttribute('cx', cx); bal.setAttribute('cy', cy.toFixed(1));
  const nx = cx - rx + 3;
  $('neck').setAttribute('d', `M${nx} ${cy - 4} L${nx - 12} ${cy - 3} L${nx - 12} ${cy + 3} L${nx} ${cy + 4} Z`);
  hi.setAttribute('cx', (cx + rx * 0.35).toFixed(1)); hi.setAttribute('cy', (cy - ry * 0.45).toFixed(1));
  hi.setAttribute('rx', (rx * 0.25).toFixed(1)); hi.setAttribute('ry', (ry * 0.16).toFixed(1));
  const px = X(posM);
  $('car').setAttribute('transform', `translate(${px.toFixed(1)} 0)`);
  $('plumb').setAttribute('x1', px.toFixed(1)); $('plumb').setAttribute('x2', px.toFixed(1));
  const tipX = px + nx - 12, tipY = cy;
  $('tube').setAttribute('d', `M67 156 C67 196 ${tipX - 40} ${tipY + 40} ${tipX} ${tipY}`);
  return { tipX, tipY };
}

// ---------- readouts ----------
// Last values shown, in SI, so a unit switch can redraw them.
const shown = { dist: 0, time: 0, speed: 0, air: 0, vol: unstretchedVolume(cfg) };

function showReadouts(o) {
  Object.assign(shown, o);
  $('rDist').textContent = fmt('dist', shown.dist, units);
  $('rTime').textContent = fmt('time', shown.time, units);
  $('rSpeed').textContent = fmt('speed', shown.speed, units);
  $('rAir').textContent = fmt('air', shown.air, units);
  $('rVol').textContent = fmt('air', shown.vol, units);
  $('rDia').textContent = fmt('width', 2 * radiusOf(shown.vol), units);
}

function setStatus(t) { $('status').textContent = t; }

// ---------- state ----------
const READY_MSG = 'Press Pump air (or the Space bar) to start filling the balloon.';
const STROKE_MS = 400; // one pump stroke (SPEC.md Controls)
let st = initialState();
let shownV = unstretchedVolume(cfg); // balloon volume on screen (m^3), eases toward the real one

function updateButtons() {
  const c = controlStates(st, cfg.maxPumps, trials.length > 0);
  $('pumpCount').textContent = c.counter;
  $('pumpBtn').disabled = !c.pump;
  $('goBtn').disabled = !c.release;
  $('resetBtn').disabled = !c.reset;
  $('pred').disabled = !c.prediction;
  ['csvBtn', 'copyBtn', 'undoBtn', 'clearBtn'].forEach((id) => { $(id).disabled = !c.data; });
  $('setBtn').disabled = st.phase === 'moving' || st.animating;
}

// ---------- inflation ----------
function pump() {
  const next = pumpState(st, cfg.maxPumps);
  if (!next) return;
  st = next;
  updateButtons();
  const from = shownV, to = startVolume(st.pumps, cfg);
  const dur = reduceMotion ? 0 : STROKE_MS, t0 = performance.now();
  const step = (now) => {
    const k = dur ? Math.min(1, (now - t0) / dur) : 1;
    const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
    shownV = from + (to - from) * e;
    drawCar(0, shownV);
    // Handle pushes down and comes back up once per stroke.
    $('handle').setAttribute('transform', `translate(0 ${(Math.sin(Math.PI * k) * 26).toFixed(1)})`);
    showReadouts({ air: st.pumps * cfg.pumpL / 1000, vol: shownV });
    if (k < 1) { requestAnimationFrame(step); return; }
    $('handle').removeAttribute('transform');
    st = strokeDoneState(st);
    updateButtons();
    const msg = pumpMessage(st.pumps, cfg.maxPumps);
    setStatus(msg); // #status is a polite live region
    // Keep keyboard focus useful once the pump button disables at the max.
    if (document.activeElement === $('pumpBtn') && $('pumpBtn').disabled) $('goBtn').focus();
  };
  requestAnimationFrame(step);
}

function reset() {
  const next = resetState(st);
  if (!next) return;
  st = next;
  shownV = unstretchedVolume(cfg);
  run = null;
  $('pumpG').classList.remove('gone');
  $('flagG').setAttribute('visibility', 'hidden');
  $('handle').removeAttribute('transform');
  $('pred').value = '';
  drawCar(0, shownV);
  showReadouts({ dist: 0, time: 0, speed: 0, air: 0, vol: shownV });
  setStatus(READY_MSG);
  updateButtons();
  if (document.activeElement === $('resetBtn')) $('pumpBtn').focus();
}

// ---------- release ----------
let run = null;   // trajectory from simulate(), computed once on Release
let puffEls = []; // reusable <circle> pool, so no elements are created during a run

function release() {
  const next = releaseState(st);
  if (!next) return;
  st = next;
  updateButtons();
  run = simulate(st.pumps, cfg);
  $('pumpG').classList.add('gone');
  setStatus('Air rushes out the back. The balloon pushes on the air, and the air pushes the car forward.');
  let puffs = [], lastEmit = -Infinity, t0 = null;
  const step = (now) => {
    if (t0 === null) t0 = now;
    const elapsed = (now - t0) / 1000;
    const i = frameIndex(run, elapsed);
    const tip = drawCar(run.x[i], run.vol[i]);
    showReadouts({ dist: run.x[i], time: run.t[i], speed: run.v[i], vol: run.vol[i] });
    drawForces(run.x[i], { thrust: run.thrust[i], drag: run.drag[i], fric: run.fric[i] });
    if (!reduceMotion) {
      ({ puffs, lastEmit } = stepPuffs(puffs, lastEmit, now, run.thrust[i] > 0, { x: tip.tipX, y: tip.tipY }));
      drawPuffs(puffs, now);
    }
    if (isPlaybackDone(run, elapsed)) finish();
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function drawPuffs(puffs, now) {
  puffEls.forEach((el, k) => {
    const p = puffs[k];
    if (!p) { el.setAttribute('visibility', 'hidden'); return; }
    const l = puffLook(p, now);
    el.setAttribute('visibility', 'visible');
    el.setAttribute('cx', l.cx.toFixed(1)); el.setAttribute('cy', l.cy.toFixed(1));
    el.setAttribute('r', l.r.toFixed(1)); el.setAttribute('opacity', l.opacity.toFixed(2));
  });
}

function drawForces(posM, forces) {
  const on = $('forcesChk').checked && st.phase === 'moving';
  // display, not visibility: a child's visibility="visible" would override a hidden parent.
  $('forces').setAttribute('display', on ? 'inline' : 'none');
  if (!on) return;
  for (const a of arrowLayout(X(posM), forces, 4, 996)) {
    const line = $(`f${a.key}L`), txt = $(`f${a.key}T`);
    line.setAttribute('display', a.visible ? 'inline' : 'none');
    txt.setAttribute('display', a.visible ? 'inline' : 'none');
    if (!a.visible) continue;
    line.setAttribute('x1', a.x1.toFixed(1)); line.setAttribute('x2', a.x2.toFixed(1));
    line.setAttribute('y1', a.y); line.setAttribute('y2', a.y);
    txt.setAttribute('x', a.labelX.toFixed(1)); txt.setAttribute('y', a.y + 4);
    txt.setAttribute('text-anchor', a.anchor);
    txt.textContent = a.label;
  }
}

function drawFlag() {
  if (!run || st.phase !== 'stopped') return;
  $('flagG').setAttribute('transform', `translate(${X(run.distance).toFixed(1)} 0)`);
  $('flagTxt').textContent = `${fmt('dist', run.distance, units)} ${unitLabel('dist', units)}`;
  // Label sits beside the pole below the flag, clear of the balloon; flips left near the far post.
  const nearEnd = X(run.distance) > 900;
  $('flagTxt').setAttribute('x', nearEnd ? -6 : 6);
  $('flagTxt').setAttribute('text-anchor', nearEnd ? 'end' : 'start');
  $('flagG').setAttribute('visibility', 'visible');
}

function resultMessage(tr) {
  const du = unitLabel('dist', units);
  let msg = `Trial ${tr.trial}: ${tr.pumps} pump${tr.pumps === 1 ? '' : 's'}, ${fmt('dist', tr.dist, units)} ${du}.`;
  if (tr.end) msg += ' It reached the end of the string.';
  if (tr.pred !== null) msg += ` You predicted ${Number(toDisplay('dist', tr.pred, units).toFixed(2))} ${du}.`;
  return msg + ' Press Start over for the next trial.';
}

function readPrediction() {
  const raw = $('pred').value.trim();
  const p = parseFloat(raw);
  return raw !== '' && isFinite(p) && p >= 0 ? fromDisplay('dist', p, units) : null;
}

let lastResult = null; // trial shown in the status line after a run

function finish() {
  st = stopState(st);
  drawPuffs([], 0);
  drawForces(0, {});
  showReadouts({ dist: run.distance, time: run.duration, speed: 0 });
  drawFlag();
  lastResult = makeTrial(trials, run, cfg.pumpL, readPrediction());
  trials.push(lastResult);
  saveLog();
  renderTable();
  renderGraph();
  setStatus(resultMessage(lastResult));
  updateButtons();
  // A keyboard user on Release (now disabled) moves on to Start over.
  if (document.activeElement === $('goBtn')) $('resetBtn').focus();
}

// ---------- table and graph ----------
function tableHeaders() {
  return ['Trial', 'Pumps',
    `Air added (${unitLabel('air', units)})`,
    `Distance (${unitLabel('dist', units)})`,
    'Time (s)',
    `Top speed (${unitLabel('speed', units)})`,
    `Prediction (${unitLabel('dist', units)})`];
}

function renderTable() {
  const heads = tableHeaders();
  $('thead').innerHTML = heads.map((h) => `<th scope="col">${h}</th>`).join('');
  const tb = $('tbody');
  if (!trials.length) {
    tb.innerHTML = `<tr class="empty"><td colspan="${heads.length}">No trials yet. Each release adds a row here.</td></tr>`;
    return;
  }
  tb.innerHTML = trials.slice().reverse().map((r) =>
    `<tr><td>${r.trial}</td><td>${r.pumps}</td><td>${fmt('air', r.air, units)}</td><td>${fmt('dist', r.dist, units)}</td>` +
    `<td>${fmt('time', r.time, units)}</td><td>${fmt('speed', r.vmax, units, 2)}</td>` +
    `<td>${r.pred === null ? '' : Number(toDisplay('dist', r.pred, units).toFixed(2))}</td></tr>`).join('');
}

function renderGraph() {
  const W = 520, H = 210, L = 46, R = 12, T = 12, B = 40;
  const maxD = toDisplay('dist', cfg.stringM, units);
  const step = niceStep(maxD);
  const maxY = Math.ceil(maxD / step - 1e-9) * step;
  const maxX = Math.max(cfg.maxPumps, ...trials.map((r) => r.pumps));
  const gx = (p) => L + (p - 0.5) / maxX * (W - L - R);
  const gy = (d) => T + (1 - d / maxY) * (H - T - B);
  const du = unitLabel('dist', units);
  let s = '';
  for (let d = 0; d <= maxY + 1e-9; d += step) {
    s += `<line class="gridline" x1="${L}" x2="${W - R}" y1="${gy(d).toFixed(1)}" y2="${gy(d).toFixed(1)}"/>`;
    s += `<text class="axislbl" x="${L - 6}" y="${(gy(d) + 4).toFixed(1)}" text-anchor="end">${d}</text>`;
  }
  for (let p = 1; p <= maxX; p++) s += `<text class="axislbl" x="${gx(p).toFixed(1)}" y="${H - B + 16}" text-anchor="middle">${p}</text>`;
  s += `<text class="axistitle" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Pumps of air</text>`;
  s += `<text class="axistitle" transform="translate(13 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">Distance (${du})</text>`;
  const seen = {};
  trials.forEach((r) => {
    const k = seen[r.pumps] = (seen[r.pumps] || 0) + 1;
    const jitter = ((k % 5) - 2) * 4;
    const d = toDisplay('dist', r.dist, units);
    s += `<circle cx="${(gx(r.pumps) + jitter).toFixed(1)}" cy="${gy(Math.min(d, maxY)).toFixed(1)}" r="5" style="fill:var(--balloon);stroke:var(--surface);stroke-width:1.5">` +
      `<title>Trial ${r.trial}: ${r.pumps} pumps, ${fmt('dist', r.dist, units)} ${du}</title></circle>`;
  });
  if (!trials.length) s += `<text x="${(L + W - R) / 2}" y="${(T + H - B) / 2}" text-anchor="middle" font-size="13" style="fill:var(--muted)">Points appear here after each trial</text>`;
  $('graph').innerHTML = s;
}

// ---------- data tools ----------
function afterLogChange(msg) {
  saveLog();
  renderTable();
  renderGraph();
  updateButtons();
  setStatus(msg);
  // Keep focus on the page if the button just pressed became disabled.
  if (document.activeElement && document.activeElement.disabled) $('nameIn').focus();
}

function deleteLast() {
  if (!trials.length || st.phase === 'moving') return;
  const gone = trials.pop();
  afterLogChange(`Trial ${gone.trial} deleted.`);
}

function clearAll() {
  if (!trials.length || st.phase === 'moving') return;
  if (!confirm('Delete all trials? This can’t be undone.')) return;
  trials = [];
  afterLogChange('All trials deleted.');
}

function downloadCSV() {
  if (!trials.length) return;
  const name = fileName($('nameIn').value, new Date());
  const blob = new Blob([toCSV(trials, units, $('nameIn').value.trim())], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus(`Saved ${name} to your Downloads folder. In Google Sheets: File, Import, Upload.`);
}

async function copyTable() {
  if (!trials.length) return;
  const text = toTSV(trials, units, $('nameIn').value.trim());
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch (e) {
    // Fallback for pages where the async clipboard is blocked (some file:// setups).
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove();
  }
  setStatus(ok ? 'Table copied. In Google Sheets, click cell A1 and paste.' : 'Copy didn’t work here. Use Download CSV instead.');
}

// ---------- dialogs ----------
function openSources() {
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  $('srcList').innerHTML = SOURCES.map(([cite, url, use]) =>
    `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(cite)}</a><br><span>${esc(use)}</span></li>`).join('');
  $('srcDlg').showModal();
}

function fillSettingsForm(s) {
  const f = settingsToForm(s, units), lim = settingsInputLimits(units);
  for (const [id, key] of [['sPump', 'pump'], ['sMax', 'max'], ['sLen', 'len']]) {
    const el = $(id);
    el.min = lim[key].min; el.max = lim[key].max; el.step = lim[key].step;
    el.value = f[key];
  }
  $('sVar').checked = f.variation;
  $('setErr').hidden = true;
}

function openSettings() {
  if ($('setBtn').disabled) return;
  fillSettingsForm(cfg);
  $('setDlg').showModal();
}

function submitSettings(e) {
  e.preventDefault();
  const bad = ['sPump', 'sMax', 'sLen'].filter((id) => {
    const el = $(id), v = Number(el.value);
    return el.value.trim() === '' || !isFinite(v) || v < Number(el.min) || v > Number(el.max);
  });
  if (bad.length) {
    const el = $(bad[0]);
    const what = { sPump: ['Air per pump', unitLabel('air', units)], sMax: ['Most pumps allowed', ''], sLen: ['String length', unitLabel('dist', units)] }[el.id];
    $('setErr').textContent = `${what[0]} must be from ${el.min} to ${el.max}${what[1] ? ' ' + what[1] : ''}.`;
    $('setErr').hidden = false;
    el.focus();
    return;
  }
  const s = formToSettings({ pump: $('sPump').value, max: $('sMax').value, len: $('sLen').value, variation: $('sVar').checked }, units);
  Object.assign(cfg, s);
  saveSettings();
  $('setDlg').close();
  reset(); // always allowed here: the gear button is disabled while moving or mid-stroke
  applyUnits();
  setStatus('Settings saved. Start a new set of trials so the data stays comparable.');
}

// ---------- keyboard ----------
// Space pumps, Enter releases, R starts over (SPEC.md Accessibility). When focus is on a control,
// the key does what that control normally does, so tabbing through the page works as usual.
function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  if (t && t.closest && t.closest('button, input, select, textarea, a, summary, [contenteditable="true"]')) return;
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); pump(); }
  else if (e.key === 'Enter') { e.preventDefault(); release(); }
  else if (e.key === 'r' || e.key === 'R') { reset(); }
}

// After a mouse or touch click on a main control, release focus so the shortcuts keep working.
function blurAfterPointer(e) {
  if (e.detail > 0 && e.currentTarget === document.activeElement) e.currentTarget.blur();
}

// ---------- units ----------
function applyUnits() {
  document.querySelectorAll('[data-unit]').forEach((el) => { el.textContent = unitLabel(el.dataset.unit, units); });
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.system === units)));
  const pred = $('pred');
  pred.setAttribute('aria-label', `Your prediction in ${units === 'imperial' ? 'feet' : 'meters'}`);
  pred.max = Math.ceil(toDisplay('dist', cfg.stringM * 2, units));
  drawTape();
  drawFlag();
  if (st.phase === 'stopped' && lastResult && trials.includes(lastResult)) setStatus(resultMessage(lastResult));
  showReadouts({});
  renderTable();
  renderGraph();
}

function setUnits(system) {
  system = unitSystem(system);
  if (system === units) return;
  // Keep a typed prediction meaning the same distance.
  const p = parseFloat($('pred').value);
  if (isFinite(p)) $('pred').value = +toDisplay('dist', fromDisplay('dist', p, units), system).toFixed(1);
  units = system;
  saveUnits();
  applyUnits();
}

// ---------- wire up ----------
$('pumpBtn').addEventListener('click', pump);
$('goBtn').addEventListener('click', release);
$('csvBtn').addEventListener('click', downloadCSV);
$('copyBtn').addEventListener('click', copyTable);
$('undoBtn').addEventListener('click', deleteLast);
$('clearBtn').addEventListener('click', clearAll);
$('nameIn').addEventListener('input', saveLog);
['pumpBtn', 'goBtn', 'resetBtn'].forEach((id) => $(id).addEventListener('click', blurAfterPointer));
$('srcBtn').addEventListener('click', openSources);
$('setBtn').addEventListener('click', openSettings);
$('setForm').addEventListener('submit', submitSettings);
$('sDefaults').addEventListener('click', () => fillSettingsForm(defaultSettings()));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
document.addEventListener('keydown', onKey);
$('forcesChk').addEventListener('change', () => { if (st.phase !== 'moving') drawForces(0, {}); });
$('resetBtn').addEventListener('click', reset);
document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setUnits(b.dataset.system)));

(function init() {
  const ns = 'http://www.w3.org/2000/svg';
  for (let k = 0; k < PUFFS.max; k++) {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('class', 'puff'); c.setAttribute('visibility', 'hidden');
    $('puffs').appendChild(c);
    puffEls.push(c);
  }
  loadSettings();
  loadLog();
  try { localStorage.setItem(STORE_KEY + '.test', '1'); localStorage.removeItem(STORE_KEY + '.test'); }
  catch (e) { $('storeWarn').hidden = false; }
  applyUnits();
  reset();
})();
