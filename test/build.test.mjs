import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SOURCES } = require('../src/sources.js');
const root = new URL('..', import.meta.url);
const distURL = new URL('../dist/balloon-rocket.html', import.meta.url);

execFileSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'pipe' });
const html = readFileSync(distURL, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

test('dist file is under 150 KB', () => {
  const size = statSync(distURL).size;
  assert.ok(size < 150 * 1024, `${(size / 1024).toFixed(1)} KB`);
});

test('everything is inline: no external scripts, styles, images, fonts or frames', () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+(stylesheet|preload|icon|manifest)/i);
  assert.doesNotMatch(html, /<(img|iframe|video|audio|source|embed|object)\b/i);
  assert.doesNotMatch(styles, /url\(|@import|@font-face/i);
  assert.equal([...html.matchAll(/<style>/g)].length, 1);
  assert.ok(scripts.length > 10000, 'scripts were inlined');
});

test('no code that makes network requests, and no claude.ai-only hooks', () => {
  for (const re of [/\bfetch\(/, /XMLHttpRequest/, /WebSocket/, /EventSource/, /sendBeacon/, /\bimport\(/, /new\s+Worker/, /claude\.use/, /window\.claude/]) {
    assert.doesNotMatch(scripts, re);
  }
});

test('the only web addresses are the 15 source links', () => {
  const urls = new Set([...html.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)].map((m) => m[0]));
  urls.delete('http://www.w3.org/2000/svg'); // SVG namespace identifier, never fetched
  const allowed = new Set(SOURCES.map((s) => s[1]));
  for (const u of urls) assert.ok(allowed.has(u), `unexpected URL ${u}`);
});

test('no leftover console logging or debugger statements', () => {
  assert.doesNotMatch(scripts, /console\.(log|debug|info|warn|error)\(|\bdebugger\b/);
});

test('page shell keeps what ChromeOS needs', () => {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>Balloon rocket car<\/title>/);
});
