/** Settings: profile, appearance, units, language, data management, about. */

import { h, mount, icon } from '../core/dom.js';
import { t, setLang, getLang, applyI18n } from '../core/i18n.js';
import { getState, patch, resetAll, exportJson, importJson, storageUsage } from '../core/store.js';
import { num, currentUnits, setUnitSystem, toDisplayLength, toDisplayWeight, fromDisplayLength, fromDisplayWeight } from '../core/format.js';
import { refresh, navigate } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { confirmDialog, toastOk, toastErr, toastWarn } from '../core/ui.js';
import { section, badge } from '../ui/bits.js';
import { settingRow, toggleSwitch, openPrompt, choiceModal } from '../ui/forms.js';
import { EXERCISES, EX_BY_ID } from '../data/exercises.js';
import { GOALS } from '../calc/macros.js';
import { applyTheme, applyLanguage, ACCENTS } from '../core/theme.js';

const VERSION = '1.0.0';
const BUILD = '2026.09';

const FORMULAS = [
  ['epley', 'Epley'],
  ['brzycki', 'Brzycki'],
  ['lander', 'Lander'],
  ['lombardi', 'Lombardi'],
  ['wathen', 'Wathen'],
  ['oconner', "O'Conner"],
];

/* --------------------------- install prompt --------------------------- */
let deferredInstall = null;
export const setInstallPrompt = (evt) => {
  deferredInstall = evt;
};

async function doInstall() {
  if (!deferredInstall) {
    toastWarn(t('set.offline'));
    return;
  }
  deferredInstall.prompt();
  const res = await deferredInstall.userChoice.catch(() => null);
  if (res?.outcome === 'accepted') {
    deferredInstall = null;
    toastOk(t('set.installApp'));
  }
  refresh();
}

/* ------------------------------ profile ------------------------------ */
function editProfile() {
  const p = getState().profile;
  openPrompt({
    title: t('set.profile'),
    fields: [
      { key: 'name', label: t('onb.name'), value: p.name ?? '' },
      {
        key: 'sex',
        label: t('onb.sex'),
        type: 'select',
        value: p.sex,
        options: [
          ['male', t('onb.male')],
          ['female', t('onb.female')],
        ],
      },
      { key: 'age', label: t('onb.age'), type: 'number', step: 1, min: 12, max: 100, suffix: t('common.years'), value: p.age },
      {
        key: 'height',
        label: t('onb.height'),
        type: 'number',
        step: 0.5,
        suffix: currentUnits().cm,
        value: num(toDisplayLength(p.height), 1),
      },
      {
        key: 'weight',
        label: t('onb.weight'),
        type: 'number',
        step: 0.1,
        suffix: currentUnits().kg,
        value: num(toDisplayWeight(p.weight), 1),
      },
      { key: 'bodyFat', label: `${t('calc.bodyFat')} %`, type: 'number', step: 0.1, suffix: '%', value: p.bodyFat ?? '' },
    ],
    onSubmit: (v) => {
      // the prompt shows display units, the store always keeps cm / kg
      patch('profile', {
        name: String(v.name ?? '').trim(),
        sex: v.sex === 'female' ? 'female' : 'male',
        age: clampInt(v.age, 12, 100, 25),
        height: clampNum(fromDisplayLength(v.height), 100, 250, 178),
        weight: clampNum(fromDisplayWeight(v.weight), 25, 300, 78),
        bodyFat: v.bodyFat ? clampNum(v.bodyFat, 3, 60, null) : null,
      });
      toastOk(t('common.done'));
      refresh();
      return true;
    },
  });
}

const clampNum = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, n));
};
const clampInt = (v, min, max, fallback) => Math.round(clampNum(v, min, max, fallback));

function editActivity() {
  const levels = [
    ['sedentary', t('act.sedentary')],
    ['light', t('act.light')],
    ['moderate', t('act.moderate')],
    ['active', t('act.active')],
    ['athlete', t('act.athlete')],
  ];
  const current = getState().profile.activity;
  choiceModal({
    title: t('onb.activity'),
    options: levels,
    value: current,
    onPick: (id) => {
      patch('profile', { activity: id });
      toastOk(t('common.done'));
      refresh();
    },
  });
}

function editGoal() {
  choiceModal({
    title: t('onb.goal'),
    options: GOALS.map((g) => [g.id, g.n, g.hint]),
    value: getState().profile.goal,
    onPick: (id) => {
      patch('profile', { goal: id, kcalTarget: null });
      toastOk(t('common.done'));
      refresh();
    },
  });
}

