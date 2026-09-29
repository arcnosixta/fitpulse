#!/usr/bin/env node
/**
 * Generates the Android launcher icon and splash resources from the same mark
 * the web manifest uses, so the installed app looks like FitPulse instead of
 * the stock Capacitor robot.
 *
 * Writes into android/app/src/main/res:
 *   mipmap-<density>/ic_launcher.png            legacy launcher icon, pre-API 26
 *   mipmap-<density>/ic_launcher_round.png      round variant for the manifest
 *   mipmap-<density>/ic_launcher_foreground.png adaptive-icon foreground layer
 *   values/ic_launcher_background.xml           adaptive-icon background colour
 *   values/splash_background.xml                splash colour
 *   drawable/splash.xml                         splash layer-list
 *
 * It also deletes the template splash bitmaps and the unused teal vector
 * drawables, which would otherwise win the resource lookup and ship the robot.
 *
 * Run: node scripts/gen-android-assets.mjs
 */

import { writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, renderIcon } from './lib/icon-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

/** Must match android.backgroundColor in capacitor.config.json. */
const DARK = '#0A0C14';

/** mdpi … xxxhdpi. */
const DENSITIES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

/**
 * An adaptive icon is a 108dp canvas of which only the centred 72dp is
 * guaranteed visible, so the mark is drawn at 72/108 with a matching stroke
 * weight to keep its proportions identical to the square icon.
 */
const SAFE = 72 / 108;

if (!existsSync(RES)) {
  console.log('  – no android/ platform yet, skipping (run: npx cap add android)');
  process.exit(0);
}

const writePng = (relPath, size, opts) => {
  const png = encodePng(renderIcon(size, opts), size);
  const abs = join(RES, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, png);
  return png.length;
};

let count = 0;
for (const [density, scale] of DENSITIES) {
  const dir = `mipmap-${density}`;
  const legacy = Math.round(48 * scale);
  const adaptive = Math.round(108 * scale);

  for (const [file, opts] of [
    ['ic_launcher.png', {}],
    ['ic_launcher_round.png', { shape: 'circle', contentScale: 0.78, strokeScale: 0.78 }],
    ['ic_launcher_foreground.png', { shape: 'none', contentScale: SAFE, strokeScale: SAFE }],
  ]) {
    const size = file === 'ic_launcher_foreground.png' ? adaptive : legacy;
    const bytes = writePng(join(dir, file), size, opts);
    console.log(`  ✓ res/${dir}/${file}  ${size}×${size}  ${(bytes / 1024).toFixed(1)} kB`);
    count += 1;
  }
}

// The template ships this as #FFFFFF, which is a white square behind the mark
// on every launcher that uses the adaptive icon.
writeFileSync(
  join(RES, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${DARK}</color>\n</resources>\n`,
);
writeFileSync(
  join(RES, 'values', 'splash_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_background">${DARK}</color>\n</resources>\n`,
);

// A layer-list replaces eleven density-bucketed splash bitmaps with one
// centred mark that scales to any screen and both orientations.
writeFileSync(
  join(RES, 'drawable', 'splash.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="@color/splash_background" />\n    <item>\n        <bitmap android:gravity="center" android:src="@mipmap/ic_launcher_foreground" />\n    </item>\n</layer-list>\n`,
);
count += 3;

for (const stale of [
  'drawable/splash.png',
  'drawable/ic_launcher_background.xml',
  'drawable-v24/ic_launcher_foreground.xml',
]) {
  const abs = join(RES, stale);
  if (!existsSync(abs)) continue;
  rmSync(abs);
  console.log(`  − res/${stale} (template artwork)`);
  count += 1;
}

for (const density of DENSITIES) {
  for (const orientation of ['port', 'land']) {
    const abs = join(RES, `drawable-${orientation}-${density[0]}`, 'splash.png');
    if (!existsSync(abs)) continue;
    rmSync(abs);
    count += 1;
  }
  // drop the bucket once its last file is gone
  for (const orientation of ['port', 'land']) {
    const dir = join(RES, `drawable-${orientation}-${density[0]}`);
    if (existsSync(dir) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
  }
}

console.log(`android assets generated (${count} files) — run: npx cap sync android`);
