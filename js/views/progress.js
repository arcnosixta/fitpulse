/** Progress: weight trend, tonnage, muscle volumes, PRs, adherence heat map. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState, update, todayKey } from '../core/store.js';
import { num, weight as fmtWeight, signed, formatDate, toDisplayWeight, currentUnits } from '../core/format.js';
import { refresh } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { openSheet, toastOk } from '../core/ui.js';
import { section, stat, empty } from '../ui/bits.js';
import { lineChart, barChart, heatCalendar, sparkline } from '../ui/charts.js';
import { openPrompt } from '../ui/forms.js';
import { muscleMap } from '../ui/muscle.js';
import { getExercise } from '../data/exercises.js';
import { tdeeFromTrend, linregSlope, weeklyRatePct } from '../calc/body.js';
import {
  logsInRange, logsThisWeek, totalVolume, volumeByMuscle, planStats, streakCount,
  personalRecords, volumeTrend, exName, muscleName,
} from '../core/session.js';
import { dayTotals } from '../core/nutrition.js';

const MEASURE_KEYS = ['chest', 'waist', 'hip', 'arm', 'thigh', 'calf', 'neck'];
const MEASURE_RU = {
  chest: 'Грудь', waist: 'Талия', hip: 'Бёдра', arm: 'Бицепс',
  thigh: 'Бедро', calf: 'Икры', neck: 'Шея',
};

let tab = 'weight';

const TABS = [
  { id: 'weight', key: 'pr.weight' },
  { id: 'volume', key: 'pr.volume' },
  { id: 'prs', key: 'pr.records' },
  { id: 'measure', key: 'pr.measure' },
];

function addWeight() {
  openPrompt({
    title: t('pr.addWeight'),
    fields: [
      { key: 'date', label: t('common.today'), type: 'date', value: todayKey() },
      { key: 'weight', label: t('common.weight'), type: 'number', step: 0.1, suffix: currentUnits().kg, value: '' },
      { key: 'bodyFat', label: `${t('calc.bodyFat')} %`, type: 'number', step: 0.1, suffix: '%' },
    ],
    onSubmit: (values) => {
      const entry = { date: values.date || todayKey(), weight: values.weight };
      if (values.bodyFat) entry.bodyFat = values.bodyFat;
      if (!entry.weight) return false;
      const log = [...(getState().weightLog ?? []).filter((w) => w.date !== entry.date), entry].sort((a, b) =>
        a.date < b.date ? -1 : 1
      );
      update({ weightLog: log });
      toastOk(t('common.done'));
      refresh();
      return true;
    },
  });
}

function addMeasure() {
  openPrompt({
    title: t('pr.addMeasure'),
    fields: [
      { key: 'date', label: t('common.today'), type: 'date', value: todayKey() },
      ...MEASURE_KEYS.map((k) => ({ key: k, label: MEASURE_RU[k], type: 'number', step: 0.5, suffix: currentUnits().cm })),
    ],
    onSubmit: (values) => {
      const date = values.date || todayKey();
      const entry = { date, values: {} };
      for (const k of MEASURE_KEYS) if (values[k]) entry.values[k] = values[k];
      if (!Object.keys(entry.values).length) return false;
      const log = [...(getState().measureLog ?? []).filter((m) => m.date !== date), entry];
      update({ measureLog: log });
      toastOk(t('common.done'));
      refresh();
      return true;
    },
  });
}

/* ------------------------------ weight ------------------------------ */
function weightTab() {
  const log = [...(getState().weightLog ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const data = log.map((entry, i) => ({ x: i, y: toDisplayWeight(entry.weight), label: entry.date.slice(5) }));
  const first = log[0];
  const last = log.at(-1);
  const delta = first && last ? toDisplayWeight(last.weight - first.weight) : 0;
  const slope = linregSlope(data.map((d) => d.x), data.map((d) => d.y));
  const targetRate = weeklyRatePct(getState().profile.goal);
  const actualRate = data.length > 1 ? (delta / (data.length - 1)) * 7 : 0;
  const trend = tdeeFromTrend({
    points: log
      .map((e) => ({ t: new Date(e.date).getTime(), weight: e.weight, intake: dayTotals(e.date).kcal }))
      .filter((p) => p.intake > 0),
  });

  if (!log.length) {
    return h(
      'div.card.card--pad-lg',
      empty({
        glyph: '⚖️',
        title: t('pr.noData'),
        text: t('pr.noDataText'),
        action: h('button.btn.btn--primary.mt-3', { onclick: addWeight }, icon('plus', 16), t('pr.addWeight')),
      })
    );
  }

  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      section(
        t('pr.weight'),
        {
          hint: `${last.weight ? fmtWeight(last.weight) : ''} · ${formatDate(last.date)}`,
          action: h('button.btn.btn--ghost.btn--icon', { 'aria-label': t('pr.addWeight'), onclick: addWeight }, icon('plus', 16)),
        },
        lineChart({
          data,
          height: 210,
          color: 'var(--accent-2)',
          yLabel: (v) => num(v, 1),
          format: (v) => `${num(v, 1)} ${currentUnits().kg}`,
        })
      )
    ),
    h(
      'div.grid.grid--4',
      stat({
        label: t('pr.delta'),
        value: signed(delta, 1),
        unit: currentUnits().kg,
        tone: delta < 0 ? 'down' : 'up',
      }),
      stat({ label: t('pr.avgWeek'), value: signed(actualRate, 2), unit: `${currentUnits().kg}/week` }),
      stat({ label: t('calc.weeklyChange'), value: `${num(targetRate, 1)}%`, unit: t('calc.weeklyChange') }),
      stat({ label: t('calc.tdee'), value: trend?.tdee ? num(trend.tdee) : '—', unit: t('common.kcal') })
    ),
    last.bodyFat
      ? h('div.card.card--pad-lg', section(t('calc.bodyFat'), null, sparkline(
          log.filter((e) => e.bodyFat).map((e) => e.bodyFat),
          { color: 'var(--warn)' }
        )))
      : null,
    h('p.formula-note', t('calc.noteTrend'))
  );
}

