// Draft physics module, extracted from reference/mockup.html. Runs in Node: require("./physics-draft.js").
// CONFIG here matches the mockup (max 5 pumps, variation off). CLAUDE.md lists the decisions that change those defaults.
const CONFIG = {
  pumpL: 0.5,        // air per pump (L), teacher setting
  maxPumps: 5,
  R0: 0.035,         // unstretched balloon radius (m), 12 in balloon estimate
  peakP: 3300,       // peak gauge pressure (Pa), Vandermarliere 2016
  alpha: 0.05,       // Mooney-Rivlin style stiffening term
  deflate: 0.85,     // deflation curve below inflation curve (hysteresis)
  neckD: 0.008,      // neck opening diameter (m)
  CdNeck: 0.6,       // orifice discharge coefficient, Engineering ToolBox
  CdBody: 0.5,       // sphere drag coefficient, NASA Glenn
  rho: 1.2,          // air density (kg/m^3)
  dryMass: 0.0045,   // balloon + straw + tape (kg)
  mu: 0.8,           // effective friction, tuned to classroom distances
  g: 9.81,
  stringM: 10,       // string length (m)
  dt: 0.001,         // physics step (s)
  variation: false   // +/-5% on friction and neck flow per trial
};
function shapeFn(l, a) { return (1 / l - 1 / Math.pow(l, 7)) * (1 + a * l * l); }
function pressureK(c) {
  let best = 0;
  for (let l = 1.001; l < 5; l += 0.001) best = Math.max(best, shapeFn(l, c.alpha));
  return c.peakP / best;
}
function gaugePressure(V, c, K) {
  const V0 = 4 / 3 * Math.PI * c.R0 ** 3;
  const l = Math.cbrt(V / V0);
  return l <= 1 ? 0 : K * shapeFn(l, c.alpha);
}
function simulate(pumps, c, rand) {
  rand = rand || Math.random;
  const vary = (k) => c.variation ? k * (1 + 0.05 * (2 * rand() - 1)) : k;
  const mu = vary(c.mu), CdN = vary(c.CdNeck);
  const K = pressureK(c);
  const V0 = 4 / 3 * Math.PI * c.R0 ** 3;
  const An = Math.PI * (c.neckD / 2) ** 2;
  let V = V0 + pumps * c.pumpL / 1000, x = 0, v = 0, t = 0, vmax = 0, burn = null, reachedEnd = false;
  const out = { t: [], x: [], v: [], vol: [], thrust: [], drag: [], fric: [] };
  while (t < 30) {
    const dP = gaugePressure(V, c, K) * c.deflate;
    let F = 0;
    if (V > V0 * 1.02 && dP > 5) {
      const ve = Math.sqrt(2 * dP / c.rho), Q = CdN * An * ve;
      F = c.rho * Q * ve;
      V = Math.max(V0, V - Q * c.dt);
    } else if (burn === null) burn = t;
    const r = Math.cbrt(3 * V / (4 * Math.PI));
    const m = c.dryMass + 1.5 * c.rho * V; // air inside + added mass (half displaced air)
    const D = 0.5 * c.rho * c.CdBody * Math.PI * r * r * v * v;
    const fr = mu * m * c.g;
    let a;
    if (v <= 0 && F <= fr) { a = 0; if (F === 0 && t > 0.01) { out.t.push(t); out.x.push(x); out.v.push(0); out.vol.push(V); out.thrust.push(0); out.drag.push(0); out.fric.push(0); break; } }
    else a = (F - D - fr) / m;
    v = Math.max(0, v + a * c.dt);
    x += v * c.dt; t += c.dt;
    if (x >= c.stringM) { x = c.stringM; v = 0; reachedEnd = true; }
    vmax = Math.max(vmax, v);
    out.t.push(t); out.x.push(x); out.v.push(v); out.vol.push(V);
    out.thrust.push(F); out.drag.push(D); out.fric.push(v > 0 ? fr : 0);
    if (reachedEnd) break;
  }
  return Object.assign(out, { distance: x, duration: t, vmax, burn: burn ?? t, reachedEnd, startVol: V0 + pumps * c.pumpL / 1000 });
}
if (typeof module !== 'undefined') module.exports = { CONFIG, simulate, gaugePressure, pressureK };
