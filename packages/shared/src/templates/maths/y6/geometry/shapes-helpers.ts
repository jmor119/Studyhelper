import type { Rng } from '../../../../rng';
import { ACCENT, FILL, INK, label, line, polygon, rightAngleMark, svgDoc, type Pt } from '../../../svg';

// Drawing helpers for m6.geo.shapes: quadrilaterals and triangles with the usual markings
// (tick marks for equal sides, arrows for parallel sides, squares for right angles), shapes for
// rotational symmetry, and simple 3D sketches of prisms and pyramids with hidden edges dashed.

const r2 = (n: number) => Math.round(n * 100) / 100;
export const rad = (d: number) => (d * Math.PI) / 180;

export function rotatePts(pts: readonly Pt[], deg: number): Pt[] {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
}

/** Fits maths-coordinate points (y up) into a pixel box (y down), keeping the shape's proportions. */
export function fitPts(pts: readonly Pt[], box: { x: number; y: number; w: number; h: number }): Pt[] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(box.w / (maxX - minX || 1), box.h / (maxY - minY || 1));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2;
  const oy = box.y + (box.h - (maxY - minY) * k) / 2;
  return pts.map((p) => ({ x: ox + (p.x - minX) * k, y: oy + (maxY - p.y) * k }));
}

/** n small tick marks across the middle of segment ab (equal sides). */
export function ticks(a: Pt, b: Pt, n: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  let out = '';
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 5;
    const c = { x: (a.x + b.x) / 2 + ux * off, y: (a.y + b.y) / 2 + uy * off };
    out += line({ x: c.x + uy * 7, y: c.y - ux * 7 }, { x: c.x - uy * 7, y: c.y + ux * 7 }, { width: 1.8 });
  }
  return out;
}

/** n arrowheads on segment ab pointing from a towards b (parallel sides), a third of the way along. */
export function arrows(a: Pt, b: Pt, n: number): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  let out = '';
  for (let i = 0; i < n; i++) {
    const tip = { x: a.x + dx * 0.3 + ux * i * 6, y: a.y + dy * 0.3 + uy * i * 6 };
    const p1 = { x: tip.x - ux * 8 - uy * 5, y: tip.y - uy * 8 + ux * 5 };
    const p2 = { x: tip.x - ux * 8 + uy * 5, y: tip.y - uy * 8 - ux * 5 };
    out += `<polyline points="${r2(p1.x)},${r2(p1.y)} ${r2(tip.x)},${r2(tip.y)} ${r2(p2.x)},${r2(p2.y)}" fill="none" stroke="${INK}" stroke-width="1.8"/>`;
  }
  return out;
}

