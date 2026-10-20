// Balloon rocket car physics. Pure functions, no DOM.
// Loaded as a classic <script> in the built page (globals) and with require() in Node tests.
// All values are SI internally; the app converts to imperial for display only.

const CONFIG = {
  // Teacher settings
  pumpL: 0.5,         // air per pump (L). Teacher setting; hand pumps vary widely (Balloons Wiki, Balloon Pumps). Teacher kept 0.5 L.
  maxPumps: 6,        // default max pumps. Teacher decision (CLAUDE.md #1).
  maxPumpsLimit: 8,   // highest max a teacher can set; the lowest is 1. Teacher decision (CLAUDE.md #1).
  stringM: 10,        // string length (m). Estimate: long enough that 8 pumps never reaches the end with defaults.
  variation: true,    // +/-5% on friction and neck flow per trial. Teacher decision (CLAUDE.md #4).
  variationFrac: 0.05, // size of that variation. Estimate chosen to mimic real repeat trials (SPEC.md Teacher settings).

  // Balloon
  R0: 0.035,          // unstretched radius (m). Estimate for a 12 in latex balloon; measurable with a ruler.
  peakP: 3300,        // peak gauge pressure (Pa), about 3% above atmospheric (Vandermarlière 2016).
  alpha: 0.05,        // Mooney-Rivlin style stiffening term; puts the peak near stretch 1.42 (Vandermarlière 2016; Merritt and Weinhaus 1978).
  deflate: 0.85,      // deflation pressure as a fraction of inflation pressure, hysteresis (Vandermarlière 2016).

  // Neck jet
  neckD: 0.008,       // neck opening diameter (m). Estimate; measurable.
  CdNeck: 0.6,        // orifice discharge coefficient (Engineering ToolBox, Orifice, Nozzle and Venturi Flow Rate Meters).

  // Vehicle and air
  CdBody: 0.5,        // sphere drag coefficient, upper end of 0.07 to 0.5 (NASA Glenn, Shape Effects on Drag).
  rho: 1.2,           // air density (kg/m^3), room-temperature air at sea level. Standard value.
  dryMass: 0.0045,    // balloon + straw + tape (kg). Estimate; weigh on a kitchen scale.
  mu: 0.8,            // effective string friction. Tuned so distances match 3 m to 8 m classroom strings (Science World; FLEET). Not measured.
  g: 9.81,            // gravitational acceleration (m/s^2). Standard value.

  // Integration
  dt: 0.001,          // physics step (s). Tuned: stable at these speeds with semi-implicit Euler.
  maxTime: 30,        // safety cap on run length (s). Tuned; real runs end in under 3 s.
  emptyFrac: 1.02,    // balloon counts as empty below this multiple of V0. Tuned.
  minDP: 5            // jet stops below this gauge pressure (Pa). Tuned.
};

// Shape of the pressure curve vs stretch ratio, before scaling by K.
function shapeFn(l, alpha) {
  return (1 / l - 1 / Math.pow(l, 7)) * (1 + alpha * l * l);
}

// Scale factor K so the curve's peak equals c.peakP. Cached per (peakP, alpha).
const kCache = new Map();
function pressureK(c) {
  const key = c.peakP + '|' + c.alpha;
  if (kCache.has(key)) return kCache.get(key);
  let best = 0;
  for (let l = 1.001; l < 5; l += 0.001) best = Math.max(best, shapeFn(l, c.alpha));
  const K = c.peakP / best;
  kCache.set(key, K);
  return K;
}

function unstretchedVolume(c) {
  return 4 / 3 * Math.PI * c.R0 ** 3;
}

// Inflation-curve gauge pressure (Pa) for balloon volume V (m^3).
function gaugePressure(V, c, K) {
  if (K === undefined) K = pressureK(c);
  const l = Math.cbrt(V / unstretchedVolume(c));
  return l <= 1 ? 0 : K * shapeFn(l, c.alpha);
}

// Volume (m^3) of the balloon after the given number of pumps.
function startVolume(pumps, c) {
  return unstretchedVolume(c) + pumps * c.pumpL / 1000;
}

// Balloon diameter (m) for volume V, treating it as a sphere.
function diameterOf(V) {
  return 2 * Math.cbrt(3 * V / (4 * Math.PI));
}

// Run one trial. Returns per-step arrays plus summary values.
// rand is injectable so tests can seed the trial-to-trial variation.
function simulate(pumps, config, rand) {
  const c = Object.assign({}, CONFIG, config);
  rand = rand || Math.random;
  const vary = (k) => c.variation ? k * (1 + c.variationFrac * (2 * rand() - 1)) : k;
  const mu = vary(c.mu);
  const CdN = vary(c.CdNeck);
  const K = pressureK(c);
  const V0 = unstretchedVolume(c);
  const An = Math.PI * (c.neckD / 2) ** 2;
  const V1 = startVolume(pumps, c);

  let V = V1, x = 0, v = 0, t = 0, vmax = 0, burn = null, reachedEnd = false;
  const out = { t: [], x: [], v: [], vol: [], thrust: [], drag: [], fric: [] };
  const push = (F, D, fr) => {
    out.t.push(t); out.x.push(x); out.v.push(v); out.vol.push(V);
    out.thrust.push(F); out.drag.push(D); out.fric.push(fr);
  };

  while (t < c.maxTime) {
    // Thrust: F = rho * Q * ve = 2 * Cd,n * An * dP (NASA Rocket Thrust Equation, pressure term dropped).
    const dP = gaugePressure(V, c, K) * c.deflate;
    let F = 0;
    if (V > V0 * c.emptyFrac && dP > c.minDP) {
      const ve = Math.sqrt(2 * dP / c.rho);   // Bernoulli jet speed
      const Q = CdN * An * ve;                // volume flow out the neck
      F = c.rho * Q * ve;
      V = Math.max(V0, V - Q * c.dt);
    } else if (burn === null) {
      burn = t;
    }

    const r = Math.cbrt(3 * V / (4 * Math.PI));
    // Moving mass: dry mass + air inside + added mass of half the displaced air (sphere).
    const m = c.dryMass + 1.5 * c.rho * V;
    const D = 0.5 * c.rho * c.CdBody * Math.PI * r * r * v * v; // NASA Drag Equation
    const fr = mu * m * c.g;

    let a;
    if (v <= 0 && F <= fr) {
      a = 0; // static: thrust cannot beat friction
      if (F === 0 && t > 0.01) { push(0, 0, 0); break; }
    } else {
      a = (F - D - fr) / m;
    }

    v = Math.max(0, v + a * c.dt); // semi-implicit Euler
    x += v * c.dt;
    t += c.dt;
    if (x >= c.stringM) { x = c.stringM; v = 0; reachedEnd = true; }
    vmax = Math.max(vmax, v);
    push(F, D, v > 0 ? fr : 0);
    if (reachedEnd) break;
  }

  return Object.assign(out, {
    pumps,
    distance: x,
    duration: t,
    vmax,
    burn: burn === null ? t : burn,
    reachedEnd,
    startVol: V1,
    startWidth: diameterOf(V1),
    airAddedL: pumps * c.pumpL,
    mu,
    CdNeck: CdN
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, simulate, gaugePressure, pressureK, shapeFn, startVolume, unstretchedVolume, diameterOf };
}
