/** Theme + accent application: writes data-theme/data-accent on <html>. */

import { getState, patch } from './store.js';
import { toast } from './ui.js';

export const ACCENTS = [
  ['volt', '#b6ff3a'],
  ['magma', '#ff7a45'],
  ['ice', '#6be8ff'],
  ['sunset', '#ffd166'],
  ['mint', '#3ee6a8'],
];

/** Apply theme and accent to the document root. */
export function applyTheme(theme, accent) {
  const s = getState().settings;
  const nextTheme = theme ?? s.theme ?? 'dark';
  const nextAccent = accent ?? s.accent ?? 'volt';
  const root = document.documentElement;
  root.dataset.theme = nextTheme;
  root.dataset.accent = nextAccent;
  root.style.colorScheme = nextTheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = nextTheme === 'dark' ? '#0a0b0f' : '#f5f6f8';
  }
  document.dispatchEvent(new CustomEvent('fitpulse:accent'));
}

/** Apply language to the document root. */
export function applyLanguage(lang) {
  const next = lang ?? getState().settings.lang ?? 'ru';
  document.documentElement.lang = next;
  document.dispatchEvent(new CustomEvent('fitpulse:lang', { detail: next }));
}

/** Persist a setting, apply it to the DOM and re-render the current view. */
export function setTheme(theme) {
  patch('settings', { theme });
  applyTheme(theme);
}

export function setAccent(accent) {
  patch('settings', { accent });
  applyTheme(undefined, accent);
  toast?.(accent, { ms: 900 });
}