/** Interior angle (degrees) at vertex i of a polygon. */
export function interiorAngle(pts: readonly Pt[], i: number): number {
  const n = pts.length;
  const p = pts[i]!;
  const a = pts[(i + n - 1) % n]!;
  const b = pts[(i + 1) % n]!;
  const u = { x: a.x - p.x, y: a.y - p.y };
  const v = { x: b.x - p.x, y: b.y - p.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// ---------------------------------------------------------------- quadrilaterals

export type QuadKind = 'square' | 'rectangle' | 'rhombus' | 'parallelogram' | 'kite' | 'trapezium';
export const QUAD_KINDS: readonly QuadKind[] = ['square', 'rectangle', 'rhombus', 'parallelogram', 'kite', 'trapezium'];

export interface MarkedShape {
  /** Vertices in order, maths coordinates (y up). Side i joins vertex i to vertex i + 1. */
  pts: Pt[];
  /** Groups of equal sides; group g gets g + 1 tick marks. */
  equal: number[][];
  /** Pairs of parallel sides (opposite sides i and i + 2); pair p gets p + 1 arrowheads. */
  parallel: Array<[number, number]>;
  /** Vertices with a right angle. */
  right: number[];
}

export function makeQuad(rng: Rng, kind: QuadKind): MarkedShape {
  const both: Array<[number, number]> = [
    [0, 2],
    [1, 3],
  ];
  switch (kind) {
    case 'square':
      return { pts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], equal: [[0, 1, 2, 3]], parallel: both, right: [0, 1, 2, 3] };
    case 'rectangle': {
      const w = rng.pick([1.5, 1.7, 1.9, 2.2]);
      return { pts: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: 1 }, { x: 0, y: 1 }], equal: [[0, 2], [1, 3]], parallel: both, right: [0, 1, 2, 3] };
    }
    case 'rhombus': {
      const t = rad(rng.pick([55, 60, 65, 70]));
      return {
        pts: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1 + Math.cos(t), y: Math.sin(t) }, { x: Math.cos(t), y: Math.sin(t) }],
        equal: [[0, 1, 2, 3]],
        parallel: both,
        right: [],
      };
    }
    case 'parallelogram': {
      const a = rng.pick([1.6, 1.8, 2]);
      const t = rad(rng.pick([55, 60, 65, 70]));
      return {
        pts: [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + Math.cos(t), y: Math.sin(t) }, { x: Math.cos(t), y: Math.sin(t) }],
        equal: [[0, 2], [1, 3]],
        parallel: both,
        right: [],
      };
    }
    case 'kite': {
      const t = rng.pick([0.6, 0.7, 0.8]);
      const b = rng.pick([1.8, 2.1, 2.4]);
      // top, left, bottom, right
      return { pts: [{ x: 0, y: t }, { x: -1, y: 0 }, { x: 0, y: -b }, { x: 1, y: 0 }], equal: [[0, 3], [1, 2]], parallel: [], right: [] };
    }
    case 'trapezium': {
      const a = rng.pick([2.2, 2.5]);
      const c = rng.pick([1, 1.2]);
      const h = rng.pick([0.9, 1.1]);
      // Not symmetric (so it isn't confused with a special case) and no right angles.
      const p = rng.pick([0.25, 0.35, a - c - 0.35, a - c - 0.25]);
      return { pts: [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: p + c, y: h }, { x: p, y: h }], equal: [], parallel: [[0, 2]], right: [] };
    }
  }
}

/** Draws a polygon with its markings, rotated by `rot` degrees, optionally with vertex letters. */
export function drawMarked(shape: MarkedShape, rot: number, o: { letters?: boolean; w?: number; h?: number } = {}): string {
  const W = o.w ?? 300;
  const H = o.h ?? 220;
  const n = shape.pts.length;
  const px = fitPts(rotatePts(shape.pts, rot), { x: 34, y: 28, w: W - 68, h: H - 56 });
  let body = polygon(px, { fill: FILL });
  shape.equal.forEach((g, gi) => {
    for (const i of g) body += ticks(px[i]!, px[(i + 1) % n]!, gi + 1);
  });
  shape.parallel.forEach(([i, j], pi) => {
    body += arrows(px[i]!, px[(i + 1) % n]!, pi + 1);
    body += arrows(px[(j + 1) % n]!, px[j]!, pi + 1);
  });
  for (const v of shape.right) body += rightAngleMark(px[v]!, px[(v + n - 1) % n]!, px[(v + 1) % n]!, 13);
  if (o.letters) {
    const c = { x: px.reduce((s, p) => s + p.x, 0) / n, y: px.reduce((s, p) => s + p.y, 0) / n };
    px.forEach((p, i) => {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const L = Math.hypot(dx, dy) || 1;
      body += label({ x: p.x + (dx / L) * 15, y: p.y + (dy / L) * 15 }, 'ABCD'[i]!, { bold: true });
    });
  }
  return svgDoc(W, H, body);
}

// ---------------------------------------------------------------- triangles and angles

export type AngleKind = 'acute' | 'right' | 'obtuse';

