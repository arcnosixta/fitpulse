#!/usr/bin/env node
/**
 * i18n integrity: RU/EN key parity plus every t('...') key resolving in both
 * dictionaries.
 *
 *   node scripts/check-i18n.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'js', 'core', 'i18n.js'), 'utf8');

/* ---------------- pull the two dictionaries out of the source ---------------- */
function extractDict(lang) {
  const start = src.indexOf(`${lang}: {`);
  if (start === -1) throw new Error(`dictionary "${lang}" not found`);
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return src.slice(from, i + 1);
}

/* The dicts are plain data with no imports, so they can be evaluated directly. */
const loadDict = (lang) => new Function(`return (${extractDict(lang)});`)();

const ru = loadDict('ru');
const en = loadDict('en');
const ruKeys = Object.keys(ru);
const enKeys = Object.keys(en);

const problems = [];
for (const k of ruKeys.filter((k) => !(k in en))) problems.push(`missing in en: ${k}`);
for (const k of enKeys.filter((k) => !(k in ru))) problems.push(`missing in ru: ${k}`);
for (const k of ruKeys) {
  if (typeof ru[k] !== 'string' || !ru[k].trim()) problems.push(`empty or non-string (ru): ${k}`);
  if (typeof en[k] !== 'string' || !en[k].trim()) problems.push(`empty or non-string (en): ${k}`);
}

/* ---------------- keys referenced from code and markup ---------------- */
const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
};

const used = new Set();
const dynamic = [];
const skipped = [];

for (const file of [...walk(join(ROOT, 'js')), join(ROOT, 'index.html')]) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  for (const m of text.matchAll(/\bdata-i18n="([a-zA-Z0-9_.]+)"/g)) used.add(m[1]);

  // a module-local `t` (the template-item helper) shadows the i18n one
  if (/(?:const|let|var|function)\s+t\s*[=(]/.test(text)) {
    skipped.push(`${rel} (declares its own t)`);
    continue;
  }

  for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) used.add(m[1]);
  // t(`prefix.${expr}`) - only the static prefix is verifiable
  for (const m of text.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]*)\$\{/g)) {
    const prefix = m[1];
    dynamic.push({ file: rel, prefix });
    if (prefix && !ruKeys.some((k) => k.startsWith(prefix))) {
      problems.push(`${rel}: dynamic key has no base "${prefix}" in the dictionaries`);
    }
  }
}

for (const k of used) {
  if (!(k in ru) || !(k in en)) problems.push(`used in code but not in both dictionaries: ${k}`);
}

const prefixes = dynamic.map((d) => d.prefix).filter(Boolean);
const unusedKeys = ruKeys.filter((k) => !used.has(k) && !prefixes.some((p) => k.startsWith(p)));

console.log(`dictionaries: ru=${ruKeys.length} en=${enKeys.length}`);
console.log(`keys referenced: ${used.size} static, ${dynamic.length} dynamic`);
if (dynamic.length) {
  for (const d of dynamic) console.log(`  dynamic: ${d.file} t(\`${d.prefix}...\`)`);
}
for (const s of skipped) console.log(`  skipped: ${s}`);
console.log(`unused keys: ${unusedKeys.length}`);
if (unusedKeys.length) console.log(`  ${unusedKeys.slice(0, 12).join(', ')}${unusedKeys.length > 12 ? ', ...' : ''}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):`);
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
console.log('\ni18n OK - RU/EN parity holds and every referenced key resolves');
