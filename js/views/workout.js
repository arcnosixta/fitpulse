/** Workout logger: set table, rest timer, PR detection and session summary. */

import { h, mount, icon, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState } from '../core/store.js';
import { num, currentUnits, toDisplayWeight, fromDisplayWeight, formatTime, minutes } from '../core/format.js';
import { navigate, refresh } from '../core/router.js';
import { openModal, openSheet, confirmDialog, toastOk, toastErr, haptic } from '../core/ui.js';
import { empty, plateStrip, stat } from '../ui/bits.js';
import { openExerciseSheet, openExercisePicker, exerciseGlyph, isFav, toggleFav } from '../ui/exercise.js';
import { restTimer, timerWidget } from '../ui/timer.js';
import { getExercise } from '../data/exercises.js';
import { WARMUP } from '../data/templates.js';
import { dayType } from '../calc/strength.js';
import {
  startWorkout, patchActive, toggleSetDone, addSetToItem, removeSetFromItem,
  sessionStats, finishWorkout, discardWorkout, suggestNext, lastPerformance, exName, todaysPlan, e1rmValue,
} from '../core/session.js';

const collapsed = new Set();
const plateHooks = new Map();

const unit = () => currentUnits().kg;
const disp = (kg) => toDisplayWeight(kg ?? 0);
const parse = (v) => fromDisplayWeight(Number(v) || 0);

/* ------------------------------ top bar ------------------------------ */
function logTop(session, stats) {
  const timeEl = h('span', formatTime(Date.now() - session.startedAt));
  const setEl = h('span', `${stats.done}/${stats.total}`);

  const tick = setInterval(() => {
    timeEl.textContent = formatTime(Date.now() - session.startedAt);
    const s = sessionStats();
    if (s) setEl.textContent = `${s.done}/${s.total}`;
  }, 1000);
  view.addEventListener('view:teardown', () => clearInterval(tick), { once: true });

  return h(
    'div.log-top',
    h(
      'button.btn.btn--ghost.btn--icon',
      { 'aria-label': t('common.back'), onclick: () => navigate('dashboard') },
      icon('prev', 18)
    ),
    h(
      'div.log-top__title',
      h('div.log-top__name', session.name || t('wo.title')),
      h('div.log-top__meta', setEl, ' · ', timeEl, ' · ', num(stats.volume / 1000, 1), ' т')
    ),
    h(
      'button.btn.btn--primary.btn--sm',
      { onclick: () => openFinish(session) },
      icon('check', 15),
      t('wo.finish')
    )
  );
}

