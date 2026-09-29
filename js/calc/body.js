/**
 * Body composition calculators.
 *
 * All functions are pure and take numbers in SI (kg, cm, years).
 * Formulas are documented with their references so results are auditable.
 */

/** Activity multipliers (Palumbo / Compendium of Physical Activities grouping). */
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', k: 1.2, n: 'Минимальная активность', en: 'Sedentary', hint: 'сидячая работа, нет тренировок' },
  { id: 'light', k: 1.375, n: 'Низкая активность', en: 'Light', hint: '1–3 тренировки в неделю' },
  { id: 'moderate', k: 1.55, n: 'Средняя активность', en: 'Moderate', hint: '3–5 тренировок в неделю' },
  { id: 'active', k: 1.725, n: 'Высокая активность', en: 'Active', hint: '6–7 тренировок, физическая работа' },
  { id: 'athlete', k: 1.9, n: 'Очень высокая', en: 'Very active', hint: 'физическая работа + 2 тренировки в день' },
];

/** MET values for the exercise types we log, used for extra burn estimation. */
export const MET = {
  strength: 5.0, // moderate effort
  cardio: 8.0, // steady state
  hiit: 9.8,
  walking: 3.5,
  running: 10.0,
  cycling: 7.5,
  swimming: 8.3,
};

/* ------------------------------------------------------------------ *
 * Basal metabolic rate
 * ------------------------------------------------------------------ */

/** Mifflin-St Jeor (1990) — best general-purpose BMR when body fat is unknown. */
export const bmrMifflin = ({ weight, height, age, sex }) =>
  10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);

/** Harris-Benedict, revised by Roza & Shizgal (1984). */
export const bmrHarris = ({ weight, height, age, sex }) =>
  sex === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;

/** Katch-McArdle (2000) — needs lean body mass, not body weight. */
export const bmrKatch = (lbm) => 370 + 21.6 * lbm;

/** Cunningham (1980) — sports-science variant for high lean mass. */
export const bmrCunningham = (lbm) => 500 + 22 * lbm;

/**
 * Average BMR from the weight-based equations plus a body-fat-based one.
 * Returned value is the mean of the applicable equations, which keeps the
 * error lower than picking a single one.
 */
export function computeBmr(profile) {
  const { weight, height, age, sex, bodyFat } = profile;
  const out = {
    mifflin: bmrMifflin({ weight, height, age, sex }),
    harris: bmrHarris({ weight, height, age, sex }),
    katch: null,
    cunningham: null,
  };
  if (bodyFat != null && bodyFat > 0 && bodyFat < 70) {
    const lbm = leanBodyMass(weight, bodyFat);
    out.katch = bmrKatch(lbm);
    out.cunningham = bmrCunningham(lbm);
  }
  const values = [out.mifflin, out.harris, out.katch, out.cunningham].filter((v) => v != null);
  out.average = values.reduce((a, b) => a + b, 0) / values.length;
  out.min = Math.min(...values);
  out.max = Math.max(...values);
  return out;
}

/* ------------------------------------------------------------------ *
 * Total daily energy expenditure
 * ------------------------------------------------------------------ */
export const activityFactor = (id) =>
  ACTIVITY_LEVELS.find((a) => a.id === id)?.k ?? 1.375;

export function computeTdee(bmr, activityId) {
  const tdee = bmr * activityFactor(activityId);
  return {
    bmr: Math.round(bmr),
    factor: activityFactor(activityId),
    tdee: Math.round(tdee),
    /** coarse range (±10 %) so users do not treat the number as exact */
    low: Math.round(tdee * 0.9),
    high: Math.round(tdee * 1.1),
  };
}

/**
 * Extra calories burned by a single session, standard MET convention:
 *   kcal/min = MET × 3.5 × kg / 200   (1 MET = 3.5 ml O₂/kg/min)
 */
export function sessionBurn({ kg, minutes, met = MET.strength }) {
  return (met * 3.5 * kg * minutes) / 200; // kcal
}

/* ------------------------------------------------------------------ *
 * Body fat
 * ------------------------------------------------------------------ */
export const leanBodyMass = (weight, bodyFatPct) => weight * (1 - bodyFatPct / 100);
export const fatMass = (weight, bodyFatPct) => weight * (bodyFatPct / 100);

/** Siri (1961) two-compartment conversion: density (g/ml) → % fat. */
const siri = (density) => 495 / density - 450;

