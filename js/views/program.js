/** Program: weekly plan, templates and volume distribution. */

import { h, mount, icon, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../core/store.js';
import { DOW } from '../core/format.js';
import { refresh } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { openModal, confirmDialog, toastOk } from '../core/ui.js';
import { section, empty } from '../ui/bits.js';
import { openExerciseSheet, openExercisePicker, exerciseGlyph } from '../ui/exercise.js';
import { getExercise, MUSCLES, muscleName } from '../data/exercises.js';
import { TEMPLATES } from '../data/templates.js';
import { WEEKLY_SET_LANDMARKS, volumeStatus, dayType } from '../calc/strength.js';
import {
  programDays, applyTemplate, clearProgram, addToDay, removeFromDay, duplicateDay, moveInProgram,
  weeklySetsByMuscle, exName, tplName, planStats, weekDays,
} from '../core/session.js';

const nameOf = (id) => exName(getExercise(id));
const glyphOf = (id) => exerciseGlyph(getExercise(id));

let tab = 'week';
let selectedDow = null;

/* ------------------------------ segmented ------------------------------ */
const TABS = [
  { id: 'week', key: 'prog.myProgram' },
  { id: 'vol', key: 'prog.volume' },
  { id: 'tpl', key: 'prog.templates' },
];

function segmented() {
  return h(
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
  );
}

/* ------------------------------ header ------------------------------ */
function header() {
  const program = getState().program;
  const stats = planStats();
  return h(
    'header.topbar',
    h(
      'div',
      h('h1.topbar__title', program.name || t('prog.myProgram')),
      h(
        'p.topbar__sub',
        `${t('prog.trainingDay')} ${stats.plannedDays} · ${t('common.sets')} ${stats.plannedSets}`
      )
    ),
    h(
      'div.row',
      program.templateId
        ? h(
            'button.btn.btn--ghost.btn--sm',
            {
              onclick: () => {
                const tpl = TEMPLATES.find((x) => x.id === program.templateId);
                openTemplates(tpl?.id);
              },
            },
            icon('layers', 15),
            t('common.edit')
          )
        : h(
            'button.btn.btn--soft.btn--sm',
            { onclick: () => openTemplates() },
            icon('layers', 15),
            t('prog.templates')
          ),
      program.days.length
        ? h(
            'button.btn.btn--ghost.btn--sm.btn--icon',
            {
              'aria-label': t('common.reset'),
              onclick: async () => {
                if (await confirmDialog({ title: t('prog.clearDay'), text: t('set.resetConfirm'), confirmLabel: t('common.delete'), danger: true })) {
                  clearProgram();
                  toastOk(t('common.done'));
                  refresh();
                }
              },
            },
            icon('trash', 16)
          )
        : null
    )
  );
}

/* ------------------------------ week tab ------------------------------ */
function slot(dow, item, index) {
  const ex = getExercise(item.ex);
  return h(
    'div.ex-slot',
    { 'data-uid': item.uid, draggable: 'true', onclick: () => openExerciseSheet(item.ex) },
    h('span.ex-slot__ord', String(index + 1)),
    h(
      'div',
      h('div.ex-slot__name', nameOf(item.ex)),
      h(
        'div.ex-slot__meta',
        `${item.sets} × ${item.reps} · ${item.rest}${t('common.sec')}`
      )
    ),
    h(
      'button.ex-slot__del',
      {
        'aria-label': t('common.delete'),
        onclick: (e) => {
          e.stopPropagation();
          removeFromDay(dow, item.uid);
          refresh();
        },
      },
      icon('close', 13)
    )
  );
}

function dayColumn(day, weekDay) {
  const isToday = weekDay.isToday;
  const sets = day.items.reduce((a, it) => a + Number(it.sets || 0), 0);
  const type = day.items.length ? dayType(day.items.map((it) => getExercise(it.ex)?.p).filter(Boolean)) : 'rest';

  const col = h(
    'div.day-col',
    {
      class: isToday ? 'is-today' : '',
      'data-dow': String(day.dow),
      ondragover: (e) => {
        e.preventDefault();
        col.classList.add('is-drop');
      },
      ondragleave: () => col.classList.remove('is-drop'),
      ondrop: (e) => {
        e.preventDefault();
        col.classList.remove('is-drop');
        const uidFrom = e.dataTransfer.getData('text/plain');
        if (!uidFrom) return;
        moveInProgram(selectedDow, uidFrom, day.dow);
        refresh();
      },
    },
    h(
      'div.day-col__head',
      h('span.day-col__dow', DOW()[day.dow]),
      h('span.day-col__date', String(weekDay.date.getDate())),
      h('span.spacer'),
      h('span.badge', `${sets} ${t('common.sets')}`)
    ),
    day.name ? h('div.day-col__name', day.name) : null,
    day.items.length
      ? h(
          'div.stack',
          ...day.items.map((it, i) =>
            h('div', {
              ondragstart: (e) => {
                selectedDow = day.dow;
                e.dataTransfer.setData('text/plain', it.uid);
                e.currentTarget.firstChild.classList.add('is-dragging');
              },
              ondragend: (e) => e.currentTarget.firstChild.classList.remove('is-dragging'),
            }, slot(day.dow, it, i))
          )
        )
      : h('div.day-col__empty', type === 'rest' ? t('dash.restDay') : t('prog.emptyDay')),
    h(
      'button.day-col__add',
      {
        onclick: () =>
          openExercisePicker({
            onPick: (exId) => {
              addToDay(day.dow, exId);
              refresh();
            },
          }),
      },
      icon('plus', 15),
      t('common.add')
    )
  );
  return col;
}

function weekTab() {
  const days = programDays();
  const week = weekDays();
  return h(
    'div',
    h(
      'div.prog-scroll',
      ...days.map((d, i) => dayColumn(d, week[i]))
    ),
    h(
      'p.muted.mt-3',
      { style: { fontSize: 'var(--fs-2xs)' } },
      icon('grip', 13),
      ' ',
      t('prog.moveHint')
    ),
    days.some((d) => d.items.length)
      ? h(
          'div.row.mt-4',
          ...days
            .filter((d) => d.items.length)
            .map((d) =>
              h(
                'button.btn.btn--ghost.btn--sm',
                {
                  onclick: () => {
                    const to = duplicateDay(d.dow);
                    if (to === null) {
                      toastOk(t('prog.emptyDay'));
                      return;
                    }
                    toastOk(`${t('prog.duplicated')} → ${DOW()[to]}`);
                    refresh();
                  },
                },
                icon('copy', 14),
                DOW()[d.dow]
              )
            )
        )
      : null
  );
}

/* ------------------------------ volume tab ------------------------------ */
function volTab() {
  const sets = weeklySetsByMuscle();
  const entries = Object.keys(MUSCLES)
    .map((m) => [m, sets.get(m) ?? 0])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    return h(
      'div.card.card--pad-lg',
      empty({
        glyph: '📊',
        title: t('pr.noData'),
        text: t('pr.noDataText'),
        action: h('button.btn.btn--soft.mt-3', { onclick: () => { tab = 'tpl'; refresh(); } }, t('prog.templates')),
      })
    );
  }

  const max = Math.max(...entries.map(([, n]) => n));
  const tone = { low: 'muted', below: 'warn', ok: 'ok', high: 'warn', veryHigh: 'danger' };

  return h(
    'div.card.card--pad-lg',
    section(
      t('prog.countSets'),
      { hint: t('pr.volumesByMuscle') },
      h(
        'div.stack',
        ...entries.map(([m, n]) => {
          const status = volumeStatus(n, m);
          const l = WEEKLY_SET_LANDMARKS[m];
          return h(
            'div.vol-row',
            h('span.vol-row__label', muscleName(m)),
            h(
              'div.bar',
              h('div.bar__fill', { style: { width: `${(n / max) * 100}%` } })
            ),
            h(
              'span.vol-row__val',
              String(n),
              l ? h('small', ` / ${l.min}–${l.max}`) : null
            )
          );
        })
      )
    )
  );
}

