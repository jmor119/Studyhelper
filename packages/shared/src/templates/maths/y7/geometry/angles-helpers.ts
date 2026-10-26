// Figure helpers for the Year 7 geometry topics (angles, polygons, transformations, nets, position).
// Built on templates/svg.ts. Copied and adapted from the Year 9 figure helpers so these files stand
// alone. Angles are in degrees, measured anticlockwise from the positive x direction as seen on
// screen (so 90° points up).

import type { Rng } from '../../../../rng';
import { ACCENT, angleArc, dot, INK, label, line, rightAngleMark, svgDoc, type Pt } from '../../../svg';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Point at distance r from c in direction `deg` (screen-anticlockwise, 90° = up). */
export function polar(c: Pt, r: number, deg: number): Pt {
  return { x: c.x + r * Math.cos(rad(deg)), y: c.y - r * Math.sin(rad(deg)) };
}

/** "65°" */
export const deg = (n: number | string) => `${n}°`;

/**
 * An angle arc at `vertex` (the smaller angle between the directions to p1 and p2), with its label
 * pushed out along the bisector far enough that longer labels such as "(3x + 10)°" clear the arms.
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
  const along = halfW * c + halfH * s;
  const across = halfW * s + halfH * c;
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

/** An arrowhead line from a to b. */
export function arrow(a: Pt, b: Pt, opts: { stroke?: string; width?: number } = {}): string {
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
    line(a, back, { stroke, width: opts.width ?? 2 }) +
    `<polygon points="${r2(b.x)},${r2(b.y)} ${r2(p1.x)},${r2(p1.y)} ${r2(p2.x)},${r2(p2.y)}" fill="${stroke}"/>`
  );
}

/** A drawn angle near `actual` (but not equal to it), staying on the same side of 90°. */
export function drawnAngle(rng: Rng, actual: number, lo = 25, hi = 155): number {
  let d = actual + rng.pick([-12, -9, -6, 6, 9, 12]);
  if (actual < 90) d = Math.min(d, 80);
  if (actual > 90) d = Math.max(d, 100);
  return Math.max(lo, Math.min(hi, d));
}

/** Scales positive sizes so they add to `total`, keeping each roughly within [lo, hi]. */
export function spread(values: number[], total: number, lo: number, hi: number): number[] {
  let v = [...values];
  for (let k = 0; k < 8; k++) {
    const sum = v.reduce((s, x) => s + x, 0);
    v = v.map((x) => Math.max(lo, Math.min(hi, (x * total) / sum)));
  }
  const sum = v.reduce((s, x) => s + x, 0);
  return v.map((x) => (x * total) / sum);
}

export interface RayArc {
  from: number;
  to: number;
  text: string;
  /** Arc radius in px (defaults to 26, or 34 beside a right-angle mark). */
  r?: number;
}

/**
 * Rays from one point in the given screen directions (degrees), with labelled arcs.
 * `straight` draws a lower, wider figure for angles on a straight line. `rightAngle` adds a
 * right-angle mark between two directions (instead of an arc).
 */
export function raysFigure(
  directions: number[],
  arcs: RayArc[],
  opts: { straight?: boolean; rightAngle?: [number, number]; centre?: Pt; length?: number; height?: number } = {},
): string {
  const V: Pt = opts.centre ?? { x: 190, y: opts.straight ? 175 : 140 };
  const L = opts.length ?? 125;
  let body = '';
  for (const d of directions) body += line(V, polar(V, L, d), { width: 2.2 });
  body += dot(V);
  if (opts.rightAngle) body += rightAngleMark(V, polar(V, 20, opts.rightAngle[0]), polar(V, 20, opts.rightAngle[1]), 13);
  for (const a of arcs) body += arcWithLabel(V, polar(V, 50, a.from), polar(V, 50, a.to), a.text, a.r ?? (opts.rightAngle ? 34 : 26));
  const h = opts.height ?? (opts.straight ? 215 : 280);
  body += notToScale({ x: 372, y: h - 10 });
  return svgDoc(380, h, body);
}

// ---------------------------------------------------------------- parallel lines and a transversal

/**
 * Sector i at a crossing: 0 above-right, 1 above-left, 2 below-left, 3 below-right (anticlockwise
 * from the right-hand ray). With the transversal at screen angle θ, sectors 0 and 2 are θ and
 * sectors 1 and 3 are 180° − θ.
 */
export type Sector = 0 | 1 | 2 | 3;
export const SECTORS: readonly Sector[] = [0, 1, 2, 3];

export interface TransversalMark {
  at: 'P' | 'Q';
  sector: Sector;
  text: string;
}