/**
 * US Navy circumference method — Hodgdon & Beckett (1984), as used by the
 * Department of Defense. Requires **height** plus girths, not a sum of them.
 *   men:   %BF = 495 / (1.0324 − 0.19077·log10(waist − neck)      + 0.15456·log10(height)) − 450
 *   women: %BF = 495 / (1.29579 − 0.35004·log10(waist + hip − neck) + 0.22100·log10(height)) − 450
 * All lengths in cm. ±3–4 percentage points against hydrostatic weighing.
 */
export function bodyFatNavy({ sex, height, neck, waist, hip }) {
  const girth = sex === 'male' ? waist - neck : waist + hip - neck;
  if (!(height > 0) || !(girth > 0)) return null;
  const d =
    sex === 'male'
      ? 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(height)
      : 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(height);
  return clampBF(siri(d));
}

/** Deurenberg (1991): BMI-based body-fat estimate. */
export function bodyFatBmi({ bmi, age, sex }) {
  return clampBF(1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4);
}

/**
 * Durnin & Womersley (1974) 4-site skinfold method.
 * Sites: biceps, triceps, subscapular, suprailiac (mm).
 * Density is age-banded: D = A − B·log10(Σ4), converted with Siri.
 */
const DW_4SITE = {
  male: [
    { max: 17, a: 1.1533, b: 0.0643 },
    { max: 20, a: 1.162, b: 0.063 },
    { max: 30, a: 1.1631, b: 0.0632 },
    { max: 40, a: 1.1422, b: 0.0544 },
    { max: 50, a: 1.162, b: 0.07 },
    { max: Infinity, a: 1.1715, b: 0.0779 },
  ],
  female: [
    { max: 17, a: 1.1369, b: 0.0598 },
    { max: 20, a: 1.1549, b: 0.0678 },
    { max: 30, a: 1.1599, b: 0.0717 },
    { max: 40, a: 1.1423, b: 0.0632 },
    { max: 50, a: 1.1333, b: 0.0612 },
    { max: Infinity, a: 1.1339, b: 0.0645 },
  ],
};

export function bodyFatSkinfold4({ sex, age = 30, biceps, triceps, subscapular, suprailiac }) {
  const s = [biceps, triceps, subscapular, suprailiac].reduce((a, b) => a + (b || 0), 0);
  if (!(s > 0)) return null;
  const band = (DW_4SITE[sex] ?? DW_4SITE.male).find((r) => age < r.max) ?? DW_4SITE.male.at(-1);
  const d = band.a - band.b * Math.log10(s);
  if (!(d > 0)) return null;
  return clampBF(siri(d));
}

/**
 * Jackson & Pollock (1980) 7-site skinfold method.
 * Sites: chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh (mm).
 *   men:   D = 1.11250 − 0.00043499·Σ7 + 0.00000055·Σ7² − 0.00028826·age
 *   women: D = 1.09727 − 0.00046971·Σ7 + 0.00000056·Σ7² − 0.00012828·age
 */
export function bodyFatSkinfold7({
  sex,
  age = 30,
  chest,
  midaxillary,
  triceps,
  subscapular,
  abdomen,
  suprailiac,
  thigh,
}) {
  const s = [chest, midaxillary, triceps, subscapular, abdomen, suprailiac, thigh].reduce(
    (a, b) => a + (b || 0),
    0
  );
  if (!(s > 0)) return null;
  const d =
    sex === 'male'
      ? 1.1125025 - 0.00043499 * s + 0.00000055 * s ** 2 - 0.00028826 * age
      : 1.097266 - 0.00046971 * s + 0.00000056 * s ** 2 - 0.00012828 * age;
  if (!(d > 0)) return null;
  return clampBF(siri(d));
}

/* Bands carry a language-neutral `id`; the display label comes from i18n
   (`calc.bmiCat.*`, `calc.bfCat.*`) so the logic stays free of UI concerns. */

