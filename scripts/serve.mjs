#!/usr/bin/env node
/**
 * Zero-dependency static server for local development and for checking the
 * service worker (a file:// page cannot register one).
 *
 *   node scripts/serve.mjs [port]
 *
 * Cache headers are deliberately off so an old service worker never shadows a
 * fresh build while you are iterating.
 */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  // stay inside the project root
  const target = normalize(join(ROOT, pathname));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    // hash routing keeps every view on "/", but a deep link should still work
    file = join(ROOT, 'index.html');
  }

  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  const ext = extname(file);
  res.writeHead(200, {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': 'no-store',
    // the worker is served from the root, so allow it to claim the whole scope
    ...(file.endsWith('sw.js') ? { 'service-worker-allowed': '/' } : {}),
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`FitPulse dev server → http://localhost:${PORT}/`);
  console.log('Ctrl+C to stop');
});
