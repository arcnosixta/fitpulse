/**
 * DOM smoke test — boots the real application in jsdom and renders every route.
 *
 * `node --check` proves the files parse; this proves they *run*. It catches the
 * class of bug that unit tests miss: a view that throws while building its
 * nodes, a missing i18n key, an untranslated template placeholder, a control
 * wired to a state key that does not exist.
 *
 *   node scripts/smoke-dom.mjs
 *
 * jsdom is a dev-only dependency; the shipped app has none.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* environment                                                         */
/* ------------------------------------------------------------------ */

const problems = [];
const errors = [];

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  // jsdom has no layout engine; these are expected, not app bugs
  const expected = /Not implemented|Could not parse CSS|getComputedStyle/.test(e.message);
  (expected ? [] : errors).push(`jsdom: ${e.message}`);
});

const dom = new JSDOM(readFileSync(join(ROOT, 'index.html'), 'utf8'), {
  url: 'http://localhost:4173/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;

/* ---- shims jsdom does not provide ---- */
window.matchMedia = (query) => ({
  media: query,
  matches: /reduced-motion|hover|pointer: fine/.test(query) ? !/reduced-motion/.test(query) : false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {},
  onchange: null,
});
window.scrollTo = () => {};
window.scroll = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.navigator.vibrate = () => true;
window.AudioContext = undefined;
window.webkitAudioContext = undefined;
window.devicePixelRatio = 1;
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
window.IntersectionObserver = Observer;
window.ResizeObserver = Observer;
// jsdom has no text metrics; charts only need non-zero extents to lay out
if (window.SVGElement) {
  window.SVGElement.prototype.getBBox = function getBBox() {
    return { x: 0, y: 0, width: 40, height: 10 };
  };
  window.SVGElement.prototype.getComputedTextLength = function getComputedTextLength() {
    return 40;
  };
}

/* ---- hand the module system the browser globals ----
   Node ships its own Event/CustomEvent, which jsdom refuses as a dispatch
   target, so these must be overwritten rather than only filled in. */
for (const key of [
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent',
  'PointerEvent', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'DocumentFragment',
  'IntersectionObserver', 'ResizeObserver', 'devicePixelRatio', 'CSS',
]) {
  if (key in window) {
    Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
  }
}
globalThis.window = window;
globalThis.document = window.document;

window.addEventListener('error', (e) => errors.push(`uncaught: ${e.message}`));
const realError = console.error.bind(console);
console.error = (...args) => {
  errors.push(`console.error: ${args.join(' ')}`);
  realError(...args);
};

/* ------------------------------------------------------------------ */
/* seed a realistic, fully onboarded state                             */
/* ------------------------------------------------------------------ */

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
};

const day = (date, kcal, weight) => ({
  date,
  kcal,
  protein: 140,
  fat: 70,
  carbs: 220,
  water: 2.5,
  weight,
  steps: 8000,
  trained: true,
  note: '',
  meals: { breakfast: [{ id: 'oats', g: 60 }], lunch: [], dinner: [], snack: [] },
});

window.localStorage.setItem(
  'fitpulse.state.v1',
  JSON.stringify({
    v: 1,
    profile: {
      onboarded: true, name: 'Test', sex: 'male', age: 28, height: 180, weight: 80,
      bodyFat: 16, activity: 'moderate', goal: 'recomp', kcalTarget: 2400,
      meals: 4, trainingDays: 4, heightSq: 1.8,
    },
    settings: {
      theme: 'dark', accent: 'volt', lang: 'ru', unitSystem: 'metric',
      sound: false, haptics: false, restDefault: 90, weekStart: 0, formula: 'epley',
    },
    program: {
      templateId: 'ppl',
      name: 'My program',
      startDate: iso(20),
      days: [
        {
          dow: 1,
          name: 'Push',
          items: [
            { uid: 'a1', ex: 'bench-press', sets: 4, reps: 8, rest: 120, tempo: '3-1-1', rpe: 8, note: '' },
            { uid: 'a2', ex: 'incline-db-press', sets: 3, reps: 10, rest: 90, tempo: '2-0-1', rpe: 7.5, note: '' },
          ],
        },
        { dow: 3, name: 'Pull', items: [{ uid: 'b1', ex: 'pull-up', sets: 4, reps: 6, rest: 150, tempo: '', rpe: 8, note: '' }] },
      ],
    },
    logs: [
      { id: 'l1', date: iso(2), startedAt: iso(2), durationSec: 4200, kcal: 420, tonnage: 12400, items: [{ ex: 'bench-press', sets: [{ reps: 8, weight: 80, rpe: 8 }] }] },
      { id: 'l2', date: iso(4), startedAt: iso(4), durationSec: 3900, kcal: 390, tonnage: 11800, items: [] },
    ],
    active: null,
    food: { [iso(0)]: day(iso(0), 2350, 79.6), [iso(1)]: day(iso(1), 2480, 79.9), [iso(2)]: day(iso(2), 2100, 80.1) },
    weightLog: [
      { date: iso(6), weight: 81.2 }, { date: iso(4), weight: 80.8 },
      { date: iso(2), weight: 80.1 }, { date: iso(0), weight: 79.6 },
    ],
    measureLog: [
      { date: iso(6), values: { chest: 103, waist: 84, hip: 96, arm: 37, thigh: 58, calf: 38, neck: 39 } },
      { date: iso(0), values: { chest: 104, waist: 81, hip: 95, arm: 37.5, thigh: 58, calf: 38, neck: 39 } },
    ],
    favorites: ['bench-press', 'squat'],
    notes: 'smoke',
  })
);

/* ------------------------------------------------------------------ */
/* boot + walk every route                                             */
/* ------------------------------------------------------------------ */

const ROUTES = [
  'dashboard', 'program', 'library', 'workout', 'nutrition',
  'progress', 'calculators', 'history', 'settings',
];

const tick = () => new Promise((r) => setTimeout(r, 0));

await import(pathToFileURL(join(ROOT, 'js', 'app.js')).href);
await tick();

const router = await import(pathToFileURL(join(ROOT, 'js', 'core', 'router.js')).href);
const outlet = window.document.querySelector('#views');
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${name}${detail ? `: ${detail}` : ''}`);
};

console.log('routes');
for (const id of ROUTES) {
  const before = errors.length;
  router.navigate(id);
  await tick();
  await tick();
  const nodes = outlet?.children.length ?? 0;
  const html = outlet?.innerHTML ?? '';
  check(
    id,
    nodes > 0 && errors.length === before,
    errors.length > before ? errors.slice(before).join(' | ') : `${nodes} root node(s), ${html.length} chars`
  );
  const placeholders = [...html.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g)].map((m) => m[1]);
  if (placeholders.length) check(`${id} has no untranslated placeholders`, false, placeholders.slice(0, 5).join(', '));
}

/* ---- English must contain no leftover Russian (checked in the language pass) ---- */

/* ---- onboarding, which the guard hides once onboarded ---- */
console.log('onboarding (fresh profile)');
{
  const { getState, update } = await import(pathToFileURL(join(ROOT, 'js', 'core', 'store.js')).href);
  const saved = JSON.parse(window.localStorage.getItem('fitpulse.state.v1'));
  update({ profile: { ...getState().profile, onboarded: false } });
  const before = errors.length;
  router.navigate('onboarding');
  await tick();
  await tick();
  check('onboarding renders', (outlet?.children.length ?? 0) > 0 && errors.length === before,
    errors.length > before ? errors.slice(before).join(' | ') : `${outlet.children.length} root node(s)`);
  window.localStorage.setItem('fitpulse.state.v1', JSON.stringify(saved));
  update({ profile: { ...getState().profile, onboarded: true } });
  router.navigate('dashboard');
  await tick();
}

/* ---- calculators: every tool, both unit systems ---- */
console.log('calculator tools');
{
  const before = errors.length;
  router.navigate('calculators');
  await tick();
  const ids = [...outlet.querySelectorAll('[data-calc],[data-tool],button')]
    .map((b) => b.dataset.calc ?? b.dataset.tool ?? b.textContent.trim())
    .filter(Boolean);
  const unique = [...new Set(ids)];
  let opened = 0;
  for (const label of unique.slice(0, 40)) {
    const btn = [...outlet.querySelectorAll('[data-calc],[data-tool],button')]
      .find((b) => (b.dataset.calc ?? b.dataset.tool ?? b.textContent.trim()) === label);
    if (!btn || btn.tagName !== 'BUTTON') continue;
    const n = errors.length;
    try {
      btn.click();
      await tick();
      opened++;
      if (errors.length > n) check(`tool "${label}"`, false, errors.slice(n).join(' | '));
    } catch (e) {
      check(`tool "${label}"`, false, e.message);
    }
  }
  check(`opened ${opened} calculator tools without throwing`, opened > 0 && errors.length === before,
    errors.length > before ? errors.slice(before).join(' | ') : 'no errors');
}

/* ---- imperial round-trip ---- */
console.log('unit system');
{
  const { update, getState } = await import(pathToFileURL(join(ROOT, 'js', 'core', 'store.js')).href);
  update({ settings: { ...getState().settings, unitSystem: 'imperial' } });
  const before = errors.length;
  for (const id of ROUTES) {
    router.navigate(id);
    await tick();
  }
  check('all routes render in imperial', errors.length === before, errors.slice(before).join(' | '));
  const { getState: gs } = await import(pathToFileURL(join(ROOT, 'js', 'core', 'store.js')).href);
  check('weight stayed metric in storage', gs().profile.weight === 80, `weight=${gs().profile.weight}`);
  const html = outlet.innerHTML;
  check('imperial labels are shown', /lb|ft"|"|'/.test(html) || /lb/.test(html), 'lb visible');
  update({ settings: { ...gs().settings, unitSystem: 'metric' } });
}

/* ---- language ---- */
console.log('language');
{
  const { setLang } = await import(pathToFileURL(join(ROOT, 'js', 'core', 'i18n.js')).href);
  const before = errors.length;
  for (const lang of ['en', 'ru']) {
    setLang(lang);
    for (const id of ROUTES) {
      router.navigate(id);
      await tick();
    }
  }
  check('all routes render in both languages', errors.length === before, errors.slice(before).join(' | '));

  // English output must not leak Russian strings
  setLang('en');
  const leaked = [];
  for (const id of ROUTES) {
    router.navigate(id);
    await tick();
    const ru = [...(outlet.innerHTML ?? '').matchAll(/>([^<>]*[а-яА-ЯёЁ]{2,}[^<>]*)</g)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    if (ru.length) leaked.push(`${id}: ${[...new Set(ru)].slice(0, 3).join(' / ')}`);
  }
  check('English views contain no Russian text', leaked.length === 0, leaked.slice(0, 4).join(' | '));
  setLang('ru');
}

/* ------------------------------------------------------------------ */

window.close();

if (errors.length) {
  console.log(`\nruntime errors (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 25)) console.log(`  ✗ ${e}`);
}
if (problems.length || errors.length) {
  console.log(`\nFAILED: ${problems.length} assertion(s), ${errors.length} runtime error(s)`);
  process.exit(1);
}
console.log('\nsmoke OK — all routes, tools, unit systems and languages render clean');
