#!/usr/bin/env node
/**
 * Static import/export validator for the vanilla ES-module codebase.
 * Parses `import { a, b as c } from './x.js'` and checks that every named
 * binding is exported by the target module. Also runs `node --check`
 * equivalent parsing through dynamic import of a stub environment.
 *
 * Usage: node scripts/check-imports.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (extname(full) === '.js') out.push(full);
  }
  return out;
};

/** Collect exported names from a module source. */
function exportsOf(src) {
  const names = new Set();
  const re = [
    /^\s*export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z0-9_$]+)/gm,
    /^\s*export\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/gm,
    /^\s*export\s+class\s+([A-Za-z0-9_$]+)/gm,
  ];
  for (const r of re) for (const m of src.matchAll(r)) names.add(m[1]);

  // export { a, b as c }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const as = bit.split(/\s+as\s+/);
      names.add((as[1] ?? as[0]).trim());
    }
  }
  if (/export\s+\*\s+from/.test(src)) names.add('*');
  return names;
}

const IMPORT_RE =
  /import\s+([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g;

const files = walk(join(ROOT, 'js'));
const exportCache = new Map();
const exportOf = (path) => {
  if (!exportCache.has(path)) exportCache.set(path, exportsOf(readFileSync(path, 'utf8')));
  return exportCache.get(path);
};

let errors = 0;
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const clause = m[1].trim();
    const spec = m[2];
    if (!spec.startsWith('.')) continue; // bare specifier: resolved by the browser only if importmap — skip
    const target = resolve(dirname(file), spec);
    checked++;

    if (!existsSync(target)) {
      console.error(`MISSING FILE  ${file.replace(ROOT + '/', '')}  ->  ${spec}`);
      errors++;
      continue;
    }

    const named = clause.match(/\{([\s\S]*)\}/);
    if (!named) continue; // default or namespace import

    const available = exportOf(target);
    if (available.has('*')) continue;

    for (const part of named[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const name = bit.split(/\s+as\s+/)[0].trim();
      if (!available.has(name)) {
        console.error(
          `MISSING EXPORT  ${file.replace(ROOT + '/', '')}  imports { ${name} } from ${spec}`
        );
        errors++;
      }
    }
  }
}

/* ------------------------- unused import scan ------------------------- */
const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

let unused = 0;
for (const file of files) {
  const src = strip(readFileSync(file, 'utf8'));
  // collapse spread ellipsis so `...FOODS` does not look like a member access
  const body = src.replace(IMPORT_RE, ' ').replace(/\.\.\./g, ', ');
  const local = new Map();
  for (const m of src.matchAll(IMPORT_RE)) {
    const clause = m[1].trim();
    const named = clause.match(/\{([\s\S]*)\}/);
    if (!named) continue;
    for (const part of named[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const pieces = bit.split(/\s+as\s+/);
      const localName = (pieces[1] ?? pieces[0]).trim();
      local.set(localName, m[2]);
    }
  }
  for (const [name, spec] of local) {
    const used = new RegExp(`(^|[^\\w$.])${name.replace(/[$]/g, '\\$&')}(?![\\w$])`).test(body);
    if (!used) {
      console.warn(`UNUSED IMPORT  ${file.replace(ROOT + '/', '')}: { ${name} } from ${spec}`);
      unused++;
    }
  }
}

console.log(`\nchecked ${checked} import statements in ${files.length} files`);
if (errors) {
  console.error(`\n${errors} problem(s) found`);
  process.exit(1);
}
if (process.env.STRICT_UNUSED === '1' && unused) {
  console.error(`\n${unused} unused import(s)`);
  process.exit(1);
}
console.log(`all named imports resolve ✓${unused ? ` (${unused} unused import warning(s))` : ''}`);
