/**
 * Body map — a simple front/back silhouette with muscle highlighting.
 * Used in the exercise detail sheet so every movement shows what it loads.
 */

const NS = 'http://www.w3.org/2000/svg';

const el = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const mirror = (node) => {
  const c = node.cloneNode(false);
  for (const a of node.attributes) {
    if (a.name !== 'transform') c.setAttribute(a.name, a.value);
  }
  c.setAttribute('transform', 'translate(120,0) scale(-1,1)');
  return c;
};

const pair = (tag, attrs) => {
  const left = el(tag, attrs);
  return [left, mirror(left)];
};

/** front view parts */
function front() {
  const g = el('g');
  const add = (mus, tag, attrs) => pair(tag, { ...attrs, 'data-mus': mus }).forEach((n) => g.append(n));

  g.append(el('ellipse', { cx: 60, cy: 17, rx: 10, ry: 12, 'data-mus': 'neck' }));
  g.append(el('path', { d: 'M55 27 h10 v9 l-5 3 -5-3z', 'data-mus': 'neck' }));

  add('delts', 'ellipse', { cx: 34, cy: 49, rx: 11, ry: 10 });
  add('chest', 'path', {
    d: 'M41 45 C47 41 57 42 59 48 C61 56 57 67 48 67 C42 67 39 54 41 45Z',
  });
  add('abs', 'rect', { x: 47, y: 69, width: 11, height: 10, rx: 3 });
  add('abs', 'rect', { x: 47, y: 81, width: 11, height: 10, rx: 3 });
  add('abs', 'rect', { x: 49, y: 93, width: 9, height: 10, rx: 3 });
  add('obliques', 'path', { d: 'M39 69 C37 79 38 92 42 101 L47 93 C44 84 44 75 45 69Z' });
  add('biceps', 'ellipse', { cx: 29, cy: 78, rx: 7.5, ry: 12 });
  add('forearms', 'rect', { x: 25.5, y: 91, width: 8, height: 18, rx: 4 });
  add('forearms', 'circle', { cx: 29.5, cy: 114, r: 4 });
  add('quads', 'path', { d: 'M42 105 C38 117 37 138 40 156 C42 164 52 164 53 156 C54 138 54 117 54 105Z' });
  add('adductors', 'path', { d: 'M54 106 C53 120 52 138 53 154 L60 154 C60 138 60 120 60 106Z' });
  add('calves', 'path', { d: 'M41 162 C39 172 40 182 42 187 C45 191 51 191 52 187 C53 181 52 171 52 162Z' });
  add('calves', 'ellipse', { cx: 46, cy: 193, rx: 7, ry: 3.4 });
  return g;
}

/** back view parts */
function back() {
  const g = el('g');
  const add = (mus, tag, attrs) => pair(tag, { ...attrs, 'data-mus': mus }).forEach((n) => g.append(n));

  g.append(el('ellipse', { cx: 60, cy: 17, rx: 10, ry: 12, 'data-mus': 'neck' }));
  g.append(el('path', { d: 'M55 27 h10 v9 l-5 3 -5-3z', 'data-mus': 'neck' }));

  add('traps', 'path', { d: 'M52 31 C43 36 37 42 33 51 L44 55 C48 46 52 41 56 39Z' });
  add('rearDelts', 'ellipse', { cx: 34, cy: 50, rx: 11, ry: 10 });
  add('lats', 'path', { d: 'M37 52 C32 62 30 77 33 89 L45 85 C44 72 45 60 48 52Z' });
  add('back', 'rect', { x: 50, y: 70, width: 20, height: 26, rx: 7 });
  add('lowerBack', 'path', { d: 'M50 76 h20 v18 h-20z' });
  add('triceps', 'ellipse', { cx: 29, cy: 78, rx: 7.5, ry: 12 });
  add('forearms', 'rect', { x: 25.5, y: 91, width: 8, height: 18, rx: 4 });
  add('glutes', 'path', { d: 'M44 97 C39 103 39 114 45 119 L58 119 C64 114 64 103 59 97Z' });
  add('hamstrings', 'path', { d: 'M43 119 C40 131 40 148 43 157 C46 163 53 163 54 157 C55 146 55 131 55 119Z' });
  add('calves', 'path', { d: 'M41 162 C39 172 40 182 42 187 C45 191 51 191 52 187 C53 181 52 171 52 162Z' });
  add('calves', 'ellipse', { cx: 46, cy: 193, rx: 7, ry: 3.4 });
  return g;
}

/**
 * @param {string[]} active muscle ids to highlight
 * @returns {SVGElement}
 */
export function muscleMap(active = []) {
  const set = new Set(active);
  const svg = el('svg', { viewBox: '0 0 182 208', role: 'img', 'aria-label': 'Карта мышц' });

  const defs = el('defs');
  const grad = el('linearGradient', { id: 'musGrad', x1: '0', y1: '0', x2: '1', y2: '1' });
  const s1 = el('stop', { offset: '0', 'stop-color': 'var(--accent-1)' });
  const s2 = el('stop', { offset: '1', 'stop-color': 'var(--accent-2)' });
  grad.append(s1, s2);
  defs.append(grad);
  svg.append(defs);

  const style = el('style');
  style.textContent = `
    [data-mus] { fill: var(--surface-2); stroke: var(--line-strong); stroke-width: 1; transition: fill 320ms ease, stroke 320ms ease; }
    [data-mus].is-active { fill: url(#musGrad); stroke: none; }
  `;
  svg.append(style);

  const fg = front();
  const bg = back();
  fg.setAttribute('transform', 'translate(2,0)');
  bg.setAttribute('transform', 'translate(80,0)');
  svg.append(fg, bg);

  svg.querySelectorAll('[data-mus]').forEach((node) => {
    if (set.has(node.dataset.mus)) node.classList.add('is-active');
  });

  const labels = el('g', { 'font-size': '9', fill: 'var(--text-3)', 'font-family': 'var(--font-ui)', 'text-anchor': 'middle' });
  const f = el('text', { x: 62, y: 206 });
  f.textContent = 'front';
  const b = el('text', { x: 140, y: 206 });
  b.textContent = 'back';
  labels.append(f, b);
  svg.append(labels);

  return svg;
}
