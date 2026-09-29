/**
 * Domain logic: program building, workout sessions, statistics.
 * Everything here is pure-ish and reads/writes through store.js.
 */

import { getState, update, todayKey } from './store.js';
import { getExercise, muscleNames } from '../data/exercises.js';
import { TEMPLATE_BY_ID } from '../data/templates.js';
import { dowIndex, iso, parseIso } from './format.js';
import { getLang, t } from './i18n.js';
import { e1rmValue, tonnage, volumeStatus, WEEKLY_SET_LANDMARKS } from '../calc/strength.js';
import { sessionBurn, MET } from '../calc/body.js';

/* ------------------------------ labels ------------------------------ */
export const exName = (ex) => {
  if (!ex) return '';
  return getLang() === 'en' ? ex.en || ex.n : ex.n;
};
export { muscleName } from '../data/exercises.js';
export const tplName = (tpl) => (getLang() === 'en' ? tpl.en || tpl.n : tpl.n);

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ------------------------------ program ------------------------------ */

/** 7 day objects for the current week (Monday first). */
export function weekDays() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dowIndex(today));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { dow: i, date: d, iso: iso(d), isToday: iso(d) === todayKey() };
  });
}

/** Program days normalised to 7 entries, creating empty ones when needed. */
export function programDays() {
  const days = getState().program.days ?? [];
  const byDow = new Map(days.map((d) => [d.dow, d]));
  return Array.from({ length: 7 }, (_, dow) => {
    const found = byDow.get(dow);
    return found
      ? { ...found, items: found.items ?? [] }
      : { dow, name: '', items: [] };
  });
}

export function saveProgramDays(days) {
  update({
    program: {
      ...getState().program,
      days: days.map((d) => ({ ...d, items: d.items ?? [] })),
    },
  });
}

export function applyTemplate(tplId) {
  const tpl = TEMPLATE_BY_ID[tplId];
  if (!tpl) return null;
  const days = tpl.days.map((d) => ({
    dow: d.dow,
    name: d.name,
    items: d.items.map((it) => ({
      uid: uid(),
      ex: it.ex,
      sets: it.sets,
      reps: it.reps,
      rest: it.rest,
      tempo: it.tempo ?? null,
      rpe: it.rpe ?? null,
      note: it.note ?? '',
    })),
  }));
  update({
    program: {
      ...getState().program,
      templateId: tpl.id,
      name: tplName(tpl),
      startDate: getState().program.startDate ?? todayKey(),
      days,
    },
  });
  return tpl;
}

export function clearProgram() {
  update({ program: { ...getState().program, templateId: null, days: [] } });
}

/* -------------------- program mutations (immutable) -------------------- */
export const withItems = (dow, fn) => {
  const days = programDays();
  const day = days.find((d) => d.dow === dow);
  if (!day) return;
  day.items = fn(day.items);
  saveProgramDays(days);
};

export const addToDay = (dow, exId, opts = {}) => {
  const ex = getExercise(exId);
  if (!ex) return;
  withItems(dow, (items) => [
    ...items,
    {
      uid: uid(),
      ex: exId,
      sets: opts.sets ?? 3,
      reps: opts.reps ?? (ex.pat === 'iso' ? '12-15' : '8-10'),
      rest: opts.rest ?? ex.rest,
      tempo: opts.tempo ?? ex.tempo,
      rpe: opts.rpe ?? 8,
      note: opts.note ?? '',
    },
  ]);
};

export const removeFromDay = (dow, itemUid) =>
  withItems(dow, (items) => items.filter((it) => it.uid !== itemUid));

export const updateInDay = (dow, itemUid, values) =>
  withItems(dow, (items) => items.map((it) => (it.uid === itemUid ? { ...it, ...values } : it)));

/** Copy a training day into another weekday (first empty one by default). */
export const duplicateDay = (dow, toDow = null) => {
  const days = programDays();
  const day = days.find((d) => d.dow === dow);
  if (!day || !day.items.length) return null;
  const target = toDow ?? days.find((d) => d.dow !== dow && !d.items.length)?.dow ?? null;
  if (target === null || target === dow) return null;
  const to = days.find((d) => d.dow === target);
  if (!to) return null;
  to.items = day.items.map((it) => ({ ...it, uid: uid() }));
  if (!to.name) to.name = day.name;
  saveProgramDays(days);
  return target;
}

export const moveInProgram = (fromDow, itemUid, toDow) => {
  if (fromDow === toDow) return;
  const days = programDays();
  const from = days.find((d) => d.dow === fromDow);
  const to = days.find((d) => d.dow === toDow);
  if (!from || !to) return;
  const idx = from.items.findIndex((it) => it.uid === itemUid);
  if (idx < 0) return;
  const [item] = from.items.splice(idx, 1);
  to.items.push(item);
  saveProgramDays(days);
};

