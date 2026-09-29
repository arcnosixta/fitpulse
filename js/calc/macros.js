/**
 * Calorie & macronutrient targets.
 *
 * Guidance follows current sports-nutrition consensus:
 *  - protein 1.6–2.2 g/kg LBM (Morton et al. 2018: plateau ≈ 1.6 g/kg,
 *    higher with fat gain / energy restriction);
 *  - fat 20–35 % of energy, not below ~0.6 g/kg bodyweight;
 *  - carbs fill the remainder, floor ≈ 3 g/kg bodyweight (glycogen);
 *  - fibre 14 g / 1000 kcal (≥ 25 g);
 *  - water ≈ 35 ml/kg + 500 ml per training hour.
 */

import { leanBodyMass, kcalPerKg } from './body.js';

export const GOALS = [
  {
    id: 'cut-fast',
    n: 'Быстрая сушка',
    en: 'Aggressive cut',
    delta: -0.22,
    rate: 0.01, // kg per week per kg of bodyweight
    proteinPerLbm: 2.2,
    fatPct: 0.25,
  },
  {
    id: 'cut',
    n: 'Похудение',
    en: 'Cut',
    delta: -0.15,
    rate: 0.0075,
    proteinPerLbm: 2.1,
    fatPct: 0.25,
  },
  {
    id: 'recomp',
    n: 'Рекомпозиция',
    en: 'Recomposition',
    delta: -0.05,
    rate: 0.0025,
    proteinPerLbm: 2.0,
    fatPct: 0.25,
  },
  {
    id: 'maintain',
    n: 'Поддержание',
    en: 'Maintain',
    delta: 0,
    rate: 0,
    proteinPerLbm: 1.7,
    fatPct: 0.27,
  },
  {
    id: 'bulk',
    n: 'Набор массы',
    en: 'Lean bulk',
    delta: 0.1,
    rate: 0.005,
    proteinPerLbm: 1.9,
    fatPct: 0.25,
  },
  {
    id: 'bulk-strong',
    n: 'Сила и масса',
    en: 'Strength & mass',
    delta: 0.08,
    rate: 0.004,
    proteinPerLbm: 2.0,
    fatPct: 0.24,
  },
];

export const goalById = (id) => GOALS.find((g) => g.id === id) ?? GOALS[3];

/**
 * Build the full target set for a profile.
 * @param {object} p profile {weight,height,age,sex,bodyFat,activity,goal,kcalTarget?}
 */
export function computeTargets(p) {
  const goal = goalById(p.goal);
  const lbm = p.bodyFat != null ? leanBodyMass(p.weight, p.bodyFat) : p.weight * 0.85;

  // Calories -------------------------------------------------------------
  let tdee = p.tdee; // pre-computed TDEE (see calcTargetsFromBmr)
  if (tdee == null) throw new Error('computeTargets requires tdee');
  let kcal = Math.round(tdee * (1 + goal.delta));
  if (p.kcalTarget) kcal = Math.round(p.kcalTarget);

  // Floors: never prescribe below BMR-adjusted safe minimums
  const minKcal = Math.round(Math.max(tdee * 0.8, p.weight * (p.sex === 'male' ? 15 : 12)));
  kcal = Math.max(kcal, minKcal);

  // Macros ---------------------------------------------------------------
  let protein = Math.round(clamp(goal.proteinPerLbm * lbm, p.weight * 1.4, p.weight * 2.5));

  let fat = Math.round((kcal * goal.fatPct) / 9);
  fat = Math.round(Math.max(fat, p.weight * 0.7, p.weight * (p.sex === 'male' ? 0.6 : 0.5)));
  fat = Math.min(fat, Math.round((kcal * 0.35) / 9));

  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  // Carb floor (glycogen + neural function) — take from fat if needed
  const carbFloor = Math.round(p.weight * 3);
  if (carbs < carbFloor && goal.delta >= 0) {
    const need = carbFloor - carbs;
    const maxTake = fat - Math.round(p.weight * 0.7);
    const take = Math.max(0, Math.min(need, Math.max(0, maxTake)));
    carbs += take;
    fat -= take;
  }

  const fiber = Math.round(clamp((kcal / 1000) * 14, 25, 45));

  const waterMl = Math.round(
    35 * p.weight +
      (p.trainingMinutesPerWeek ? (p.trainingMinutesPerWeek / 7) * 12 : 0) +
      (p.heat ? 500 : 0)
  );

  const minerals = {
    sodium: 2300, // mg — ACSM upper bound for daily intake
    potassium: sexK(p.sex), // mg
    calcium: 1000,
  };

  const mealSplit = splitMeals({ kcal, protein, fat, carbs }, p.meals ?? 4);

  return {
    goal,
    kcal,
    kcalMin: minKcal,
    tdee: Math.round(tdee),
    macros: { protein, fat, carbs, fiber },
    kcalFromMacros: protein * 4 + fat * 9 + carbs * 4,
    waterMl,
    minerals,
    mealSplit,
    lbm: Math.round(lbm),
    projectedWeeklyChange: Math.round(((kcal - tdee) * 7) / kcalPerKg * 100) / 100,
  };
}

