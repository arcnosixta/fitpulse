/** Small shared building blocks used by several views. */

import { h, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { num, weight as fmtWeight, formatTime } from '../core/format.js';
import { platesFor } from '../calc/strength.js';
import { currentUnits } from '../core/format.js';

export const section = (title, opts, ...children) => {
  const { hint, action } = opts ?? {};
  return h(
    'section.section',
    title || action
      ? h(
          'div.section__head',
          title ? h('h2.section__title', title) : h('span'),
          hint ? h('span.section__hint', hint) : null,
          h('span.spacer'),
          action ?? null
        )
      : null,
    ...children
  );
};

export const stat = ({ label, value, unit, delta, tone }) =>
  h(
    'div.stat',
    h('span.stat__label', label),
    h('span.stat__value', String(value), unit ? h('span.stat__unit', unit) : null),
    delta ? h('span.stat__delta' + (tone ? `.stat__delta--${tone}` : ''), delta) : null
  );

export const badge = (text, tone) => h(`span.badge${tone ? `.badge--${tone}` : ''}`, text);

export const empty = ({ glyph = '📭', title, text, action }) =>
  h(
    'div.empty',
    h('div.empty__icon', glyph),
    title ? h('div.empty__title', title) : null,
    text ? h('p.empty__text', text) : null,
    action ?? null
  );

/** Row with a coloured dot, a progress bar and a value. */
export const macroRow = ({ label, value, target, color, digits = 0, unit = 'г' }) => {
  const ratio = target > 0 ? Math.min(1.6, value / target) : 0;
  return h(
    'div.macro-row',
    h('span.macro-row__name', h('i.macro-row__dot', { style: { background: color } }), label),
    h('div.bar', h('div.bar__fill', { style: { width: `${Math.min(100, ratio * 100)}%`, background: color } })),
    h(
      'span.macro-row__val',
      `${num(value, digits)}`,
      h('small', ` / ${num(target, digits)} ${unit}`)
    )
  );
};

/** Stacked protein / fat / carbs bar by calorie share. */
export const macroBar = ({ protein, fat, carbs }) => {
  const p = protein * 4;
  const f = fat * 9;
  const c = carbs * 4;
  const total = p + f + c || 1;
  return h(
    'div.macro-bar',
    h('i', { style: { width: `${(p / total) * 100}%`, background: 'var(--mac-p)' } }),
    h('i', { style: { width: `${(f / total) * 100}%`, background: 'var(--mac-f)' } }),
    h('i', { style: { width: `${(c / total) * 100}%`, background: 'var(--mac-c)' } })
  );
};

export const kcalBig = (kcal, cap, sub) =>
  h(
    'div.kcal-big',
    h('div.kcal-big__num', num(Math.round(kcal))),
    h('div.kcal-big__cap', cap),
    sub ? h('div.kcal-big__sub', sub) : null
  );

/** Bar loading strip for a target weight. */
export function plateStrip(targetKg) {
  const unit = currentUnits().kg === 'lb' ? 'lb' : 'kg';
  const bar = unit === 'lb' ? 45 : 20;
  const displayTotal = unit === 'lb' ? targetKg * 2.2046226218 : targetKg;
  const displayBar = unit === 'lb' ? 45 : 20;
  const { plates, achieved, exact } = platesFor(displayTotal, unit, displayBar);
  const plate = (p) => {
    const height = 34 + Math.min(46, p * (unit === 'lb' ? 0.7 : 2));
    const width = 13 + Math.min(16, p * 0.7);
    return h(
      'div.plate',
      {
        style: {
          height: `${height}px`,
          width: `${width}px`,
          background: `linear-gradient(160deg, hsl(${210 - p * 2} 22% 62%), hsl(${215 - p * 2} 24% 44%))`,
        },
        title: `${num(p, p % 1 ? 2 : 0)} ${unit}`,
      },
      p >= 5 ? num(p, 0) : ''
    );
  };
  return h(
    'div.stack',
    h(
      'div.plate-strip',
      h('div.plate-bar', { style: { background: 'var(--text-2)' } }),
      ...plates.map(plate),
      h('div.plate-bar', { style: { background: 'var(--text-2)' } })
    ),
    h(
      'p.plate-note',
      `${num(achieved, achieved % 1 ? 1 : 0)} ${unit} ${exact ? '✓' : `≈ ${num(displayTotal, 1)}`} · ${t('wo.barWeight')} ${num(displayBar)} ${unit}`
    ),
    h('p.sr-only', `${bar}`)
  );
}

export const timerPill = (ms) =>
  h('span.badge.badge--info', icon('clock', 12), formatTime(ms));

export const listRow = ({ glyph, title, meta, value, onClick, right }) =>
  h(
    onClick ? 'button.list__item' : 'div.list__item',
    onClick ? { onclick: onClick } : null,
    glyph ? h('span.list__thumb', typeof glyph === 'string' && glyph.length < 6 ? glyph : icon(glyph, 20)) : null,
    h('div.list__body', h('div.list__title', title), meta ? h('div.list__meta', meta) : null),
    right ?? (value != null ? h('div.list__value', value) : null)
  );

export const weightStat = (label, kg) => stat({ label, value: fmtWeight(kg) });
