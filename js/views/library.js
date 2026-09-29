/** Library: searchable exercise catalogue with a muscle map filter. */

import { h, mount, icon, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { num } from '../core/format.js';
import { refresh } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { section, empty } from '../ui/bits.js';
import { exerciseCard, exerciseGlyph, openExerciseSheet } from '../ui/exercise.js';
import { muscleMap } from '../ui/muscle.js';
import {
  EXERCISES, MUSCLES, EQUIPMENT, PATTERNS, equipmentName, muscleName, muscleSearchText, patternName,
} from '../data/exercises.js';
import { getState } from '../core/store.js';
import { bestEver, exName } from '../core/session.js';

const filters = { query: '', muscle: null, equipment: null, pattern: null, favOnly: false };

function matches(ex) {
  const favs = getState().favorites ?? [];
  if (filters.favOnly && !favs.includes(ex.id)) return false;
  if (filters.muscle && ex.p !== filters.muscle && !(ex.s ?? []).includes(filters.muscle)) return false;
  if (filters.equipment && ex.eq !== filters.equipment) return false;
  if (filters.pattern && ex.pat !== filters.pattern) return false;
  if (filters.query) {
    const hay = `${ex.n} ${ex.en} ${muscleSearchText(ex)} ${(ex.tags ?? []).join(' ')}`.toLowerCase();
    if (!hay.includes(filters.query.toLowerCase())) return false;
  }
  return true;
}

const list = () => EXERCISES.filter(matches);

function chipRow(entries, current, onPick, label) {
  return h(
    'div.chips.chips--scroll',
    ...entries.map(([id, meta]) =>
      h(
        'button.chip',
        {
          'aria-pressed': String(current === id),
          onclick: () => onPick(current === id ? null : id),
        },
        label(meta, id)
      )
    )
  );
}

/* Repainted without a full view re-render so the search field keeps focus. */
let repaint = () => {};

function searchBar() {
  const count = h('span.badge.badge--accent', String(list().length));
  const input = h('input.input', {
    type: 'search',
    value: filters.query,
    placeholder: t('lib.search'),
    oninput: (e) => {
      filters.query = e.target.value;
      repaint();
    },
  });
  return h(
    'div.stack',
    h(
      'div.row',
      h('div.input-group.grow', icon('search', 18), input),
      h(
        'div.segmented',
        h(
          'button',
          {
            class: !filters.favOnly ? 'is-active' : '',
            'aria-pressed': String(!filters.favOnly),
            onclick: () => {
              filters.favOnly = false;
              refresh();
            },
          },
          t('common.all')
        ),
        h(
          'button',
          {
            class: filters.favOnly ? 'is-active' : '',
            'aria-pressed': String(filters.favOnly),
            onclick: () => {
              filters.favOnly = true;
              refresh();
            },
          },
          icon('star', 15),
          t('lib.onlyFavs')
        )
      )
    ),
    h('div.row', h('span.section__hint', t('lib.results')), h('span.spacer'), count)
  );
}

function filterPanel() {
  return h(
    'div.stack',
    h('span.section__hint', t('lib.muscle')),
    chipRow(
      Object.entries(MUSCLES),
      filters.muscle,
      (v) => {
        filters.muscle = v;
        refresh();
      },
      (_m, id) => muscleName(id)
    ),
    h('span.section__hint', t('lib.equipment')),
    chipRow(
      Object.entries(EQUIPMENT),
      filters.equipment,
      (v) => {
        filters.equipment = v;
        refresh();
      },
      (_m, id) => equipmentName(id)
    ),
    h('span.section__hint', t('lib.type')),
    chipRow(
      Object.entries(PATTERNS),
      filters.pattern,
      (v) => {
        filters.pattern = v;
        refresh();
      },
      (_p, id) => patternName(id)
    )
  );
}

function prPanel() {
  const withPr = list()
    .map((ex) => ({ ex, best: bestEver(ex.id) }))
    .filter((row) => row.best)
    .sort((a, b) => b.best.e1rm - a.best.e1rm)
    .slice(0, 8);
  if (!withPr.length) return null;
  return section(
    t('pr.records'),
    { hint: t('wo.e1rm') },
    h(
      'div.card.card--flush',
      h(
        'div.list',
        ...withPr.map(({ ex, best }) =>
          h(
            'button.list__item',
            { onclick: () => openExerciseSheet(ex.id, { onChange: () => refresh() }) },
            h('span.list__thumb', { style: { padding: '3px' } }, exerciseGlyph(ex)),
            h(
              'div.list__body',
              h('div.list__title', exName(ex)),
              h('div.list__meta', `${num(best.w)} × ${best.r} · ${best.date}`)
            ),
            h('div.list__value', num(best.e1rm, 1))
          )
        )
      )
    )
  );
}

function results() {
  const grid = h('div.ex-grid');
  const paint = () => {
    clear(grid);
    const found = list();
    if (!found.length) {
      grid.append(
        h(
          'div',
          { style: { gridColumn: '1 / -1' } },
          empty({ glyph: '🔍', title: t('lib.noResults'), text: t('lib.noResultsText') })
        )
      );
      return;
    }
    for (const ex of found) {
      grid.append(
        exerciseCard(ex, { onOpen: (id) => openExerciseSheet(id, { onChange: () => refresh() }) })
      );
    }
  };
  paint();
  repaint = paint;
  return section(t('lib.title'), { hint: `${num(list().length)}` }, grid);
}

function mapPanel() {
  return h(
    'div.card.card--pad-lg',
    section(
      t('lib.muscle'),
      { hint: t('lib.primary') },
      h(
        'div.mus-map',
        muscleMap(filters.muscle ? [filters.muscle] : Object.keys(MUSCLES)),
        h(
          'div.mus-map__parts',
          ...Object.keys(MUSCLES).map((id) =>
            h(
              'button.mus-part',
              {
                class: filters.muscle === id ? 'mus-part--primary' : 'mus-part--secondary',
                'aria-pressed': String(filters.muscle === id),
                style: { cursor: 'pointer' },
                onclick: () => {
                  filters.muscle = filters.muscle === id ? null : id;
                  refresh();
                },
              },
              muscleName(id)
            )
          )
        )
      )
    )
  );
}

export function render(_params, _ctx) {
  const view = h('div.view');
  repaint = () => {};

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('lib.title')), h('p.topbar__sub', t('lib.sub'))),
      h('span.badge', `${num(EXERCISES.length)}`)
    ),
    searchBar(),
    filterPanel(),
    prPanel(),
    results(),
    mapPanel()
  );
  enterView(view);
  stagger(view.querySelectorAll('.ex-card'));
  return view;
}
