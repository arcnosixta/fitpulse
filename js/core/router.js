/**
 * Hash router: `#/view?key=value`.
 * Views export `render(params, ctx)` and return a DOM node.
 */

import { clear } from './dom.js';

const routes = new Map();
let outlet = null;
let onChange = () => {};
let current = null;
let scrollMemo = 0;
let started = false;
let guard = null;

export function defineRoutes(list) {
  for (const route of list) routes.set(route.id, route);
}

export const setRouterOutlet = (el) => (outlet = el);
export const onRouteChange = (fn) => (onChange = fn);
export const currentRoute = () => current;
/** Guard may return false to block rendering (it is expected to redirect itself). */
export const setRouteGuard = (fn) => (guard = fn);

export function parseHash() {
  const raw = String(location.hash || '').replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const id = (path || 'dashboard').split('/')[0] || 'dashboard';
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { id, params };
}

export function navigate(id, params) {
  const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  const next = `#/${id}${qs}`;
  if (location.hash === next) {
    render(true);
    return;
  }
  location.hash = next;
}

export const back = () => (history.length > 1 ? history.back() : navigate('dashboard'));

/** Re-render the current view, keeping the scroll position. */
export function refresh() {
  render(true);
}

function render(keepScroll = false) {
  if (!outlet) return;
  const { id, params } = parseHash();
  if (guard && guard({ id, params }) === false) return;
  const route = routes.get(id) ?? routes.get('dashboard');
  if (!route) return;

  const prevId = current?.id;
  current = { id: route.id, params, route };
  scrollMemo = keepScroll ? window.scrollY : 0;

  clear(outlet);
  const node = route.render(params, { navigate, refresh, back });
  if (node) outlet.append(node);

  if (keepScroll) window.scrollTo({ top: scrollMemo });
  else if (prevId && prevId !== route.id) window.scrollTo({ top: 0 });

  onChange(current);
}

export function startRouter() {
  if (started) return;
  started = true;
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  window.addEventListener('hashchange', () => render(false));
  render(false);
}
