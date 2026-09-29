/** Onboarding: three steps — profile, goal, summary. Creates a starter program. */

import { h, mount, icon } from '../core/dom.js';
import { t, getLang } from '../core/i18n.js';
import { getState, patch, update } from '../core/store.js';
import { num, currentUnits, toDisplayLength, fromDisplayLength, toDisplayWeight, fromDisplayWeight, DOW } from '../core/format.js';
import { navigate, refresh } from '../core/router.js';
import { enterView } from '../core/anim.js';
import { toastOk, haptic } from '../core/ui.js';
import { stat } from '../ui/bits.js';
import { segmented } from '../ui/forms.js';
import { GOALS, computeTargets } from '../calc/macros.js';
import { ACTIVITY_LEVELS, computeBmr, computeTdee } from '../calc/body.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../data/templates.js';
import { applyTemplate, tplName } from '../core/session.js';

let step = 0;
let draft = null;

const goalLabel = (g) => (getLang() === 'en' ? g.en || g.n : g.n);
const actLabel = (a) => (getLang() === 'en' ? a.en : a.n);

const freshDraft = () => {
  const p = getState().profile;
  return {
    name: p.name ?? '',
    sex: p.sex ?? 'male',
    age: p.age ?? 25,
    height: toDisplayLength(p.height ?? 178),
    weight: toDisplayWeight(p.weight ?? 78),
    bodyFat: p.bodyFat ?? '',
    activity: p.activity ?? 'moderate',
    goal: p.goal ?? 'recomp',
    templateId: TEMPLATES[2]?.id ?? TEMPLATES[0]?.id ?? null,
  };
};

const profilePayload = () => ({
  name: draft.name.trim(),
  sex: draft.sex,
  age: Math.min(100, Math.max(12, Math.round(Number(draft.age) || 25))),
  height: Math.min(250, Math.max(100, fromDisplayLength(Number(draft.height) || 178))),
  weight: Math.min(300, Math.max(25, fromDisplayWeight(Number(draft.weight) || 78))),
  bodyFat: draft.bodyFat ? Math.min(60, Math.max(3, Number(draft.bodyFat))) : null,
});

/* ------------------------------ fields ------------------------------ */
const field = (label, control, hint) =>
  h('label.field', h('span.field__label', label), control, hint ? h('div.field__hint', hint) : null);

const numInput = (value, onChange, stepv, suffix) => {
  const input = h('input.input', {
    type: 'number',
    inputmode: 'decimal',
    step: String(stepv),
    value: String(value),
    oninput: (e) => onChange(e.target.value),
  });
  return suffix ? h('div.input-group', input, h('span.input-group__suffix', suffix)) : input;
};

/* ------------------------------ steps ------------------------------ */
function stepProfile() {
  return h(
    'div.stack',
    field(t('onb.name'), h('input.input', {
      type: 'text',
      value: draft.name,
      placeholder: t('dash.guest'),
      oninput: (e) => { draft.name = e.target.value; },
    })),
    h(
      'div.field',
      h('span.field__label', t('onb.sex')),
      segmented(
        [
          ['male', t('onb.male')],
          ['female', t('onb.female')],
        ],
        draft.sex,
        (id) => { draft.sex = id; refresh(); }
      )
    ),
    h(
      'div.grid.grid--2',
      field(t('onb.age'), numInput(draft.age, (v) => { draft.age = v; }, 1, t('common.years'))),
      field(t('onb.height'), numInput(draft.height, (v) => { draft.height = v; }, 0.5, currentUnits().cm))
    ),
    h(
      'div.grid.grid--2',
      field(t('onb.weight'), numInput(draft.weight, (v) => { draft.weight = v; }, 0.1, currentUnits().kg)),
      field(t('onb.bodyFat'), numInput(draft.bodyFat, (v) => { draft.bodyFat = v; }, 0.1, '%'))
    ),
    h(
      'div.field',
      h('span.field__label', t('onb.activity')),
      h(
        'div.chips',
        ...ACTIVITY_LEVELS.map((a) =>
          h(
            'button.chip',
            {
              'aria-pressed': String(a.id === draft.activity),
              title: getLang() === 'en' ? a.hint : a.hint,
              onclick: () => { draft.activity = a.id; refresh(); },
            },
            actLabel(a)
          )
        )
      ),
      h('div.field__hint', `${actLabel(ACTIVITY_LEVELS.find((a) => a.id === draft.activity))} · k=${ACTIVITY_LEVELS.find((a) => a.id === draft.activity).k}`)
    )
  );
}