/** Weekly sets per primary+secondary muscle. */
export function weeklySetsByMuscle() {
  const map = new Map();
  for (const day of programDays()) {
    for (const item of day.items) {
      const ex = getExercise(item.ex);
      if (!ex) continue;
      for (const m of new Set([ex.p, ...(ex.s ?? [])])) {
        map.set(m, (map.get(m) ?? 0) + Number(item.sets || 0));
      }
    }
  }
  return map;
}

export function volumeStatusFor(muscle, sets) {
  return volumeStatus(sets, muscle);
}

/* ------------------------------ statistics ------------------------------ */

export const logsSorted = () => [...(getState().logs ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1));

export const logsInRange = (daysBack) => {
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const key = iso(from);
  return logsSorted().filter((l) => l.date >= key);
};

export const logsThisWeek = () => {
  const keys = new Set(weekDays().map((d) => d.iso));
  return logsSorted().filter((l) => keys.has(l.date));
};

export const totalVolume = (logs = getState().logs ?? []) =>
  logs.reduce((sum, l) => sum + (l.volume ?? 0), 0);

export const volumeByMuscle = (logs = getState().logs ?? []) => {
  const map = new Map();
  for (const log of logs) {
    for (const item of log.items ?? []) {
      const ex = getExercise(item.ex);
      if (!ex) continue;
      const vol = item.sets.reduce((a, s) => a + tonnage(s.w, s.r), 0);
      for (const m of new Set([ex.p, ...(ex.s ?? [])])) {
        map.set(m, (map.get(m) ?? 0) + vol);
      }
    }
  }
  return map;
};

/** Consecutive days (ending today or yesterday) with at least one session. */
export function streakCount() {
  const days = new Set((getState().logs ?? []).map((l) => l.date));
  const cursor = new Date();
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function planStats() {
  const days = programDays();
  const plannedDays = days.filter((d) => d.items.length > 0);
  const plannedSets = plannedDays.reduce(
    (a, d) => a + d.items.reduce((x, it) => x + Number(it.sets || 0), 0),
    0
  );
  const week = logsThisWeek();
  const doneDays = new Set(week.map((l) => l.date));
  const plannedThisWeek = plannedDays.length;
  const doneSets = week.reduce(
    (a, l) => a + l.items.reduce((x, it) => x + it.sets.filter((s) => s.done).length, 0),
    0
  );
  return {
    plannedDays: plannedDays.length,
    plannedSets,
    doneDays: doneDays.size,
    doneSets,
    sessions: week.length,
    weekVolume: week.reduce((a, l) => a + (l.volume ?? 0), 0),
    streak: streakCount(),
    adherence: plannedThisWeek ? Math.round((doneDays.size / plannedThisWeek) * 100) : 0,
  };
}

/** Weekly volume for the last N weeks — [ {label, value} ]. */
export function volumeTrend(weeks = 8) {
  const out = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const a = iso(start);
    const b = iso(end);
    const value = (getState().logs ?? [])
      .filter((l) => l.date >= a && l.date <= b)
      .reduce((sum, l) => sum + (l.volume ?? 0), 0);
    out.push({ x: weeks - i, y: value, label: String(end.getDate()), value });
  }
  return out;
}

/** Body-weight series for the chart. */
export function weightSeries() {
  return (getState().weightLog ?? [])
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((entry, i) => ({ x: i, y: entry.weight, label: entry.date.slice(5) }));
}

/* ------------------------------ records ------------------------------ */

export function bestEver(exId) {
  let best = null;
  for (const log of getState().logs ?? []) {
    for (const item of log.items ?? []) {
      if (item.ex !== exId) continue;
      for (const set of item.sets ?? []) {
        if (!set.w || !set.r) continue;
        const e1rm = set.e1rm || e1rmValue(set.w, set.r, set.rpe);
        if (!best || e1rm > best.e1rm) best = { ...set, e1rm, date: log.date, ex: exId };
      }
    }
  }
  return best;
}

