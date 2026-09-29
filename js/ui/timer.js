/** Rest timer: shared singleton + visual widget for the logger. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { formatTime } from '../core/format.js';
import { getState } from '../core/store.js';
import { ring } from './charts.js';
import { beep, haptic, toastOk } from '../core/ui.js';

function createRestTimer() {
  let total = 90;
  let left = 0;
  let running = false;
  let endsAt = 0;
  let handle = null;
  const subs = new Set();
  let lastSecond = -1;

  const state = () => ({ total, left, running, progress: total > 0 ? left / total : 0 });

  const emit = () => subs.forEach((fn) => fn(state()));

  const clearHandle = () => {
    clearTimeout(handle);
    handle = null;
  };

  const complete = () => {
    running = false;
    clearHandle();
    const { sound, haptics } = getState().settings;
    if (sound) {
      beep(880, 180);
      setTimeout(() => beep(1180, 220), 200);
    }
    if (haptics) haptic([40, 60, 40]);
    emit();
    toastOk(t('wo.countdown'));
  };

  const tick = () => {
    const seconds = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    if (seconds !== left) {
      left = seconds;
      lastSecond = seconds;
      emit();
    }
    if (left <= 0) {
      complete();
      return;
    }
    handle = setTimeout(tick, 200);
  };

  return {
    start(seconds) {
      total = Math.max(5, Math.round(seconds || getState().settings.restDefault || 90));
      left = total;
      running = true;
      endsAt = Date.now() + total * 1000;
      lastSecond = left;
      clearHandle();
      emit();
      tick();
      return this;
    },
    add(seconds) {
      if (!running && left <= 0) return this.start(seconds);
      total = Math.max(total, left + seconds);
      left = Math.max(0, left + seconds);
      endsAt = Date.now() + left * 1000;
      emit();
      return this;
    },
    pause() {
      if (!running) return this;
      left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      running = false;
      clearHandle();
      emit();
      return this;
    },
    resume() {
      if (running || left <= 0) return this;
      running = true;
      endsAt = Date.now() + left * 1000;
      clearHandle();
      tick();
      return this;
    },
    stop() {
      running = false;
      left = 0;
      clearHandle();
      emit();
      return this;
    },
    skip() {
      if (running || left > 0) {
        const { sound } = getState().settings;
        if (sound) beep(520, 90);
        complete();
      }
      return this;
    },
    on(fn) {
      subs.add(fn);
      fn(state());
      return () => subs.delete(fn);
    },
    get: state,
    isRunning: () => running,
  };
}

export const restTimer = createRestTimer();

/**
 * Timer widget for the logger. Renders once and patches on every tick.
 * @param {{onSkip?:()=>void, compact?:boolean}} opts
 */
export function timerWidget({ onSkip, compact = false } = {}) {
  const container = h('div.timer');
  const dial = h('div.timer__ring');
  const time = h('div.timer__time');
  const controls = h('div.timer__ctrl');
  const quick = h('div.timer__quick');

  const presets = [45, 60, 90, 120, 180];
  const arc = ring({ value: 0, max: 1, size: 132, stroke: 9, label: '', cap: false });
  dial.append(arc);
  dial.append(time);
  container.append(dial, quick, controls);

  const render = ({ total, left, running, progress }) => {
    arc.setValue(progress);
    const done = left <= 0;
    time.replaceChildren(
      h('span', formatTime(left * 1000)),
      h('small', done ? t('wo.restEnd') : running ? t('wo.restTimer') : t('wo.timer'))
    );
    dial.classList.toggle('anim-tick', running);
    time.classList.toggle('anim-count', done);

    if (quick.children.length === 0) {
      for (const sec of presets) {
        quick.append(
          h(
            'button.chip',
            {
              'aria-pressed': total === sec && left === sec,
              onclick: () => restTimer.start(sec),
            },
            `${sec} ${t('common.sec')}`
          )
        );
      }
    }

    mount(
      controls,
      running
        ? h('button.btn.btn--soft.btn--sm', { onclick: () => restTimer.pause() }, icon('pause', 15), t('wo.timer'))
        : h('button.btn.btn--soft.btn--sm', { onclick: () => restTimer.resume() }, icon('play', 15), t('common.next')),
      h('button.btn.btn--ghost.btn--sm', { onclick: () => restTimer.add(30) }, t('wo.plus30')),
      h(
        'button.btn.btn--ghost.btn--sm',
        { onclick: () => { restTimer.skip(); onSkip?.(); } },
        t('wo.skip')
      )
    );
  };

  const unsubscribe = restTimer.on(render);
  container.addEventListener('view:teardown', unsubscribe);
  return container;
}

export function destroyTimerWidget(el) {
  el?.dispatchEvent(new CustomEvent('view:teardown'));
}
