// Extra figure helpers for the measurement and geometry strands (arcs, graphs, parallel marks).
// Built on templates/svg.ts. Angles are in degrees, measured anticlockwise from the positive
// x direction as seen on screen (so 90° points up).

import { ACCENT, angleArc, FILL, INK, label, line, type Pt } from '../../svg';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Point at distance r from c in direction `deg` (screen-anticlockwise, 90° = up). */
export function polar(c: Pt, r: number, deg: number): Pt {
  return { x: c.x + r * Math.cos(rad(deg)), y: c.y - r * Math.sin(rad(deg)) };
}

/** Path data for an arc of a circle, anticlockwise (on screen) from angle a1 to a2. */
export function arcD(c: Pt, r: number, a1: number, a2: number, move = true): string {
  const p1 = polar(c, r, a1);
  const p2 = polar(c, r, a2);
  const sweepDeg = (((a2 - a1) % 360) + 360) % 360;
  const large = sweepDeg > 180 ? 1 : 0;
  return `${move ? `M ${r2(p1.x)} ${r2(p1.y)} ` : ''}A ${r2(r)} ${r2(r)} 0 ${large} 0 ${r2(p2.x)} ${r2(p2.y)}`;
}

/** A stroked (unfilled) arc. */
export function arc(c: Pt, r: number, a1: number, a2: number, opts: { stroke?: string; width?: number } = {}): string {
  return `<path d="${arcD(c, r, a1, a2)}" fill="none" stroke="${opts.stroke ?? INK}" stroke-width="${opts.width ?? 2}"/>`;
}

/** A filled sector (pie slice) from a1 to a2: centre → arc → centre. Use a2 − a1 = 180 for a semicircle. */
export function sector(c: Pt, r: number, a1: number, a2: number, opts: { fill?: string; stroke?: string } = {}): string {
  const p1 = polar(c, r, a1);
  return `<path d="M ${r2(c.x)} ${r2(c.y)} L ${r2(p1.x)} ${r2(p1.y)} ${arcD(c, r, a1, a2, false)} Z" fill="${opts.fill ?? FILL}" stroke="${opts.stroke ?? INK}" stroke-width="2"/>`;
}

/** Any closed path given as SVG path data. */
export function pathShape(d: string, opts: { fill?: string; stroke?: string; width?: number; dash?: boolean } = {}): string {
  return `<path d="${d}" fill="${opts.fill ?? FILL}" stroke="${opts.stroke ?? INK}" stroke-width="${opts.width ?? 2}"${opts.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
}

/** Average of points (a point inside a convex shape). */
export function centroid(points: Pt[]): Pt {
  const n = points.length || 1;
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

/**
 * Label for segment a–b placed on the side away from `inside` (so it sits outside the shape).
 * The gap allows for the text width when the label sits beside a steep edge.
 */
export function labelAway(
  a: Pt,
  b: Pt,
  inside: Pt,
  text: string,
  opts: { offset?: number; fill?: string; size?: number; bold?: boolean } = {},
): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / len;
  let ny = (b.x - a.x) / len;
  if ((mx - inside.x) * nx + (my - inside.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const size = opts.size ?? 14;
  const halfWidth = (text.length * size * 0.56) / 2;
  const off = (opts.offset ?? 12) + Math.abs(nx) * halfWidth + Math.abs(ny) * (size * 0.3);
  return label({ x: mx + nx * off, y: my + ny * off }, text, {
    size,
    ...(opts.fill && { fill: opts.fill }),
    ...(opts.bold && { bold: true }),
  });
}

/**
 * An angle arc at `vertex` (the smaller angle between the directions to p1 and p2), with its label
 * pushed out along the bisector far enough that longer labels such as "(3x + 10)°" clear the lines.
 */
export function arcWithLabel(vertex: Pt, p1: Pt, p2: Pt, text: string, radius = 24): string {
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  const mid = a1 + delta / 2;
  const halfW = (text.length * 14 * 0.56) / 2;
  const halfH = 7;
  const c = Math.abs(Math.cos(mid));
  const s = Math.abs(Math.sin(mid));
  // Half-size of the label box along the bisector, and across it.
  const along = halfW * c + halfH * s;
  const across = halfW * s + halfH * c;
  // Far enough to clear the arc, and far enough that the box fits between the two arms.
  const dist = Math.max(radius + 5 + along, across / Math.tan(Math.max(0.2, Math.abs(delta) / 2)) + 3);
  return (
    angleArc(vertex, p1, p2, undefined, radius) +
    label({ x: vertex.x + dist * Math.cos(mid), y: vertex.y + dist * Math.sin(mid) }, text, { fill: ACCENT })
  );
}

/** Small grey "Not to scale" note. */
export function notToScale(at: Pt, anchor: 'start' | 'middle' | 'end' = 'end'): string {
  return label(at, 'Not to scale', { size: 11, fill: '#6b7280', anchor });
}

/** Rotated text (e.g. a vertical axis title). */
export function rotatedLabel(at: Pt, text: string, deg: number, opts: { size?: number; fill?: string } = {}): string {
  return `<text x="${r2(at.x)}" y="${r2(at.y)}" text-anchor="middle" dominant-baseline="middle" font-size="${opts.size ?? 13}" fill="${opts.fill ?? INK}" transform="rotate(${deg} ${r2(at.x)} ${r2(at.y)})">${esc(text)}</text>`;
}

/** Chevron arrow marks (">" or ">>") at the middle of segment a→b, pointing from a to b. */
export function parallelMarks(a: Pt, b: Pt, count = 1, size = 7): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let out = '';
  for (let i = 0; i < count; i++) {
    const shift = (i - (count - 1) / 2) * 7;
    const tip = { x: mid.x + ux * (shift + size / 2), y: mid.y + uy * (shift + size / 2) };
    const back = { x: tip.x - ux * size, y: tip.y - uy * size };
    const p1 = { x: back.x - uy * size * 0.7, y: back.y + ux * size * 0.7 };
    const p2 = { x: back.x + uy * size * 0.7, y: back.y - ux * size * 0.7 };
    out += `<polyline points="${r2(p1.x)},${r2(p1.y)} ${r2(tip.x)},${r2(tip.y)} ${r2(p2.x)},${r2(p2.y)}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  }
  return out;
}