/* ------------------------------ set table ------------------------------ */
function setTable(item, session) {
  const table = h('table.set-table');
  const target = String(item.targetReps ?? '');
  const head = h(
    'thead',
    h(
      'tr',
      h('th', '#'),
      h('th', t('common.weight')),
      h('th', t('common.reps')),
      h('th', 'RPE'),
      h('th', t('wo.e1rm')),
      h('th', '')
    )
  );

  const body = h('tbody');

  const repHint = (r) => String(r ?? '').split('-')[0];
  const weightStep = unit() === 'lb' ? 5 : 2.5;

  const patch = (index, set) => {
    const cell = body.children[index];
    if (!cell) return;
    cell.classList.toggle('is-done', !!set.done);
    cell.classList.toggle('is-pr', !!set.isPr);
    const e1 = cell.querySelector('[data-e1rm]');
    if (e1) e1.textContent = set.e1rm ? num(set.e1rm, 1) : '—';
    const chk = cell.querySelector('.set-check');
    if (chk) {
      chk.setAttribute('aria-pressed', String(!!set.done));
      clear(chk);
      if (set.done) chk.append(icon('check', 16));
    }
  };

  item.sets.forEach((set, index) => {
    const wInput = h('input.cell', {
      type: 'number',
      inputmode: 'decimal',
      step: String(weightStep),
      min: '0',
      value: set.w ? String(disp(set.w)) : '',
      placeholder: '0',
      onchange: (e) => {
        const next = patchActive((s) => {
          const target2 = s.items.find((i) => i.uid === item.uid).sets[index];
          target2.w = e.target.value === '' ? null : parse(e.target.value);
          if (target2.w && !target2.r) target2.r = Number(repHint(target2.targetReps)) || null;
          if (target2.w && target2.r) target2.e1rm = e1rmValue(target2.w, target2.r, target2.rpe);
          return s;
        });
        const updated = next?.items.find((i) => i.uid === item.uid).sets[index];
        if (updated) patch(index, updated);
        plateHooks.get(item.uid)?.(updated?.w);
      },
    });

    const rInput = h('input.cell', {
      type: 'number',
      inputmode: 'numeric',
      min: '0',
      value: set.r ? String(set.r) : '',
      placeholder: repHint(target) || '8',
      onchange: (e) => {
        const next = patchActive((s) => {
          const target2 = s.items.find((i) => i.uid === item.uid).sets[index];
          target2.r = e.target.value === '' ? null : Number(e.target.value);
          if (target2.w && target2.r) target2.e1rm = e1rmValue(target2.w, target2.r, target2.rpe);
          return s;
        });
        const updated = next?.items.find((i) => i.uid === item.uid).sets[index];
        if (updated) patch(index, updated);
      },
    });

    const rpeInput = h('input.cell', {
      type: 'number',
      inputmode: 'numeric',
      min: '5',
      max: '10',
      step: '0.5',
      value: set.rpe ? String(set.rpe) : '',
      placeholder: String(item.rpe ?? 8),
      onchange: (e) => {
        const next = patchActive((s) => {
          const target2 = s.items.find((i) => i.uid === item.uid).sets[index];
          target2.rpe = e.target.value === '' ? null : Number(e.target.value);
          if (target2.w && target2.r) target2.e1rm = e1rmValue(target2.w, target2.r, target2.rpe);
          return s;
        });
        const updated = next?.items.find((i) => i.uid === item.uid).sets[index];
        if (updated) patch(index, updated);
      },
    });

    const check = h(
      'button.set-check',
      {
        'aria-label': t('wo.set'),
        'aria-pressed': String(!!set.done),
        onclick: () => {
          const updated = toggleSetDone(item.uid, index);
          if (!updated) return;
          const now = updated.items.find((i) => i.uid === item.uid).sets[index];
          patch(index, now);
          haptic(10);
          if (now.done) {
            restTimer.start(item.rest ?? 90);
            if (now.isPr) {
              toastOk(`🏆 ${t('wo.newPr')}: ${num(now.e1rm, 1)} ${unit()}`);
              haptic([30, 40, 30]);
            }
          }
          updateDoneCount();
        },
      },
      set.done ? icon('check', 16) : null
    );

    const row = h(
      'tr.set-row',
      { class: [set.done ? 'is-done' : '', set.isPr ? 'is-pr' : ''].filter(Boolean).join(' ') },
      h('td', h('span.cell.cell--idx', String(index + 1))),
      h('td', wInput),
      h('td', rInput),
      h('td', rpeInput),
      h('td', h('span.cell', { 'data-e1rm': '1' }, set.e1rm ? num(set.e1rm, 1) : '—')),
      h('td', check)
    );
    body.append(row);
  });

  table.append(head, body);

  const doneCount = h('span.set-done-count');
  const updateDoneCount = () => {
    const s = sessionStats();
    if (s) doneCount.replaceChildren(icon('check', 13), ` ${s.done}/${s.total} ${t('wo.sets')}`);
  };
  updateDoneCount();

  return h(
    'div',
    table,
    h(
      'div.row.row--wrap.mt-3',
      doneCount,
      h('span.spacer'),
      h(
        'button.btn.btn--ghost.btn--xs',
        {
          onclick: () => {
            addSetToItem(item.uid);
            refresh();
          },
        },
        icon('plus', 14),
        t('wo.addSet')
      ),
      item.sets.length > 1
        ? h(
            'button.btn.btn--ghost.btn--xs',
            {
              onclick: () => {
                removeSetFromItem(item.uid, item.sets.length - 1);
                refresh();
              },
            },
            icon('trash', 14),
            t('wo.delSet')
          )
        : null
    )
  );
}

/* ------------------------------ plates ------------------------------ */
function plateBlock(itemUid) {
  const item = getState().active.items.find((i) => i.uid === itemUid);
  const set = item.sets.find((s) => s.w) ?? item.sets[item.sets.length - 1];
  const host = h('div');
  const paintPlates = (weight) => {
    const w = weight ?? set?.w;
    clear(host);
    if (!w) {
      host.append(h('p.muted', { style: { fontSize: 'var(--fs-2xs)' } }, t('wo.platesHint')));
      return;
    }
    host.append(plateStrip(w));
  };
  paintPlates(set?.w);
  plateHooks.set(itemUid, paintPlates);
  host.addEventListener('view:teardown', () => plateHooks.delete(itemUid), { once: true });
  return host;
}

