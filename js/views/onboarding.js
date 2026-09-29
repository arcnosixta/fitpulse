/** Onboarding: three steps — profile, goal, summary. Creates a starter program. */

import { h, mount, icon } from '../core/dom.js';
import { t, getLang } from '../core/i18n.js';
import { getState, patch, update } from '../core/store.js';
import { num, currentUnits, toDisplayLength, fromDisplayLength, toDisplayWeight, fromDisplayWeight, DOW } from '../core/format.js';
import { navigate, refresh } from '../core/router.js';
import { toastOk, haptic } from '../core/ui.js';
import { stat } from '../ui/bits.js';
import { segmented, radioCards, choiceGroup } from '../ui/forms.js';
import { GOALS, computeTargets } from '../calc/macros.js';
import { ACTIVITY_LEVELS, computeBmr, computeTdee } from '../calc/body.js';
import { TEMPLATES, TEMPLATE_BY_ID } from '../data/templates.js';
import { applyTemplate, tplName } from '../core/session.js';

let step = 0;
let draft = null;
/** Set from the route: #/onboarding?edit=1 reopens the wizard to correct data. */
let editMode = false;

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
  const actHint = h('div.field__hint');
  const paintActHint = () => {
    const a = ACTIVITY_LEVELS.find((x) => x.id === draft.activity);
    if (a) actHint.textContent = `${getLang() === 'en' ? a.hint : a.hint} · k=${a.k}`;
  };
  paintActHint();

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
        (id) => { draft.sex = id; }
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
      choiceGroup({
        options: ACTIVITY_LEVELS.map((a) => [a.id, actLabel(a)]),
        value: draft.activity,
        onPick: (id) => { draft.activity = id; paintActHint(); },
        className: 'chips',
        optionClass: 'chip',
        label: t('onb.activity'),
      }),
      actHint
    )
  );
}

function stepGoal() {
  return h(
    'div.stack',
    h(
      'div.field',
      h('span.field__label', t('onb.goal')),
      radioCards(
        GOALS.map((g) => [
          g.id,
          goalLabel(g),
          `${g.delta > 0 ? '+' : ''}${Math.round(g.delta * 100)}% kcal · ${g.rate * 100}% mass/week`,
        ]),
        draft.goal,
        (id) => { draft.goal = id; }
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

  const note = h('p.formula-note');
  const paintNote = () => {
    const sel = TEMPLATE_BY_ID[draft.templateId];
    note.textContent = sel ? sel.desc : '';
    note.hidden = !sel;
  };

  const group = choiceGroup({
    options: TEMPLATES.map((tpl) => [tpl.id, tpl]),
    value: draft.templateId,
    onPick: (id) => { draft.templateId = id; paintNote(); },
    className: 'stack',
    optionClass: 'tpl-card',
    label: t('onb.pickTemplate'),
    renderOption: ([, tpl]) => [
      h('div.tpl-card__name', tplName(tpl)),
      h('div.tpl-card__meta', `${tpl.level} · ${tpl.days.length} ${t('dash.days')} · ${tpl.perWeek}×/week`),
      h(
        'div.tpl-card__days',
        ...Array.from({ length: 7 }, (_, i) =>
          h(`div.tpl-card__day${tpl.days.some((d) => d.dow === i) ? ' is-on' : ''}`, DOW()[i])
        )
      ),
    ],
    onRender: () => paintNote(),
  });
  paintNote();

  const result = h(
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
  );

  // Re-entering the wizard to fix a number must not offer to rebuild the program.
  if (editMode) return h('div.stack', result);

  return h(
    'div.stack',
    result,
    h('div.field', h('span.field__label', t('onb.pickTemplate')), group),
    note
  );
}

const STEPS = [stepProfile, stepGoal, stepSummary];

function commit() {
  const profile = profilePayload();
  update({
    profile: { ...getState().profile, ...profile },
    active: null,
  });
  // In edit mode the user only came to correct their numbers, so the existing
  // program is left alone instead of being rebuilt from a template.
  if (!editMode && draft.templateId) {
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
  const backTo = (n) => () => { step = n; refresh(); };
  const rows = [];

  if (step > 0) {
    rows.push(h('button.btn.btn--ghost', { onclick: backTo(step - 1) }, icon('chevron', 16), t('onb.back')));
  } else if (editMode) {
    rows.push(h('button.btn.btn--ghost', { onclick: () => navigate('settings') }, t('common.cancel')));
  }

  if (step < STEPS.length - 1) {
    rows.push(h('button.btn.btn--primary', { onclick: backTo(step + 1) }, t('onb.next'), icon('chevron', 16)));
  } else {
    rows.push(
      h('button.btn.btn--primary', { onclick: commit }, icon('check', 16),
        editMode ? t('common.save') : t('onb.finish'))
    );
  }

  return h(
    'div.onb__nav',
    h('span.muted', `${step + 1} / ${STEPS.length}`),
    h('div.row', ...rows)
  );
}

export function render(params, ctx) {
  editMode = params?.edit === '1';
  if (!draft) draft = freshDraft();
  const view = h('div.view');
  // Each step is its own screen, so a step change animates while an in-place
  // pick (handled inside choiceGroup) does not re-render anything at all.
  view.dataset.screen = `onboarding:${editMode ? 'edit' : 'new'}:${step}`;
  const titles = [t('onb.step1'), t('onb.step2'), t('onb.step3')];
  const texts = [t('onb.step1Text'), t('onb.step2Text'), t('onb.step3Text')];

  mount(
    view,
    h(
      'div.onb',
      h(
        'div.onb__steps',
        { role: 'progressbar', 'aria-valuenow': step + 1, 'aria-valuemin': 1, 'aria-valuemax': STEPS.length },
        ...STEPS.map((_, i) => h('i', { class: i <= step ? 'is-active' : '' }))
      ),
      h('div.onb__head', h('h1.onb__title', titles[step]), h('p.onb__text', texts[step])),
      h('div.card.card--pad-lg', STEPS[step]()),
      navButtons()
    )
  );
  return view;
}

export const resetOnboarding = () => {
  step = 0;
  draft = null;
};
