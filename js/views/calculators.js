/** Calculators: BMR/TDEE, macros, 1RM, plates, BMI, body fat. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState, update } from '../core/store.js';
import { num, currentUnits, toDisplayWeight, fromDisplayWeight, toDisplayLength, fromDisplayLength, round } from '../core/format.js';
import { navigate, refresh } from '../core/router.js';
import { enterView } from '../core/anim.js';
import { section, stat, plateStrip } from '../ui/bits.js';
import { donut } from '../ui/charts.js';
import { targets, weeklyTrainingMinutes } from '../core/nutrition.js';
import { GOALS } from '../calc/macros.js';
import {
  ACTIVITY_LEVELS, computeBmr, computeTdee, bodyFatNavy, bodyFatSkinfold4, bodyFatSkinfold7,
  bmi, bmiCategory, bfCategory, idealWeight, leanBodyMass, fatMass,
} from '../calc/body.js';
import {
  e1rmValue, e1rmEpley, e1rmBrzycki, e1rmLander, e1rmLombardi, e1rmWathen, e1rmOconner,
  weightAtPercent, warmupPlan, platesFor, rirFromRpe,
} from '../calc/strength.js';

const TOOLS = [
  { id: 'bmr', icon: 'flame', key: 'calc.bmr' },
  { id: 'macro', icon: 'food', key: 'calc.macros' },
  { id: 'one', icon: 'scale', key: 'calc.onerm' },
  { id: 'plates', icon: 'dumbbell', key: 'calc.plates' },
  { id: 'bmi', icon: 'target', key: 'calc.bmi' },
  { id: 'bf', icon: 'heart', key: 'calc.bodyFat' },
];

let tool = 'bmr';
const draft = {
  // profile-ish, cm
  weight: 80, height: 180, age: 30,
  // Navy girths, cm
  neck: 38, waist: 85, hip: 100,
  // skinfolds, mm
  chest: 10, midaxillary: 12, triceps: 12, subscapular: 12, suprailiac: 10,
  abdomen: 15, thigh: 20, biceps: 8,
  liftWeight: 60, liftReps: 5, platesWeight: 60, barWeight: 20, bfMethod: 'navy',
};

const isMass = (key) => key === 'weight' || key === 'liftWeight' || key === 'platesWeight';
/** Body lengths are stored in cm and converted for display, like the profile fields. */
const isLength = (key) => key === 'height' || key === 'neck' || key === 'waist' || key === 'hip';

/* ------------------------------ inputs ------------------------------ */
function numField(label, key, { step = 1, min = 0, max = 400, suffix = '' } = {}) {
  const unitLabel = suffix || (isMass(key) ? currentUnits().kg : isLength(key) ? currentUnits().cm : '');
  const display = isMass(key) ? toDisplayWeight(draft[key]) : isLength(key) ? toDisplayLength(draft[key]) : draft[key];
  const toStored = (v) => (isMass(key) ? fromDisplayWeight(v) : isLength(key) ? fromDisplayLength(v) : v);
  const stepper = (delta) => {
    draft[key] = Math.max(min, Math.min(max, round(draft[key] + delta, step)));
    refresh();
  };
  return h(
    'label.field',
    h('span.field__label', label),
    h(
      'div.input-group.input-group--step',
      h('button.step-btn', { type: 'button', 'aria-label': '-', onclick: () => stepper(-step) }, '−'),
      h('input.input.input--num', {
        type: 'number',
        inputmode: 'decimal',
        step: String(step),
        min: String(min),
        max: String(max),
        value: String(Math.round(display * 10) / 10),
        onchange: (e) => {
          const v = Number(e.target.value);
          if (Number.isNaN(v)) return;
          draft[key] = toStored(v);
          refresh();
        },
      }),
      h('button.step-btn', { type: 'button', 'aria-label': '+', onclick: () => stepper(step) }, '+'),
      h('span.input-group__suffix', unitLabel)
    )
  );
}

const field = (label, key, opts) => numField(label, key, opts);

