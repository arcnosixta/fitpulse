/** History: finished sessions grouped by month with detail drill-down. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { num, weight as fmtWeight, minutes, relativeDay, DOW, formatDate } from '../core/format.js';
import { refresh } from '../core/router.js';
import { stagger } from '../core/anim.js';
import { openSheet } from '../core/ui.js';
import { section, stat, empty } from '../ui/bits.js';
import { barChart } from '../ui/charts.js';
import { getExercise } from '../data/exercises.js';
import { tonnage } from '../calc/strength.js';
import { logsSorted, totalVolume, exName } from '../core/session.js';

let monthFilter = null;

const monthKey = (isoDate) => isoDate.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return formatDate(new Date(y, m - 1, 1), { month: 'long', year: 'numeric' });
};

function openLog(log) {
  const items = log.items ?? [];
  openSheet({
    title: log.name || DOW()[log.dow] || t('wo.title'),
    body: h(
      'div.stack',
      h(
        'div.grid.grid--3',
        stat({ label: t('pr.totalVolume'), value: num(log.volume / 1000, 1), unit: 'т' }),
        stat({ label: t('wo.duration'), value: minutes(log.minutes) }),
        stat({ label: t('wo.calories'), value: num(log.kcal), unit: t('common.kcal') })
      ),
      ...items.map((item) => {
        const ex = getExercise(item.ex);
        const vol = item.sets.reduce((a, s) => a + tonnage(s.w, s.r), 0);
        return h(
          'div.card.card--pad-lg',
          h(
            'div.row.row--between',
            h('div.log-top__name', exName(ex)),
            h('span.badge', `${num(vol / 1000, 1)} т`)
          ),
          h(
            'div.list.mt-2',
            ...item.sets.map((s) =>
              h(
                'div.list__item',
                h('div.list__body', h('div.list__title', `${fmtWeight(s.w)} × ${s.r}`)),
                h(
                  'div.list__value',
                  s.e1rm ? num(s.e1rm, 1) : '',
                  s.isPr ? icon('sparkle', 14) : null
                )
              )
            )
          )
        );
      }),
      log.notes ? h('p.formula-note', log.notes) : null
    ),
  });
}

export function render(_params, ctx) {
  const view = h('div.view');
  const logs = logsSorted();
  const months = [...new Set(logs.map((l) => monthKey(l.date)))];
  const active = monthFilter && months.includes(monthFilter) ? monthFilter : null;
  const shown = active ? logs.filter((l) => monthKey(l.date) === active) : logs;
  const volume = totalVolume(shown);

  const groups = new Map();
  for (const log of shown) {
    const key = monthKey(log.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(log);
  }

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('nav.history')), h('p.topbar__sub', `${num(logs.length)} ${t('wo.set')}`)),
      h('span.badge.badge--accent', `${num(totalVolume(logs) / 1000, 1)} т`)
    ),
    logs.length
      ? h(
          'div.card.card--pad-lg',
          section(
            t('pr.totalVolume'),
            { hint: `${num(volume / 1000, 1)} т` },
            barChart({
              data: [...groups.entries()].map(([key, list]) => ({
                label: monthLabel(key).slice(0, 3),
                value: totalVolume(list) / 1000,
              })),
              height: 150,
              format: (v) => `${num(v, 1)} т`,
            })
          )
        )
      : null,
    months.length
      ? h(
          'div.chips.chips--scroll',
          h(
            'button.chip',
            {
              'aria-pressed': String(!active),
              onclick: () => {
                monthFilter = null;
                refresh();
              },
            },
            t('common.all')
          ),
          ...months.map((key) =>
            h(
              'button.chip',
              {
                'aria-pressed': String(active === key),
                onclick: () => {
                  monthFilter = key;
                  refresh();
                },
              },
              monthLabel(key)
            )
          )
        )
      : null,
    logs.length
      ? h(
          'div',
          ...[...groups.entries()].map(([key, list]) =>
            section(
              monthLabel(key),
              { hint: `${num(list.length)}` },
              h(
                'div.card.card--flush',
                h(
                  'div.list',
                  ...list.map((log) =>
                    h(
                      'button.list__item',
                      { onclick: () => openLog(log) },
                      h(
                        'span.list__thumb',
                        log.prs ? '🏆' : icon('dumbbell', 20)
                      ),
                      h(
                        'div.list__body',
                        h('div.list__title', log.name || DOW()[log.dow] || t('wo.title')),
                        h(
                          'div.list__meta',
                          `${relativeDay(log.date)} · ${minutes(log.minutes)} · ${(log.items ?? []).length} ×`
                        )
                      ),
                      h('div.list__value', `${num((log.volume ?? 0) / 1000, 1)} т`)
                    )
                  )
                )
              )
            )
          )
        )
      : h(
          'div.card.card--pad-lg',
          empty({
            glyph: '📋',
            title: t('pr.noData'),
            text: t('pr.noDataText'),
            action: h(
              'a.btn.btn--primary.mt-3',
              { href: '#/program' },
              icon('calendar', 16),
              t('dash.buildPlan')
            ),
          })
        )
  );
  if (ctx.routeChanged) stagger(view.querySelectorAll('.card, .list__item'));
  return view;
}
