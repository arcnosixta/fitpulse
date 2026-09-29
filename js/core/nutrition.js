/** Nutrition helpers: day totals, food log mutations, targets. */

import { getState, todayKey, getDay, updateDay, MEALS, mealName } from './store.js';
import { getFood, foodMacros, kcalFromMacros, FOODS, FOOD_CATEGORIES } from '../data/foods.js';
import { computeTargets, dietScore, cycleDay, CARB_DAYS } from '../calc/macros.js';
import { computeBmr, computeTdee } from '../calc/body.js';
import { logsInRange } from './session.js';
import { getLang } from './i18n.js';

export { MEALS, mealName, CARB_DAYS };

export const foodName = (food) => (getLang() === 'en' ? food.en || food.n : food.n);
export const categoryName = (cat) => {
  const c = FOOD_CATEGORIES[cat];
  if (!c) return cat;
  return getLang() === 'en' ? c.en : c.n;
};
export const categoryGlyph = (cat) => FOOD_CATEGORIES[cat]?.glyph ?? '🍽️';

/* ------------------------------ day totals ------------------------------ */

export function dayItems(key = todayKey()) {
  const day = getDay(key);
  const out = [];
  for (const meal of MEALS) {
    const list = (day.meals?.[meal.id] ?? []).map((entry, index) => {
      const food = getFood(entry.id) ?? { id: entry.id, n: entry.id, en: entry.id, k: 0, p: 0, f: 0, c: 0, fib: 0, na: 0, fe: 0, ca: 0, po: 0 };
      return { ...entry, food, meal: meal.id, index, macros: foodMacros(food, entry.g) };
    });
    out.push({ meal, list, kcal: list.reduce((a, e) => a + e.macros.kcal, 0) });
  }
  return out;
}

export function dayTotals(key = todayKey()) {
  const day = getDay(key);
  const totals = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, na: 0, fe: 0, ca: 0, po: 0 };
  for (const { list } of dayItems(key)) {
    for (const entry of list) {
      for (const k of Object.keys(totals)) totals[k] += entry.macros[k] ?? 0;
    }
  }
  for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 10) / 10;
  totals.water = day.water ?? 0;
  totals.count = Object.values(day.meals ?? {}).reduce((a, list) => a + list.length, 0);
  return totals;
}

/* ------------------------------ mutations ------------------------------ */

export function addFood(key, mealId, foodId, grams) {
  const amount = Math.max(1, Math.round(grams));
  updateDay(key, (day) => {
    const meals = { ...(day.meals ?? {}) };
    const list = [...(meals[mealId] ?? [])];
    const same = list.findIndex((e) => e.id === foodId);
    if (same >= 0) list[same] = { ...list[same], g: list[same].g + amount };
    else list.push({ id: foodId, g: amount });
    meals[mealId] = list;
    return { ...day, meals };
  });
  return bumpRecent(foodId);
}

export function removeFood(key, mealId, index) {
  updateDay(key, (day) => {
    const meals = { ...(day.meals ?? {}) };
    const list = [...(meals[mealId] ?? [])];
    list.splice(index, 1);
    meals[mealId] = list;
    return { ...day, meals };
  });
}

export function setGrams(key, mealId, index, grams) {
  updateDay(key, (day) => {
    const meals = { ...(day.meals ?? {}) };
    const list = [...(meals[mealId] ?? [])];
    if (!list[index]) return day;
    list[index] = { ...list[index], g: Math.max(0, Math.round(grams)) };
    meals[mealId] = list;
    return { ...day, meals };
  });
}

export function copyDay(from, to) {
  const src = getDay(from);
  updateDay(to, () => ({ ...src, meals: structuredClone(src.meals ?? {}) }));
}

export const addWater = (key, ml) =>
  updateDay(key, (day) => ({ ...day, water: Math.max(0, (day.water ?? 0) + ml) }));

export const setWater = (key, ml) => updateDay(key, (day) => ({ ...day, water: Math.max(0, ml) }));

/* ------------------------------ recents ------------------------------ */

const RECENT_KEY = 'fitpulse.recentFoods';
const readRecents = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
};
export const recentFoods = (limit = 12) => readRecents().map(getFood).filter(Boolean).slice(0, limit);
export function bumpRecent(foodId) {
  const list = [foodId, ...readRecents().filter((id) => id !== foodId)].slice(0, 24);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage full — recents are optional */
  }
}

/* ------------------------------ search ------------------------------ */

export function searchFoods(query, { category } = {}) {
  const q = query.trim().toLowerCase();
  return FOODS.filter((f) => {
    if (category && f.cat !== category) return false;
    if (!q) return true;
    return `${f.n} ${f.en} ${categoryName(f.cat)}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    const ai = a.n.toLowerCase().startsWith(q) ? 0 : 1;
    const bi = b.n.toLowerCase().startsWith(q) ? 0 : 1;
    return ai - bi || a.n.localeCompare(b.n);
  });
}

/* ------------------------------ targets ------------------------------ */

/** Average weekly training minutes from the last 4 weeks of logs. */
export function weeklyTrainingMinutes() {
  const logs = logsInRange(28);
  if (!logs.length) return 0;
  const total = logs.reduce((a, l) => a + (l.minutes ?? 0), 0);
  return Math.round(total / 4);
}

/** Full target set for the current profile, flattened for the UI. */
export function targets() {
  const p = getState().profile;
  const bmr = computeBmr(p);
  const tdee = computeTdee(bmr.average, p.activity);
  const r = computeTargets({ ...p, tdee: tdee.tdee, trainingMinutesPerWeek: weeklyTrainingMinutes() });
  return {
    ...r,
    bmr: bmr.average,
    bmrRange: { min: bmr.min, max: bmr.max },
    tdeeRange: { low: tdee.low, high: tdee.high },
    protein: r.macros.protein,
    fat: r.macros.fat,
    carbs: r.macros.carbs,
    fiber: r.macros.fiber,
    water: r.waterMl,
  };
}

export { dietScore, cycleDay, kcalFromMacros };

/** Nutrition series for the week chart. */
export function kcalSeries(days = 7) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ x: days - i, y: dayTotals(key).kcal, label: String(d.getDate()) });
  }
  return out;
}

export function streakOfLoggedDays() {
  const food = getState().food ?? {};
  const keys = Object.keys(food).filter((k) => (food[k].meals && Object.values(food[k].meals).some((l) => l.length)) || (food[k].water ?? 0) > 0);
  const set = new Set(keys);
  const cursor = new Date();
  if (!set.has(todayKey())) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (set.has(todayKeyFrom(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

const todayKeyFrom = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
