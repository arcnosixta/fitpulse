/**
 * FitPulse — application bootstrap.
 * Boots theme, language, units, routes, navigation, ambient FX and the PWA.
 */

import { $ } from './core/dom.js';
import { t, setLang, applyI18n } from './core/i18n.js';
import { getState } from './core/store.js';
import { setUnitSystem } from './core/format.js';
import { applyTheme, applyLanguage } from './core/theme.js';
import {
  defineRoutes, setRouterOutlet, startRouter, onRouteChange, setRouteGuard, navigate, currentRoute,
} from './core/router.js';
import { startAmbient } from './core/ambient.js';
import { attachRipple, play } from './core/anim.js';
import { toast, toastOk } from './core/ui.js';
import { syncNav } from './ui/nav.js';
import { setInstallPrompt } from './views/settings.js';

import * as dashboard from './views/dashboard.js';
import * as program from './views/program.js';
import * as library from './views/library.js';
import * as workout from './views/workout.js';
import * as nutrition from './views/nutrition.js';
import * as progress from './views/progress.js';
import * as calculators from './views/calculators.js';
import * as history from './views/history.js';
import * as settings from './views/settings.js';
import * as onboarding from './views/onboarding.js';

const ROUTES = [
  { id: 'dashboard', render: dashboard.render },
  { id: 'program', render: program.render },
  { id: 'library', render: library.render },
  { id: 'workout', render: workout.render },
  { id: 'nutrition', render: nutrition.render },
  { id: 'progress', render: progress.render },
  { id: 'calculators', render: calculators.render },
  { id: 'history', render: history.render },
  { id: 'settings', render: settings.render },
  { id: 'onboarding', render: onboarding.render, hidden: true },
];

let deferredInstall = null;

/* ------------------------------ PWA ------------------------------ */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;
  // In the native container the assets are already local and a worker would only
  // pin an old build after an app update — Capacitor serves them from
  // https://localhost, so the protocol alone does not reveal the platform.
  if (window.Capacitor?.isNativePlatform?.()) return;
  try {
    const reg = await navigator.serviceWorker.register(
      new URL('../sw.js', import.meta.url),
      { scope: './' }
    );
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          toast(t('install.text'), {
            ms: 8000,
            action: { label: t('common.done'), run: () => sw.postMessage({ type: 'SKIP_WAITING' }) },
          });
        }
      });
    });
  } catch (err) {
    console.warn('[fitpulse] service worker registration failed', err);
  }
}

function wireInstallBar() {
  const bar = $('#install-bar');
  if (!bar) return;
  const isStandalone =
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    navigator.standalone === true;

  const canInstall = !isStandalone && 'onbeforeinstallprompt' in window;

  const hide = () => {
    bar.hidden = true;
  };

  if (!canInstall) {
    hide();
    return;
  }

  const show = () => {
    bar.hidden = false;
    play(bar, 'anim-pop');
  };

  window.addEventListener('beforeinstallprompt', (evt) => {
    evt.preventDefault();
    deferredInstall = evt;
    setInstallPrompt(evt);
    show();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    hide();
    toastOk(t('set.installApp'));
  });

  bar.querySelector('[data-action="install-accept"]')?.addEventListener('click', async () => {
    if (!deferredInstall) {
      toast(t('set.offline'), { type: 'warn' });
      return hide();
    }
    deferredInstall.prompt();
    const res = await deferredInstall.userChoice.catch(() => null);
    if (res?.outcome === 'accepted') hide();
    deferredInstall = null;
  });

  bar.querySelector('[data-action="install-dismiss"]')?.addEventListener('click', hide);

  if (deferredInstall) show();
  return undefined;
}

/* ------------------------------ boot ------------------------------ */
function applyPreferences() {
  const s = getState().settings;
  setLang(s.lang);
  applyLanguage(s.lang);
  setUnitSystem(s.unitSystem);
  applyTheme(s.theme, s.accent);
}

function hideBoot() {
  const boot = $('#boot');
  if (!boot) return;
  boot.style.transition = 'opacity .32s ease';
  boot.style.opacity = '0';
  setTimeout(() => {
    boot.remove();
  }, 340);
}

function showApp() {
  const app = $('#app');
  if (app) {
    app.hidden = false;
  }
}

function guard({ id, params }) {
  const onboarded = getState().profile.onboarded === true;
  if (id === 'onboarding') {
    // #/onboarding?edit=1 stays reachable once the profile exists. Without it a
    // mistake made in setup could never be corrected, because the guard bounced
    // every attempt straight back to the dashboard.
    if (onboarded && params?.edit !== '1') {
      navigate('dashboard');
      return false;
    }
    return true;
  }
  if (!onboarded) {
    navigate('onboarding');
    return false;
  }
  return true;
}

function boot() {
  applyPreferences();
  applyI18n(document);

  const rail = $('#rail');
  const tabbar = $('#tabbar');
  const outlet = $('#views');
  setRouterOutlet(outlet);
  defineRoutes(ROUTES);
  setRouteGuard(guard);
  syncNav(rail, tabbar);

  onRouteChange(() => {
    document.body.dataset.route = currentRoute().id;
    syncNav(rail, tabbar);
  });

  startAmbient();
  attachRipple(document.body);
  wireInstallBar();

  // keep the tab bar in sync with keyboard/back gestures
  window.addEventListener('online', () => toastOk(t('set.offlineReady')));
  window.addEventListener('offline', () => toast(t('set.offline'), { type: 'warn' }));

  showApp();
  startRouter();
  hideBoot();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
