/** Exercise cards, detail sheet and the picker used across views. */

import { h, icon, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState, update } from '../core/store.js';
import { EXERCISES, getExercise, MUSCLES, EQUIPMENT, equipmentName, muscleName, muscleSearchText } from '../data/exercises.js';
import { muscleMap } from './muscle.js';
import { openSheet, openModal, toastOk, haptic } from '../core/ui.js';
import { exName, lastPerformance, bestEver, programDays, addToDay } from '../core/session.js';
import { DOW, weight as fmtWeight, num } from '../core/format.js';
import { e1rmValue } from '../calc/strength.js';

/* ------------------------------ glyph ------------------------------ */
export function exerciseGlyph(ex) {
  if (!ex) return h('span');
  const active = ex.p === 'fullBody' ? Object.keys(MUSCLES) : [ex.p, ...(ex.s ?? [])];
  return muscleMap(active);
}

/* ------------------------------ favourite ------------------------------ */
export function isFav(id) {
  return (getState().favorites ?? []).includes(id);
}

export function toggleFav(id) {
  const favs = getState().favorites ?? [];
  update({ favorites: favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id] });
  return !favs.includes(id);
}

/* ------------------------------ card ------------------------------ */
export function exerciseCard(ex, { onOpen, showFav = true } = {}) {
  const favBtn = h(
    'button.ex-card__fav',
    {
      'aria-pressed': String(isFav(ex.id)),
      'aria-label': t('lib.fav'),
      onclick: (e) => {
        e.stopPropagation();
        const on = toggleFav(ex.id);
        favBtn.setAttribute('aria-pressed', String(on));
        favBtn.style.color = on ? 'var(--warn)' : '';
        haptic(8);
      },
    },
    icon('star', 16)
  );

  return h(
    'article.ex-card',
    { tabindex: '0', role: 'button', onclick: () => onOpen?.(ex.id) },
    showFav ? favBtn : null,
    h(
      'div.ex-card__top',
      h('div.ex-card__glyph', exerciseGlyph(ex)),
      h(
        'div.grow',
        h('div.ex-card__name', exName(ex)),
        h('div.ex-card__en', getLangSafe(ex.en))
      )
    ),
    h(
      'div.ex-card__tags',
      h('span.mus-part.mus-part--primary', muscleName(ex.p)),
      ...(ex.s ?? []).slice(0, 2).map((m) => h('span.mus-part.mus-part--secondary', muscleName(m)))
    ),
    h(
      'div.ex-card__foot',
      icon('dumbbell', 13),
      equipmentName(ex.eq),
      h('span.spacer'),
      icon('timer', 13),
      `${ex.rest} ${t('common.sec')}`
    )
  );
}

const getLangSafe = (s) => s ?? '';

/* ------------------------------ detail sheet ------------------------------ */
export function openExerciseSheet(exId, { onChange } = {}) {
  const ex = getExercise(exId);
  if (!ex) return;
  const best = bestEver(exId);
  const prev = lastPerformance(exId);

  const body = h('div.stack');
  const active = ex.p === 'fullBody' ? Object.keys(MUSCLES) : [ex.p, ...(ex.s ?? [])];

  body.append(
    h(
      'div.row',
      h('div.ex-card__glyph', { style: { width: '76px', height: '96px' } }, exerciseGlyph(ex)),
      h(
        'div.grow',
        h('h2', { style: { fontSize: 'var(--fs-xl)' } }, exName(ex)),
        h('p.muted', { style: { fontSize: 'var(--fs-sm)' } }, ex.en),
        h(
          'div.chips.mt-2',
          h('span.badge.badge--accent', t('lib.diff') + ' ' + t(`lib.diff${ex.d}`)),
          h('span.badge', ex.t),
          h('span.badge', equipmentName(ex.eq)),
          ex.u ? h('span.badge.badge--info', ' unilateral') : null,
          ex.bw ? h('span.badge.badge--ok', 'bodyweight') : null
        )
      )
    ),
    h(
      'div.mus-map',
      muscleMap(active),
      h(
        'div',
        h(
          'div.mus-map__parts',
          h('span.mus-part.mus-part--primary', muscleName(ex.p)),
          ...(ex.s ?? []).map((m) => h('span.mus-part.mus-part--secondary', muscleName(m)))
        ),
        h(
          'p.muted.mt-2',
          { style: { fontSize: 'var(--fs-2xs)' } },
          `${t('lib.tempo')}: ${ex.tempo} · ${t('lib.rest')}: ${ex.rest} ${t('common.sec')}`
        )
      )
    )
  );

  if (ex.cues?.length) {
    body.append(
      h(
        'div.section',
        h('div.section__head', h('h3.section__title', t('lib.cues'))),
        h(
          'ul.stack',
          { style: { gap: '6px' } },
          ...ex.cues.map((c) =>
            h(
              'li.row',
              { style: { alignItems: 'flex-start' } },
              h('span', { style: { color: 'var(--accent-1)', fontWeight: '800' } }, '—'),
              h('span', { style: { fontSize: 'var(--fs-sm)', color: 'var(--text-2)' } }, c)
            )
          )
        )
      )
    );
  }

  if (best) {
    const e1rm = best.e1rm || e1rmValue(best.w, best.r, best.rpe);
    body.append(
      h(
        'div.grid.grid--3',
        h(
          'div.stat',
          h('span.stat__label', t('pr.best')),
          h('span.stat__value', fmtWeight(best.w), h('span.stat__unit', `× ${best.r}`))
        ),
        h(
          'div.stat',
          h('span.stat__label', t('wo.e1rm')),
          h('span.stat__value', fmtWeight(e1rm))
        ),
        h('div.stat', h('span.stat__label', t('common.today')), h('span.stat__value', best.date.slice(5)))
      )
    );
  }

  if (prev?.sets?.length) {
    body.append(
      h(
        'div.card.card--flush',
        h('div.card__head', { style: { padding: '12px 16px 0' } }, h('span.card__title', t('wo.prevSet'))),
        h(
          'div.list',
          ...prev.sets.slice(-4).map((s) =>
            h(
              'div.list__item',
              h('span.list__title', `${fmtWeight(s.w)} × ${s.r}`),
              h('span.list__value', s.e1rm ? fmtWeight(s.e1rm) : '')
            )
          )
        )
      )
    );
  }

  const addRow = h('div.stack');
  const addBtn = h(
    'button.btn.btn--primary.btn--block',
    { onclick: () => showAdd() },
    icon('plus', 16),
    t('prog.addExercise')
  );
  addRow.append(addBtn);

  const { close } = openSheet({
    title: t('lib.title'),
    body,
    footer: h('div.row', { style: { width: '100%' } }, addBtn),
    onClose: onChange,
  });

  function showAdd() {
    const days = programDays();
    const grid = h(
      'div.chips',
      ...days.map((d) =>
        h(
          'button.chip',
          {
            onclick: () => {
              addToDay(d.dow, ex.id);
              toastOk(`${exName(ex)} → ${DOW()[d.dow]}`);
              close();
              onChange?.();
            },
          },
          DOW()[d.dow],
          h('span.chip__count', String(d.items.length))
        )
      )
    );
    openModal({
      title: t('prog.setName'),
      body: h('div.stack', grid),
      onClose: () => {},
    });
  }
}