/* ------------------------------ BMR ------------------------------ */
function bmrTool() {
  const profile = { ...getState().profile, weight: draft.weight, height: draft.height, age: draft.age };
  const bmr = computeBmr(profile);
  const tdee = computeTdee(bmr.average, profile.activity);
  const profile2 = { ...profile, tdee: tdee.tdee, trainingMinutesPerWeek: weeklyTrainingMinutes() };
  const macroTargets = targets();
  const activity = ACTIVITY_LEVELS.find((a) => a.id === profile.activity) ?? ACTIVITY_LEVELS[2];

  return h(
    'div.stack',
    h('p.muted', { style: { fontSize: 'var(--fs-sm)' } }, t('calc.sub')),
    h(
      'div.card.card--pad-lg',
      h(
        'div.result-hero',
        h('div.result-hero__num', num(Math.round(bmr.average))),
        h('p.result-hero__cap', t('calc.bmr'))
      ),
      h(
        'div.grid.grid--3.mt-4',
        stat({ label: 'Mifflin', value: num(Math.round(bmr.mifflin)) }),
        stat({ label: 'Harris', value: num(Math.round(bmr.harris)) }),
        stat({ label: 'Katch', value: bmr.katch ? num(Math.round(bmr.katch)) : '—' })
      ),
      bmr.cunningham
        ? h('div.grid.grid--3.mt-3', stat({ label: 'Cunningham', value: num(Math.round(bmr.cunningham)) }))
        : null,
      h('p.formula-note.mt-3', t('calc.noteBmr'))
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.tdee'),
        { hint: `${num(tdee.low)}–${num(tdee.high)}` },
        h(
          'div.result-hero',
          h('div.result-hero__num', num(tdee.tdee)),
          h('p.result-hero__cap', `${t('common.kcal')} · ×${activity?.k ?? 1.375}`)
        ),
        h('p.formula-note.mt-3', t('calc.noteTdee')),
        h(
          'div.chips.mt-3',
          ...ACTIVITY_LEVELS.map((a) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(a.id === profile.activity),
                onclick: () => {
                  update({ profile: { ...getState().profile, activity: a.id } });
                  refresh();
                },
              },
              a.n
            )
          )
        )
      )
    ),
    field(t('calc.weightInput'), 'weight', { step: 0.5 }),
    field(t('calc.height'), 'height', { step: 1 }),
    field(t('calc.age'), 'age', { step: 1, max: 100 }),
    h(
      'div.row',
      h('span.muted', t('calc.noteTrend')),
      h('span.spacer'),
      h(
        'button.btn.btn--soft.btn--sm',
        { onclick: () => navigate('progress') },
        t('calc.trend')
      )
    )
  );
}

/* ------------------------------ macros ------------------------------ */
function macroTool() {
  const tgt = targets();
  const goal = GOALS.find((g) => g.id === getState().profile.goal) ?? GOALS[3];
  const segs = [
    { label: t('common.protein'), value: tgt.protein, kcal: tgt.protein * 4, color: 'var(--mac-p)' },
    { label: t('common.fat'), value: tgt.fat, kcal: tgt.fat * 9, color: 'var(--mac-f)' },
    { label: t('common.carbs'), value: tgt.carbs, kcal: tgt.carbs * 4, color: 'var(--mac-c)' },
  ];
  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      h(
        'div.result-hero',
        h('div.result-hero__num', num(tgt.kcal)),
        h('p.result-hero__cap', t('common.kcal'))
      ),
      h(
        'div.mt-4',
        donut({
          segments: segs.map((s) => ({ label: s.label, value: s.kcal, color: s.color })),
          size: 150,
          center: t('common.kcal'),
        })
      ),
      h('p.formula-note.mt-3', t('calc.noteMacro'))
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.macros'),
        { hint: goal.n },
        h(
          'div.grid.grid--3',
          stat({ label: t('common.protein'), value: num(tgt.protein), unit: 'г' }),
          stat({ label: t('common.fat'), value: num(tgt.fat), unit: 'г' }),
          stat({ label: t('common.carbs'), value: num(tgt.carbs), unit: 'г' })
        ),
        h(
          'div.grid.grid--3.mt-3',
          stat({ label: t('common.fiber'), value: num(tgt.fiber), unit: 'г' }),
          stat({ label: t('nut.water'), value: `${num(tgt.water / 1000, 1)}`, unit: 'л' }),
          stat({ label: t('calc.lbm'), value: num(tgt.lbm), unit: currentUnits().kg })
        ),
        h(
          'div.row.row--wrap.mt-3',
          h('span.badge', `${t('calc.perWeek')}: ${num(tgt.projectedWeeklyChange, 2)} ${currentUnits().kg}`),
          h('span.badge', `${t('nut.waterTarget')}: ${num(tgt.water)} мл`)
        )
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.goal'),
        null,
        h(
          'div.chips',
          ...GOALS.map((g) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(g.id === getState().profile.goal),
                onclick: () => {
                  update({ profile: { ...getState().profile, goal: g.id } });
                  refresh();
                },
              },
              g.n
            )
          )
        )
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(t('calc.noteMacro')),
      h('p.formula-note', t('calc.safely'))
    )
  );
}