function editRest() {
  const value = getState().settings.restDefault;
  choiceModal({
    title: t('set.restDefault'),
    options: [30, 45, 60, 90, 120, 180, 240].map((s) => [s, `${s} s`]),
    value,
    onPick: (s) => {
      patch('settings', { restDefault: s });
      toastOk(t('common.done'));
      refresh();
    },
  });
}

function editFormula() {
  choiceModal({
    title: t('set.formula'),
    options: FORMULAS.map(([id, label]) => [id, label, t('wo.e1rm')]),
    value: getState().settings.formula,
    onPick: (id) => {
      patch('settings', { formula: id });
      toastOk(t('common.done'));
      refresh();
    },
  });
}

function editMeals() {
  choiceModal({
    title: t('nut.meals'),
    options: [3, 4, 5, 6].map((n) => [n, String(n)]),
    value: getState().profile.meals,
    onPick: (n) => {
      patch('profile', { meals: n });
      toastOk(t('common.done'));
      refresh();
    },
  });
}

/* ------------------------------ data ------------------------------ */
function exportData() {
  try {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `fitpulse-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toastOk(t('set.export'));
  } catch (err) {
    toastErr(t('set.export'));
    console.error(err);
  }
}

function importData() {
  const input = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    onchange: async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ok = await confirmDialog({
        title: t('set.import'),
        text: t('set.importText'),
        confirmLabel: t('set.import'),
      });
      if (!ok) return;
      try {
        importJson(await file.text());
        toastOk(t('set.import'));
        location.reload();
      } catch (err) {
        toastErr(String(err?.message ?? err));
      }
    },
  });
  document.body.append(input);
  input.click();
  setTimeout(() => input.remove(), 0);
}

async function wipeAll() {
  const ok = await confirmDialog({
    title: t('set.resetAll'),
    text: t('set.resetConfirm'),
    confirmLabel: t('set.resetAll'),
    danger: true,
  });
  if (!ok) return;
  resetAll();
  toastOk(t('set.resetDone'));
  setTimeout(() => location.reload(), 400);
}

/* ------------------------------ view ------------------------------ */
export function render(_params, _ctx) {
  const view = h('div.view');
  const s = getState().settings;
  const p = getState().profile;
  const usage = storageUsage();
  const online = navigator.onLine;

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('set.title'))),
      badge(`${VERSION}`, 'accent')
    ),
    h(
      'div.section',
      h(
        'div.stack',
        section(
          t('set.profile'),
          { hint: p.name || t('dash.guest') },
          h(
            'div.card.card--flush',
            settingRow({
              glyph: 'user',
              title: p.name || t('dash.guest'),
              sub: `${p.age} ${t('common.years')} · ${num(toDisplayLength(p.height))} ${currentUnits().cm} · ${num(toDisplayWeight(p.weight), 1)} ${currentUnits().kg}`,
              control: icon('chevron', 18),
              onClick: editProfile,
            }),
            settingRow({
              glyph: 'activity',
              title: t('onb.activity'),
              sub: t(`act.${p.activity}`),
              control: icon('chevron', 18),
              onClick: editActivity,
            }),
            settingRow({
              glyph: 'target',
              title: t('onb.goal'),
              sub: t(`goal.${p.goal}`),
              control: icon('chevron', 18),
              onClick: editGoal,
            }),
            settingRow({
              glyph: 'nutrition',
              title: t('nut.meals'),
              sub: `${p.meals} × ${t('nut.perDay')}`,
              control: icon('chevron', 18),
              onClick: editMeals,
            })
          )
        ),

        section(
          t('set.appearance'),
          null,
          h(
            'div.card.card--flush',
            settingRow({
              glyph: 'sun',
              title: t('set.theme'),
              sub: s.theme === 'dark' ? t('set.themeDark') : t('set.themeLight'),
              control: toggleSwitch(s.theme === 'dark', (next) => {
                patch('settings', { theme: next ? 'dark' : 'light' });
                applyTheme(next);
                refresh();
              }),
            }),
            settingRow({
              glyph: 'palette',
              title: t('set.accent'),
              control: h(
                'div.chips.chips--tight',
                ...ACCENTS.map(([id, color]) =>
                  h('button.swatch', {
                    'aria-label': id,
                    'aria-pressed': String(id === s.accent),
                    style: { background: color },
                    onclick: () => {
                      patch('settings', { accent: id });
                      applyTheme(s.theme, id);
                      refresh();
                    },
                  })
                )
              ),
            }),
            settingRow({
              glyph: 'globe',
              title: t('set.language'),
              sub: getLang() === 'en' ? 'English' : 'Русский',
              control: h(
                'div.chips.chips--tight',
                ...[
                  ['ru', 'RU'],
                  ['en', 'EN'],
                ].map(([id, label]) =>
                  h(
                    'button.chip',
                    {
                      'aria-pressed': String(id === s.lang),
                      onclick: () => {
                        patch('settings', { lang: id });
                        setLang(id);
                        applyLanguage(id);
                        applyI18n(document);
                        refresh();
                      },
                    },
                    label
                  )
                )
              ),
            }),
            settingRow({
              glyph: 'ruler',
              title: t('set.units'),
              sub: s.unitSystem === 'metric' ? t('set.metric') : t('set.imperial'),
              control: h(
                'div.chips.chips--tight',
                ...[
                  ['metric', t('set.metric')],
                  ['imperial', t('set.imperial')],
                ].map(([id, label]) =>
                  h(
                    'button.chip',
                    {
                      'aria-pressed': String(id === s.unitSystem),
                      onclick: () => {
                        patch('settings', { unitSystem: id });
                        setUnitSystem(id);
                        refresh();
                      },
                    },
                    label
                  )
                )
              ),
            })
          )
        ),

        section(
          t('set.workout'),
          null,
          h(
            'div.card.card--flush',
            settingRow({
              glyph: 'timer',
              title: t('set.restDefault'),
              control: h('span.setting__val', `${s.restDefault}s`),
              onClick: editRest,
            }),
            settingRow({
              glyph: 'calculator',
              title: t('set.formula'),
              sub: t('wo.e1rm'),
              control: h('span.setting__val', FORMULAS.find(([id]) => id === s.formula)?.[1] ?? s.formula),
              onClick: editFormula,
            }),
            settingRow({
              glyph: 'bell',
              title: t('set.sound'),
              control: toggleSwitch(s.sound, (next) => patch('settings', { sound: next })),
            }),
            settingRow({
              glyph: 'vibrate',
              title: t('set.haptics'),
              control: toggleSwitch(s.haptics, (next) => patch('settings', { haptics: next })),
            })
          )
        ),

        section(
          t('set.data'),
          null,
          h(
            'div.card.card--flush',
            settingRow({
              glyph: 'download',
              title: t('set.export'),
              sub: t('set.exportText'),
              control: icon('chevron', 18),
              onClick: exportData,
            }),
            settingRow({
              glyph: 'upload',
              title: t('set.import'),
              sub: t('set.importText'),
              control: icon('chevron', 18),
              onClick: importData,
            }),
            settingRow({
              glyph: 'trash',
              title: t('set.resetAll'),
              sub: t('set.resetText'),
              control: icon('chevron', 18),
              onClick: wipeAll,
            })
          )
        ),

        section(
          t('set.about'),
          null,
          h(
            'div.card.card--pad-lg.stack',
            h('p.muted', t('set.aboutText')),
            h(
              'div.grid.grid--3',
              h('div.mini-stat', h('span.mini-stat__val', VERSION), h('span.mini-stat__label', t('set.version'))),
              h('div.mini-stat', h('span.mini-stat__val', BUILD), h('span.mini-stat__label', t('set.build'))),
              h(
                'div.mini-stat',
                h('span.mini-stat__val', `${num(usage.kb, 1)} KB`),
                h('span.mini-stat__label', t('set.storage'))
              )
            ),
            h(
              'div.row.row--between',
              h('div', h('div.setting__title', t('set.offline')), h('div.setting__sub', online ? t('set.offlineReady') : '—')),
              h('span.badge', { class: online ? 'badge--ok' : 'badge--warn' }, online ? 'online' : 'offline')
            ),
            h('button.btn.btn--primary.btn--block', { onclick: doInstall }, icon('download', 16), t('set.installApp')),
            h(
              'div.row.row--between',
              h('span.muted', 'MIT License'),
              h('a.muted.muted--link', { href: 'https://github.com/', target: '_blank', rel: 'noreferrer' }, 'GitHub ↗')
            )
          )
        ),

        section(
          t('set.favorites'),
          {
            hint: `${getState().favorites.length} / ${EXERCISES.length}`,
            action: h(
              'button.btn.btn--ghost.btn--icon',
              { 'aria-label': t('nav.library'), onclick: () => navigate('library') },
              icon('chevron', 18)
            ),
          },
          h(
            'div.card.card--pad-lg',
            (getState().favorites ?? []).length
              ? h(
                  'div.chips',
                  ...getState().favorites
                    .map((id) => EX_BY_ID[id])
                    .filter(Boolean)
                    .map((ex) => h('span.chip.chip--static', getLang() === 'en' ? ex.en || ex.n : ex.n))
                )
              : h('p.muted', t('pr.noDataText'))
          )
        )
      )
    )
  );
  enterView(view);
  stagger(view.querySelectorAll('.card'));
  return view;
}
