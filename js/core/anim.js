/** Motion helpers that respect prefers-reduced-motion. */

import { num } from './format.js';

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Re-trigger a keyframe animation on an element. */
export function play(el, className) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation restarts
  el.classList.add(className);
  el.addEventListener('animationend', () => el.classList.remove(className), { once: true });
}

/** View container entry animation. */
export function enterView(el) {
  if (!el) return el;
  if (!reducedMotion()) el.classList.add('view');
  return el;
}

/** Staggered entrance. Accepts one element, a NodeList or an array. */
export function stagger(els) {
  const list = toElementList(els);
  if (list.length && !reducedMotion()) {
    list.forEach((el, i) => {
      if (!el?.classList) return;
      el.classList.add('reveal-item');
      el.style.animationDelay = `${Math.min(20 + i * 40, 340)}ms`;
    });
  }
  return els;
}

function toElementList(els) {
  if (!els || typeof els === 'string') return [];
  if (els.classList) return [els];
  if (typeof els.length === 'number') return Array.prototype.slice.call(els);
  return [];
}

/** Numeric value tween for any DOM text node. */
export function tweenNumber(el, to, { duration = 700, digits = 0, suffix = '' } = {}) {
  if (!el) return;
  const fmt = (v) => num(v, digits);
  if (reducedMotion()) {
    el.textContent = fmt(to) + suffix;
    return;
  }
  const from = Number(el.dataset.value ?? 0);
  el.dataset.value = String(to);
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Material-style ripple on any container. */
export function attachRipple(root, selector = '.btn, .chip, .icon-btn, .card--tap, .ex-card, .tpl-card') {
  root.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target.closest(selector);
      if (!target || reducedMotion()) return;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const span = document.createElement('span');
      Object.assign(span.style, {
        position: 'absolute',
        left: `${e.clientX - rect.left - size / 2}px`,
        top: `${e.clientY - rect.top - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: 'currentColor',
        opacity: '0.18',
        pointerEvents: 'none',
        transform: 'scale(0)',
        transition: 'transform 480ms cubic-bezier(0.22,1,0.36,1), opacity 480ms ease',
        zIndex: '5',
      });
      if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
      target.append(span);
      requestAnimationFrame(() => {
        span.style.transform = 'scale(1)';
        span.style.opacity = '0';
      });
      setTimeout(() => span.remove(), 520);
    },
    { passive: true }
  );
}

/** Swipe-left detection (used to go back / delete rows). */
export function onSwipe(el, { onLeft, threshold = 70 } = {}) {
  let x0 = null;
  let y0 = null;
  el.addEventListener(
    'pointerdown',
    (e) => {
      x0 = e.clientX;
      y0 = e.clientY;
    },
    { passive: true }
  );
  el.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (dx < -threshold && Math.abs(dy) < 40) onLeft?.();
    x0 = y0 = null;
  });
}