/* ------------------------------ templates ------------------------------ */
export function openTemplates(selectedId = null) {
  const grid = h('div.tpl-grid');
  const paint = () => {
    clear(grid);
    for (const tpl of TEMPLATES) {
      const days = tpl.days.filter((d) => d.items.length);
      const sets = tpl.days.reduce((a, d) => a + d.items.reduce((x, it) => x + it.sets, 0), 0);
      grid.append(
        h(
          'button.tpl-card',
          {
            'aria-pressed': String(getState().program.templateId === tpl.id),
            onclick: () => {
              applyTemplate(tpl.id);
              toastOk(`${t('onb.templateApplied')}: ${tplName(tpl)}`);
              paint();
              refresh();
            },
          },
          h('span.tpl-card__name', tplName(tpl)),
          h(
            'span.tpl-card__meta',
            `${days.length} ${t('dash.days')} · ${sets} ${t('common.sets')} · ${tpl.perWeek}×/week`
          ),
          h('span.tpl-card__meta', { style: { color: 'var(--text-3)' } }, tpl.desc),
          h(
            'div.tpl-card__days',
            ...days.map((d) => h('span.badge', DOW()[d.dow]))
          )
        )
      );
    }
  };
  paint();
  openModal({
    title: t('prog.templates'),
    body: grid,
    footer: h(
      'button.btn.btn--ghost.btn--sm',
      {
        onclick: () => {
          if (getState().program.days.length) {
            clearProgram();
            refresh();
          }
        },
      },
      t('prog.clearDay')
    ),
  });
}

function tplTab() {
  return h(
    'div.stack',
    h(
      'p.muted',
      t('onb.pickTemplate'),
    ),
    h(
      'button.btn.btn--primary.btn--block',
      { onclick: () => openTemplates(getState().program.templateId) },
      icon('layers', 16),
      t('prog.templates')
    )
  );
}

/* ------------------------------ view ------------------------------ */
export function render(_params, _ctx) {
  const view = h('div.view');
  const body =
    tab === 'week' ? weekTab() : tab === 'vol' ? volTab() : tplTab();

  mount(view, header(), segmented(), h('div.section', body));
  enterView(view);
  stagger(view.querySelectorAll('.card, .day-col, .tpl-card'));
  return view;
}