/* ------------------------------ 1RM ------------------------------ */
function oneRmTool() {
  const formula = getState().settings.formula;
  const primary = e1rmValue(draft.liftWeight, draft.liftReps, null, formula);
  const all = [
    { id: 'epley', n: 'Epley', v: e1rmEpley(draft.liftWeight, draft.liftReps) },
    { id: 'brzycki', n: 'Brzycki', v: e1rmBrzycki(draft.liftWeight, draft.liftReps) },
    { id: 'lombardi', n: 'Lombardi', v: e1rmLombardi(draft.liftWeight, draft.liftReps) },
    { id: 'lander', n: 'Lander', v: e1rmLander(draft.liftWeight, draft.liftReps) },
    { id: 'wathen', n: 'Wathen', v: e1rmWathen(draft.liftWeight, draft.liftReps) },
    { id: 'oconner', n: "O'Conner", v: e1rmOconner(draft.liftWeight, draft.liftReps) },
  ];
  const warm = warmupPlan(draft.liftWeight, draft.liftReps);
  const rir = rirFromRpe(8);

  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      h(
        'div.result-hero',
        h('div.result-hero__num', num(toDisplayWeight(primary), 1)),
        h('p.result-hero__cap', currentUnits().kg)
      ),
      h('p.formula-note.mt-3', `${t('calc.formula')}: ${formula}`)
    ),
    field(t('calc.weightInput'), 'liftWeight', { step: 2.5, max: 600 }),
    field(t('calc.reps'), 'liftReps', { step: 1, max: 30 }),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.method'),
        { hint: t('calc.formulaNote') },
        h(
          'div.chips',
          ...all.map((f) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(f.id === formula),
                onclick: () => {
                  update({ settings: { ...getState().settings, formula: f.id } });
                  refresh();
                },
              },
              f.n
            )
          )
        ),
        h(
          'div.stack.mt-3',
          ...all.map((f) =>
            h(
              'div.compare-row',
              h('span.compare-row__name', f.n),
              h('div.bar', h('div.bar__fill', { style: { width: `${Math.min(100, (f.v / primary) * 100)}%` } })),
              h('span.compare-row__num', num(toDisplayWeight(f.v), 1))
            )
          )
        )
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('wo.warmup'),
        null,
        h(
          'div.stack',
          ...warm.map((w) =>
            h(
              'div.compare-row',
              h('span.compare-row__name', `${w.reps} ×`),
              h('div.bar', h('div.bar__fill', { style: { width: `${(w.pct * 100).toFixed(0)}%` } })),
              h('span.compare-row__num', `${num(toDisplayWeight(w.weight), 1)}`)
            )
          )
        ),
        h('p.formula-note.mt-3', t('wo.warmupWeight'))
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.sub'),
        { hint: `RPE 8 ≈ RIR ${rir}` },
        h(
          'div.stack',
          ...[0.7, 0.75, 0.8, 0.85, 0.9, 0.95].map((pct) =>
            h(
              'div.compare-row',
              h('span.compare-row__name', `${Math.round(pct * 100)}%`),
              h(
                'div.bar',
                h('div.bar__fill', { style: { width: `${pct * 100}%` } })
              ),
              h('span.compare-row__num', num(toDisplayWeight(weightAtPercent(primary, pct)), 1))
            )
          )
        )
      )
    )
  );
}

