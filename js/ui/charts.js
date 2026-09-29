/**
 * Lightweight SVG charts with animation — ring, line, bars, donut, sparkline.
 * No dependencies; every chart animates on mount and reacts to hover/touch.
 */

import { h, clear } from '../core/dom.js';
import { num } from '../core/format.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/* ------------------------------ ring ------------------------------ */
/**
 * Circular progress ring.
 * @param {{value:number,max:number,size?:number,stroke?:number,color?:string,
 *          track?:string,label?:string,caption?:string,cap?:string}} opts
 */
export function ring({ value, max = 100, size = 132, stroke = 10, color, label, caption, cap = true }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1.35, value / max) : 0;

  const track = svg('circle', {
    class: 'ring__track',
    cx: size / 2,
    cy: size / 2,
    r,
    'stroke-width': stroke,
  });
  const arc = svg('circle', {
    class: 'ring__value',
    cx: size / 2,
    cy: size / 2,
    r,
    'stroke-width': stroke,
    stroke: color ?? 'url(#ringGrad)',
    'stroke-dasharray': c,
    'stroke-dashoffset': c,
  });

  const defs = svg('defs');
  const grad = svg('linearGradient', { id: 'ringGrad', x1: '0', y1: '0', x2: '1', y2: '1' });
  grad.append(
    svg('stop', { offset: '0', 'stop-color': 'var(--accent-1)' }),
    svg('stop', { offset: '1', 'stop-color': 'var(--accent-2)' })
  );
  defs.append(grad);

  const node = h(
    'div.ring',
    { style: { width: size + 'px', height: size + 'px' } },
    (() => {
      const s = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
      s.append(defs, track, arc);
      return s;
    })(),
    h(
      'div.ring__center',
      h('div.ring__num', label ?? num(value)),
      cap && caption ? h('div.ring__cap', caption) : null
    )
  );

  requestAnimationFrame(() => {
    arc.style.transition = 'stroke-dashoffset 950ms cubic-bezier(0.22,1,0.36,1)';
    arc.setAttribute('stroke-dashoffset', String(c * (1 - Math.min(1, ratio))));
  });

  node.setValue = (v) => arc.setAttribute('stroke-dashoffset', String(c * (1 - Math.min(1, max > 0 ? v / max : 0))));
  node.arc = arc;
  node.circumference = c;
  return node;
}