/** A triangle whose largest angle is clearly acute (≤ 75°), exactly 90° or clearly obtuse (≥ 110°). */
export function makeTriangle(rng: Rng, kind: AngleKind): MarkedShape {
  let A: number;
  let B: number;
  for (;;) {
    if (kind === 'acute') {
      A = rng.int(50, 72);
      B = rng.int(50, 72);
    } else if (kind === 'right') {
      A = 90;
      B = rng.int(30, 60);
    } else {
      A = rng.int(110, 135);
      B = rng.int(15, 180 - A - 15);
    }
    const C = 180 - A - B;
    if (kind === 'acute' && (C < 40 || C > 75)) continue;
    if (C < 15) continue;
    break;
  }
  const C = 180 - A - B;
  const t = Math.sin(rad(B)) / Math.sin(rad(C));
  const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: t * Math.cos(rad(A)), y: t * Math.sin(rad(A)) }];
  return { pts, equal: [], parallel: [], right: kind === 'right' ? [0] : [] };
}

/** A convex quadrilateral (optionally with one right angle) whose other angles are clearly acute or obtuse. */
export function makeAngleQuad(rng: Rng, withRight: boolean): { shape: MarkedShape; kinds: AngleKind[] } {
  for (;;) {
    let pts: Pt[];
    if (withRight) {
      pts = [{ x: 0, y: 0 }, { x: rng.int(14, 24) / 10, y: 0 }, { x: rng.int(6, 26) / 10, y: rng.int(8, 20) / 10 }, { x: 0, y: rng.int(8, 18) / 10 }];
    } else {
      const angs = [rng.int(-20, 20), rng.int(70, 110), rng.int(160, 200), rng.int(250, 290)];
      pts = angs.map((a) => {
        const r = rng.int(8, 13) / 10;
        return { x: r * Math.cos(rad(a)), y: r * Math.sin(rad(a)) };
      });
    }
    const angles = pts.map((_, i) => interiorAngle(pts, i));
    const sum = angles.reduce((s, a) => s + a, 0);
    if (Math.abs(sum - 360) > 0.5) continue; // not convex
    const kinds: AngleKind[] = [];
    let ok = true;
    angles.forEach((a, i) => {
      if (withRight && i === 0) kinds.push('right');
      else if (a >= 28 && a <= 72) kinds.push('acute');
      else if (a >= 108 && a <= 160) kinds.push('obtuse');
      else ok = false;
    });
    if (!ok) continue;
    return { shape: { pts, equal: [], parallel: [], right: withRight ? [0] : [] }, kinds };
  }
}

// ---------------------------------------------------------------- rotational symmetry

export interface SymShape {
  name: string;
  order: number;
  /** Polygons in maths coordinates around (0, 0). */
  polys: Pt[][];
  /** Draw an ellipse instead (rx, ry). */
  ellipse?: [number, number];
}

const regular = (n: number, r = 1): Pt[] => Array.from({ length: n }, (_, i) => ({ x: r * Math.cos(rad(90 + (360 * i) / n)), y: r * Math.sin(rad(90 + (360 * i) / n)) }));
const star = (k: number): Pt[] =>
  Array.from({ length: 2 * k }, (_, i) => {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = rad(90 + (180 * i) / k);
    return { x: r * Math.cos(a), y: r * Math.sin(a) };
  });
const pinwheel = (k: number): Pt[][] =>
  Array.from({ length: k }, (_, i) => rotatePts([{ x: 0.12, y: 0 }, { x: 1, y: 0 }, { x: 0.72, y: 0.42 }], (360 * i) / k));
const centre = (pts: Pt[]): Pt[] => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
};

export const SYM_EASY: readonly SymShape[] = [
  { name: 'equilateral triangle', order: 3, polys: [regular(3)] },
  { name: 'square', order: 4, polys: [regular(4)] },
  { name: 'regular pentagon', order: 5, polys: [regular(5)] },
  { name: 'regular hexagon', order: 6, polys: [regular(6)] },
  { name: 'regular octagon', order: 8, polys: [regular(8)] },
  { name: 'rectangle', order: 2, polys: [centre([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }])] },
  { name: 'plus sign', order: 4, polys: [centre([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }])] },
];