/* ------------------------------ plates ------------------------------ */
const BAR_OPTIONS = { kg: [20, 15, 10, 7], lb: [45, 35, 25] };

function platesTool() {
  const unit = currentUnits().kg;
  const options = BAR_OPTIONS[unit] ?? BAR_OPTIONS.kg;
  // the stored bar must exist in the current unit system
  if (!options.includes(draft.barWeight)) draft.barWeight = options[0];
  const target = draft.platesWeight;
  const info = platesFor(unit === 'lb' ? toDisplayWeight(target) : target, unit, draft.barWeight);
  return h(
    'div.stack',
    h('div.card.card--pad-lg', plateStrip(target)),
    field(t('calc.weightInput'), 'platesWeight', { step: 2.5, max: 600 }),
    h(
      'div.card.card--pad-lg',
      section(
        t('wo.barWeight'),
        null,
        h(
          'div.chips',
          ...options.map((b) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(b === info.bar),
                onclick: () => {
                  draft.barWeight = b;
                  refresh();
                },
              },
              `${b} ${unit}`
            )
          )
        ),
        h('p.formula-note.mt-3', `${t('wo.platesHint')}: ${info.plates.length ? info.plates.join(' + ') : '—'}`),
        h('p.formula-note', `${t('common.total')}: ${num(info.achieved, 1)} ${unit}${info.exact ? ' ✓' : ''}`)
      )
    )
  );
}

/* ------------------------------ BMI ------------------------------ */
function bmiTool() {
  const value = bmi(draft.weight, draft.height);
  const cat = bmiCategory(value);
  const ideal = idealWeight({ height: draft.height, sex: getState().profile.sex });
  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      h('div.result-hero', h('div.result-hero__num', num(value, 1)), h('p.result-hero__cap', 'BMI')),
      h('p.formula-note.mt-3', cat ? t(`calc.bmiCat.${cat.id}`) : ''),
      h(
        'div.mt-4',
        h(
          'div.bar',
          h('div.bar__fill', { style: { width: `${Math.min(100, (value / 40) * 100)}%` } })
        )
      )
    ),
    field(t('calc.weightInput'), 'weight', { step: 0.5 }),
    field(t('calc.height'), 'height', { step: 1, max: 250 }),
    h(
      'div.grid.grid--3',
      stat({ label: 'Devine', value: num(toDisplayWeight(ideal.devine), 1), unit: currentUnits().kg }),
      stat({ label: 'Hamwi', value: num(toDisplayWeight(ideal.hamwi), 1), unit: currentUnits().kg }),
      stat({ label: t('calc.lbm'), value: num(leanBodyMass(draft.weight, 20), 1), unit: currentUnits().kg })
    ),
    h('p.formula-note', t('calc.noteBmi'))
  );
}

/* ------------------------------ body fat ------------------------------ */
const BF_METHODS = [
  { id: 'navy', n: 'calc.navy', note: 'calc.noteNavy' },
  { id: 'dw4', n: 'calc.skinfold4', note: 'calc.noteSkinfold' },
  { id: 'jp7', n: 'calc.skinfold7', note: 'calc.noteSkinfold' },
];

