/** Aggregated calculation entry point used by views. */
import { computeBmr, computeTdee } from './body.js';
import { computeTargets } from './macros.js';

export * from './body.js';
export * from './macros.js';
export * from './strength.js';

/**
 * One-shot: profile → BMR/TDEE/targets.
 * @param {object} p {weight,height,age,sex,bodyFat,activity,goal,kcalTarget,meals}
 */
export function calcProfile(p) {
  const bmr = computeBmr(p);
  const tdee = computeTdee(bmr.average, p.activity);
  const targets = computeTargets({ ...p, tdee: tdee.tdee });
  return { bmr, tdee, targets };
}