/** Small tick across the middle of a segment (equal-length marks). */
export function equalTick(a: Pt, b: Pt, count = 1, size = 6): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let out = '';
  for (let i = 0; i < count; i++) {
    const shift = (i - (count - 1) / 2) * 5;
    const c = { x: mid.x + ux * shift, y: mid.y + uy * shift };
    out += line({ x: c.x - uy * size, y: c.y + ux * size }, { x: c.x + uy * size, y: c.y - ux * size }, { width: 1.5 });
  }
  return out;
}

/** An arrowhead line from a to b (for directions such as "Front"). */
export function arrow(a: Pt, b: Pt, opts: { stroke?: string } = {}): string {
  const stroke = opts.stroke ?? INK;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const back = { x: b.x - ux * 9, y: b.y - uy * 9 };
  const p1 = { x: back.x - uy * 5, y: back.y + ux * 5 };
  const p2 = { x: back.x + uy * 5, y: back.y - ux * 5 };
  return (
    line(a, back, { stroke, width: 2 }) +
    `<polygon points="${r2(b.x)},${r2(b.y)} ${r2(p1.x)},${r2(p1.y)} ${r2(p2.x)},${r2(p2.y)}" fill="${stroke}"/>`
  );
}

export interface GraphOptions {
  xMax: number;
  yMax: number;
  xStep: number;
  yStep: number;
  xLabel: string;
  yLabel: string;
  /** Label every n-th grid line (defaults: every line). */
  xLabelEvery?: number;
  yLabelEvery?: number;
  /** Plot area size in px. */
  width?: number;
  height?: number;
}

/**
 * Axes for a first-quadrant graph (e.g. distance–time) with labelled ticks every step and a
 * light grid. Returns a mapper from data coordinates to pixels and the total figure size.
 */
export function graphAxes(o: GraphOptions): { width: number; height: number; toPx: (p: Pt) => Pt; body: string } {
  const left = 62;
  const top = 18;
  const w = o.width ?? 300;
  const h = o.height ?? 210;
  const bottomPad = 50;
  const rightPad = 22;
  const toPx = (p: Pt): Pt => ({ x: left + (p.x / o.xMax) * w, y: top + h - (p.y / o.yMax) * h });
  let body = '';
  let i = 0;
  for (let x = 0; x <= o.xMax + 1e-9; x += o.xStep, i++) {
    body += line(toPx({ x, y: 0 }), toPx({ x, y: o.yMax }), { stroke: '#e5e7eb', width: 1 });
    if (i % (o.xLabelEvery ?? 1) === 0) {
      body += label({ x: toPx({ x, y: 0 }).x, y: top + h + 13 }, String(Math.round(x * 100) / 100), { size: 11, fill: '#4b5563' });
    }
  }
  i = 0;
  for (let y = 0; y <= o.yMax + 1e-9; y += o.yStep, i++) {
    body += line(toPx({ x: 0, y }), toPx({ x: o.xMax, y }), { stroke: '#e5e7eb', width: 1 });
    if (i % (o.yLabelEvery ?? 1) === 0) {
      body += label({ x: left - 8, y: toPx({ x: 0, y }).y }, String(Math.round(y * 100) / 100), { size: 11, fill: '#4b5563', anchor: 'end' });
    }
  }
  body += line(toPx({ x: 0, y: 0 }), toPx({ x: o.xMax, y: 0 }), { width: 1.5 });
  body += line(toPx({ x: 0, y: 0 }), toPx({ x: 0, y: o.yMax }), { width: 1.5 });
  body += label({ x: left + w / 2, y: top + h + 34 }, o.xLabel, { size: 13 });
  body += rotatedLabel({ x: 16, y: top + h / 2 }, o.yLabel, -90);
  return { width: left + w + rightPad, height: top + h + bottomPad, toPx, body };
}

/** A polyline through points (for graphs). */
export function polyline(points: Pt[], opts: { stroke?: string; width?: number } = {}): string {
  return `<polyline points="${points.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' ')}" fill="none" stroke="${opts.stroke ?? ACCENT}" stroke-width="${opts.width ?? 2.5}" stroke-linejoin="round"/>`;
}

