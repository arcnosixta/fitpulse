/** Nutrition: daily log, meal cards, macro targets, water and micronutrients. */

import { h, mount, icon, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { getState, todayKey } from '../core/store.js';
import { num, formatDate, relativeDay, grams } from '../core/format.js';
import { refresh } from '../core/router.js';
import { enterView, stagger } from '../core/anim.js';
import { openModal, openSheet, toastOk, haptic } from '../core/ui.js';
import { section, macroRow, kcalBig, stat } from '../ui/bits.js';
import { lineChart, ring as ringChart } from '../ui/charts.js';
import {
  dayItems, dayTotals, addFood, removeFood, setGrams, targets, kcalSeries, recentFoods,
  addWater, setWater, copyDay, dietScore, searchFoods, foodName, categoryName, categoryGlyph, mealName,
} from '../core/nutrition.js';
import { FOOD_CATEGORIES, getFood } from '../data/foods.js';
import { CARB_DAYS } from '../calc/macros.js';

let dayKey = todayKey();
let tab = 'log';

const TABS = [
  { id: 'log', key: 'nut.title' },
  { id: 'week', key: 'nut.week' },
  { id: 'micro', key: 'nut.micronutrients' },
];

/* ------------------------------ date nav ------------------------------ */
const shiftDay = (delta) => {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  refresh();
};

/* ------------------------------ food picker ------------------------------ */
function openFoodSearch(mealId) {
  let query = '';
  let category = null;
  const results = h('div.stack');
  const input = h('input.input', {
    type: 'search',
    placeholder: t('nut.searchFood'),
    oninput: (e) => {
      query = e.target.value;
      paint();
    },
  });
  const cats = h(
    'div.chips.chips--scroll',
    ...Object.keys(FOOD_CATEGORIES).map((cat) =>
      h(
        'button.chip',
        {
          'aria-pressed': 'false',
          onclick: (e) => {
            category = category === cat ? null : cat;
            e.currentTarget.setAttribute('aria-pressed', String(category === cat));
            paint();
          },
        },
        `${categoryGlyph(cat)} ${categoryName(cat)}`
      )
    )
  );
  const recents = h(
    'div.chips.chips--scroll',
    ...recentFoods(10).map((f) =>
      h('button.chip', { onclick: () => pick(f.id) }, `${categoryGlyph(f.cat)} ${foodName(f)}`)
    )
  );

  const pick = (foodId) => {
    const food = getFood(foodId);
    close();
    openPortion(food, mealId);
  };

  const paint = () => {
    clear(results);
    const found = searchFoods(query, { category }).slice(0, 40);
    if (!found.length) {
      results.append(h('div.empty', h('div.empty__title', t('nut.noFoods'))));
      return;
    }
    for (const f of found) {
      results.append(
        h(
          'button.food-hit',
          { onclick: () => pick(f.id) },
          h('span.food-hit__glyph', categoryGlyph(f.cat)),
          h(
            'span',
            h('span.food-hit__name', foodName(f)),
            h('span.food-hit__macros', `${num(f.p, 1)} / ${num(f.f, 1)} / ${num(f.c, 1)}`)
          ),
          h('span.food-hit__kcal', `${num(f.k)} ${t('common.kcal')}`)
        )
      );
    }
  };
  paint();

  const { close } = openModal({
    title: t('nut.addFood'),
    body: h('div.stack', input, cats, recentFoods().length ? h('p.section__hint', t('nut.recent')) : null, recents, results),
  });
  setTimeout(() => input.focus(), 80);
}

function openPortion(food, mealId) {
  const unitOptions = [50, 100, 150, 200, 250, 300];
  const gramInput = h('input.input.input--num', { type: 'number', inputmode: 'numeric', value: '100', min: '1' });
  const preview = h('div');
  const paint = () => {
    const g = Math.max(1, Number(gramInput.value) || 0);
    const k = (food.k * g) / 100;
    clear(preview);
    preview.append(
      h(
        'div.grid.grid--3',
        stat({ label: t('common.kcal'), value: num(k) }),
        stat({ label: t('common.protein'), value: num((food.p * g) / 100, 1), unit: 'г' }),
        stat({ label: t('common.carbs'), value: num((food.c * g) / 100, 1), unit: 'г' })
      )
    );
  };
  gramInput.addEventListener('input', paint);
  paint();

  const { close } = openSheet({
    title: foodName(food),
    body: h(
      'div.stack',
      h('p.muted', `${categoryName(food.cat)} · ${num(food.k)} ${t('common.kcal')} / 100 ${t('nut.per100')}`),
      h(
        'div.chips',
        ...unitOptions.map((g) =>
          h('button.chip', { onclick: () => { gramInput.value = String(g); paint(); } }, `${g} г`)
        )
      ),
      h('div.input-group', gramInput, h('span.input-group__suffix', 'г')),
      preview
    ),
    footer: h(
      'button.btn.btn--primary.btn--block',
      {
        onclick: () => {
          addFood(dayKey, mealId, food.id, Number(gramInput.value));
          haptic(8);
          toastOk(`${foodName(food)} · ${grams(Number(gramInput.value))}`);
          close();
          refresh();
        },
      },
      icon('plus', 16),
      t('common.add')
    ),
  });
}

/* ------------------------------ meals ------------------------------ */
function mealCard(meal, entries, kcal) {
  const body = entries.length
    ? h(
        'div.stack',
        ...entries.map((entry) =>
          h(
            'div.food-row',
            h('span.food-row__name', h('b', foodName(entry.food)), h('small', categoryName(entry.food.cat))),
            h(
              'button.btn.btn--ghost.btn--xs',
              {
                onclick: async () => {
                  const g = await promptGram(entry);
                  if (g == null) return;
                  setGrams(dayKey, meal.id, entry.index, g);
                  refresh();
                },
              },
              h('span.food-row__gram', grams(entry.g))
            ),
            h('span.food-row__kcal', `${num(entry.macros.kcal)}`),
            h(
              'button.food-row__del',
              {
                'aria-label': t('common.delete'),
                onclick: () => {
                  removeFood(dayKey, meal.id, entry.index);
                  refresh();
                },
              },
              icon('close', 13)
            )
          )
        )
      )
    : h('p.muted', { style: { fontSize: 'var(--fs-2xs)' } }, t('nut.noFoods'));

  return h(
    'div.meal-card',
    h(
      'div.meal-card__head',
      h('span.meal-card__glyph', meal.glyph),
      h(
        'div.grow',
        h('div.meal-card__title', mealName(meal.id).n),
        h(
          'div.meal-card__macro',
          h('i.macro-row__dot', { style: { background: 'var(--mac-p)' } }),
          h('i.macro-row__dot', { style: { background: 'var(--mac-f)' } }),
          h('i.macro-row__dot', { style: { background: 'var(--mac-c)' } })
        )
      ),
      h('span.meal-card__kcal', num(kcal)),
      h(
        'button.btn.btn--ghost.btn--icon',
        { 'aria-label': t('common.add'), onclick: () => openFoodSearch(meal.id) },
        icon('plus', 16)
      )
    ),
    h('div.meal-card__items', body)
  );
}

const promptGram = (entry) =>
  new Promise((resolve) => {
    const input = h('input.input.input--num', { type: 'number', inputmode: 'numeric', value: String(entry.g), min: '0' });
    const submit = () => {
      close();
      resolve(Number(input.value));
    };
    const { close } = openModal({
      title: foodName(entry.food),
      body: h('div.stack', h('div.input-group', input, h('span.input-group__suffix', 'г'))),
      footer: h(
        'button.btn.btn--primary',
        { onclick: submit },
        t('common.save')
      ),
    });
  });

/* ------------------------------ tabs ------------------------------ */
function logTab() {
  const totals = dayTotals(dayKey);
  const tgt = targets();
  const items = dayItems(dayKey);
  const score = dietScore({ consumed: totals, target: tgt, waterTarget: tgt.water, water: totals.water });
  const waterTarget = tgt.water ?? 2000;
  const cups = Math.round(waterTarget / 250);
  const filled = Math.round(totals.water / 250);

  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      h(
        'div.row.row--between',
        h(
          'button.btn.btn--ghost.btn--icon',
          { 'aria-label': t('common.back'), onclick: () => shiftDay(-1) },
          icon('prev', 16)
        ),
        h(
          'div.center',
          h('p.card__title', formatDate(dayKey, { weekday: 'long', day: 'numeric', month: 'long' })),
          h('p.card__sub', relativeDay(dayKey))
        ),
        h(
          'button.btn.btn--ghost.btn--icon',
          { 'aria-label': t('common.next'), onclick: () => shiftDay(1), disabled: dayKey >= todayKey() },
          icon('next', 16)
        )
      ),
      h(
        'div.mt-4',
        h(
          'div.row.row--between.mb-3',
          kcalBig(totals.kcal, t('common.kcal'), `${t('nut.remaining')}: ${num(Math.max(0, tgt.kcal - totals.kcal))}`),
          ringChart({
            value: Math.min(1, totals.kcal / Math.max(1, tgt.kcal)),
            size: 104,
            stroke: 9,
            color: 'var(--accent-1)',
            label: `${num(totals.kcal / Math.max(1, tgt.kcal) * 100)}%`,
            caption: t('nut.targets'),
          })
        ),
        macroRow({ label: t('common.protein'), value: totals.protein, target: tgt.protein, color: 'var(--mac-p)' }),
        macroRow({ label: t('common.fat'), value: totals.fat, target: tgt.fat, color: 'var(--mac-f)' }),
        macroRow({ label: t('common.carbs'), value: totals.carbs, target: tgt.carbs, color: 'var(--mac-c)' })
      )
    ),
    h(
      'div.row.row--wrap',
      h(
        'button.btn.btn--soft.btn--sm',
        {
          onclick: () => {
            copyDay(shiftIso(dayKey, -1), dayKey);
            toastOk(t('nut.copied'));
            refresh();
          },
        },
        icon('copy', 15),
        t('nut.copyYesterday')
      ),
      h('span.spacer'),
      h('span.badge.badge--accent', `${t('nut.score')}: ${num(score)}`)
    ),
    h('div', ...items.map(({ meal, list, kcal }) => mealCard(meal, list, kcal))),
    h(
      'div.card.card--pad-lg',
      section(
        t('nut.water'),
        { hint: `${num(totals.water)} / ${num(waterTarget)} ${t('nut.water').toLowerCase()}` },
        h(
          'div.water-grid',
          ...Array.from({ length: cups }, (_, i) =>
            h(
              'button.water-cup',
              {
                'aria-pressed': String(i < filled),
                'aria-label': '250 мл',
                onclick: () => {
                  setWater(dayKey, (i < filled ? i : i + 1) * 250);
                  haptic(6);
                  refresh();
                },
              },
              '💧'
            )
          )
        ),
        h(
          'div.row.mt-3',
          h('button.btn.btn--soft.btn--sm', { onclick: () => { addWater(dayKey, -250); refresh(); } }, '−250'),
          h('button.btn.btn--soft.btn--sm', { onclick: () => { addWater(dayKey, 250); refresh(); } }, '+250'),
          h('button.btn.btn--soft.btn--sm', { onclick: () => { addWater(dayKey, 500); refresh(); } }, '+500')
        )
      )
    )
  );
}

