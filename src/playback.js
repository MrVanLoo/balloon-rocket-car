// Playback helpers for the release animation. Pure functions, no DOM.
// The whole trajectory is computed on Release; playback only picks samples from it,
// so what students see and what gets logged can never disagree (SPEC.md Technical requirements).
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

// Index of the trajectory sample to show `elapsed` seconds after release.
function frameIndex(run, elapsed) {
  const n = run.t.length;
  if (n === 0) return -1;
  const dt = n > 1 ? run.t[1] - run.t[0] : run.t[0] || 0.001;
  const i = Math.floor(elapsed / dt);
  return Math.max(0, Math.min(n - 1, i));
}

function isPlaybackDone(run, elapsed) {
  return frameIndex(run, elapsed) >= run.t.length - 1;
}

const ARROWS = {
  k: 700,       // arrow px per newton. Tuned so peak thrust (about 0.17 N) is about 120 px.
  minLen: 10,   // shortest visible arrow (px)
  minForce: 0.0005, // hide arrows for forces below this (N)
  charW: 6.6,   // approximate label width per character at 11px (px)
  gap: 8,       // space between an arrow tip and its label (px)
  rows: { thrust: 52, drag: 38, fric: 24 } // arrow heights in the scene (SVG y)
};

const ARROW_NAMES = { thrust: 'Thrust', drag: 'Air resistance', fric: 'Friction' };

// Lay out the three force arrows on a car at SVG x `px`.
// Thrust points forward (right); air resistance and friction point back (left).
// Labels go past the arrow tip, or on the other side of the car if they would leave [xMin, xMax].
function arrowLayout(px, forces, xMin, xMax) {
  const out = [];
  for (const key of ['thrust', 'drag', 'fric']) {
    const val = forces[key] || 0;
    const dir = key === 'thrust' ? 1 : -1;
    const y = ARROWS.rows[key];
    const label = `${ARROW_NAMES[key]} ${val.toFixed(2)} N`;
    if (val < ARROWS.minForce) { out.push({ key, visible: false, label, y }); continue; }
    // Clamp to the scene so an arrow never runs off the edge (only near the far post).
    const room = dir > 0 ? xMax - px : px - xMin;
    const len = Math.min(room, Math.max(ARROWS.minLen, val * ARROWS.k));
    const x2 = px + dir * len;
    const w = label.length * ARROWS.charW;
    let labelX = x2 + dir * ARROWS.gap, anchor = dir > 0 ? 'start' : 'end';
    const fits = dir > 0 ? labelX + w <= xMax : labelX - w >= xMin;
    if (!fits) {
      labelX = px - dir * ARROWS.gap;
      anchor = dir > 0 ? 'end' : 'start';
    }
    out.push({ key, visible: true, x1: px, x2, y, label, labelX, anchor, len });
  }
  return out;
}

const PUFFS = {
  everyMs: 45,  // one puff per 45 ms while air is flowing
  lifeMs: 600,  // each puff fades over 600 ms
  max: 16       // pool size; lifeMs / everyMs rounded up, plus room
};

// Advance the puff list to time `now` (ms). Emits a new puff at `tip` while `flowing`.
// Returns { puffs, lastEmit }; each puff has x, y, born, seed.
function stepPuffs(puffs, lastEmit, now, flowing, tip) {
  const live = puffs.filter((p) => now - p.born < PUFFS.lifeMs);
  if (flowing && tip && now - lastEmit >= PUFFS.everyMs && live.length < PUFFS.max) {
    live.push({ x: tip.x, y: tip.y, born: now, seed: (live.length * 7919 + Math.round(now)) % 13 / 13 });
    lastEmit = now;
  }
  return { puffs: live, lastEmit };
}

// Where a puff is drawn: drifts back from the neck, grows and fades.
function puffLook(p, now) {
  const a = Math.min(1, (now - p.born) / PUFFS.lifeMs);
  return {
    cx: p.x - a * 60,
    cy: p.y + (p.seed - 0.5) * a * 16,
    r: 3 + a * 9,
    opacity: 0.45 * (1 - a)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { frameIndex, isPlaybackDone, ARROWS, arrowLayout, PUFFS, stepPuffs, puffLook };
}
