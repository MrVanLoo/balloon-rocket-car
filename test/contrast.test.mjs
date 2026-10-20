import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// WCAG 2.1 AA: 4.5:1 for text, 3:1 for graphics such as arrows and graph points (SPEC.md Accessibility).
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

function tokens(re) {
  const m = css.match(re);
  assert.ok(m, `theme block ${re}`);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):(#[0-9A-Fa-f]{6})/g)) out[k] = v;
  return out;
}
const light = tokens(/^:root\{([\s\S]*?)\n\}/m);
const darkMedia = { ...light, ...tokens(/:root:not\(\[data-theme="light"\]\)\{([\s\S]*?)\}/) };
const darkAttr = { ...light, ...tokens(/:root\[data-theme="dark"\]\{([\s\S]*?)\}/) };

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEXT = [['ink', 'surface'], ['muted', 'surface'], ['ink', 'wall'], ['muted', 'wall'],
  ['accent-ink', 'accent'], ['accent', 'surface'], ['go-ink', 'go'], ['tape-ink', 'tape'],
  ['thrust', 'surface'], ['drag', 'surface'], ['fric', 'surface']];
// The tape's yellow band is decoration; its ticks and numbers (tape-ink on tape, checked above) carry the reading.
const GRAPHICS = [['balloon', 'surface'], ['string', 'surface'], ['post', 'surface'], ['go', 'surface']];

for (const [name, t] of [['light', light], ['dark (system)', darkMedia], ['dark (attribute)', darkAttr]]) {
  test(`${name} theme: text colors pass 4.5:1`, () => {
    for (const [fg, bg] of TEXT) {
      assert.ok(t[fg] && t[bg], `${fg} and ${bg} are defined`);
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `${fg} on ${bg}: ${r.toFixed(2)}`);
    }
  });
  test(`${name} theme: graphics pass 3:1`, () => {
    for (const [fg, bg] of GRAPHICS) {
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 3, `${fg} on ${bg}: ${r.toFixed(2)}`);
    }
  });
}

test('the two dark theme blocks match', () => {
  assert.deepEqual(darkMedia, darkAttr);
});