function stepGoal() {
  return h(
    'div.stack',
    h(
      'div.field',
      h('span.field__label', t('onb.goal')),
      h(
        'div.stack',
        ...GOALS.map((g) =>
          h(
            'button.radio-card',
            {
              'aria-pressed': String(g.id === draft.goal),
              onclick: () => { draft.goal = g.id; refresh(); },
            },
            h('span.radio-card__dot'),
            h(
              'div',
              h('div.setting__title', goalLabel(g)),
              h('div.setting__sub', `${g.delta > 0 ? '+' : ''}${Math.round(g.delta * 100)}% kcal · ${g.rate * 100}% mass/week`)
            )
          )
        )
      )
    )
  );
}

function stepSummary() {
  const profile = profilePayload();
  const bmr = computeBmr(profile);
  const tdee = computeTdee(bmr.average, draft.activity);
  const r = computeTargets({
    ...profile,
    tdee: tdee.tdee,
    meals: getState().profile.meals ?? 4,
  });
  const selected = TEMPLATE_BY_ID[draft.templateId];

  return h(
    'div.stack',
    h(
      'div.onb__result',
      h(
        'div.grid.grid--3',
        stat({ label: t('onb.bmr'), value: num(bmr.average), unit: t('common.kcal') }),
        stat({ label: t('onb.tdee'), value: num(tdee.tdee), unit: t('common.kcal') }),
        stat({ label: t('onb.calories'), value: num(r.kcal), unit: t('common.kcal') })
      ),
      h(
        'div.grid.grid--3',
        stat({ label: t('common.protein'), value: num(r.macros.protein), unit: 'g' }),
        stat({ label: t('common.fat'), value: num(r.macros.fat), unit: 'g' }),
        stat({ label: t('common.carbs'), value: num(r.macros.carbs), unit: 'g' })
      )
    ),
    h(
      'div.field',
      h('span.field__label', t('onb.pickTemplate')),
      h(
        'div.stack',
        ...TEMPLATES.map((tpl) =>
          h(
            'button.tpl-card',
            {
              'aria-pressed': String(tpl.id === draft.templateId),
              onclick: () => { draft.templateId = tpl.id; refresh(); },
            },
            h('div.tpl-card__name', tplName(tpl)),
            h('div.tpl-card__meta', `${tpl.level} · ${tpl.days.length} ${t('dash.days')} · ${tpl.perWeek}×/week`),
            h(
              'div.tpl-card__days',
              ...Array.from({ length: 7 }, (_, i) =>
                h(`div.tpl-card__day${tpl.days.some((d) => d.dow === i) ? ' is-on' : ''}`, DOW()[i])
              )
            )
          )
        )
      )
    ),
    selected
      ? h(
          'p.formula-note',
          `${selected.desc}`
        )
      : null
  );
}

const STEPS = [stepProfile, stepGoal, stepSummary];

function commit() {
  const profile = profilePayload();
  update({
    profile: { ...getState().profile, ...profile },
    active: null,
  });
  if (draft.templateId) {
    const ok = applyTemplate(draft.templateId);
    if (ok) toastOk(t('onb.templateApplied'));
  }
  patch('profile', { onboarded: true });
  haptic([8, 40, 12]);
  step = 0;
  draft = null;
  navigate('dashboard');
}

function navButtons() {
  if (step === 0) {
    return h(
      'div.row.row--between',
      h('span.muted', `1 / ${STEPS.length}`),
      h('button.btn.btn--primary', { onclick: () => { step = 1; refresh(); } }, t('onb.next'), icon('chevron', 16))
    );
  }
  if (step === 1) {
    return h(
      'div.row.row--between',
      h('button.btn.btn--ghost', { onclick: () => { step = 0; refresh(); } }, icon('chevron', 16), t('onb.back')),
      h('button.btn.btn--primary', { onclick: () => { step = 2; refresh(); } }, t('onb.next'), icon('chevron', 16))
    );
  }
  return h(
    'div.row.row--between',
    h('button.btn.btn--ghost', { onclick: () => { step = 1; refresh(); } }, icon('chevron', 16), t('onb.back')),
    h('div.row', h('button.btn.btn--ghost', { onclick: commit }, t('onb.skip')), h('button.btn.btn--primary', { onclick: commit }, icon('check', 16), t('onb.finish')))
  );
}

export function render(_params, _ctx) {
  if (!draft) draft = freshDraft();
  const view = h('div.view');
  const titles = [t('onb.step1'), t('onb.step2'), t('onb.step3')];
  const texts = [t('onb.step1Text'), t('onb.step2Text'), t('onb.step3Text')];

  mount(
    view,
    h(
      'div.onb',
      h(
        'div.onb__steps',
        ...STEPS.map((_, i) => h('i', { class: i <= step ? 'is-active' : '' }))
      ),
      h('div', h('h1.onb__title', titles[step]), h('p.onb__text', texts[step])),
      h('div.card.card--pad-lg', STEPS[step]()),
      navButtons()
    )
  );
  enterView(view);
  return view;
}

export const resetOnboarding = () => {
  step = 0;
  draft = null;
};