/* ------------------------------ volume ------------------------------ */
function volumeTab() {
  const logs = logsInRange(90);
  const weeks = [...new Set(logs.map((l) => l.date.slice(0, 7)))];
  const trend = volumeTrend(8);
  const byMuscle = volumeByMuscle(logsInRange(28));
  const rows = [...byMuscle.entries()]
    .map(([m, v]) => ({ m, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);
  const max = Math.max(1, ...rows.map((r) => r.v));
  const stats = planStats();

  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      section(
        t('pr.totalVolume'),
        { hint: `${num(totalVolume(logsInRange(28)) / 1000, 1)} т` },
        barChart({
          data: trend.map((p) => ({ label: p.label, value: p.y / 1000 })),
          height: 170,
          format: (v) => `${num(v, 1)} т`,
        })
      )
    ),
    h(
      'div.grid.grid--4',
      stat({ label: t('pr.total'), value: num(stats.weekVolume / 1000, 1), unit: 'т' }),
      stat({ label: t('dash.sessionsDone'), value: String(logs.length) }),
      stat({ label: t('dash.streak'), value: String(streakCount()) }),
      stat({ label: t('dash.adherence'), value: `${stats.adherence}`, unit: '%' })
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('pr.volumesByMuscle'),
        null,
        rows.length
          ? h(
              'div.stack',
              ...rows.map((r) =>
                h(
                  'div.vol-row',
                  h('span.vol-row__label', muscleName(r.m)),
                  h('div.bar', h('div.bar__fill', { style: { width: `${(r.v / max) * 100}%` } })),
                  h('span.vol-row__val', num(r.v / 1000, 1))
                )
              )
            )
          : h('p.muted', t('pr.noDataText')),
        rows.length ? h('div.mt-4', muscleMap(rows.map((r) => r.m))) : null
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('dash.adherence'),
        { hint: `${num(stats.adherence)}%` },
        heatCalendar(
          new Map((getState().logs ?? []).map((l) => [l.date, 1])),
          12,
          'var(--accent-1)'
        )
      )
    )
  );
}