/* ------------------------------ exercise block ------------------------------ */
function exBlock(item, order) {
  const ex = getExercise(item.ex);
  const prev = lastPerformance(item.ex);
  const isOpen = !collapsed.has(item.uid);
  const prevWeight = prev?.sets?.length ? prev.sets[prev.sets.length - 1].w : null;

  const head = h(
    'div.ex-block__head',
    {
      onclick: () => {
        if (collapsed.has(item.uid)) collapsed.delete(item.uid);
        else collapsed.add(item.uid);
        refresh();
      },
    },
    h('span.ex-block__ord', String(order)),
    h(
      'div.grow',
      h('div.log-top__name', exName(ex)),
      h(
        'div.log-top__meta',
        `${item.targetSets} × ${item.targetReps} · ${item.rest} ${t('common.sec')}`,
        prevWeight ? ` · ${t('wo.prevSet')} ${num(disp(prevWeight))} ${unit()}` : ''
      )
    ),
    h(
      'button.btn.btn--ghost.btn--icon',
      {
        'aria-label': t('lib.fav'),
        'aria-pressed': String(isFav(item.ex)),
        onclick: (e) => {
          e.stopPropagation();
          toggleFav(item.ex);
          refresh();
        },
      },
      icon('star', 16)
    ),
    h('button.btn.btn--ghost.btn--icon', { 'aria-label': t('lib.title'), onclick: (e) => { e.stopPropagation(); openExerciseSheet(item.ex, { onChange: () => refresh() }); } }, icon('info', 16))
  );

  const suggestion = suggestNext(item.uid);
  const body = isOpen
    ? h(
        'div.ex-block__body',
        h(
          'div.row.row--wrap',
          h('span.badge', icon('clock', 12), ` ${item.rest} ${t('common.sec')}`),
          suggestion
            ? h(
                'button.badge.badge--accent',
                {
                  onclick: () => {
                    const next = patchActive((s) => {
                      const it = s.items.find((i) => i.uid === item.uid);
                      for (const st of it.sets) if (!st.w) st.w = suggestion;
                      return s;
                    });
                    refresh();
                  },
                },
                icon('target', 12),
                ` ${t('common.suggest')} ${num(disp(suggestion))} ${unit()}`
              )
            : null,
          h(
            'button.badge',
            {
              onclick: () => {
                restTimer.start(item.rest ?? 90);
                toastOk(`${t('wo.restTimerOn')} ${item.rest} ${t('common.sec')}`);
              },
            },
            icon('timer', 12),
            ` ${t('wo.restTimer')}`
          )
        ),
        h('div.mt-3', setTable(item, getState().active)),
        h('div.mt-3', plateBlock(item.uid)),
        prev?.sets?.length
          ? h(
              'p.formula-note.mt-3',
              `${t('wo.prevSet')}: ${prev.sets.map((s) => `${num(disp(s.w))}×${s.r}`).join(' · ')}`
            )
          : null
      )
    : null;

  return h('div.ex-block', head, body);
}

/* ------------------------------ warmup & plates sheets ------------------------------ */
function openWarmup(session) {
  const muscles = session.items.map((i) => getExercise(i.ex)?.p).filter(Boolean);
  const kind = dayType(muscles);
  const list = WARMUP[kind] ?? WARMUP.full;
  openSheet({
    title: t('wo.warmup'),
    body: h(
      'div.stack',
      h('p.formula-note', t('lib.tempoHint')),
      h(
        'div.list.card.card--flush',
        ...list.map((entry) => {
          const ex = getExercise(entry.ex);
          return h(
            'div.list__item',
            h('span.list__thumb', { style: { padding: '3px' } }, exerciseGlyph(ex)),
            h('div.list__body', h('div.list__title', exName(ex)), h('div.list__meta', entry.note))
          );
        })
      )
    ),
  });
}

function openPlates() {
  const strip = h('div.mt-3');
  const input = h('input.input.input--num', { type: 'number', inputmode: 'decimal', value: '60' });
  const paint = () => {
    clear(strip);
    strip.append(plateStrip(parse(input.value)));
  };
  input.addEventListener('input', paint);
  paint();
  openModal({
    title: t('wo.plates'),
    body: h('div.stack', h('div.input-group', input, h('span.input-group__suffix', unit())), strip),
  });
}

/* ------------------------------ finish ------------------------------ */
function openFinish(session) {
  const stats = sessionStats();
  const prs = session.items
    .flatMap((i) => i.sets)
    .filter((s) => s.isPr)
    .map((s) => s.e1rm);
  const notes = h('textarea.input', { rows: '3', placeholder: t('common.notes') });

  const { close } = openModal({
    title: t('wo.summary'),
    body: h(
      'div.stack',
      h(
        'div.result-hero',
        h('div.result-hero__num', num(stats.volume / 1000, 1), h('span.result-hero__cap', ' т')),
        h('p.muted', `${stats.done}/${stats.total} ${t('wo.sets')}`)
      ),
      h(
        'div.grid.grid--3',
        stat({ label: t('wo.duration'), value: minutes(stats.minutes) }),
        stat({ label: t('wo.calories'), value: num(stats.kcal), unit: t('common.kcal') }),
        stat({ label: t('wo.newPr'), value: String(prs.length) })
      ),
      prs.length ? h('p.formula-note', `🏆 ${prs.map((v) => num(v, 1)).join(' · ')}`) : null,
      h('label.field', h('span.field__label', t('common.notes')), notes)
    ),
    footer: h(
      'div.row',
      h(
        'button.btn.btn--ghost',
        {
          onclick: async () => {
            if (await confirmDialog({ title: t('wo.discard'), text: t('wo.discardConfirm'), confirmLabel: t('wo.discard'), danger: true })) {
              discardWorkout();
              toastOk(t('common.done'));
              navigate('dashboard');
            }
          },
        },
        icon('trash', 15),
        t('wo.discard')
      ),
      h('span.spacer'),
      h(
        'button.btn.btn--primary',
        {
          onclick: () => {
            patchActive((s) => {
              s.notes = notes.value;
              return s;
            });
            const log = finishWorkout();
            close();
            if (!log) {
              toastErr(t('wo.noPrev'));
              return;
            }
            toastOk(`${t('wo.finish')} · ${num(log.volume / 1000, 1)} т`);
            haptic([20, 40, 20]);
            navigate('progress');
          },
        },
        icon('check', 16),
        t('wo.finish')
      )
    ),
  });
}

