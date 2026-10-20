import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The built page loads every src/*.js as a classic <script> sharing one global scope,
// so a top-level name declared in two files is a SyntaxError at load time.
test('no two scripts declare the same top-level name', () => {
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.ok(files.length >= 5);
  const seen = new Map();
  for (const f of files) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/^(?:const|let|var|function|async function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      const name = m[1];
      assert.ok(!seen.has(name), `"${name}" is declared in both ${seen.get(name)} and ${f}`);
      seen.set(name, f);
    }
  }
});