/* ------------------------------ records ------------------------------ */
function prsTab() {
  const records = personalRecords(30);
  if (!records.length) {
    return h(
      'div.card.card--pad-lg',
      empty({ glyph: '🏆', title: t('pr.noData'), text: t('pr.noDataText') })
    );
  }
  return h(
    'div.card.card--pad-lg',
    section(
      t('pr.records'),
      { hint: `${num(records.length)}` },
      h(
        'div.list',
        ...records.map((r) =>
          h(
            'button.pr-row',
            { onclick: () => openRecord(r) },
            h('div', h('div.pr-row__name', exName(getExercise(r.ex))), h('div.pr-row__date', r.date)),
            h('div.pr-row__val', `${fmtWeight(r.w)} × ${r.r}`)
          )
        )
      )
    )
  );
}

function openRecord(r) {
  const ex = getExercise(r.ex);
  openSheet({
    title: exName(ex),
    body: h(
      'div.stack',
      h('div.result-hero', h('div.result-hero__num', num(r.e1rm, 1)), h('p.result-hero__cap', t('wo.e1rm'))),
      h(
        'div.grid.grid--3',
        stat({ label: t('common.weight'), value: fmtWeight(r.w) }),
        stat({ label: t('common.reps'), value: String(r.r) }),
        stat({ label: t('pr.last30'), value: r.date })
      ),
      h('p.formula-note', t('wo.e1rm'))
    ),
  });
}

/* ------------------------------ measures ------------------------------ */
function measureTab() {
  const log = [...(getState().measureLog ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!log.length) {
    return h(
      'div.card.card--pad-lg',
      empty({
        glyph: '📏',
        title: t('pr.noData'),
        text: t('pr.noDataText'),
        action: h('button.btn.btn--primary.mt-3', { onclick: addMeasure }, icon('plus', 16), t('pr.addMeasure')),
      })
    );
  }
  const last = log.at(-1);
  const prev = log.at(-2);
  return h(
    'div.card.card--pad-lg',
    section(
      t('pr.measure'),
      {
        hint: last.date,
        action: h('button.btn.btn--ghost.btn--icon', { 'aria-label': t('pr.addMeasure'), onclick: addMeasure }, icon('plus', 16)),
      },
      h(
        'div.measure-grid',
        ...MEASURE_KEYS.filter((k) => last.values[k]).map((k) => {
          const diff = prev?.values?.[k] != null ? last.values[k] - prev.values[k] : null;
          return h(
            'div.measure-item',
            h('div.measure-item__row', h('span.measure-item__label', MEASURE_RU[k]), h('span.measure-item__val', num(last.values[k], 1))),
            diff != null && diff !== 0
              ? h('span.measure-item__delta', { class: diff < 0 ? 'stat__delta--down' : 'stat__delta--up' }, signed(diff, 1))
              : null
          );
        })
      )
    )
  );
}

/* ------------------------------ view ------------------------------ */
export function render(_params, _ctx) {
  const view = h('div.view');
  const week = logsThisWeek();
  const body = tab === 'weight' ? weightTab() : tab === 'volume' ? volumeTab() : tab === 'prs' ? prsTab() : measureTab();

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('pr.title')), h('p.topbar__sub', `${num(week.length)} ${t('dash.days')}`)),
      h('span.badge.badge--accent', `${num(streakCount())} 🔥`)
    ),
    h(
      'div.segmented',
      ...TABS.map((item) =>
        h(
          'button',
          {
            class: tab === item.id ? 'is-active' : '',
            onclick: () => {
              tab = item.id;
              refresh();
            },
          },
          t(item.key)
        )
      )
    ),
    h('div.section', body)
  );
  enterView(view);
  stagger(view.querySelectorAll('.card'));
  return view;
}
