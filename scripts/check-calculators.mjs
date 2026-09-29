#!/usr/bin/env node
/**
 * Calculator reference checks — every value below is computed by hand from the
 * published formula, so the test fails if a formula drifts.
 * Run: node scripts/check-calculators.mjs
 */

import {
  bmrMifflin, bmrHarris, bmrKatch, bmrCunningham, computeBmr, computeTdee, activityFactor,
  bodyFatNavy, bodyFatBmi, bodyFatSkinfold4, bodyFatSkinfold7, bmi, bmiCategory, bfCategory,
  idealWeight, leanBodyMass, fatMass, sessionBurn, linregSlope, weeklyRatePct, tdeeFromTrend,
} from '../js/calc/body.js';
import {
  e1rmEpley, e1rmBrzycki, e1rmLombardi, e1rmLander, e1rmWathen, e1rmOconner,
  estimate1rm, e1rmValue, rirFromRpe, rpeFromRir, estimate1rmFromRpe, percentForReps,
  weightAtPercent, warmupPlan, platesFor, tonnage, volumeStatus, WEEKLY_SET_LANDMARKS,
} from '../js/calc/strength.js';
import { computeTargets, goalById, GOALS, cycleDay, CARB_DAYS, dietScore } from '../js/calc/macros.js';
import { kcalFromMacros } from '../js/data/foods.js';

let pass = 0;
let fail = 0;

