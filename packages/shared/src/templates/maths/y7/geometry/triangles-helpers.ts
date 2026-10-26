// Figure helpers for m7.geo.triangles: a triangle drawn from its three angles, with angle arcs,
// labels, equal-side tick marks and right-angle marks. Angles are in degrees.

import { ACCENT, angleArc, INK, label, line, polygon, rightAngleMark, svgDoc, type Pt } from '../../../svg';

const GREY = '#6b7280';

/** Small tick marks across the middle of a segment (equal-length marks). */
export function equalTick(a: Pt, b: Pt, count = 1, size = 6): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let out = '';
  for (let i = 0; i < count; i++) {
    const shift = (i - (count - 1) / 2) * 5;
    const c = { x: (a.x + b.x) / 2 + ux * shift, y: (a.y + b.y) / 2 + uy * shift };
    out += line({ x: c.x - uy * size, y: c.y + ux * size }, { x: c.x + uy * size, y: c.y - ux * size }, { width: 1.5 });
  }
  return out;
}

/** An angle arc with its label pushed out along the bisector, far enough to clear both arms. */
function arcLabel(vertex: Pt, p1: Pt, p2: Pt, text: string, deg: number): string {
  const radius = deg < 40 ? 30 : deg > 100 ? 18 : 24;
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  let delta = a2 - a1;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  const mid = a1 + delta / 2;
  const halfW = (text.length * 14 * 0.55) / 2;
  const halfH = 8;
  const c = Math.abs(Math.cos(mid));
  const s = Math.abs(Math.sin(mid));
  const along = halfW * c + halfH * s;
  const across = halfW * s + halfH * c;
  const dist = Math.max(radius + 6 + along, across / Math.tan(Math.max(0.2, Math.abs(delta) / 2)) + 4);
  return (
    angleArc(vertex, p1, p2, undefined, radius) +
    label({ x: vertex.x + dist * Math.cos(mid), y: vertex.y + dist * Math.sin(mid) }, text, { fill: ACCENT })
  );
}

export interface TriangleOpts {
  /** Angle labels at A (bottom left), B (bottom right) and C (top); null for no arc. */
  angleLabels: [string | null, string | null, string | null];
  /** Tick counts for sides BC, CA and AB (the sides opposite A, B and C). */
  ticks?: [number, number, number];
  /** Side labels for BC, CA and AB. */
  sideLabels?: [string | null, string | null, string | null];
  /** Mirror the drawing left to right (A becomes the bottom right corner). */
  mirror?: boolean;
  /** Add the "Not to scale" note. */
  notToScale?: boolean;
  /** Extend AB past B to make a straight line, and label the outside angle at B. */
  exteriorAtB?: string;
}

/**
 * Draws triangle ABC with AB along the bottom, angle A = `a` and angle B = `b` (so C = 180 − a − b).
 * A right angle (90°) is shown with a square mark instead of an arc.
 */
export function triangleFromAngles(a: number, b: number, opts: TriangleOpts): string {
  const c = 180 - a - b;
  const rad = (d: number) => (d * Math.PI) / 180;
  // Unit base AB; C from the sine rule.
  const ac = Math.sin(rad(b)) / Math.sin(rad(c));
  const C0 = { x: ac * Math.cos(rad(a)), y: ac * Math.sin(rad(a)) };
  const xs = [0, 1, C0.x];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const w = maxX - minX;
  const h = C0.y;
  const scale = Math.min((opts.exteriorAtB ? 200 : 260) / w, 170 / h);
  const padX = opts.exteriorAtB ? 100 : 56;
  const padTop = 34;
  const toPx = (p: Pt): Pt => {
    const x = (p.x - minX) * scale;
    return { x: padX + (opts.mirror ? w * scale - x : x), y: padTop + (h - p.y) * scale };
  };
  const A = toPx({ x: 0, y: 0 });
  const B = toPx({ x: 1, y: 0 });
  const C = toPx(C0);
  let body = '';
  if (opts.exteriorAtB) {
    const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const E = { x: B.x + ((B.x - A.x) / len) * 80, y: B.y };
    body += line(B, E);
    body += arcLabel(B, E, C, opts.exteriorAtB, 180 - b);
  }
  body += polygon([A, B, C]);
  const corners: Array<[Pt, Pt, Pt, number, string | null]> = [
    [A, B, C, a, opts.angleLabels[0]],
    [B, C, A, b, opts.angleLabels[1]],
    [C, A, B, c, opts.angleLabels[2]],
  ];
  for (const [v, p1, p2, deg, text] of corners) {
    if (text === null) continue;
    if (Math.abs(deg - 90) < 1e-9) {
      body += rightAngleMark(v, p1, p2, 13);
      if (text) body += arcLabelOnly(v, p1, p2, text);
    } else {
      body += arcLabel(v, p1, p2, text, deg);
    }
  }
  const sides: Array<[Pt, Pt]> = [
    [B, C],
    [C, A],
    [A, B],
  ];
  const centre = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  sides.forEach(([p, q], i) => {
    const t = opts.ticks?.[i];
    if (t) body += equalTick(p, q, t);
    const text = opts.sideLabels?.[i];
    if (text) body += sideLabelAway(p, q, centre, text);
  });
  const width = padX * 2 + w * scale;
  const height = padTop + h * scale + 40;
  if (opts.notToScale !== false) body += label({ x: width - 8, y: height - 10 }, 'Not to scale', { size: 11, fill: GREY, anchor: 'end' });
  return svgDoc(Math.round(width), Math.round(height), body);
}

/** Label for a right angle that is not just the square mark (e.g. "90°" when asked to show it). */
function arcLabelOnly(v: Pt, p1: Pt, p2: Pt, text: string): string {
  const m1 = Math.atan2(p1.y - v.y, p1.x - v.x);
  const m2 = Math.atan2(p2.y - v.y, p2.x - v.x);
  const mid = Math.atan2(Math.sin(m1) + Math.sin(m2), Math.cos(m1) + Math.cos(m2));
  return label({ x: v.x + 34 * Math.cos(mid), y: v.y + 34 * Math.sin(mid) }, text, { fill: ACCENT });
}

/** Side label on the outside of the triangle. */
function sideLabelAway(a: Pt, b: Pt, inside: Pt, text: string): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / len;
  let ny = (b.x - a.x) / len;
  if ((mx - inside.x) * nx + (my - inside.y) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const halfW = (text.length * 14 * 0.55) / 2;
  const off = 10 + Math.abs(nx) * halfW + Math.abs(ny) * 6;
  return label({ x: mx + nx * off, y: my + ny * off }, text, { fill: INK });
}
