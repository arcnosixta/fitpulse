/** Navigation: desktop rail + mobile tab bar. */

import { h, mount, icon } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { navigate, currentRoute } from '../core/router.js';

const MAIN = [
  { id: 'dashboard', icon: 'home', label: 'nav.today' },
  { id: 'program', icon: 'calendar', label: 'nav.program' },
  { id: 'nutrition', icon: 'food', label: 'nav.nutrition' },
  { id: 'progress', icon: 'chart', label: 'nav.progress' },
];

const TOOLS = [
  { id: 'library', icon: 'book', label: 'nav.library' },
  { id: 'calculators', icon: 'calc', label: 'nav.tools' },
  { id: 'history', icon: 'history', label: 'nav.history' },
  { id: 'settings', icon: 'settings', label: 'nav.settings' },
];

const TABS = [
  { id: 'dashboard', icon: 'home', label: 'nav.today' },
  { id: 'program', icon: 'calendar', label: 'nav.program' },
  { id: 'library', icon: 'dumbbell', label: 'nav.library' },
  { id: 'nutrition', icon: 'food', label: 'nav.nutrition' },
  { id: 'progress', icon: 'chart', label: 'nav.progress' },
];

const go = (id) => (e) => {
  e.preventDefault();
  navigate(id);
};

const brand = () =>
  h(
    'a.rail__brand',
    { href: '#/dashboard', onclick: go('dashboard'), 'aria-label': 'FitPulse' },
    h('span.rail__logo', icon('bolt', 22)),
    h('span', h('span.rail__name', 'FitPulse'), h('span.rail__tag', t('app.tagline')))
  );

const railItem = (item, active) =>
  h(
    'a.rail__item',
    {
      href: `#/${item.id}`,
      onclick: go(item.id),
      'aria-current': item.id === active ? 'page' : null,
    },
    icon(item.icon, 19),
    t(item.label)
  );

export function renderRail(root) {
  const active = currentRoute()?.id;
  mount(
    root,
    brand(),
    h('div.rail__group', t('nav.today')),
    ...MAIN.map((i) => railItem(i, active)),
    h('div.rail__group', t('nav.tools')),
    ...TOOLS.map((i) => railItem(i, active)),
    h(
      'div.rail__foot',
      h(
        'button.btn.btn--ghost.btn--sm.btn--block',
        { onclick: () => navigate('settings') },
        icon('settings', 16),
        t('nav.settings')
      ),
      h('p.muted.mt-2', { style: { fontSize: 'var(--fs-2xs)' } }, 'FitPulse · v1.0.0 · MIT')
    )
  );
}

export function renderTabbar(root) {
  const active = currentRoute()?.id;
  mount(
    root,
    ...TABS.map((item) =>
      h(
        'a.tab',
        {
          href: `#/${item.id}`,
          onclick: go(item.id),
          'aria-current': item.id === active ? 'page' : null,
        },
        icon(item.icon, 22),
        t(item.label)
      )
    )
  );
}

export function syncNav(rail, tabbar) {
  if (rail) renderRail(rail);
  if (tabbar) renderTabbar(tabbar);
}
