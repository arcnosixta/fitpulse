/** Toast notifications, modal dialogs and bottom sheets. */

import { h, mount, clear, icon } from './dom.js';
import { t } from './i18n.js';

const toastRoot = () => document.getElementById('toast-root');
const modalRoot = () => document.getElementById('modal-root');
const sheetRoot = () => document.getElementById('sheet-root');

/* ------------------------------ toast ------------------------------ */
const TOAST_ICON = { ok: 'check', warn: 'warn', danger: 'close', info: 'info' };

export function toast(message, { type = 'info', ms = 2600, action } = {}) {
  const root = toastRoot();
  if (!root) return;
  const el = h(
    `div.toast.toast--${type}`,
    h('div.toast__icon', icon(TOAST_ICON[type] ?? 'info', 14)),
    h('span.grow', message),
    action ? h('button.toast__action', { onclick: () => { action.onClick(); dismiss(); } }, action.label) : null
  );
  root.append(el);
  const dismiss = () => {
    el.classList.add('is-out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  };
  const timer = setTimeout(dismiss, ms);
  el.addEventListener('click', (e) => {
    if (e.target.closest('.toast__action')) return;
    clearTimeout(timer);
    dismiss();
  });
  return dismiss;
}

export const toastOk = (m, opts) => toast(m, { ...opts, type: 'ok' });
export const toastWarn = (m, opts) => toast(m, { ...opts, type: 'warn' });
export const toastErr = (m, opts) => toast(m, { ...opts, type: 'danger', ms: 3600 });

/* ------------------------------ overlay base ------------------------------ */
function lockScroll(lock) {
  document.body.classList.toggle('is-locked', lock);
}

function buildOverlay(root, { title, body, footer, sheet, onClose }) {
  clear(root);
  const scrim = h('div.scrim', { onclick: () => close() });
  const panel = h(
    sheet ? 'div.sheet' : 'div.modal',
    sheet ? h('div.sheet__grip') : null,
    h(
      'div.' + (sheet ? 'sheet__head' : 'modal__head'),
      h('div.' + (sheet ? 'modal__title' : 'modal__title'), title ?? ''),
      h('button.icon-btn', { onclick: () => close(), 'aria-label': t('common.close') }, icon('close', 16))
    ),
    h('div.' + (sheet ? 'sheet__body' : 'modal__body'), body),
    footer ? h('div.modal__foot', footer) : null
  );
  root.append(scrim, panel);
  root.classList.add('is-open');
  lockScroll(true);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  function close(result) {
    document.removeEventListener('keydown', onKey);
    root.classList.remove('is-open');
    clear(root);
    if (!modalRoot().classList.contains('is-open') && !sheetRoot().classList.contains('is-open')) {
      lockScroll(false);
    }
    onClose?.(result);
  }
  return { close, panel, bodyEl: panel.querySelector('.modal__body, .sheet__body') };
}

export function openModal({ title, body, footer, onClose, sheet = false }) {
  const root = sheet ? sheetRoot() : modalRoot();
  return buildOverlay(root, { title, body, footer, sheet, onClose });
}

export const openSheet = (opts) => openModal({ ...opts, sheet: true });

/** Promise-based confirm. */
export function confirmDialog({ title, text, confirmLabel, cancelLabel, danger }) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title,
      body: h('p.muted', { style: { fontSize: 'var(--fs-sm)' } }, text),
      footer: [
        h('button.btn.btn--ghost', { onclick: () => { close(); resolve(false); } }, cancelLabel ?? t('common.cancel')),
        h(
          `button.btn.${danger ? 'btn--danger' : 'btn--primary'}`,
          { onclick: () => { close(); resolve(true); } },
          confirmLabel ?? t('common.done')
        ),
      ],
      onClose: () => resolve(false),
    });
  });
}

/** Promise-based single-value prompt (returns null on cancel). */
export function promptDialog({ title, label, value = '', type = 'text', hint, placeholder, validate }) {
  return new Promise((resolve) => {
    const input = h('input.input', { type, value, placeholder: placeholder ?? '' });
    const error = h('div.field__error.hidden');
    const submit = () => {
      const v = type === 'number' ? Number(input.value) : input.value;
      if (validate && !validate(v)) {
        error.textContent = validate(v);
        error.classList.remove('hidden');
        input.focus();
        return;
      }
      close();
      resolve(v);
    };
    const { close } = openModal({
      title,
      body: h('div.field', h('label.field__label', label), input, hint ? h('div.field__hint', hint) : null, error),
      footer: [
        h('button.btn.btn--ghost', { onclick: () => { close(); resolve(null); } }, t('common.cancel')),
        h('button.btn.btn--primary', { onclick: submit }, t('common.save')),
      ],
      onClose: () => resolve(null),
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    setTimeout(() => input.focus(), 60);
  });
}

/* ------------------------------ feedback ------------------------------ */
export function haptic(pattern = 12) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/** WebAudio beep without any external asset. */
let audioCtx = null;
export function beep(freq = 880, ms = 180, volume = 0.12) {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000 + 0.02);
  } catch {
    /* audio unavailable — silent fallback */
  }
}

export function mountToastDemo() {
  return mount;
}