/** Field sets per method — Navy needs girths in cm, calipers need folds in mm. */
function bfFields(id, sex) {
  const cm = { step: 0.5, suffix: currentUnits().cm };
  const mm = { step: 0.5, suffix: t('calc.mm') };
  if (id === 'navy') {
    return [
      field(t('calc.height'), 'height', { step: 1, max: 250 }),
      field(t('calc.neck'), 'neck', cm),
      field(t('calc.waist'), 'waist', cm),
      sex === 'male' ? null : field(t('calc.hip'), 'hip', cm),
    ];
  }
  const age = field(t('calc.age'), 'age', { step: 1, min: 10, max: 100, suffix: '' });
  if (id === 'dw4') {
    return [
      age,
      field(t('calc.biceps'), 'biceps', mm),
      field(t('calc.triceps'), 'triceps', mm),
      field(t('calc.subscapular'), 'subscapular', mm),
      field(t('calc.suprailiac'), 'suprailiac', mm),
    ];
  }
  return [
    age,
    field(t('calc.chest'), 'chest', mm),
    field(t('calc.midaxillary'), 'midaxillary', mm),
    field(t('calc.triceps'), 'triceps', mm),
    field(t('calc.subscapular'), 'subscapular', mm),
    field(t('calc.abdomen'), 'abdomen', mm),
    field(t('calc.suprailiac'), 'suprailiac', mm),
    field(t('calc.thigh'), 'thigh', mm),
  ];
}

function bfTool() {
  const sex = getState().profile.sex;
  const methods = [
    { id: 'navy', n: t('calc.navy'), v: bodyFatNavy({ ...draft, sex }) },
    { id: 'dw4', n: t('calc.skinfold4'), v: bodyFatSkinfold4({ ...draft, sex }) },
    { id: 'jp7', n: t('calc.skinfold7'), v: bodyFatSkinfold7({ ...draft, sex }) },
  ];
  const active = methods.find((m) => m.id === draft.bfMethod) ?? methods[0];
  const noteKey = BF_METHODS.find((m) => m.id === active.id)?.note ?? 'calc.noteSkinfold';
  const cat = bfCategory(active.v ?? 20, sex);

  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      h(
        'div.result-hero',
        h('div.result-hero__num', num(active.v, 1), h('span.result-hero__cap', ' %')),
        h('p.result-hero__cap', t(`calc.bfCat.${cat.id}`))
      ),
      h(
        'div.mt-3',
        h(
          'div.grid.grid--3',
          stat({ label: t('calc.lbm'), value: num(leanBodyMass(draft.weight, active.v ?? 20), 1), unit: currentUnits().kg }),
          stat({ label: t('calc.fatMass'), value: num(fatMass(draft.weight, active.v ?? 20), 1), unit: currentUnits().kg }),
          stat({ label: t('calc.bmr'), value: num(computeBmr({ ...getState().profile, weight: draft.weight, height: draft.height, age: draft.age, bodyFat: active.v }).katch ?? 0) })
        )
      ),
      h('p.formula-note.mt-3', t(noteKey))
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('calc.method'),
        null,
        h(
          'div.chips',
          ...methods.map((m) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(m.id === draft.bfMethod),
                onclick: () => {
                  draft.bfMethod = m.id;
                  refresh();
                },
              },
              m.n
            )
          )
        )
      )
    ),
    h('div', ...bfFields(active.id, sex).filter(Boolean), h('p.formula-note', t('calc.bodyFatInput')))
  );
}

/* ------------------------------ view ------------------------------ */
const TOOL_FN = { bmr: bmrTool, macro: macroTool, one: oneRmTool, plates: platesTool, bmi: bmiTool, bf: bfTool };

export function render(_params, _ctx) {
  const view = h('div.view');
  const p = getState().profile;
  if (draft.weight === 80 && p.weight) draft.weight = p.weight;
  if (draft.height === 180 && p.height) draft.height = p.height;
  if (draft.age === 30 && p.age) draft.age = p.age;

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('calc.title')), h('p.topbar__sub', t('calc.profile')))
    ),
    h(
      'div.chips.chips--scroll',
      ...TOOLS.map((item) =>
        h(
          'button.chip',
          {
            'aria-pressed': String(tool === item.id),
            onclick: () => {
              tool = item.id;
              refresh();
            },
          },
          icon(item.icon, 14),
          t(item.key)
        )
      )
    ),
    h('div.section', TOOL_FN[tool]())
  );
  enterView(view);
  return view;
}
