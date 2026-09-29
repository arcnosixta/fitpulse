/** Animated ambient background (canvas particle field). */

import { $ } from './dom.js';

let raf = null;
let canvas = null;
let ctx = null;
let dots = [];
let w = 0;
let h_ = 0;
let dpr = 1;
let reduce = false;

const COLORS = () => {
  const cs = getComputedStyle(document.documentElement);
  return [
    cs.getPropertyValue('--accent-1').trim() || '#b6ff3a',
    cs.getPropertyValue('--accent-2').trim() || '#35e0ff',
    cs.getPropertyValue('--accent-3').trim() || '#7a5cff',
  ];
};

function resize() {
  if (!canvas) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h_ = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h_ * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.round(Math.min(70, (w * h_) / 26000));
  const colors = COLORS();
  dots = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h_,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r: 0.7 + Math.random() * 1.9,
    c: colors[Math.floor(Math.random() * colors.length)],
    a: 0.16 + Math.random() * 0.4,
  }));
}

function frame() {
  ctx.clearRect(0, 0, w, h_);
  for (const d of dots) {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < -10) d.x = w + 10;
    if (d.x > w + 10) d.x = -10;
    if (d.y < -10) d.y = h_ + 10;
    if (d.y > h_ + 10) d.y = -10;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = d.c;
    ctx.globalAlpha = d.a;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // connecting lines keep the field from looking like noise
  ctx.lineWidth = 1;
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130) {
        ctx.globalAlpha = 0.08 * (1 - dist / 130);
        ctx.strokeStyle = dots[i].c;
        ctx.beginPath();
        ctx.moveTo(dots[i].x, dots[i].y);
        ctx.lineTo(dots[j].x, dots[j].y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(frame);
}

export function startAmbient() {
  canvas = $('#fx-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d', { alpha: true });
  // decorative only — never let a missing/blocked 2D context stop the app booting
  if (!ctx) {
    canvas.hidden = true;
    return;
  }
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  resize();
  window.addEventListener('resize', () => {
    clearTimeout(canvas._t);
    canvas._t = setTimeout(resize, 200);
  });
  document.addEventListener('fitpulse:accent', () => {
    const colors = COLORS();
    dots.forEach((d, i) => (d.c = colors[i % colors.length]));
  });
  if (reduce) {
    drawStatic();
    return;
  }
  frame();
  // pause when the tab is hidden to save battery
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      frame();
    }
  });
}

function drawStatic() {
  ctx.clearRect(0, 0, w, h_);
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = d.c;
    ctx.globalAlpha = d.a;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
