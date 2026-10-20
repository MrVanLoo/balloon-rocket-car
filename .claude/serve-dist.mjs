// Dev-only static server for dist/, so localStorage works in the preview (file:// previews block it).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
createServer(async (req, res) => {
  try {
    const body = await readFile(join(dist, 'balloon-rocket.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(8765, '127.0.0.1');
