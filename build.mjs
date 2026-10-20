// Inlines src/ into dist/balloon-rocket.html. No dependencies: node build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');
const LIMIT = 150 * 1024;

let html = src('index.html');
html = html.replace(/^\s*<!-- build\.mjs[^>]*-->\n/m, '');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g,
  (_, f) => `<style>\n${src(f).trim()}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g,
  (_, f) => `<script>\n${src(f).trim().replace(/<\/script/gi, '<\\/script')}\n</script>`);

const left = html.match(/<(?:link|script)[^>]+(?:href|src)="[^"#]+"/g);
if (left) throw new Error(`Not inlined: ${left.join(', ')}`);

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'balloon-rocket.html');
writeFileSync(out, html);
const size = Buffer.byteLength(html);
console.log(`dist/balloon-rocket.html: ${(size / 1024).toFixed(1)} KB (limit 150 KB)`);
if (size > LIMIT) { console.error('Over the 150 KB limit.'); process.exit(1); }