/** Two horizontal lines (parallel unless told otherwise) crossed by a transversal at angle `phi`. */
export function transversalFigure(phi: number, marks: TransversalMark[], opts: { parallel?: boolean } = {}): string {
  const yP = 85;
  const yQ = 215;
  const t = Math.tan(rad(phi));
  const P: Pt = { x: 200 + (yQ - yP) / t / 2, y: yP };
  const Q: Pt = { x: P.x - (yQ - yP) / t, y: yQ };
  let body = '';
  body += line({ x: 30, y: yP }, { x: 370, y: yP }, { width: 2.2 });
  body += line({ x: 30, y: yQ }, { x: 370, y: yQ }, { width: 2.2 });
  if (opts.parallel !== false) {
    body += parallelMarks({ x: 300, y: yP }, { x: 350, y: yP }) + parallelMarks({ x: 300, y: yQ }, { x: 350, y: yQ });
    body += parallelMarks({ x: 50, y: yP }, { x: 100, y: yP }) + parallelMarks({ x: 50, y: yQ }, { x: 100, y: yQ });
  }
  body += line(polar(P, 70, phi), polar(Q, 70, phi + 180), { width: 2.2 });
  const dirs = (s: Sector): [number, number] => ([[0, phi], [phi, 180], [180, 180 + phi], [180 + phi, 360]] as const)[s] as [number, number];
  for (const m of marks) {
    const V = m.at === 'P' ? P : Q;
    const [a1, a2] = dirs(m.sector);
    body += arcWithLabel(V, polar(V, 40, a1), polar(V, 40, a2), m.text, 22);
  }
  body += dot(P, 3) + dot(Q, 3);
  body += notToScale({ x: 392, y: 290 });
  return svgDoc(400, 300, body);
}

/** Size of the angle in sector s when the transversal makes angle θ with the lines. */
export const sectorValue = (theta: number, s: Sector) => (s % 2 === 0 ? theta : 180 - theta);

/** Where a sector is, in words, for alt text. */
export const SECTOR_WORDS = [
  'above the line, to the right of the crossing line',
  'above the line, to the left of the crossing line',
  'below the line, to the left of the crossing line',
  'below the line, to the right of the crossing line',
] as const;

// ---------------------------------------------------------------- polygons

/**
 * Vertices (screen coordinates) of a convex polygon whose interior angles are close to `angles`
 * (which must add to 180(n − 2)), fitted into the box. Falls back to a regular polygon.
 */
export function polygonWithAngles(rng: Rng, angles: number[], box: { x: number; y: number; w: number; h: number }): Pt[] {
  const n = angles.length;
  // Edge i runs from vertex i to vertex i + 1; the turn at vertex k is 180 − angle k.
  const theta: number[] = [];
  let dir = 0;
  for (let i = 0; i < n; i++) {
    theta.push(dir);
    dir += 180 - angles[(i + 1) % n]!;
  }
  // Choose random lengths for all but two edges, then solve for those two so the shape closes.
  // Cycle through which pair is solved for, since some pairs can't close a given shape.
  const pairs: Array<[number, number]> = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) pairs.push([u, v]);
  let lengths: number[] | null = null;
  for (let attempt = 0; attempt < 300 && !lengths; attempt++) {
    // Start with similar side lengths; allow more uneven ones if that doesn't close the shape.
    const [lo, hi] = attempt < 100 ? [0.55, 1.9] : attempt < 200 ? [0.4, 2.6] : [0.25, 4];
    const [u, v] = pairs[attempt % pairs.length]!;
    const ls = Array.from({ length: n }, () => (attempt < 100 ? 0.75 : 0.5) + rng.next() * (attempt < 100 ? 0.6 : 1.5));
    let sx = 0;
    let sy = 0;
    ls.forEach((l, i) => {
      if (i === u || i === v) return;
      sx += l * Math.cos(rad(theta[i]!));
      sy += l * Math.sin(rad(theta[i]!));
    });
    const ax = Math.cos(rad(theta[u]!));
    const ay = Math.sin(rad(theta[u]!));
    const bx = Math.cos(rad(theta[v]!));
    const by = Math.sin(rad(theta[v]!));
    const det = ax * by - ay * bx;
    if (Math.abs(det) < 1e-6) continue;
    const l1 = (-sx * by + sy * bx) / det;
    const l2 = (-ax * sy + ay * sx) / det;
    if (l1 > lo && l1 < hi && l2 > lo && l2 < hi) {
      ls[u] = l1;
      ls[v] = l2;
      lengths = ls;
    }
  }
  let raw: Pt[];
  if (lengths) {
    raw = [{ x: 0, y: 0 }];
    for (let i = 0; i < n - 1; i++) {
      const p = raw[i]!;
      raw.push({ x: p.x + lengths[i]! * Math.cos(rad(theta[i]!)), y: p.y + lengths[i]! * Math.sin(rad(theta[i]!)) });
    }
  } else {
    raw = Array.from({ length: n }, (_, i) => ({ x: Math.cos(rad(-90 + (360 * i) / n)), y: Math.sin(rad(-90 + (360 * i) / n)) }));
  }
  // Maths y-up → screen y-down, then fit into the box.
  const pts = raw.map((p) => ({ x: p.x, y: -p.y }));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const s = Math.min(box.w / (maxX - minX || 1), box.h / (maxY - minY || 1));
  const ox = box.x + (box.w - (maxX - minX) * s) / 2;
  const oy = box.y + (box.h - (maxY - minY) * s) / 2;
  return pts.map((p) => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s }));
}

/** Drawn angles near the real ones (for "not to scale" figures), still adding to the same total. */
export function nudgeAngles(rng: Rng, angles: number[], lo = 45, hi = 168): number[] {
  const total = angles.reduce((s, a) => s + a, 0);
  const moved = angles.map((a) => Math.max(lo, Math.min(hi, a + rng.pick([-8, -5, 5, 8]))));
  return spread(moved, total, lo, hi);
}

/** Vertices of a regular n-gon centred at c with circumradius R. */
export function regularPolygon(c: Pt, R: number, n: number, startDeg = 90): Pt[] {
  return Array.from({ length: n }, (_, i) => polar(c, R, startDeg + (360 * i) / n));
}
