/** Dashboard: today at a glance — rings, today's plan, weekly progress. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState, todayKey } from '../core/store.js';
import { num, DOW, relativeDay } from '../core/format.js';
import { navigate, refresh } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { ring } from '../ui/charts.js';
import { section, stat, empty, macroRow, kcalBig } from '../ui/bits.js';
import { exerciseGlyph } from '../ui/exercise.js';
import { getExercise } from '../data/exercises.js';
import {
  todaysPlan, startWorkout, planStats, weekDays, programDays, exName, volumeByMuscle,
} from '../core/session.js';
import { dayTotals, targets, addWater, setWater } from '../core/nutrition.js';

const nameOf = (id) => exName(getExercise(id));
const glyphOf = (id) => exerciseGlyph(getExercise(id));

export function render(_params, _ctx) {
  const state = getState();
  const profile = state.profile;
  const view = h('div.view');
  const stats = planStats();
  const plan = todaysPlan();
  const active = state.active;
  const totals = dayTotals();
  const tgt = targets();

  /* ------------------------------ hero ------------------------------ */
  const hour = new Date().getHours();
  const greeting = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌆';
  const greetKey = hour < 12 ? 'dash.greetMorning' : hour < 18 ? 'dash.greetDay' : 'dash.greetEvening';
  const waterTarget = tgt.water ?? 2000;
  const waterPct = Math.min(1, totals.water / waterTarget);

  const hero = h(
    'section.hero.card.card--glow',
    h(
      'div.hero__head',
      h(
        'div',
        h('p.hero__eyebrow', `${greeting} ${t(greetKey)}`),
        h('h1.hero__title', profile.name ? `${profile.name}!` : t('app.tagline')),
        h('p.hero__sub', relativeDay(todayKey()))
      ),
      h(
        'div.hero__rings',
        ring({
          value: Math.min(1, totals.kcal / Math.max(1, tgt.kcal)),
          size: 104,
          stroke: 9,
          color: 'var(--accent-1)',
          label: String(Math.round(totals.kcal)),
          caption: `/ ${num(tgt.kcal)}`,
        }),
        ring({
          value: Math.min(1, totals.protein / Math.max(1, tgt.protein)),
          size: 104,
          stroke: 9,
          color: 'var(--mac-p)',
          label: String(Math.round(totals.protein)),
          caption: `/ ${num(tgt.protein)}`,
        }),
        ring({
          value: waterPct,
          size: 104,
          stroke: 9,
          color: 'var(--info)',
          label: (totals.water / 1000).toFixed(1),
          caption: `/ ${(waterTarget / 1000).toFixed(1)} ${t('nut.water').toLowerCase()}`,
        })
      )
    ),
    h(
      'div.hero__cta',
      active
        ? h(
            'button.btn.btn--primary.btn--lg.btn--block',
            { onclick: () => navigate('workout') },
            icon('play', 18),
            t('dash.continueWorkout')
          )
        : plan
          ? h(
              'button.btn.btn--primary.btn--lg.btn--block',
              {
                onclick: () => {
                  startWorkout({ day: plan });
                  navigate('workout');
                },
              },
              icon('play', 18),
              t('dash.startWorkout'),
              h('span.btn__meta', `${plan.items.length} × ${t('wo.sets')}`)
            )
          : h(
              'button.btn.btn--soft.btn--lg.btn--block',
              { onclick: () => navigate('program') },
              icon('calendar', 18),
              t('dash.buildPlan')
            )
    )
  );

  /* ------------------------------ week strip ------------------------------ */
  const doneDates = new Set((state.logs ?? []).map((l) => l.date));
  const plannedDows = new Set(programDays().filter((d) => d.items.length).map((d) => d.dow));
  const strip = h(
    'div.week-strip',
    ...weekDays().map((d) =>
      h(
        'button.week-day',
        {
          class: [d.isToday ? 'is-today' : '', doneDates.has(d.iso) ? 'is-done' : ''].filter(Boolean).join(' '),
          onclick: () => navigate('program', { day: d.dow }),
          'aria-label': DOW()[d.dow],
        },
        doneDates.has(d.iso) ? icon('check', 13, 'week-day__check') : null,
        h('span.week-day__dow', DOW()[d.dow]),
        h('span.week-day__num', String(d.date.getDate())),
        h('span', {
          class:
            'week-day__dot ' +
            (doneDates.has(d.iso)
              ? 'week-day__dot--done'
              : plannedDows.has(d.dow)
                ? 'week-day__dot--planned'
                : 'week-day__dot--rest'),
        })
      )
    )
  );

  /* ------------------------------ today's plan ------------------------------ */
  const startBtn = h(
    'button.btn.btn--primary.btn--block',
    {
      onclick: () => {
        startWorkout({ day: plan });
        navigate('workout');
      },
    },
    icon('play', 16),
    t('dash.startWorkout')
  );

  const planSection = plan
    ? section(
        plan.name || t('prog.titleProgress'),
        {
          hint: `${plan.items.length} ${t('common.sets')}`,
          action: h(
            'button.btn.btn--ghost.btn--sm',
            { onclick: () => navigate('program') },
            icon('edit', 15),
            t('common.edit')
          ),
        },
        h(
          'div.card.card--flush',
          h(
            'div.list',
            ...plan.items.map((item, i) =>
              h(
                'button.list__item',
                { onclick: () => navigate('workout', { ex: item.ex }) },
                h('span.list__thumb', { style: { padding: '3px' } }, glyphOf(item.ex)),
                h(
                  'div.list__body',
                  h('div.list__title', nameOf(item.ex)),
                  h(
                    'div.list__meta',
                    `${item.sets} × ${item.reps} · ${t('wo.restTimer')} ${item.rest} ${t('common.sec')}`
                  )
                ),
                h('span.badge.badge--accent', `${i + 1}`)
              )
            )
          ),
          h('div.card__head', { style: { padding: '10px 16px' } }, startBtn)
        )
      )
    : section(
        t('prog.titleProgress'),
        null,
        h(
          'div.card.card--pad-lg',
          empty({
            glyph: '🗓️',
            title: t('dash.restDay'),
            text: t('dash.restDayText'),
            action: h(
              'button.btn.btn--soft.mt-3',
              { onclick: () => navigate('program') },
              icon('calendar', 16),
              t('dash.buildPlan')
            ),
          })
        )
      );

  /* ------------------------------ quick stats ------------------------------ */
  const week = (state.logs ?? []).filter((l) => weekDays().some((d) => d.iso === l.date));
  const muscleVol = volumeByMuscle(week);
  const topMuscle = [...muscleVol.entries()].sort((a, b) => b[1] - a[1])[0];

  const quick = h(
    'div.grid.grid--4',
    stat({ label: t('dash.streak'), value: `${stats.sessions}`, unit: t('common.min') }),
    stat({ label: t('dash.sessionsDone'), value: `${stats.doneDays}/${stats.plannedDays}` }),
    stat({ label: t('dash.volumeWeek'), value: num(stats.weekVolume / 1000, 1), unit: 'т' }),
    stat({
      label: t('dash.adherence'),
      value: String(stats.adherence),
      unit: '%',
      delta: topMuscle ? t('pr.volumesByMuscle') : null,
      tone: stats.adherence >= 80 ? 'up' : 'down',
    })
  );

  /* ------------------------------ nutrition ------------------------------ */
  const cups = Math.round(waterTarget / 250);
  const filled = Math.round(totals.water / 250);
  const waterGrid = h(
    'div.water-grid',
    ...Array.from({ length: cups }, (_, i) =>
      h('button.water-cup', {
        'aria-pressed': String(i < filled),
        'aria-label': `250 ${t('nut.water').toLowerCase()}`,
        onclick: () => {
          setWater(todayKey(), (i < filled ? i : i + 1) * 250);
          refresh();
        },
      }, '💧')
    )
  );

  const nutHero = h(
    'section.section',
    h(
      'div.section__head',
      h('h2.section__title', t('dash.macrosToday')),
      h('span.spacer'),
      h(
        'button.btn.btn--ghost.btn--sm',
        { onclick: () => navigate('nutrition') },
        t('common.all'),
        icon('next', 14)
      )
    ),
    h(
      'div.card.nut-hero',
      h(
        'div',
        kcalBig(totals.kcal, t('common.kcal'), t('nut.targets')),
        h(
          'div.stack.mt-3',
          macroRow({ label: t('common.protein'), value: totals.protein, target: tgt.protein, color: 'var(--mac-p)' }),
          macroRow({ label: t('common.fat'), value: totals.fat, target: tgt.fat, color: 'var(--mac-f)' }),
          macroRow({ label: t('common.carbs'), value: totals.carbs, target: tgt.carbs, color: 'var(--mac-c)' })
        )
      ),
      h(
        'div',
        h(
          'div.row.row--between',
          h('span.card__sub', t('nut.waterTarget')),
          h('span.card__sub', `${num(totals.water)} / ${num(waterTarget)} ${t('nut.water').toLowerCase()}`)
        ),
        h('div.mt-3', waterGrid),
        h(
          'div.row.mt-3',
          h(
            'button.btn.btn--soft.btn--sm',
            {
              onclick: () => {
                addWater(todayKey(), -250);
                refresh();
              },
            },
            '−'
          ),
          h(
            'button.btn.btn--soft.btn--sm',
            {
              onclick: () => {
                addWater(todayKey(), 250);
                refresh();
              },
            },
            '+250'
          ),
          h(
            'button.btn.btn--soft.btn--sm',
            {
              onclick: () => {
                addWater(todayKey(), 500);
                refresh();
              },
            },
            '+500'
          )
        )
      )
    )
  );

  mount(view, hero, strip, planSection, quick, nutHero);
  enterView(view);
  stagger(view.querySelectorAll('.card, .section'));
  return view;
}
