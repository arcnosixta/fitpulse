#!/usr/bin/env node
/**
 * Builds the deployable web root into dist/.
 *
 * This is what both the PWA host and Capacitor ship: the static app only, with
 * no sources of the build tooling, no node_modules and no docs. It also
 * cross-checks the service worker precache list against what was actually
 * copied, so a renamed view can never silently fall out of the offline cache.
 *
 * Run: node scripts/build-web.mjs
 */

import { cpSync, rmSync, mkdirSync, statSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Everything the browser needs. Directories are copied recursively. */
const PAYLOAD = ['index.html', 'sw.js', 'styles', 'js', 'assets'];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const copied = [];
for (const entry of PAYLOAD) {
  const from = join(ROOT, entry);
  if (!existsSync(from)) {
    console.error(`  ✗ missing source: ${entry}`);
    process.exitCode = 1;
    continue;
  }
  cpSync(from, join(DIST, entry), { recursive: true });
  copied.push(entry);
}

const bytes = (p) => statSync(p).size;
const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

console.log('web build → dist/');
for (const entry of copied) {
  const to = join(DIST, entry);
  console.log(`  ✓ ${entry.padEnd(16)} ${statSync(to).isDirectory() ? '<dir>' : kb(bytes(to))}`);
}
console.log(`  total index.html ${kb(bytes(join(DIST, 'index.html')))}`);

/* ---------------------- precache cross-check ---------------------- */
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const shell = [...sw.matchAll(/^\s+'([^']+)',/gm)].map((m) => m[1]).filter((s) => s !== './');

const walk = (dir, base = dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out;
};

const problems = [];
for (const url of shell) {
  if (url === 'index.html') continue;
  if (!existsSync(join(DIST, url))) problems.push(`precached but not built: ${url}`);
}
const built = ['styles', 'js', 'assets'].flatMap((d) => (existsSync(join(DIST, d)) ? walk(join(DIST, d), DIST) : []));
for (const file of built) {
  if (!shell.includes(file)) problems.push(`built but not precached: ${file}`);
}

if (problems.length) {
  console.error('\n  ✗ service worker precache list is out of sync:');
  for (const p of problems) console.error(`      ${p}`);
  process.exitCode = 1;
} else {
  console.log(`\n  ✓ sw.js precache list matches the build (${shell.length} entries)`);
}