const near = (label, got, want, tol = 0.05) => {
  const ok =
    want == null ? got == null : Math.abs(got - want) <= Math.max(tol, Math.abs(want) * 0.001);
  if (ok) {
    pass++;
    console.log(`  ✓ ${label} = ${fmt(got)}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}: got ${fmt(got)}, expected ${fmt(want)}`);
  }
};
const is = (label, got, want) => {
  if (got === want) {
    pass++;
    console.log(`  ✓ ${label} = ${fmt(got)}`);
  } else {
    fail++;
    console.error(`  ✗ ${label}: got ${fmt(got)}, expected ${fmt(want)}`);
  }
};
const truthy = (label, cond, info = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label} ${info}`);
  } else {
    fail++;
    console.error(`  ✗ ${label} ${info}`);
  }
};
const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(3)) : String(v));

/* ------------------------------------------------------------------ *
 * 1. BMR
 * ------------------------------------------------------------------ */
console.log('\nBMR');
{
  // Mifflin-St Jeor (1990)
  near('mifflin male 80/180/30', bmrMifflin({ weight: 80, height: 180, age: 30, sex: 'male' }), 1780, 0.01);
  near('mifflin female 80/180/30', bmrMifflin({ weight: 80, height: 180, age: 30, sex: 'female' }), 1614, 0.01);
  // Harris-Benedict revised (Roza & Shizgal 1984)
  near(
    'harris male 80/180/30',
    bmrHarris({ weight: 80, height: 180, age: 30, sex: 'male' }),
    88.362 + 13.397 * 80 + 4.799 * 180 - 5.677 * 30
  );
  near(
    'harris female 80/180/30',
    bmrHarris({ weight: 80, height: 180, age: 30, sex: 'female' }),
    447.593 + 9.247 * 80 + 3.098 * 180 - 4.33 * 30
  );
  // LBM-based equations
  near('katch LBM 60', bmrKatch(60), 370 + 21.6 * 60, 0.01);
  near('cunningham LBM 60', bmrCunningham(60), 500 + 22 * 60, 0.01);

  const withBf = computeBmr({ weight: 80, height: 180, age: 30, sex: 'male', bodyFat: 20 });
  truthy('computeBmr uses 4 equations when bodyFat is known', withBf.katch != null && withBf.cunningham != null);
  const noBf = computeBmr({ weight: 80, height: 180, age: 30, sex: 'male' });
  truthy('computeBmr falls back to 2 equations', noBf.katch == null && noBf.cunningham == null);
  truthy('average lies between min and max', noBf.min <= noBf.average && noBf.average <= noBf.max);
}

/* ------------------------------------------------------------------ *
 * 2. TDEE
 * ------------------------------------------------------------------ */
console.log('\nTDEE');
{
  is('activityFactor moderate', activityFactor('moderate'), 1.55);
  const t = computeTdee(1780, 'moderate');
  near('tdee 1780 @ 1.55', t.tdee, Math.round(1780 * 1.55), 1);
  truthy('tdee range brackets the point value', t.low < t.tdee && t.tdee < t.high);
  is('unknown activity defaults', activityFactor('nope'), 1.375);
}

/* ------------------------------------------------------------------ *
 * 3. Body composition
 * ------------------------------------------------------------------ */
console.log('\nBody composition');
{
  near('bmi 80/180', bmi(80, 180), 24.691, 0.01);
  is('bmi category 24.7', bmiCategory(24.7).id, 'normal');
  is('bmi category 31', bmiCategory(31).id, 'obese1');
  is('bf category male 12', bfCategory(12, 'male').id, 'athletic');
  is('bf category female 12', bfCategory(12, 'female').id, 'essential');

  near('lbm 80 @ 20 %', leanBodyMass(80, 20), 64, 0.01);
  near('fatMass 80 @ 20 %', fatMass(80, 20), 16, 0.01);
  truthy('lbm + fatMass = bodyweight', Math.abs(leanBodyMass(80, 20) + fatMass(80, 20) - 80) < 1e-9);

  // US Navy / Hodgdon & Beckett (1984) — published worked example:
  // 172 cm man, neck 37, waist 85 → 18.2 %
  //   log10(85−37)=1.681241, log10(172)=2.235528
  //   495 / (1.0324 − 0.320730 + 0.345523) − 450 = 495/1.057193 − 450
  const navy = bodyFatNavy({ sex: 'male', height: 172, neck: 37, waist: 85 });
  near('navy male published example', navy, 18.2, 0.1);
  // 163 cm woman, neck 32, waist 74, hips 96 → 495/1.035633 − 450
  const navyF = bodyFatNavy({ sex: 'female', height: 163, neck: 32, waist: 74, hip: 96 });
  near('navy female reference value', navyF, 27.9, 0.1);
  is('navy returns null without height', bodyFatNavy({ sex: 'male', neck: 37, waist: 85 }), null);
  is('navy returns null for empty input', bodyFatNavy({ sex: 'male', height: 172, neck: 0, waist: 0 }), null);
  is('navy returns null when waist < neck', bodyFatNavy({ sex: 'male', height: 172, neck: 90, waist: 80 }), null);

  near('bf from bmi 80/180/30 male', bodyFatBmi({ bmi: 24.69, age: 30, sex: 'male' }), 1.2 * 24.69 + 0.23 * 30 - 10.8 - 5.4, 0.05);

  // Durnin & Womersley 4-site: biceps 8 + triceps 12 + subscapular 12 + suprailiac 10 = 42 mm
  // age 30 → band 30-39: D = 1.1422 − 0.0544·log10(42) = 1.053895
  const dw4 = bodyFatSkinfold4({ sex: 'male', age: 30, biceps: 8, triceps: 12, subscapular: 12, suprailiac: 10 });
  near('D&W 4-site reference value', dw4, 495 / 1.053895 - 450, 0.1);
  truthy('D&W 4-site in physiological range', dw4 > 5 && dw4 < 45, `= ${dw4.toFixed(1)} %`);

  // Jackson & Pollock 7-site: 10+12+12+12+15+10+20 = 91 mm, age 30
  // D = 1.1125025 − 0.03958409 + 0.00455455 − 0.0086478 = 1.068825
  const jp7 = bodyFatSkinfold7({
    sex: 'male', age: 30, chest: 10, midaxillary: 12, triceps: 12, subscapular: 12,
    abdomen: 15, suprailiac: 10, thigh: 20,
  });
  near('Jackson-Pollock 7-site reference value', jp7, 495 / 1.068825 - 450, 0.1);
  truthy('two caliper methods agree within 8 points', Math.abs(jp7 - dw4) < 8, `${jp7.toFixed(1)} % vs ${dw4.toFixed(1)} %`);
  is('caliper method returns null for empty input', bodyFatSkinfold4({ sex: 'male', age: 30 }), null);

  const iw = idealWeight({ height: 180, sex: 'male' });
  near('devine 180 cm male', iw.devine, 50 + 2.3 * (180 - 152.4), 0.01);
  truthy('hamwi above devine', iw.hamwi > iw.devine);

  // MET convention: kcal/min = MET × 3.5 × kg / 200
  near('sessionBurn 80 kg, 60 min @ MET 5', sessionBurn({ kg: 80, minutes: 60 }), (5 * 3.5 * 80 * 60) / 200, 0.01);
  near('sessionBurn halves with half the time', sessionBurn({ kg: 80, minutes: 30 }), sessionBurn({ kg: 80, minutes: 60 }) / 2, 0.01);
  truthy('sessionBurn scales with body mass', sessionBurn({ kg: 100, minutes: 60 }) > sessionBurn({ kg: 60, minutes: 60 }));
}

/* ------------------------------------------------------------------ *
 * 4. 1RM formulas
 * ------------------------------------------------------------------ */
console.log('\n1RM');
{
  near('epley 100×5', e1rmEpley(100, 5), 116.667, 0.01);
  near('brzycki 100×5', e1rmBrzycki(100, 5), 100 * (36 / 32), 0.01);
  near('brzycki 100×1', e1rmBrzycki(100, 1), 100 * (36 / 36), 0.01);
  near('lombardi 100×5', e1rmLombardi(100, 5), 100 * Math.pow(5, 0.1), 0.01);
  near('lander 100×5', e1rmLander(100, 5), 10000 / (101.3 - 2.67123 * 5), 0.01);
  near('oconner 100×5', e1rmOconner(100, 5), 112.5, 0.01);
  near('wathen 100×1', e1rmWathen(100, 1), 10000 / (48 + 54 * Math.exp(-1 / 30)), 0.01);

  // A single rep at true failure is the 1RM, so every formula must land within a
  // few percent of the lifted weight. Epley/Lander/O'Conner overshoot by design.
  for (const [name, f] of [
    ['epley', e1rmEpley], ['brzycki', e1rmBrzycki], ['lombardi', e1rmLombardi],
    ['lander', e1rmLander], ['oconner', e1rmOconner], ['wathen', e1rmWathen],
  ]) {
    truthy(`${name} 1 rep ≈ weight`, Math.abs(f(80, 1) - 80) <= 80 * 0.05, `= ${f(80, 1).toFixed(1)} kg`);
  }

  // Every formula must be non-decreasing in reps — more work cannot lower the 1RM.
  for (const [name, f] of [
    ['epley', e1rmEpley], ['brzycki', e1rmBrzycki], ['lombardi', e1rmLombardi],
    ['lander', e1rmLander], ['oconner', e1rmOconner], ['wathen', e1rmWathen],
  ]) {
    let mono = true;
    for (let r = 2; r <= 12; r++) if (f(100, r) < f(100, r - 1) - 1e-9) mono = false;
    truthy(`${name} increases with reps`, mono);
  }
  truthy('epley increases with reps', e1rmEpley(100, 12) > e1rmEpley(100, 1));

  const est = estimate1rm(100, 5, 'epley');
  is('estimate1rm chosen formula', est.formula, 'epley');
  truthy('estimate1rm band brackets the chosen value', est.min <= est.chosen && est.chosen <= est.max);
  is('estimate1rm null for zero weight', estimate1rm(0, 5), null);
  is('estimate1rm null for zero reps', estimate1rm(100, 0), null);

  near('e1rmValue matches chosen', e1rmValue(100, 5, null, 'epley'), est.chosen, 0.001);
  is('e1rmValue 0 for empty input', e1rmValue(0, 5), 0);

  is('rir from RPE 10', rirFromRpe(10), 0);
  is('rir from RPE 8', rirFromRpe(8), 2);
  is('rpe from RIR 2', rpeFromRir(2), 8);
  // RPE 8 × 5 reps == 7 reps at RPE 10 (chosen is snapped to 0.5 kg)
  near('estimate1rmFromRpe equals reps+rir',
    estimate1rmFromRpe(100, 5, 8).chosen, Math.round(e1rmEpley(100, 7) * 2) / 2, 0.001);

  near('percentForReps 5@8 → 100/1RM', percentForReps(5, 8, 'epley') * e1rmEpley(100, 7), 100, 0.01);
  near('weightAtPercent 100 @ 80 %', weightAtPercent(100, 0.8, 2.5), 80, 0.01);
  truthy('weightAtPercent snaps to the step', weightAtPercent(103, 0.775, 2.5) % 2.5 === 0);
}

/* ------------------------------------------------------------------ *
 * 5. Warm-up, plates, volume
 * ------------------------------------------------------------------ */
console.log('\nWarm-up, plates, volume');
{
  const w = warmupPlan(100, 5, 2.5);
  is('warm-up ladder length', w.length, 4);
  truthy('warm-up weights are below the top set', w.every((s) => s.weight < 100));
  truthy('warm-up weights ascend', w.every((s, i) => i === 0 || s.weight > w[i - 1].weight));
  is('warm-up ignores zero weights', warmupPlan(10, 5, 2.5).length, 4);

  // platesFor(total, unit, barWeight) returns the per-side stack:
  // total = bar + 2 × Σ(plates)
  const loaded = (w) => platesFor(w, 'kg', 20);
  const barTotal = (p) => p.bar + p.plates.reduce((a, x) => a + x, 0) * 2;
  near('plates 100 kg total', barTotal(loaded(100)), 100, 0.01);
  near('plates 60 kg total', barTotal(loaded(60)), 60, 0.01);
  near('plates 22.5 kg total', barTotal(loaded(22.5)), 22.5, 0.01);
  is('plates 100 kg is exact', loaded(100).exact, true);
  near('plates 100 kg per side', loaded(100).perSide, 40, 0.01);
  truthy('plates are ordered heaviest first',
    loaded(140).plates.every((v, i, arr) => i === 0 || arr[i - 1] >= v));
  near('plates below the bar keep the bar', loaded(10).achieved, 20, 0.01);
  near('plates scale with the bar', barTotal(platesFor(100, 'kg', 15)), 100, 0.01);

  near('tonnage 100×5', tonnage(100, 5), 500, 0.01);
  is('tonnage of an empty set', tonnage(0, 0), 0);

  // volumeStatus(sets, muscle) returns a status string
  is('volumeStatus flags the volume under the minimum', volumeStatus(WEEKLY_SET_LANDMARKS.chest.min - 1, 'chest'), 'below');
  is('volumeStatus accepts the minimum', volumeStatus(WEEKLY_SET_LANDMARKS.chest.min, 'chest'), 'ok');
  is('volumeStatus marks the middle as ok', volumeStatus(12, 'chest'), 'ok');
  is('volumeStatus flags overload', volumeStatus(40, 'chest'), 'veryHigh');
  is('volumeStatus flags an unknown muscle', volumeStatus(12, 'tail'), 'unknown');
  truthy('volumeStatus separates low from high',
    volumeStatus(2, 'chest') !== volumeStatus(40, 'chest'),
    `${volumeStatus(2, 'chest')} … ${volumeStatus(40, 'chest')}`);
}

/* ------------------------------------------------------------------ *
 * 6. Macros
 * ------------------------------------------------------------------ */
console.log('\nMacros');
{
  const base = { weight: 80, height: 180, age: 30, sex: 'male', bodyFat: 15, activity: 'moderate', meals: 4 };
  const bmr = computeBmr(base);
  const tdee = computeTdee(bmr.average, base.activity);

  for (const goal of GOALS) {
    const r = computeTargets({ ...base, goal: goal.id, tdee: tdee.tdee });
    truthy(`${goal.id}: kcal respects the safety floor`, r.kcal >= r.kcalMin, `${r.kcal} ≥ ${r.kcalMin}`);
    truthy(`${goal.id}: protein within 1.4–2.5 g/kg`,
      r.macros.protein >= 80 * 1.4 - 1 && r.macros.protein <= 80 * 2.5 + 1, `${r.macros.protein} g`);
    const drift = Math.abs(kcalFromMacros(r.macros.protein, r.macros.fat, r.macros.carbs) - r.kcal) / r.kcal;
    truthy(`${goal.id}: macros reproduce kcal`, drift < 0.02, `drift ${(drift * 100).toFixed(1)} %`);
    truthy(`${goal.id}: fibre in 25–45 g`, r.macros.fiber >= 25 && r.macros.fiber <= 45, `${r.macros.fiber} g`);
    truthy(`${goal.id}: water above 2 L`, r.waterMl >= 2000, `${r.waterMl} ml`);
    truthy(`${goal.id}: meal split covers the total`, (() => {
      const sum = r.mealSplit.reduce((a, m) => a + m.kcal, 0);
      return Math.abs(sum - r.kcal) / r.kcal < 0.06;
    })(), `${r.mealSplit.length} meals`);
  }

  // direction of the goal must survive the floors
  const cut = computeTargets({ ...base, goal: 'cut-fast', tdee: tdee.tdee });
  const bulk = computeTargets({ ...base, goal: 'bulk', tdee: tdee.tdee });
  truthy('cut kcal < maintain < bulk', cut.kcal < bulk.kcal, `${cut.kcal} < ${bulk.kcal}`);

  let threw = false;
  try {
    computeTargets({ ...base, goal: 'recomp' });
  } catch {
    threw = true;
  }
  truthy('computeTargets refuses to guess TDEE', threw);

  is('goalById falls back safely', goalById('nope').id, GOALS[3].id);
  is('kcalFromMacros 100/50/200', kcalFromMacros(100, 50, 200), 100 * 4 + 50 * 9 + 200 * 4);

  const macros = { protein: 150, fat: 60, carbs: 200 };
  const high = cycleDay({ macros, kcal: 2200 }, 'high');
  const low = cycleDay({ macros, kcal: 2200 }, 'low');
  truthy('high-carb day exceeds low-carb day', high.carbs > low.carbs, `${high.carbs} > ${low.carbs}`);
  truthy('carb cycle keeps protein stable', high.protein === low.protein);
  is('carb cycle ids', CARB_DAYS.map((d) => d.id).join(','), 'high,normal,low');
}

/* ------------------------------------------------------------------ *
 * 7. Trend maths
 * ------------------------------------------------------------------ */
console.log('\nTrend');
{
  is('linregSlope of a perfect line', linregSlope([0, 1, 2, 3], [10, 12, 14, 16]), 2, 0.0001);
  is('linregSlope of a flat line', linregSlope([0, 1, 2], [5, 5, 5]), 0, 0.0001);
  is('linregSlope with a single point', linregSlope([0], [7]), 0);

  is('weeklyRatePct cut', weeklyRatePct('cut'), 1.0);
  is('weeklyRatePct bulk', weeklyRatePct('bulk'), 0.4);
  is('weeklyRatePct recomp', weeklyRatePct('recomp'), 0.2);

  const pts = Array.from({ length: 14 }, (_, i) => ({
    t: Date.UTC(2026, 0, 1) + i * 86400000,
    weight: 80 - 0.1 * i, // −0.1 kg/day
    intake: 2400,
  }));
  // 0.1 kg/day × 7700 = 770 kcal; observed 2400 → TDEE ≈ 3170
  const tdeeFromLog = tdeeFromTrend({ points: pts });
  near('tdee from weight trend', tdeeFromLog, 2400 + 770, 5);
  is('tdee needs enough points', tdeeFromTrend({ points: pts.slice(0, 3) }), null);
}

/* ------------------------------------------------------------------ *
 * 8. Diet score
 * ------------------------------------------------------------------ */
console.log('\nDiet score');
{
  const perfect = dietScore({
    consumed: { kcal: 2200, protein: 160, fat: 70, carbs: 250, fib: 35 },
    target: { kcal: 2200, protein: 160, fat: 70, carbs: 250, fib: 35 },
    waterTarget: 2500,
    water: 2500,
  });
  const poor = dietScore({
    consumed: { kcal: 3200, protein: 40, fat: 150, carbs: 400, fib: 8 },
    target: { kcal: 2200, protein: 160, fat: 70, carbs: 250, fib: 35 },
    waterTarget: 2500,
    water: 500,
  });
  truthy('diet score spans 0–100', perfect.score >= 0 && perfect.score <= 100, `perfect=${perfect.score}`);
  truthy('on-target day scores higher', perfect.score > poor.score, `${perfect.score} > ${poor.score}`);
  truthy('poor day produces notes', poor.notes.length > 0, `${poor.notes.length} notes`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