/* ------------------------------ view ------------------------------ */
let view;

export function render(params) {
  let session = getState().active;

  if (!session) {
    const plan = todaysPlan();
    view = h('div.view');
    mount(
      view,
      h('header.topbar', h('div', h('h1.topbar__title', t('wo.title')))),
      h(
        'div.card.card--pad-lg',
        empty({
          glyph: '🏋️',
          title: t('dash.noPlan'),
          text: plan ? t('dash.restDayText') : t('dash.noPlanText'),
          action: h(
            'div.row.mt-3',
            plan
              ? h(
                  'button.btn.btn--primary',
                  {
                    onclick: () => {
                      startWorkout({ day: plan });
                      refresh();
                    },
                  },
                  icon('play', 16),
                  t('dash.startWorkout')
                )
              : h('button.btn.btn--soft', { onclick: () => navigate('program') }, t('dash.buildPlan')),
            h(
              'button.btn.btn--ghost',
              {
                onclick: () => {
                  startWorkout({ name: t('wo.title'), items: [] });
                  refresh();
                },
              },
              icon('plus', 16),
              t('common.add')
            )
          ),
        })
      )
    );
    return view;
  }

  if (params?.ex && !session.items.some((i) => i.ex === params.ex)) {
    session = startWorkout({
      dow: session.dow,
      name: session.name,
      items: [...session.items, { uid: undefined, ex: params.ex, sets: 3, reps: '8-10', rest: 90 }],
    });
  }

  const stats = sessionStats();
  const doneAll = stats.done >= stats.total && stats.total > 0;

  view = h('div.view');
  mount(
    view,
    logTop(session, stats),
    h(
      'div.row.row--wrap.mt-3',
      h('button.btn.btn--soft.btn--sm', { onclick: () => openWarmup(session) }, icon('bolt', 15), t('wo.warmup')),
      h('button.btn.btn--soft.btn--sm', { onclick: openPlates }, icon('scale', 15), t('wo.plates')),
      h(
        'button.btn.btn--soft.btn--sm',
        {
          onclick: () =>
            openExercisePicker({
              title: t('wo.addSet'),
              onPick: (exId) => {
                startWorkout({
                  dow: session.dow,
                  name: session.name,
                  items: [...session.items, { ex: exId, sets: 3, reps: '8-10', rest: 90 }],
                });
                refresh();
              },
            }),
        },
        icon('plus', 15),
        t('common.add')
      ),
      h('span.spacer'),
      h(
        'button.btn.btn--ghost.btn--sm',
        {
          onclick: async () => {
            if (await confirmDialog({ title: t('wo.discard'), text: t('wo.discardConfirm'), confirmLabel: t('wo.discard'), danger: true })) {
              discardWorkout();
              toastOk(t('common.done'));
              navigate('dashboard');
            }
          },
        },
        icon('trash', 15)
      )
    ),
    h(
      'div.section',
      timerWidget({
        onSkip: () => {
          const nextPending = session.items.flatMap((i) => i.sets).find((s) => !s.done);
          if (nextPending) toastOk(t('wo.next'));
        },
      })
    ),
    h(
      'div.section',
      session.items.length
        ? h('div', ...session.items.map((item, i) => exBlock(item, i + 1)))
        : h(
            'div.card.card--pad-lg',
            empty({ glyph: '➕', title: t('prog.emptyDay'), text: t('dash.noPlanText') })
          )
    ),
    h(
      'div.row',
      h('span.spacer'),
      h(
        'button.btn.btn--primary.btn--lg',
        { onclick: () => openFinish(session), disabled: !doneAll },
        icon('check', 18),
        t('wo.finish')
      ),
      h('span.spacer')
    )
  );
  return view;
}
