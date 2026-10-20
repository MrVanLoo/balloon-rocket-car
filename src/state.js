// Run states and control rules (SPEC.md "Run states"). Pure functions, no DOM.
// ready -> inflating -> moving -> stopped -> (Start over) -> ready
// `animating` is true during a pump stroke; inputs that change the balloon wait for it.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.

function initialState() {
  return { phase: 'ready', pumps: 0, animating: false };
}

function canPump(s, maxPumps) {
  return (s.phase === 'ready' || s.phase === 'inflating') && !s.animating && s.pumps < maxPumps;
}

function canRelease(s) {
  return s.phase === 'inflating' && s.pumps > 0 && !s.animating;
}

function canReset(s) {
  return s.phase !== 'moving' && !s.animating;
}

// Each transition returns a new state, or null when the action is not allowed.
function pumpState(s, maxPumps) {
  if (!canPump(s, maxPumps)) return null;
  return { phase: 'inflating', pumps: s.pumps + 1, animating: true };
}

function strokeDoneState(s) {
  return Object.assign({}, s, { animating: false });
}

function releaseState(s) {
  if (!canRelease(s)) return null;
  return Object.assign({}, s, { phase: 'moving' });
}

function stopState(s) {
  if (s.phase !== 'moving') return null;
  return Object.assign({}, s, { phase: 'stopped' });
}

function resetState(s) {
  if (!canReset(s)) return null;
  return initialState();
}

// What every control should show for state s.
function controlStates(s, maxPumps, hasTrials) {
  const moving = s.phase === 'moving';
  return {
    pump: canPump(s, maxPumps),
    release: canRelease(s),
    reset: canReset(s),
    prediction: !moving,
    data: hasTrials && !moving,
    counter: `${s.pumps} of ${maxPumps} pump${maxPumps === 1 ? '' : 's'}`
  };
}

// Status line after a pump stroke finishes.
function pumpMessage(pumps, maxPumps) {
  if (pumps >= maxPumps) return `${pumps} pump${pumps === 1 ? '' : 's'}. That’s the most air allowed. Press Release.`;
  return `${pumps} pump${pumps === 1 ? '' : 's'} in. Pump more or press Release.`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initialState, canPump, canRelease, canReset, pumpState, strokeDoneState, releaseState, stopState, resetState, controlStates, pumpMessage };
}
