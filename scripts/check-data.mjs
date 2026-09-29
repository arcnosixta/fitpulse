#!/usr/bin/env node
/**
 * Data integrity checks for the exercise, food and template databases.
 * Run: node scripts/check-data.mjs
 */

import { EXERCISES, EX_BY_ID, MUSCLES, EQUIPMENT, PATTERNS } from '../js/data/exercises.js';
import { FOODS, FOOD_CATEGORIES } from '../js/data/foods.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../js/data/templates.js';

let errors = 0;
let warnings = 0;

const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  errors++;
};
const warn = (msg) => {
  console.warn(`  ! ${msg}`);
  warnings++;
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

/* ------------------------------ exercises ------------------------------ */
console.log(`\nEXERCISES (${EXERCISES.length})`);
{
  const ids = new Set();
  for (const ex of EXERCISES) {
    if (!ex.id) fail('exercise without id');
    if (ids.has(ex.id)) fail(`duplicate exercise id: ${ex.id}`);
    ids.add(ex.id);

    if (!ex.n) fail(`${ex.id}: missing Russian name`);
    if (!ex.en) warn(`${ex.id}: missing English name`);

    if (!MUSCLES[ex.p]) fail(`${ex.id}: unknown primary muscle "${ex.p}"`);
    for (const s of ex.s ?? []) {
      if (!MUSCLES[s]) fail(`${ex.id}: unknown secondary muscle "${s}"`);
      if (s === ex.p) warn(`${ex.id}: secondary muscle duplicates primary (${s})`);
    }
    if (!EQUIPMENT[ex.eq]) fail(`${ex.id}: unknown equipment "${ex.eq}"`);
    if (!PATTERNS[ex.pat]) fail(`${ex.id}: unknown pattern "${ex.pat}"`);
    if (!['strength', 'warmup', 'mobility', 'cardio'].includes(ex.t)) {
      fail(`${ex.id}: unknown type "${ex.t}"`);
    }
    if (typeof ex.rest !== 'number' || ex.rest < 15 || ex.rest > 600) {
      fail(`${ex.id}: implausible rest ${ex.rest}`);
    }
    if (typeof ex.d !== 'number' || ex.d < 1 || ex.d > 4) {
      fail(`${ex.id}: difficulty out of range: ${ex.d}`);
    }
  }
  if (!errors) ok(`${EXERCISES.length} exercises, ids unique, references valid`);
}

/* ------------------------------ foods ------------------------------ */
console.log(`\nFOODS (${FOODS.length})`);
{
  const ids = new Set();
  let kcalDrift = 0;
  let skipped = 0;
  for (const f of FOODS) {
    if (!f.id) fail('food without id');
    if (ids.has(f.id)) fail(`duplicate food id: ${f.id}`);
    ids.add(f.id);

    if (!f.n) fail(`${f.id}: missing name`);
    if (!f.en) warn(`${f.id}: missing English name`);
    if (!FOOD_CATEGORIES[f.cat]) fail(`${f.id}: unknown category "${f.cat}"`);

    for (const key of ['k', 'p', 'f', 'c', 'fib', 'na', 'fe', 'ca', 'po']) {
      const v = f[key];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        fail(`${f.id}: bad value for ${key} (${v})`);
      }
    }
    if (f.p > 100 || f.f > 100 || f.c > 100) fail(`${f.id}: macro above 100 g/100 g`);
    if (f.p + f.f + f.c > 105) warn(`${f.id}: macros sum to ${(f.p + f.f + f.c).toFixed(1)} g/100 g`);

    // energy from macros must be close to the stated kcal
    // Atwater: 4/4/9. Fiber and ethanol carry energy that is not in the macro
    // columns, so those rows are reported separately instead of as drift.
    if (f.fib >= 8 || f.tags?.includes('alcohol')) {
      skipped++;
      continue;
    }
    // `f.c` is total carbohydrate (fiber included), so plain Atwater applies;
    // the residual gap is the indigestible part of the fiber.
    const derived = f.p * 4 + f.f * 9 + f.c * 4;
    const drift = Math.abs(derived - f.k) / Math.max(1, f.k);
    if (drift > 0.2) {
      kcalDrift++;
      warn(`${f.id}: kcal ${f.k} vs macros ${derived.toFixed(0)} (${(drift * 100).toFixed(0)} % off)`);
    }
  }
  if (!errors) ok(`${FOODS.length} foods, ids unique, category refs valid`);
  console.log(`  · energy-from-macro drift > 20 %: ${kcalDrift}`);
  console.log(`  · skipped (fiber ≥ 8 g or alcohol): ${skipped}`);
}

/* ------------------------------ templates ------------------------------ */
console.log(`\nTEMPLATES (${TEMPLATES.length})`);
{
  const ids = new Set();
  let totalSlots = 0;
  for (const tpl of TEMPLATES) {
    if (ids.has(tpl.id)) fail(`duplicate template id: ${tpl.id}`);
    ids.add(tpl.id);

    if (!tpl.n) fail(`${tpl.id}: missing name`);
    if (!tpl.en) warn(`${tpl.id}: missing English name`);
    if (!Array.isArray(tpl.days) || !tpl.days.length) fail(`${tpl.id}: no days`);

    const dows = new Set();
    let slots = 0;
    for (const day of tpl.days ?? []) {
      if (day.dow < 0 || day.dow > 6) fail(`${tpl.id}: invalid dow ${day.dow}`);
      if (dows.has(day.dow)) fail(`${tpl.id}: duplicate day for dow ${day.dow}`);
      dows.add(day.dow);
      if (!day.name) warn(`${tpl.id}: day ${day.dow} has no name`);
      if (!day.items?.length) fail(`${tpl.id}: day ${day.dow} is empty`);

      for (const it of day.items ?? []) {
        slots++;
        if (!EX_BY_ID[it.ex]) fail(`${tpl.id}: unknown exercise "${it.ex}"`);
        if (!(it.sets > 0)) fail(`${tpl.id}/${it.ex}: sets must be > 0`);
        if (!it.reps) fail(`${tpl.id}/${it.ex}: missing reps`);
        if (!(it.rest > 0)) fail(`${tpl.id}/${it.ex}: rest must be > 0`);
        const ex = EX_BY_ID[it.ex];
        if (ex && ex.t === 'mobility') {
          warn(`${tpl.id}: "${it.ex}" is a mobility item used as a working slot`);
        }
      }
    }
    totalSlots += slots;
    if (tpl.perWeek != null && tpl.perWeek !== slots && tpl.days.length !== tpl.perWeek) {
      warn(`${tpl.id}: perWeek=${tpl.perWeek} but ${tpl.days.length} days defined`);
    }
  }
  if (!errors) ok(`${TEMPLATES.length} templates, ${totalSlots} exercise slots, all exercise ids valid`);
}

console.log(`\n${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
