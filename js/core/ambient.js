/** Ambient background (a static canvas particle field, painted once). */

import { $ } from './dom.js';

let canvas = null;
let ctx = null;
let dots = [];
let w = 0;
let h_ = 0;
let dpr = 1;

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

function draw() {
  ctx.clearRect(0, 0, w, h_);
  for (const d of dots) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = d.c;
    ctx.globalAlpha = d.a;
    ctx.fill();
  }
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
  resize();
  window.addEventListener('resize', () => {
    clearTimeout(canvas._t);
    canvas._t = setTimeout(() => {
      resize();
      draw();
    }, 200);
  });
  document.addEventListener('fitpulse:accent', () => {
    const colors = COLORS();
    dots.forEach((d, i) => (d.c = colors[i % colors.length]));
    draw();
  });
  // Painted once and left alone. This used to be a requestAnimationFrame loop
  // repainting up to 70 dots plus ~2400 stroked connector lines every frame,
  // which ran continuously behind the page and made scrolling stutter on
  // mid-range phones. The background is decoration, so a still frame is enough.
  draw();
}