export function personalRecords(limit = 12) {
  const map = new Map();
  for (const log of getState().logs ?? []) {
    for (const item of log.items ?? []) {
      for (const set of item.sets ?? []) {
        if (!set.w || !set.r) continue;
        const e1rm = set.e1rm || e1rmValue(set.w, set.r, set.rpe);
        const prev = map.get(item.ex);
        if (!prev || e1rm > prev.e1rm) map.set(item.ex, { ex: item.ex, ...set, e1rm, date: log.date });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}

/** Sets logged for an exercise during the previous session, most recent first. */
export function lastPerformance(exId) {
  const logs = logsSorted();
  for (const log of logs) {
    const item = (log.items ?? []).find((i) => i.ex === exId);
    if (item) return { date: log.date, sets: item.sets.filter((s) => s.w && s.r) };
  }
  return null;
}

/* ------------------------------ workout session ------------------------------ */

export function todaysPlan() {
  const dow = dowIndex(new Date());
  return programDays().find((d) => d.dow === dow) ?? null;
}

export function startWorkout({ dow, day, items, name } = {}) {
  const source = day ?? todaysPlan();
  const list = items ?? source?.items ?? [];
  const session = {
    id: uid(),
    date: todayKey(),
    dow: dow ?? dowIndex(new Date()),
    name: name ?? source?.name ?? t('prog.trainingDay'),
    startedAt: Date.now(),
    notes: '',
    items: list.map((it) => ({
      uid: it.uid ?? uid(),
      ex: it.ex,
      targetSets: Number(it.sets ?? 3),
      targetReps: it.reps ?? '8-10',
      rest: it.rest ?? 90,
      rpe: it.rpe ?? 8,
      sets: Array.from({ length: Number(it.sets ?? 3) }, () => ({ w: null, r: null, rpe: null, done: false, e1rm: 0, isPr: false })),
    })),
  };
  update({ active: session });
  return session;
}

export function patchActive(fn) {
  const active = getState().active;
  if (!active) return null;
  const next = fn(structuredClone(active));
  update({ active: next });
  return next;
}

export function setSet(itemUid, setIndex, values) {
  return patchActive((session) => {
    const item = session.items.find((i) => i.uid === itemUid);
    if (!item) return session;
    const set = item.sets[setIndex];
    if (!set) return session;
    Object.assign(set, values);
    if (values.w != null && values.r) {
      set.e1rm = e1rmValue(values.w, values.r, values.rpe);
    }
    return session;
  });
}

export function toggleSetDone(itemUid, setIndex) {
  const active = getState().active;
  const item = active?.items.find((i) => i.uid === itemUid);
  const set = item?.sets[setIndex];
  if (!set) return null;
  const next = !set.done;
  const updated = setSet(itemUid, setIndex, { done: next });
  if (!next) return updated;

  const done = updated.items.find((i) => i.uid === itemUid).sets[setIndex];
  const best = bestEver(item.ex);
  if (done.e1rm && (!best || done.e1rm > best.e1rm + 0.5)) {
    return patchActive((session) => {
      session.items.find((i) => i.uid === itemUid).sets[setIndex].isPr = true;
      return session;
    });
  }
  return updated;
}

export function addSetToItem(itemUid) {
  return patchActive((session) => {
    const item = session.items.find((i) => i.uid === itemUid);
    if (!item) return session;
    const last = item.sets[item.sets.length - 1] ?? { w: null, r: null };
    item.sets.push({ w: last.w, r: last.r, rpe: last.rpe, done: false, e1rm: 0, isPr: false });
    return session;
  });
}

export function removeSetFromItem(itemUid, index) {
  return patchActive((session) => {
    const item = session.items.find((i) => i.uid === itemUid);
    if (item && item.sets.length > 1) item.sets.splice(index, 1);
    return session;
  });
}

export function sessionStats() {
  const active = getState().active;
  if (!active) return null;
  let total = 0;
  let done = 0;
  let volume = 0;
  let prs = 0;
  for (const item of active.items) {
    total += item.sets.length;
    for (const s of item.sets) {
      if (!s.done) continue;
      done += 1;
      volume += tonnage(s.w, s.r);
      if (s.isPr) prs += 1;
    }
  }
  const minutes = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000));
  const kcal = sessionBurn({ kg: getState().profile.weight, minutes, met: MET.strength });
  return { total, done, volume, prs, minutes, kcal };
}

export function finishWorkout() {
  const active = getState().active;
  if (!active) return null;
  const stats = sessionStats();
  const items = active.items
    .filter((i) => i.sets.some((s) => s.done))
    .map((i) => ({
      ex: i.ex,
      sets: i.sets
        .filter((s) => s.done)
        .map((s) => ({ w: s.w, r: s.r, rpe: s.rpe, e1rm: s.e1rm, isPr: s.isPr, done: true })),
    }));
  const log = {
    id: active.id,
    date: active.date,
    dow: active.dow,
    name: active.name,
    minutes: stats.minutes,
    kcal: stats.kcal,
    volume: stats.volume,
    prs: stats.prs,
    items,
    notes: active.notes,
  };
  update({ logs: [log, ...(getState().logs ?? [])], active: null });
  return log;
}

export function discardWorkout() {
  update({ active: null });
}

/** Next suggested load for an exercise from the last logged session. */
export function suggestNext(itemUid) {
  const active = getState().active;
  const item = active?.items.find((i) => i.uid === itemUid);
  if (!item) return null;
  const prev = lastPerformance(item.ex);
  if (!prev?.sets.length) return null;
  const best = prev.sets.reduce((a, s) => (tonnage(s.w, s.r) > tonnage(a.w, a.r) ? s : a));
  const step = getState().settings.unitSystem === 'imperial' ? 5 : 2.5;
  return Math.max(best.w, Math.round((best.w + step) / step) * step);
}

export const muscleNamesOf = (ex) => (ex ? muscleNames(ex) : []);

export { volumeStatus, WEEKLY_SET_LANDMARKS, parseIso, e1rmValue };
