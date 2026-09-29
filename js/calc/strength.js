/**
 * Strength calculators: 1RM estimation, RPE/RIR, warm-ups, plates, volume.
 */

/* ------------------------------------------------------------------ *
 * 1RM estimates
 * ------------------------------------------------------------------ */
export const e1rmEpley = (w, r) => w * (1 + r / 30);
/** Brzycki: undefined at 37+ reps — fall back to the lifted weight there. */
export const e1rmBrzycki = (w, r) => (r >= 37 ? w : (w * 36) / (37 - r));
export const e1rmLombardi = (w, r) => w * Math.pow(r, 0.1);
export const e1rmWathen = (w, r) => (100 * w) / (48 + 54 * Math.exp(-r / 30));
export const e1rmOconner = (w, r) => w * (1 + r / 40);
export const e1rmLander = (w, r) => (100 * w) / (101.3 - 2.67123 * r);

/** All estimates + their spread — used to show a realistic band, not a fake exact number. */
export function estimate1rm(weight, reps, formula = 'epley') {
  if (!(weight > 0) || !(reps > 0)) return null;
  const map = {
    epley: e1rmEpley,
    brzycki: e1rmBrzycki,
    lombardi: e1rmLombardi,
    wathen: e1rmWathen,
    oconner: e1rmOconner,
    lander: e1rmLander,
  };
  const values = Object.values(map).map((f) => f(weight, reps));
  const chosen = (map[formula] ?? map.epley)(weight, reps);
  return {
    chosen: Math.round(chosen * 2) / 2,
    formula,
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values)),
    reps,
    weight,
  };
}

/**
 * Scalar 1RM in kilograms for the given weight/reps (and optional RPE).
 * `estimate1rm` returns the full spread for the UI; this is the number used
 * for comparisons, PR detection and stored values.
 */
export function e1rmValue(weight, reps, rpe = null, formula = 'epley') {
  const r = reps + (rpe == null ? 0 : rirFromRpe(rpe));
  if (!(weight > 0) || !(r > 0)) return 0;
  const est = estimate1rm(weight, r, formula);
  return est ? est.chosen : 0;
}

/** Best (highest) estimate observed historically for an exercise. */
export const bestEstimate = (estimates) =>
  estimates?.length ? Math.max(...estimates.map((e) => e?.chosen ?? 0)) : 0;

/* ------------------------------------------------------------------ *
 * RPE / RIR
 * ------------------------------------------------------------------ */
/** reps in reserve per RPE (10 = failure, 8 = 2 reps left). */
export const rirFromRpe = (rpe) => Math.max(0, Math.round((10 - rpe) * 2) / 2);
export const rpeFromRir = (rir) => Math.max(6, 10 - rir);

/**
 * Convert a set performed at `reps` @ `rpe` into the reps it would equal at RPE 10,
 * then apply the chosen 1RM formula. Keeps the RPE table internally consistent.
 */
export function estimate1rmFromRpe(weight, reps, rpe, formula = 'epley') {
  const repsToFailure = reps + rirFromRpe(rpe);
  return estimate1rm(weight, repsToFailure, formula);
}

/** % of 1RM for a planned set, given reps and target RPE. */
export function percentForReps(reps, rpe, formula = 'epley') {
  const repsToFailure = reps + rirFromRpe(rpe);
  const map = { epley: e1rmEpley, brzycki: e1rmBrzycki, lombardi: e1rmLombardi, oconner: e1rmOconner, lander: e1rmLander };
  const fn = map[formula] ?? e1rmEpley;
  // percent such that fn(w, repsToFailure) = w  =>  w / e1rm
  const e1 = fn(100, repsToFailure);
  return 100 / e1;
}

/** Working weight for a target percentage, rounded to the nearest plate step. */
export const weightAtPercent = (e1rm, pct, step = 2.5) =>
  Math.round((e1rm * pct) / step) * step;

/* ------------------------------------------------------------------ *
 * Warm-up scheme
 * ------------------------------------------------------------------ */
/**
 * Percent-based warm-up ladder before a heavy working set.
 * @returns [{pct, reps, note}]
 */
export function warmupPlan(topWeight, topReps, step = 2.5) {
  const ladder = [
    { pct: 0.4, reps: 8, note: 'пустой гриф / лёгкий вес' },
    { pct: 0.55, reps: 5 },
    { pct: 0.7, reps: 3 },
    { pct: 0.85, reps: 2 },
  ];
  const plan = ladder
    .map((l) => ({ ...l, weight: weightAtPercent(topWeight, l.pct, step) }))
    .filter((l) => l.weight > 0 && l.weight < topWeight);
  return plan;
}

/* ------------------------------------------------------------------ *
 * Plate calculator
 * ------------------------------------------------------------------ */
