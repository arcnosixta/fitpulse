/** Number, date and unit formatting. */

import { getLang } from './i18n.js';

const RU = 'ru-RU';
const EN = 'en-US';

let units = { kg: 'kg', cm: 'cm' };
let numUnits = { kg: 'kg', cm: 'cm' };

export const setUnitSystem = (next) => {
  numUnits = { kg: next === 'imperial' ? 'lb' : 'kg', cm: next === 'imperial' ? 'in' : 'cm' };
};
export const currentUnits = () => numUnits;

const isEn = () => getLang() === 'en';
const loc = () => (isEn() ? EN : RU);

export const num = (v, digits = 0) => {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString(loc(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const round = (v, step = 1) => (v == null ? 0 : Math.round(v / step) * step);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------ mass ------------------------------ */
export const KG_TO_LB = 2.2046226218;
export const toDisplayWeight = (kg) => (numUnits.kg === 'lb' ? kg * KG_TO_LB : kg);
export const fromDisplayWeight = (v) => (numUnits.kg === 'lb' ? v / KG_TO_LB : v);
export const toDisplayLength = (cm) => (numUnits.cm === 'in' ? cm / 2.54 : cm);
export const fromDisplayLength = (v) => (numUnits.cm === 'in' ? v * 2.54 : v);

export const weight = (kg, digits) => {
  if (kg == null) return '—';
  const v = toDisplayWeight(kg);
  return `${num(v, digits ?? (numUnits.kg === 'lb' ? 1 : v % 1 ? 1 : 0))} ${numUnits.kg}`;
};
export const length = (cm, digits = 0) =>
  `${num(toDisplayLength(cm), digits)} ${numUnits.cm}`;

export const plateWeight = (kg) =>
  `${num(kg, kg % 1 ? 2 : 0)} ${numUnits.kg}`;

/* ------------------------------ dates ------------------------------ */
export const DOW_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const DOW_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_FULL_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
export const DOW_FULL_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DOW = () => (isEn() ? DOW_EN : DOW_RU);
export const DOW_FULL = () => (isEn() ? DOW_FULL_EN : DOW_FULL_RU);

export const iso = (d = new Date()) => {
  const t = new Date(d);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const parseIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Monday-based weekday index: Monday = 0 … Sunday = 6. */
export const dowIndex = (d = new Date()) => (new Date(d).getDay() + 6) % 7;

export const formatDate = (s, opts = { day: 'numeric', month: 'short' }) => {
  const d = typeof s === 'string' ? parseIso(s) : s;
  return d.toLocaleDateString(loc(), opts);
};

export const formatTime = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const clock = (ms) => formatTime(ms);

export const relativeDay = (s) => {
  const target = parseIso(s);
  const today = parseIso(iso());
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return isEn() ? 'Today' : 'Сегодня';
  if (diff === -1) return isEn() ? 'Yesterday' : 'Вчера';
  if (diff === 1) return isEn() ? 'Tomorrow' : 'Завтра';
  if (diff < 0) return formatDate(s);
  return formatDate(s);
};

export const relativeTime = (ms) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return isEn() ? `${s}s ago` : `${s} с назад`;
  const m = Math.round(s / 60);
  if (m < 60) return isEn() ? `${m}m ago` : `${m} мин назад`;
  const h = Math.round(m / 60);
  if (h < 24) return isEn() ? `${h}h ago` : `${h} ч назад`;
  const d = Math.round(h / 24);
  return isEn() ? `${d}d ago` : `${d} дн назад`;
};

/* ------------------------------ misc ------------------------------ */
export const pct = (v, digits = 0) => `${num(v, digits)}%`;
export const signed = (v, digits = 1) => `${v > 0 ? '+' : ''}${num(v, digits)}`;
export const plural = (n, forms) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
  return forms[2];
};
export const grams = (v) => `${num(v, v % 1 ? 1 : 0)} г`;
export const minutes = (v) => (isEn() ? `${Math.round(v)} min` : `${Math.round(v)} мин`);