/* ------------------------------ donut ------------------------------ */
/** @param {{segments:[{value:number,color:string,label:string}],size?:number,stroke?:number}} opts */
export function donut({ segments, size = 128, stroke = 14, center }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const node = h('div.ring', { style: { width: size + 'px', height: size + 'px' } });
  const s = svg('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, style: { transform: 'rotate(-90deg)' } });
  s.append(svg('circle', { class: 'ring__track', cx: size / 2, cy: size / 2, r, 'stroke-width': stroke }));
  let offset = 0;
  const arcs = [];
  for (const seg of segments) {
    const len = (seg.value / total) * c;
    const arc = svg('circle', {
      class: 'ring__value',
      cx: size / 2,
      cy: size / 2,
      r,
      'stroke-width': stroke,
      stroke: seg.color,
      'stroke-dasharray': `${len} ${c - len}`,
      'stroke-dashoffset': -offset,
      opacity: 0.95,
    });
    arcs.push(arc);
    s.append(arc);
    offset += len;
  }
  node.append(s);
  if (center) node.append(h('div.ring__center', center));
  requestAnimationFrame(() => {
    arcs.forEach((a) => {
      const len = Number(a.getAttribute('stroke-dasharray').split(' ')[0]);
      a.setAttribute('stroke-dasharray', `0 ${c}`);
      requestAnimationFrame(() => {
        a.style.transition = 'stroke-dasharray 800ms cubic-bezier(0.22,1,0.36,1)';
        a.setAttribute('stroke-dasharray', `${len} ${c - len}`);
      });
    });
  });
  return node;
}

/* ------------------------------ line chart ------------------------------ */
/**
 * @param {{data:Array<{x:number,y:number,label?:string}>,height?:number,color?:string,
 *          area?:boolean,yLabel?:(v:number)=>string,showDots?:boolean,curve?:boolean,
 *          target?:{y:number,label:string},xTicks?:number}} opts
 */
export function lineChart({
  data,
  height = 200,
  color = 'var(--accent-1)',
  area = true,
  yLabel = (v) => num(v, 1),
  showDots = true,
  smooth = true,
  target = null,
  xTicks = 6,
  format = (v) => num(v, 1),
}) {
  const W = 600;
  const H = height;
  const pad = { l: 34, r: 12, t: 14, b: 22 };
  const wrap = h('div.chart-wrap');
  const el = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
  el.style.height = H + 'px';

  const pts = data ?? [];
  if (pts.length === 0) {
    el.append(svg('text', { class: 'chart__empty', x: W / 2, y: H / 2 }, '—'));
    wrap.append(el);
    return wrap;
  }

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.05);
  const minY = rawMin - span * 0.18;
  const maxY = rawMax + span * 0.18;
  const px = (x) => pad.l + ((x - minX) / (maxX - minX || 1)) * (W - pad.l - pad.r);
  const py = (y) => pad.t + (1 - (y - minY) / (maxY - minY || 1)) * (H - pad.t - pad.b);

  // grid + y labels
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const v = minY + ((maxY - minY) * i) / gridCount;
    const y = py(v);
    el.append(svg('line', { class: 'chart__grid', x1: pad.l, x2: W - pad.r, y1: y, y2: y }));
    const t = svg('text', { class: 'chart__axis', x: 4, y: y + 3 });
    t.textContent = yLabel(v);
    el.append(t);
  }
  if (target && target.y >= minY && target.y <= maxY) {
    const y = py(target.y);
    el.append(
      svg('line', {
        x1: pad.l,
        x2: W - pad.r,
        y1: y,
        y2: y,
        stroke: 'var(--accent-2)',
        'stroke-width': 1.4,
        'stroke-dasharray': '5 4',
        opacity: 0.8,
      })
    );
    const tl = svg('text', { class: 'chart__axis', x: W - pad.r, y: y - 5, 'text-anchor': 'end' });
    tl.textContent = target.label;
    el.append(tl);
  }

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`);
  const lineD = smooth ? smoothPath(path) : path.join(' ');
  const areaD = `${lineD} L ${px(maxX).toFixed(1)} ${H - pad.b} L ${px(minX).toFixed(1)} ${H - pad.b} Z`;

  if (area) {
    const areaEl = svg('path', { class: 'chart__area', d: areaD, fill: color });
    el.append(areaEl);
    requestAnimationFrame(() => {
      areaEl.style.transition = 'opacity 700ms ease 260ms';
      areaEl.style.opacity = '0.18';
    });
  }
  const line = svg('path', { class: 'chart__line', d: lineD, stroke: color });
  el.append(line);
  const len = line.getTotalLength ? 3000 : 0;
  try {
    const total = line.getTotalLength();
    line.style.strokeDasharray = `${total}`;
    line.style.strokeDashoffset = `${total}`;
    line.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => (line.style.strokeDashoffset = '0'));
  } catch {
    /* getTotalLength unsupported — line simply appears */
  }

  if (showDots) {
    pts.forEach((p, i) => {
      const dot = svg('circle', {
        class: 'chart__pt',
        cx: px(p.x),
        cy: py(p.y),
        r: 3.4,
        fill: color,
      });
      el.append(dot);
      dot.style.opacity = '0';
      dot.style.transition = 'opacity 300ms ease';
      setTimeout(() => (dot.style.opacity = '1'), 320 + i * 22);
    });
  }

  // x ticks
  const step = Math.max(1, Math.floor(pts.length / xTicks));
  for (let i = 0; i < pts.length; i += step) {
    const tx = svg('text', {
      class: 'chart__axis',
      x: px(pts[i].x),
      y: H - 6,
      'text-anchor': i === 0 ? 'start' : 'middle',
    });
    tx.textContent = pts[i].label ?? '';
    el.append(tx);
  }

  // hover interaction
  const cursor = svg('line', { class: 'chart__cursor', y1: pad.t, y2: H - pad.b, x1: 0, x2: 0, opacity: 0 });
  el.append(cursor);
  const tip = h('div.chart-tip', { style: { opacity: '0' } });
  wrap.append(el, tip);

  const move = (ev) => {
    const rect = el.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const ratio = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(px(p.x) - ratio);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const p = pts[best];
    cursor.setAttribute('x1', px(p.x));
    cursor.setAttribute('x2', px(p.x));
    cursor.setAttribute('opacity', '1');
    tip.textContent = `${p.label ? p.label + ' · ' : ''}${format(p.y)}`;
    tip.style.opacity = '1';
    tip.style.left = `${(px(p.x) / W) * 100}%`;
    tip.style.top = `${(py(p.y) / H) * 100}%`;
  };
  const leave = () => {
    cursor.setAttribute('opacity', '0');
    tip.style.opacity = '0';
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  el.addEventListener('touchmove', move, { passive: true });
  el.addEventListener('touchend', leave);
  return wrap;
}

/** Catmull-Rom → cubic bezier for a smooth line without overshoot artefacts. */
function smoothPath(path) {
  if (path.length < 3) return path.join(' ');
  let d = path[0];
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i].slice(1).split(' ').map(Number);
    const [x1, y1] = path[i + 1].slice(1).split(' ').map(Number);
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

/* ------------------------------ bars ------------------------------ */
/** @param {{data:Array<{label:string,value:number,color?:string,sub?:string}>,height?:number,format?:(v:number)=>string}} opts */
export function barChart({ data, height = 180, color = 'var(--accent-2)', format = (v) => num(v), showValues = true }) {
  const W = 600;
  const H = height;
  const pad = { l: 30, r: 10, t: 16, b: 24 };
  const wrap = h('div.chart-wrap');
  const el = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
  el.style.height = H + 'px';
  const vals = data.map((d) => d.value);
  const max = Math.max(1, ...vals);
  const innerW = W - pad.l - pad.r;
  const slot = innerW / Math.max(1, data.length);
  const bw = Math.min(38, slot * 0.6);

  for (let i = 0; i <= 3; i++) {
    const y = pad.t + ((H - pad.t - pad.b) * i) / 3;
    el.append(svg('line', { class: 'chart__grid', x1: pad.l, x2: W - pad.r, y1: y, y2: y }));
    const t = svg('text', { class: 'chart__axis', x: 2, y: y + 3 });
    t.textContent = format(Math.round(max * (1 - i / 3)));
    el.append(t);
  }

  data.forEach((d, i) => {
    const hFull = ((H - pad.t - pad.b) * d.value) / max;
    const x = pad.l + slot * i + (slot - bw) / 2;
    const y = H - pad.b - hFull;
    const rect = svg('rect', {
      class: 'chart__bar',
      x,
      y: H - pad.b,
      width: bw,
      height: 0,
      rx: 5,
      fill: d.color ?? color,
    });
    el.append(rect);
    const full = svg('rect', { x, y, width: bw, height: hFull, rx: 5, fill: d.color ?? color });
    full.setAttribute('opacity', '0.35');
    el.append(full);
    requestAnimationFrame(() => {
      rect.style.transition = `y 700ms cubic-bezier(0.22,1,0.36,1) ${i * 30}ms, height 700ms cubic-bezier(0.22,1,0.36,1) ${i * 30}ms`;
      rect.setAttribute('y', y);
      rect.setAttribute('height', hFull);
    });
    const label = svg('text', { class: 'chart__axis', x: x + bw / 2, y: H - 6, 'text-anchor': 'middle' });
    label.textContent = d.label;
    el.append(label);
    if (showValues && d.value > 0) {
      const vt = svg('text', {
        class: 'chart__axis',
        x: x + bw / 2,
        y: y - 6,
        'text-anchor': 'middle',
        fill: 'var(--text-2)',
      });
      vt.textContent = d.sub ?? format(d.value);
      el.append(vt);
    }
  });

  const tip = h('div.chart-tip', { style: { opacity: '0' } });
  wrap.append(el, tip);
  el.addEventListener('pointermove', (ev) => {
    const rect = el.getBoundingClientRect();
    const ratio = ((ev.clientX - rect.left) / rect.width) * W;
    const idx = Math.floor((ratio - pad.l) / slot);
    const d = data[Math.max(0, Math.min(data.length - 1, idx))];
    if (!d) return;
    tip.textContent = `${d.label}: ${format(d.value)}`;
    tip.style.opacity = '1';
    tip.style.left = `${((pad.l + slot * idx + slot / 2) / W) * 100}%`;
    tip.style.top = '12%';
  });
  el.addEventListener('pointerleave', () => (tip.style.opacity = '0'));
  return wrap;
}

/* ------------------------------ sparkline ------------------------------ */
export function sparkline(values, { width = 120, height = 34, color = 'var(--accent-1)' } = {}) {
  const el = svg('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}` });
  el.style.height = height + 'px';
  el.style.width = width + 'px';
  if (!values.length) return el;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  el.append(svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round' }));
  return el;
}

/* ------------------------------ heat calendar ------------------------------ */
/** @param {Map<string,number>} counts date(iso) → value */
export function heatCalendar(counts, weeks = 12, color = 'var(--accent-1)') {
  const grid = h('div.heat');
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - ((end.getDay() + 6) % 7) + 6); // last Saturday
  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = counts.get(iso) ?? 0;
    const lvl = v === 0 ? '' : v === 1 ? ' heat__lvl1' : v === 2 ? ' heat__lvl2' : v === 3 ? ' heat__lvl3' : ' heat__lvl4';
    grid.append(
      h(`div.heat__cell${lvl}`, {
        title: `${iso}: ${v}`,
        style: lvl ? { background: color } : {},
      })
    );
  }
  return grid;
}

/** Animated count-up for numbers (respects reduced motion). */
export function countUp(el, to, { duration = 700, digits = 0, suffix = '' } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    el.textContent = num(to, digits) + suffix;
    return;
  }
  const from = 0;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = num(from + (to - from) * eased, digits) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export { clear };
