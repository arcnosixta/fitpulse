#!/usr/bin/env node
/**
 * Rasterises assets/icons/icon.svg into the PNGs the web manifest and iOS need.
 * The drawing itself lives in lib/icon-render.mjs so the Android resources stay
 * in sync. Keep both in sync with icon.svg.
 *
 * Run: node scripts/gen-icons.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, renderIcon } from './lib/icon-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'icons');

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-192.png', 192, { maskable: true }],
  ['maskable-512.png', 512, { maskable: true }],
];

mkdirSync(OUT, { recursive: true });
for (const [name, size, opts] of targets) {
  const png = encodePng(renderIcon(size, opts), size);
  writeFileSync(join(OUT, name), png);
  console.log(`  ✓ assets/icons/${name}  ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`);
}
console.log('icons generated');