/** Health/normal ranges by sex — the standards used to colour the gauge. */
export const BF_NORMALS = {
  male: [
    { max: 6, id: 'essential', color: 'var(--info)' },
    { max: 14, id: 'athletic', color: 'var(--accent-1)' },
    { max: 17, id: 'fitness', color: 'var(--ok)' },
    { max: 24, id: 'normal', color: 'var(--ok)' },
    { max: 30, id: 'excess', color: 'var(--warn)' },
    { max: 101, id: 'obese', color: 'var(--danger)' },
  ],
  female: [
    { max: 13, id: 'essential', color: 'var(--info)' },
    { max: 21, id: 'athletic', color: 'var(--accent-1)' },
    { max: 25, id: 'fitness', color: 'var(--ok)' },
    { max: 32, id: 'normal', color: 'var(--ok)' },
    { max: 39, id: 'excess', color: 'var(--warn)' },
    { max: 101, id: 'obese', color: 'var(--danger)' },
  ],
};

export const bfCategory = (bf, sex = 'male') =>
  BF_NORMALS[sex].find((r) => bf < r.max) ?? BF_NORMALS[sex].at(-1);

const clampBF = (v) => Math.min(60, Math.max(3, v));

/* ------------------------------------------------------------------ *
 * BMI / ideal weight
 * ------------------------------------------------------------------ */
export const bmi = (weight, heightCm) => weight / (heightCm / 100) ** 2;

export const BMI_CATEGORIES = [
  { max: 16.5, id: 'severeUnder', tone: 'danger' },
  { max: 18.5, id: 'under', tone: 'warn' },
  { max: 25, id: 'normal', tone: 'ok' },
  { max: 30, id: 'over', tone: 'warn' },
  { max: 35, id: 'obese1', tone: 'danger' },
  { max: 40, id: 'obese2', tone: 'danger' },
  { max: 200, id: 'obese3', tone: 'danger' },
];

export const bmiCategory = (v) => BMI_CATEGORIES.find((c) => v < c.max);

/** Devine (1974) and Hamwi (1964) ideal body weight formulas, kg. */
export const idealWeight = ({ height, sex }) => {
  const over = Math.max(0, height - (sex === 'male' ? 152.4 : 147.3));
  return {
    devine: sex === 'male' ? 50 + 2.3 * over : 45.5 + 2.3 * over,
    hamwi: sex === 'male' ? 48 + 2.7 * over : 45.5 + 2.7 * over,
  };
};

/* ------------------------------------------------------------------ *
 * Weight-change based TDEE ("calorie detective")
 * ------------------------------------------------------------------ */

/**
 * Estimate real TDEE from the observed weight trend.
 *
 * Energy balance over the window:  TDEE − intake = slope(kg/day) × energy(kcal/kg)
 * so  TDEE = intake − slope × energy.  Losing weight ⇒ slope < 0 ⇒ TDEE above the
 * logged intake, which is the whole point of the "calorie detective".
 *
 * Pure adipose tissue is ~7700 kcal/kg; gaining mixed tissue (muscle + fat + glycogen
 * + water) is cheaper, so the gaining branch uses a conservative 5000 kcal/kg.
 * Requires ≥ 10 days of logs with a known intake.
 */
export function tdeeFromTrend({ points }) {
  const valid = points
    .filter((p) => p?.weight && p.intake)
    .map((p) => ({ t: p.t, w: p.weight, intake: p.intake }))
    .sort((a, b) => a.t - b.t);
  if (valid.length < 4) return null;
  const t0 = valid[0].t;
  const xs = valid.map((p) => (p.t - t0) / 86400000);
  const ws = valid.map((p) => p.w);
  const n = valid.length;
  const slope = linregSlope(xs, ws); // kg per day
  const avgIntake = valid.reduce((a, p) => a + p.intake, 0) / n;
  const energyPerKg = slope < 0 ? kcalPerKg : 5000;
  return Math.round(avgIntake - slope * energyPerKg);
}

/** Simple least-squares slope (y on x). */
export function linregSlope(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Expected rate of change for a calorie delta: 1 kg fat ≈ 7700 kcal. */
export const kcalPerKg = 7700;
export const predictedChange = (dailyDelta, days) => (dailyDelta * days) / kcalPerKg;

/**
 * Safe weekly change as % of bodyweight.
 * 1 % per week is the widely used upper bound for sustainable fat loss;
 * muscle gain stays under ~0.4 %/week for natural lifters.
 */
export const weeklyRatePct = (goalId) => (goalId?.startsWith('cut') ? 1.0 : goalId?.startsWith('bulk') ? 0.4 : 0.2);

export const weeklyRateKg = (weight, goalId) => (weight * weeklyRatePct(goalId)) / 100;