const sexK = (sex) => (sex === 'male' ? 3500 : 2600);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Distribute macros across N meals, with a carbohydrate bias near training. */
function splitMeals(totals, meals) {
  const n = Math.max(2, Math.min(8, meals));
  const perProtein = Math.round(totals.protein / n);
  const perFat = Math.round(totals.fat / n);
  const perCarbs = Math.round(totals.carbs / n);
  return Array.from({ length: n }, () => ({
    protein: perProtein,
    fat: perFat,
    carbs: perCarbs,
    kcal: perProtein * 4 + perFat * 9 + perCarbs * 4,
  }));
}

/* ------------------------------------------------------------------ *
 * Carb cycling
 * ------------------------------------------------------------------ */
export const CARB_DAYS = [
  { id: 'high', n: 'Высокие углеводы', en: 'High carb', mult: 1.15, note: 'день нагруженной группы или кардио' },
  { id: 'normal', n: 'Норма', en: 'Normal', mult: 1.0, note: 'умеренная нагрузка' },
  { id: 'low', n: 'Низкие углеводы', en: 'Low carb', mult: 0.8, note: 'день отдыха' },
];

/** Shift calories between carbs and fat while keeping kcal and protein fixed. */
export function cycleDay({ macros, kcal }, dayId) {
  const day = CARB_DAYS.find((d) => d.id === dayId) ?? CARB_DAYS[1];
  const protein = macros.protein;
  const fat = macros.fat;
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4 * day.mult);
  return { id: day.id, n: day.n, carbs, protein, fat, kcal: protein * 4 + fat * 9 + carbs * 4 };
}

/* ------------------------------------------------------------------ *
 * Diet quality helpers
 * ------------------------------------------------------------------ */

/** Score 0–100: protein density, fibre, sodium, water, calorie alignment. */
export function dietScore({ consumed, target, waterTarget, water }) {
  const notes = [];
  let score = 100;
  const ratio = (a, b) => (b > 0 ? a / b : 0);

  const proteinPct = ratio(consumed.protein, target.protein);
  const fiberPct = ratio(consumed.fiber, target.fiber);
  const kcalPct = ratio(consumed.kcal, target.kcal);
  const waterPct = ratio(water, waterTarget);

  if (proteinPct < 0.8) {
    score -= 22;
    notes.push({ id: 'protein', tone: 'warn', text: 'Белок ниже 80 % нормы — добавьте источник (творог, курица, яйца, изолят)' });
  }
  if (fiberPct < 0.7) {
    score -= 14;
    notes.push({ id: 'fiber', tone: 'warn', text: 'Мало клетчатки — овощи, бобовые, цельнозерновые' });
  }
  if (kcalPct < 0.65 || kcalPct > 1.25) {
    score -= 12;
    notes.push({ id: 'kcal', tone: 'warn', text: 'Калории заметно вне коридора — проверьте дневник' });
  }
  if (waterPct < 0.7) {
    score -= 12;
    notes.push({ id: 'water', tone: 'info', text: 'Мало воды — цель ' + waterTarget + ' мл' });
  }
  if (consumed.sodium > 3500) {
    score -= 10;
    notes.push({ id: 'sodium', tone: 'warn', text: 'Натрий выше 3500 мг — сократите солёное и готовую еду' });
  }
  if (consumed.fiber >= target.fiber && proteinPct >= 0.9) {
    notes.push({ id: 'ok', tone: 'ok', text: 'Белок и клетчатка закрыты — раскладка собрана верно' });
  }
  return { score: clamp(Math.round(score), 0, 100), notes };
}
