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

  const prev = current;
  const prevId = prev?.id;
  const routeChanged = prevId !== route.id;
  scrollMemo = keepScroll ? window.scrollY : 0;

  clear(outlet);
  const node = route.render(params, { navigate, refresh, back, routeChanged });

  // A view declares its own screen identity through `data-screen`. Keying the
  // entrance off the route alone was too coarse: an onboarding step change
  // keeps the same route, and so does a data-level refresh() such as addWater
  // or a settings toggle — those two need opposite treatment.
  const screen = node?.dataset?.screen ?? route.id;
  const screenChanged = screen !== prev?.screen;

  current = { id: route.id, params, route, screen };

  if (node) {
    if (screenChanged) {
      node.classList.add('view--enter');
      // `animationend` bubbles, so a child's stagger animation would consume a
      // `{ once: true }` listener before `view-in` ever fired. Match the name
      // first and detach only then, otherwise the marker stayed for good and
      // `fill: both` kept a finished animation attached to the node.
      const onEnd = (e) => {
        if (e.animationName !== 'view-in') return;
        node.removeEventListener('animationend', onEnd);
        node.classList.remove('view--enter');
      };
      node.addEventListener('animationend', onEnd);
    }
    outlet.append(node);
  }

  if (keepScroll) window.scrollTo({ top: scrollMemo });
  else if (prevId && routeChanged) window.scrollTo({ top: 0 });

  onChange(current);
}

export function startRouter() {
  if (started) return;
  started = true;
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  window.addEventListener('hashchange', () => render(false));
  render(false);
}