const shiftIso = (key, delta) => {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function weekTab() {
  const tgt = targets();
  const data = kcalSeries(7);
  const trainedToday = (getState().logs ?? []).some((l) => l.date === todayKey());
  const cycle = trainedToday ? CARB_DAYS[0] : CARB_DAYS[1];
  return h(
    'div.stack',
    h(
      'div.card.card--pad-lg',
      section(
        t('nut.week'),
        { hint: `${t('nut.targets')}: ${num(tgt.kcal)}` },
        lineChart({
          data,
          height: 200,
          target: { y: tgt.kcal, label: t('nut.targets') },
          yLabel: (v) => num(v),
          format: (v) => `${num(v)} ${t('common.kcal')}`,
        })
      )
    ),
    h(
      'div.card.card--pad-lg',
      section(
        t('nut.carbCycle'),
        { hint: cycle.n },
        h(
          'div.stack',
          ...CARB_DAYS.map((c) =>
            h(
              'div.compare-row',
              h('span.compare-row__name', c.n),
              h(
                'div.bar',
                h('div.bar__fill', { style: { width: `${c.mult * 100}%` } })
              ),
              h('span.compare-row__num', `${num(c.mult * 100)}%`)
            )
          )
        ),
        h('p.formula-note.mt-3', cycle.note)
      )
    )
  );
}

function microTab() {
  const totals = dayTotals(dayKey);
  const rows = [
    { key: 'fiber', label: t('common.fiber'), target: targets().fiber ?? 25, unit: 'г', color: 'var(--mac-fib)' },
    { key: 'na', label: t('nut.sodium'), target: 2300, unit: 'мг', color: 'var(--warn)' },
    { key: 'fe', label: t('nut.iron'), target: 14, unit: 'мг', color: 'var(--danger)' },
    { key: 'ca', label: t('nut.calcium'), target: 1000, unit: 'мг', color: 'var(--info)' },
    { key: 'po', label: t('nut.potassium'), target: 2900, unit: 'мг', color: 'var(--ok)' },
  ];
  return h(
    'div.card.card--pad-lg',
    section(
      t('nut.micronutrients'),
      { hint: formatDate(dayKey) },
      h(
        'div.stack',
        ...rows.map((r) =>
          macroRow({ label: r.label, value: totals[r.key], target: r.target, color: r.color, digits: 1, unit: r.unit })
        )
      )
    )
  );
}

/* ------------------------------ view ------------------------------ */
export function render(_params, _ctx) {
  const view = h('div.view');
  const totals = dayTotals(dayKey);

  mount(
    view,
    h(
      'header.topbar',
      h('div', h('h1.topbar__title', t('nut.title')), h('p.topbar__sub', t('nut.sub'))),
      h('span.badge', `${num(totals.kcal)} ${t('common.kcal')}`)
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
    tab === 'log' ? logTab() : tab === 'week' ? weekTab() : microTab()
  );
  enterView(view);
  stagger(view.querySelectorAll('.card, .meal-card'));
  return view;
}
