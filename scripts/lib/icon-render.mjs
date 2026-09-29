/**
 * Shared rasteriser for the FitPulse mark.
 *
 * assets/icons/icon.svg is the source of truth, but there is no SVG or image
 * dependency in this project on purpose, so the shapes are re-drawn here with
 * 4×4 supersampled coverage and written as PNG through zlib. Both the PWA icon
 * generator and the Android resource generator build on this module so the two
 * platforms can never drift apart.
 */

import { deflateSync } from 'node:zlib';

/* ----------------------------- canvas ----------------------------- */
export const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Diagonal gradient coordinate, matching the SVG's x1,y1→x2,y2 object box. */
const diag = (x, y, size) => clamp01((x / size + y / size) / 2);

/** Signed distance to a rounded rectangle; negative inside. */
function sdRoundRect(px, py, size, radius) {
  const qx = Math.abs(px - size / 2) - (size / 2 - radius);
  const qy = Math.abs(py - size / 2) - (size / 2 - radius);
  const ax = qx > 0 ? qx : 0;
  const ay = qy > 0 ? qy : 0;
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - radius;
}

/** Signed distance to a circle inscribed in size×size. */
const sdCircle = (px, py, size) => Math.hypot(px - size / 2, py - size / 2) - size / 2;

/** Distance from a point to a polyline (round caps and joins fall out of min-of-segments). */
function sdPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - (x1 + t * dx);
    const ey = py - (y1 + t * dy);
    const d = Math.sqrt(ex * ex + ey * ey);
    if (d < best) best = d;
  }
  return best;
}

/* ------------------------------ PNG ------------------------------ */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/**
 * @param {Uint8Array} rgba row-major RGBA, size×size
 */
export function encodePng(rgba, size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------- palette ---------------------------- */
export const BG_TOP = hex('#0f1220');
export const BG_BOTTOM = hex('#070810');
export const BOLT_A = hex('#b6ff3a');
export const BOLT_B = hex('#35e0ff');

/** The pulse trace, in 0..1 icon space (see icon.svg). */
const PULSE = [
  [0.125, 0.5625],
  [0.2656, 0.5625],
  [0.332, 0.3906],
  [0.4414, 0.7344],
  [0.5273, 0.5],
  [0.5859, 0.625],
  [0.875, 0.625],
];

const SS = 4; // supersampling factor per axis

/**
 * Renders the mark.
 *
 * @param size  output edge in px
 * @param opts.shape          'squircle' | 'circle' | 'none' — the plate behind the trace
 * @param opts.contentScale   how large the trace is relative to the canvas, centred
 * @param opts.strokeScale    how thick the trace is; pass contentScale to keep
 *                            the mark's proportions identical while scaling it
 * @param opts.maskable       shorthand for contentScale 0.76, no radius, no inner border
 * @param opts.tintBorder     hairline of the gradient bolt colour on the plate edge
 */
export function renderIcon(size, opts = {}) {
  const {
    shape = 'squircle',
    maskable = false,
    contentScale = maskable ? 0.76 : 1,
    strokeScale = 1,
    tintBorder = !maskable,
  } = opts;

  const rgba = new Uint8Array(size * size * 4);
  // maskable icons fill the square because the launcher crops them
  const radius = maskable ? 0 : size * 0.219; // 112/512
  const box = size * contentScale;
  const ox = (size - box) / 2;
  const oy = (size - box) / 2;
  const stroke = size * 0.043 * strokeScale; // 22/512

  const pts = PULSE.map(([x, y]) => [ox + x * box, oy + y * box]);
  const pad = stroke;
  const bbMinX = Math.min(...pts.map((p) => p[0])) - pad;
  const bbMaxX = Math.max(...pts.map((p) => p[0])) + pad;
  const bbMinY = Math.min(...pts.map((p) => p[1])) - pad;
  const bbMaxY = Math.max(...pts.map((p) => p[1])) + pad;

  const samples = SS * SS;
  const inv = 1 / samples;
  const halfStroke = stroke / 2;
  const borderInner = -size * 0.008;
  const bAR = BOLT_A[0];
  const bAG = BOLT_A[1];
  const bAB = BOLT_A[2];
  const bDR = BOLT_B[0] - BOLT_A[0];
  const bDG = BOLT_B[1] - BOLT_A[1];
  const bDB = BOLT_B[2] - BOLT_A[2];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let plate = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let bolt = 0;
      let br = 0;
      let bg = 0;
      let bb = 0;

      for (let sy = 0; sy < SS; sy++) {
        const py = y + (sy + 0.5) / SS;
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;

          let d = Infinity;
          if (shape === 'squircle') d = sdRoundRect(px, py, size, radius);
          else if (shape === 'circle') d = sdCircle(px, py, size);

          const inPlate = d <= 0.5;
          if (!inPlate && shape !== 'none') continue;
          if (inPlate) plate += 1;

          const t = diag(px, py, size);
          r += lerp(BG_TOP[0], BG_BOTTOM[0], t);
          g += lerp(BG_TOP[1], BG_BOTTOM[1], t);
          b += lerp(BG_TOP[2], BG_BOTTOM[2], t);
          if (inPlate && d > borderInner && tintBorder) {
            r = lerp(r, bAR, 0.18);
            g = lerp(g, bAG, 0.18);
            b = lerp(b, bAB, 0.18);
          }
          // cheap bounding-box reject before the six-segment distance test
          if (px >= bbMinX && px <= bbMaxX && py >= bbMinY && py <= bbMaxY && sdPolyline(px, py, pts) <= halfStroke) {
            bolt += 1;
            br += bAR + bDR * t;
            bg += bAG + bDG * t;
            bb += bAB + bDB * t;
          }
        }
      }

      const alpha = shape === 'none' ? bolt : plate;
      if (alpha === 0) continue;
      const k = bolt > 0 ? bolt / samples : 0;
      const pr = plate > 0 ? r / plate : 0;
      const pg = plate > 0 ? g / plate : 0;
      const pb = plate > 0 ? b / plate : 0;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(bolt > 0 ? pr + (br / bolt - pr) * k : pr);
      rgba[i + 1] = Math.round(bolt > 0 ? pg + (bg / bolt - pg) * k : pg);
      rgba[i + 2] = Math.round(bolt > 0 ? pb + (bb / bolt - pb) * k : pb);
      rgba[i + 3] = Math.round(alpha * inv * 255);
    }
  }
  return rgba;
}