export const SYM_HARDER: readonly SymShape[] = [
  { name: 'four-pointed star', order: 4, polys: [star(4)] },
  { name: 'five-pointed star', order: 5, polys: [star(5)] },
  { name: 'six-pointed star', order: 6, polys: [star(6)] },
  { name: 'eight-pointed star', order: 8, polys: [star(8)] },
  { name: 'pinwheel with 3 blades', order: 3, polys: pinwheel(3) },
  { name: 'pinwheel with 4 blades', order: 4, polys: pinwheel(4) },
  { name: 'pinwheel with 5 blades', order: 5, polys: pinwheel(5) },
  { name: 'pinwheel with 6 blades', order: 6, polys: pinwheel(6) },
  { name: 'parallelogram', order: 2, polys: [centre([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2.6, y: 1 }, { x: 0.6, y: 1 }])] },
  { name: 'rhombus', order: 2, polys: [centre([{ x: 0, y: 0 }, { x: 1.2, y: 0.7 }, { x: 0, y: 1.4 }, { x: -1.2, y: 0.7 }])] },
  { name: 'kite', order: 1, polys: [centre([{ x: 0, y: 0.7 }, { x: -1, y: 0 }, { x: 0, y: -2 }, { x: 1, y: 0 }])] },
  { name: 'isosceles triangle', order: 1, polys: [centre([{ x: 0, y: 0 }, { x: 1.4, y: 0 }, { x: 0.7, y: 2 }])] },
  { name: 'trapezium', order: 1, polys: [centre([{ x: 0, y: 0 }, { x: 2.4, y: 0 }, { x: 1.7, y: 1 }, { x: 0.4, y: 1 }])] },
  { name: 'Z shape', order: 2, polys: [centre([{ x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }])] },
  { name: 'L shape', order: 1, polys: [centre([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 }])] },
  { name: 'oval', order: 2, polys: [], ellipse: [1.4, 0.8] },
];

/** Draws a symmetry shape centred in a 240 × 200 box, turned by `rot` degrees, with a centre dot. */
export function drawSym(s: SymShape, rot: number): string {
  const W = 240;
  const H = 200;
  const c = { x: W / 2, y: H / 2 };
  if (s.ellipse) {
    const [rx, ry] = s.ellipse;
    const k = 70 / rx;
    return svgDoc(W, H, `<ellipse cx="${c.x}" cy="${c.y}" rx="${r2(rx * k)}" ry="${r2(ry * k)}" fill="${FILL}" stroke="${INK}" stroke-width="2" transform="rotate(${-rot} ${c.x} ${c.y})"/>`);
  }
  const all = s.polys.flatMap((p) => rotatePts(p, rot));
  const R = Math.max(...all.map((p) => Math.hypot(p.x, p.y)));
  const k = 80 / R;
  const toPx = (p: Pt): Pt => ({ x: c.x + p.x * k, y: c.y - p.y * k });
  let body = '';
  for (const poly of s.polys) body += polygon(rotatePts(poly, rot).map(toPx), { fill: FILL });
  if (s.name.startsWith('pinwheel')) body += `<circle cx="${c.x}" cy="${c.y}" r="${r2(0.14 * k)}" fill="${ACCENT}" stroke="${INK}" stroke-width="1.5"/>`;
  return svgDoc(W, H, body);
}

// ---------------------------------------------------------------- prisms and pyramids

export type SolidType = 'prism' | 'pyramid';
export const BASE_SIDES = [3, 4, 5, 6, 8] as const;

export function solidName(type: SolidType, n: number): string {
  const base: Record<number, string> = { 3: 'triangular', 5: 'pentagonal', 6: 'hexagonal', 7: 'heptagonal', 8: 'octagonal' };
  if (n === 4) return type === 'prism' ? 'rectangular prism' : 'square-based pyramid';
  return `${base[n]} ${type}`;
}

