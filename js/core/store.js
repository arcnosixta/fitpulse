/**
 * Application state: one plain object, persisted to localStorage,
 * with a minimal pub/sub so views can react without a framework.
 */

import { getLang } from './i18n.js';

const KEY = 'fitpulse.state.v1';
const SCHEMA = 1;

const defaultState = () => ({
  v: SCHEMA,
  profile: {
    onboarded: false,
    name: '',
    sex: 'male',
    age: 25,
    height: 178,
    weight: 78,
    bodyFat: null, // % — null means "unknown", BMR uses weight-based equations
    activity: 'moderate',
    goal: 'recomp',
    kcalTarget: null,
    meals: 4,
    trainingDays: 4,
    heightSq: null,
  },
  settings: {
    theme: 'dark',
    accent: 'volt',
    lang: 'ru',
    unitSystem: 'metric',
    sound: true,
    haptics: true,
    restDefault: 90,
    weekStart: 0,
    formula: 'epley',
  },
  program: {
    templateId: null,
    name: 'Моя программа',
    startDate: null,
    days: [], // [{dow, name, items:[{uid, ex, sets, reps, rest, tempo, rpe, note}]}]
  },
  logs: [], // finished sessions
  active: null, // in-progress session
  food: {}, // { 'YYYY-MM-DD': { meals: {breakfast:[{id,g}], ... }, water: number } }
  weightLog: [], // [{date, weight, bodyFat}]
  measureLog: [], // [{date, values:{chest,waist,hip,arm,thigh,calf,neck}}]
  favorites: [], // exercise ids
  notes: '',
});

/* ------------------------------ pub/sub ------------------------------ */
const listeners = new Map(); // key -> Set<fn>
let state = load();
let saveTimer = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (err) {
    console.warn('[fitpulse] state load failed, starting fresh', err);
    return defaultState();
  }
}

function migrate(s) {
  const base = defaultState();
  const merged = {
    ...base,
    ...s,
    profile: { ...base.profile, ...(s.profile ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) },
    program: { ...base.program, ...(s.program ?? {}) },
    logs: s.logs ?? [],
    food: s.food ?? {},
    weightLog: s.weightLog ?? [],
    measureLog: s.measureLog ?? [],
    favorites: s.favorites ?? [],
  };
  merged.v = SCHEMA;
  return merged;
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error('[fitpulse] state save failed', err);
    }
  }, 180);
}

function emit(keys) {
  for (const key of keys) {
    const set = listeners.get(key);
    if (set) for (const fn of set) fn(state);
  }
  const all = listeners.get('*');
  if (all) for (const fn of all) fn(state, keys);
}

/* ------------------------------ API ------------------------------ */
export const getState = () => state;

export function subscribe(keys, fn) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
  }
  return () => list.forEach((key) => listeners.get(key)?.delete(fn));
}

/**
 * Update state. Accepts a patch object or an updater function.
 * Only top-level keys are notified.
 */
export function update(patchOrFn) {
  const next = typeof patchOrFn === 'function' ? patchOrFn(state) : patchOrFn;
  if (!next) return state;
  const changed = [];
  for (const [key, value] of Object.entries(next)) {
    if (state[key] !== value) {
      state = { ...state, [key]: value };
      changed.push(key);
    }
  }
  if (changed.length) {
    persist();
    emit(changed);
  }
  return state;
}

/** Shallow-merge into a nested slice: patch('profile', {weight: 80}). */
export function patch(slice, values) {
  const current = state[slice] ?? {};
  const merged = { ...current, ...values };
  return update({ [slice]: merged });
}

export function resetAll() {
  state = defaultState();
  persist();
  emit(['*']);
  return state;
}

export function exportJson() {
  return JSON.stringify({ app: 'fitpulse', schema: SCHEMA, exported: new Date().toISOString(), state }, null, 2);
}

export function importJson(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed.state ?? parsed;
  if (!incoming || typeof incoming !== 'object') throw new Error('bad file');
  state = migrate(incoming);
  persist();
  emit(['*']);
  return state;
}

/** Daily food log helpers ------------------------------------------- */
export const todayKey = () => {
  const d = new Date();
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
};

export function getDay(key = todayKey()) {
  return state.food[key] ?? { meals: {}, water: 0 };
}

export function updateDay(key, updater) {
  const day = getDay(key);
  const next = updater(day);
  const food = { ...state.food, [key]: next };
  return update({ food });
}

export const MEALS = [
  { id: 'breakfast', n: 'Завтрак', en: 'Breakfast', glyph: '🌅' },
  { id: 'lunch', n: 'Обед', en: 'Lunch', glyph: '🍽️' },
  { id: 'snack', n: 'Перекус', en: 'Snack', glyph: '🥜' },
  { id: 'dinner', n: 'Ужин', en: 'Dinner', glyph: '🌙' },
  { id: 'supper', n: 'Поздний ужин', en: 'Supper', glyph: '🫖' },
];

/** Meal with its name resolved for the active language (`n` is always display-ready). */
export const mealName = (id) => {
  const m = MEALS.find((x) => x.id === id);
  if (!m) return { id, n: id, glyph: '🍽️' };
  return getLang() === 'en' ? { ...m, n: m.en || m.n } : m;
};

export function storageUsage() {
  try {
    const bytes = new Blob([JSON.stringify(state)]).size;
    return { bytes, kb: Math.round(bytes / 1024) };
  } catch {
    return { bytes: 0, kb: 0 };
  }
}