/* ------------------------------ picker ------------------------------ */
/**
 * Modal exercise picker with search + filters.
 * @param {{onPick:(id:string)=>void,title?:string}} opts
 */
export function openExercisePicker({ onPick, title } = {}) {
  let muscle = null;
  let equipment = null;
  let query = '';

  const results = h('div.stack');
  const input = h('input.input', {
    type: 'search',
    placeholder: t('lib.search'),
    oninput: (e) => {
      query = e.target.value.trim().toLowerCase();
      paint();
    },
  });

  const muscleChips = h(
    'div.chips.chips--scroll',
    ...Object.keys(MUSCLES).map((id) =>
      h(
        'button.chip',
        {
          'aria-pressed': 'false',
          onclick: (e) => {
            muscle = muscle === id ? null : id;
            e.currentTarget.setAttribute('aria-pressed', String(muscle === id));
            paint();
          },
        },
        muscleName(id)
      )
    )
  );

  const equipChips = h(
    'div.chips.chips--scroll',
    ...Object.entries(EQUIPMENT).map(([id, m]) =>
      h(
        'button.chip',
        {
          'aria-pressed': 'false',
          onclick: (e) => {
            equipment = equipment === id ? null : id;
            e.currentTarget.setAttribute('aria-pressed', String(equipment === id));
            paint();
          },
        },
        m.n
      )
    )
  );

  const count = h('span.section__hint');

  const paint = () => {
    const list = EXERCISES.filter((ex) => {
      if (muscle && ex.p !== muscle && !(ex.s ?? []).includes(muscle)) return false;
      if (equipment && ex.eq !== equipment) return false;
      if (query && !`${ex.n} ${ex.en} ${muscleSearchText(ex)}`.toLowerCase().includes(query)) return false;
      return true;
    });
    count.textContent = `${num(list.length)} ${t('lib.results')}`;
    clear(results);
    if (!list.length) {
      results.append(h('div.empty', h('div.empty__title', t('lib.noResults')), h('p.empty__text', t('lib.noResultsText'))));
      return;
    }
    for (const ex of list.slice(0, 60)) {
      results.append(
        h(
          'button.food-hit',
          { onclick: () => { close(); onPick?.(ex.id); } },
          h('span.food-hit__glyph', { style: { padding: '0' } }, exerciseGlyph(ex)),
          h(
            'span',
            h('span.food-hit__name', { style: { fontWeight: '650' } }, exName(ex)),
            h('span.food-hit__macros', muscleName(ex.p), ' · ', equipmentName(ex.eq))
          ),
          h('span.food-hit__kcal', { style: { fontSize: 'var(--fs-2xs)' } }, `${ex.rest}с`)
        )
      );
    }
  };

  const { close } = openModal({
    title: title ?? t('prog.addExercise'),
    body: h(
      'div.stack',
      input,
      muscleChips,
      equipChips,
      h('div.row.row--between', h('span.card__sub', t('lib.primary')), count),
      results
    ),
  });

  paint();
  setTimeout(() => input.focus(), 80);
}