export const BAR_WEIGHTS = [20, 15, 10, 7];
export const PLATE_SETS = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/**
 * Greedy plate loading.
 * @returns {{perSide, plates, achieved, exact, bar}}
 */
export function platesFor(totalWeight, unit = 'kg', barWeight = 20) {
  const plates = PLATE_SETS[unit] ?? PLATE_SETS.kg;
  const step = unit === 'kg' ? 0.25 : 0.5;
  const rounded = Math.round(totalWeight / step) * step;
  let perSide = (rounded - barWeight) / 2;
  if (perSide < 0) return { perSide: 0, plates: [], achieved: barWeight, exact: false, bar: barWeight };
  const used = [];
  let remaining = Math.round(perSide * 1000) / 1000;
  for (const p of plates) {
    while (remaining >= p - 1e-6) {
      used.push(p);
      remaining = Math.round((remaining - p) * 1000) / 1000;
    }
  }
  const achieved = barWeight + used.reduce((a, b) => a + b, 0) * 2;
  return {
    perSide: used.reduce((a, b) => a + b, 0),
    plates: used,
    achieved: Math.round(achieved * 100) / 100,
    exact: Math.abs(achieved - rounded) < 1e-6,
    bar: barWeight,
  };
}

/* ------------------------------------------------------------------ *
 * Volume & programming landmarks
 * ------------------------------------------------------------------ */
/** Weekly sets per muscle — Schoenfeld et al. (2017) meta-analysis ranges. */
export const WEEKLY_SET_LANDMARKS = {
  chest: { min: 8, max: 20, name: 'Грудь' },
  lats: { min: 8, max: 22, name: 'Широчайшие' },
  back: { min: 8, max: 22, name: 'Спина' },
  traps: { min: 0, max: 16, name: 'Трапеции' },
  delts: { min: 8, max: 22, name: 'Дельты' },
  rearDelts: { min: 4, max: 16, name: 'Задние дельты' },
  biceps: { min: 6, max: 20, name: 'Бицепс' },
  triceps: { min: 6, max: 20, name: 'Трицепс' },
  quads: { min: 6, max: 20, name: 'Квадрицепсы' },
  hamstrings: { min: 6, max: 16, name: 'Задняя поверхность' },
  glutes: { min: 6, max: 16, name: 'Ягодицы' },
  calves: { min: 6, max: 16, name: 'Икры' },
  abs: { min: 6, max: 16, name: 'Пресс' },
  lowerBack: { min: 4, max: 12, name: 'Поясница' },
  forearms: { min: 0, max: 12, name: 'Предплечья' },
  obliques: { min: 0, max: 12, name: 'Косые' },
  adductors: { min: 0, max: 12, name: 'Приводящие' },
  neck: { min: 0, max: 8, name: 'Шея' },
};

export const volumeStatus = (sets, muscle) => {
  const l = WEEKLY_SET_LANDMARKS[muscle];
  if (!l) return 'unknown';
  if (sets < l.min * 0.6) return 'low';
  if (sets < l.min) return 'below';
  if (sets <= l.max) return 'ok';
  if (sets <= l.max * 1.25) return 'high';
  return 'veryHigh';
};

/** tonnage = Σ weight × reps for a set */
export const tonnage = (weight, reps) => weight * reps;

/** Progressive overload suggestion: +2–5 % on the working weight. */
export const nextLoad = (weight, unit = 'kg', jump = 0.025) => {
  const step = unit === 'kg' ? 2.5 : 5;
  return Math.round((weight * (1 + jump)) / step) * step;
};

/** Deload recommendation: after N weeks of hard training. */
export const deloadPlan = (weeksHard, weeks = 4) =>
  weeksHard >= weeks ? { week: weeks, load: 0.6, sets: 0.6, note: 'Снизьте вес и подходы на 40 %' } : null;

/** RIR → suggested load cut when the target is missed. */
export const autoRegulate = (targetRpe, actualRpe) => {
  if (actualRpe > targetRpe + 0.5) return -0.05;
  if (actualRpe < targetRpe - 1.5) return 0.05;
  return 0;
};

/** Macro cycling for a training block (upper-body day = more carbs). */
export const dayType = (muscles) => {
  const set = new Set(muscles);
  const lower = ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'];
  const upper = ['chest', 'lats', 'back', 'delts', 'biceps', 'triceps', 'traps', 'rearDelts', 'forearms'];
  const low = lower.filter((m) => set.has(m)).length;
  const up = upper.filter((m) => set.has(m)).length;
  if (low >= 2 && low >= up) return 'lower';
  if (up >= 3) return 'upper';
  return 'full';
};

/** MET-based session burn from the logged types (kcal). */
export function estimateSessionKcal({ minutes, met, weight }) {
  return Math.round(((met * 3.5 * weight * minutes) / 200) * 10) / 10;
}