export const baseShapeName = (n: number) => ({ 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' } as Record<number, string>)[n]!;

export function counts(type: SolidType, n: number): { faces: number; edges: number; vertices: number } {
  return type === 'prism' ? { faces: n + 2, edges: 3 * n, vertices: 2 * n } : { faces: n + 1, edges: 2 * n, vertices: n + 1 };
}

/**
 * A sketch of a prism or pyramid standing on its base, seen from slightly above. Edges at the
 * back are dashed. `turn` (0–1) rotates the base a little so different instances look different.
 */
export function drawSolid(type: SolidType, n: number, turn: number): string {
  const W = 260;
  const H = 230;
  const cx = W / 2;
  const by = type === 'prism' ? 176 : 182;
  const R = 92;
  const ry = 30;
  const off = (180 / n) * (0.3 + 0.4 * turn);
  const th = Array.from({ length: n }, (_, i) => rad(off + (360 * i) / n));
  const bottom = th.map((t) => ({ x: cx + R * Math.cos(t), y: by + ry * Math.sin(t) }));
  // Front chain: from the leftmost to the rightmost vertex along the lower (nearer) side.
  const left = bottom.reduce((m, p, i) => (p.x < bottom[m]!.x ? i : m), 0);
  const right = bottom.reduce((m, p, i) => (p.x > bottom[m]!.x ? i : m), 0);
  const walk = (step: 1 | -1) => {
    const out = [left];
    for (let i = left; i !== right; ) {
      i = (i + step + n) % n;
      out.push(i);
    }
    return out;
  };
  const a = walk(1);
  const b = walk(-1);
  const avgY = (ix: number[]) => ix.reduce((s, i) => s + bottom[i]!.y, 0) / ix.length;
  const front = new Set(avgY(a) >= avgY(b) ? a : b);
  const edge = (p: Pt, q: Pt, hidden: boolean) => line(p, q, { width: hidden ? 1.5 : 2.2, dash: hidden, stroke: hidden ? '#6b7280' : INK });
  let back = '';
  let fore = '';
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const hidden = !(front.has(i) && front.has(j));
    (hidden ? (s: string) => (back += s) : (s: string) => (fore += s))(edge(bottom[i]!, bottom[j]!, hidden));
  }
  let faces = '';
  if (type === 'prism') {
    const h = 112;
    const top = bottom.map((p) => ({ x: p.x, y: p.y - h }));
    faces += polygon(top, { fill: FILL });
    for (let i = 0; i < n; i++) {
      const hidden = !front.has(i);
      const s = edge(bottom[i]!, top[i]!, hidden);
      if (hidden) back += s;
      else fore += s;
    }
    // Side faces facing us, lightly shaded.
    const chain = avgY(a) >= avgY(b) ? a : b;
    let sides = '';
    for (let k = 0; k + 1 < chain.length; k++) {
      const i = chain[k]!;
      const j = chain[k + 1]!;
      sides += polygon([bottom[i]!, bottom[j]!, top[j]!, top[i]!], { fill: '#eff6ff', stroke: 'none' });
    }
    return svgDoc(W, H, sides + back + faces + fore);
  }
  const apex = { x: cx, y: by - 150 };
  const chain = avgY(a) >= avgY(b) ? a : b;
  for (let k = 0; k + 1 < chain.length; k++) {
    faces += polygon([bottom[chain[k]!]!, bottom[chain[k + 1]!]!, apex], { fill: '#eff6ff', stroke: 'none' });
  }
  for (let i = 0; i < n; i++) {
    const hidden = !front.has(i);
    const s = edge(bottom[i]!, apex, hidden);
    if (hidden) back += s;
    else fore += s;
  }
  return svgDoc(W, H, faces + back + fore);
}
