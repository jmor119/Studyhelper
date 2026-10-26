// Helpers for m7.geo.nets: names and counts for prisms and pyramids, sketches of solids, nets,
// and folding a net of six squares into a cube. Adapted from the Year 9 nets template so this
// topic stands alone.

import { label, line, polygon, svgDoc, type Pt } from '../../../svg';
import { polar } from './angles-helpers';

export type SolidKind = 'prism' | 'pyramid';

export const BASE_NAMES: Record<number, string> = {
  3: 'triangular',
  4: 'rectangular',
  5: 'pentagonal',
  6: 'hexagonal',
  8: 'octagonal',
};

/** Name of the 2D shape with n sides. */
export const SHAPE_NAMES: Record<number, string> = {
  3: 'triangle',
  4: 'rectangle',
  5: 'pentagon',
  6: 'hexagon',
  8: 'octagon',
};

export function solidName(kind: SolidKind, n: number, cube = false): string {
  if (kind === 'prism') return n === 4 ? (cube ? 'cube' : 'rectangular prism') : `${BASE_NAMES[n]} prism`;
  return n === 4 ? 'square-based pyramid' : `${BASE_NAMES[n]} pyramid`;
}

export const counts = (kind: SolidKind, n: number) =>
  kind === 'prism' ? { faces: n + 2, edges: 3 * n, vertices: 2 * n } : { faces: n + 1, edges: 2 * n, vertices: n + 1 };

export const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

const DASH = { stroke: '#6b7280', width: 1.4, dash: true };

/** Oblique sketch of a prism or pyramid with hidden edges dashed. */
export function solidFigure(kind: SolidKind, n: number, cube = false): string {
  const c: Pt = { x: 160, y: 185 };
  const R = 95;
  const squash = 0.32;
  const start = n === 4 ? 55 : 90 / n + 12; // a slight turn so no edge is exactly edge-on
  const ang = Array.from({ length: n }, (_, i) => start + (360 * i) / n);
  const base = ang.map((a) => ({ x: c.x + R * Math.cos((a * Math.PI) / 180), y: c.y - R * squash * Math.sin((a * Math.PI) / 180) }));
  // A base edge is at the back if its midpoint is higher on screen than the centre.
  const back = (i: number) => Math.sin(((ang[i]! + 180 / n) * Math.PI) / 180) > 0.05;
  const hiddenVertex = (i: number) => back(i) && back((i - 1 + n) % n);
  const H = kind === 'prism' ? (cube ? 2 * R * Math.sin(Math.PI / 4) * 0.95 : 110) : 140;
  let body = '';
  if (kind === 'prism') {
    const top = base.map((p) => ({ x: p.x, y: p.y - H }));
    body += polygon(top, { fill: '#dbeafe' });
    for (let i = 0; i < n; i++) {
      if (back(i)) continue;
      const j = (i + 1) % n;
      body += polygon([base[i]!, base[j]!, top[j]!, top[i]!], { fill: '#bfdbfe' });
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (back(i)) body += line(base[i]!, base[j]!, DASH);
      if (hiddenVertex(i)) body += line(base[i]!, top[i]!, DASH);
    }
    return svgDoc(320, 215, body);
  }
  const apex: Pt = { x: c.x, y: c.y - H };
  for (let i = 0; i < n; i++) {
    if (back(i)) continue;
    const j = (i + 1) % n;
    body += polygon([base[i]!, base[j]!, apex], { fill: '#bfdbfe' });
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (back(i)) body += line(base[i]!, base[j]!, DASH);
    if (hiddenVertex(i)) body += line(base[i]!, apex, DASH);
  }
  return svgDoc(320, 215, body);
}

/** A regular n-gon built on segment a→b, on the side given by `outward`. */
function regularPolygonOnEdge(a: Pt, b: Pt, n: number, outward: 1 | -1): Pt[] {
  const pts: Pt[] = [a, b];
  const side = Math.hypot(b.x - a.x, b.y - a.y);
  let dir = Math.atan2(b.y - a.y, b.x - a.x);
  const turn = (outward * 2 * Math.PI) / n;
  let cur = b;
  for (let i = 2; i < n; i++) {
    dir += turn;
    cur = { x: cur.x + side * Math.cos(dir), y: cur.y + side * Math.sin(dir) };
    pts.push(cur);
  }
  return pts;
}

/**
 * Net of a prism: a strip of n rectangles with the two n-sided ends attached.
 * `endsApart` attaches the ends to different rectangles (still a correct net).
 * `broken` puts both ends on the same side of the strip, which does not fold into a prism.
 * `oneEnd` leaves out the bottom end.
 */
export function prismNet(n: number, opts: { endsApart?: boolean; broken?: boolean; oneEnd?: boolean } = {}): string {
  const w = Math.min(46, 330 / n);
  const h = n === 4 ? 46 * 1.6 : 70;
  const x0 = (380 - n * w) / 2;
  const y0 = 30 + w / (2 * Math.tan(Math.PI / n)) + w * 0.6;
  let body = '';
  for (let i = 0; i < n; i++) {
    body += polygon([{ x: x0 + i * w, y: y0 }, { x: x0 + (i + 1) * w, y: y0 }, { x: x0 + (i + 1) * w, y: y0 + h }, { x: x0 + i * w, y: y0 + h }], { fill: '#dbeafe' });
  }
  const k = Math.floor(n / 2);
  const k2 = opts.broken ? (k + 2) % n : opts.endsApart ? (k + 1) % n : k;
  const a = { x: x0 + k * w, y: y0 };
  const b = { x: x0 + (k + 1) * w, y: y0 };
  body += polygon(regularPolygonOnEdge(a, b, n, -1), { fill: '#fde68a' });
  if (opts.broken) {
    const a2 = { x: x0 + k2 * w, y: y0 };
    const b2 = { x: x0 + (k2 + 1) * w, y: y0 };
    body += polygon(regularPolygonOnEdge(a2, b2, n, -1), { fill: '#fde68a' });
  } else if (!opts.oneEnd) {
    const c = { x: x0 + (k2 + 1) * w, y: y0 + h };
    const d = { x: x0 + k2 * w, y: y0 + h };
    body += polygon(regularPolygonOnEdge(c, d, n, -1), { fill: '#fde68a' });
  }
  const height = y0 + h + (y0 - 20);
  return svgDoc(380, Math.min(330, Math.max(height, y0 + h + 20)), body);
}

/** Net of a pyramid: an n-sided base with a triangle on each edge. `missing` leaves out triangles. */
export function pyramidNet(n: number, rot: number, missing = 0): string {
  const c: Pt = { x: 190, y: 165 };
  const side = n <= 4 ? 80 : n <= 6 ? 62 : 48;
  const R = side / (2 * Math.sin(Math.PI / n));
  const base = Array.from({ length: n }, (_, i) => polar(c, R, rot + (360 * i) / n));
  let body = polygon(base, { fill: '#fde68a' });
  // Each triangle must be taller than the base's apothem, or the triangles could not meet at the apex.
  const slant = side * (1 / (2 * Math.tan(Math.PI / n)) + 0.55);
  for (let i = 0; i < n - missing; i++) {
    const a = base[i]!;
    const b = base[(i + 1) % n]!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = mid.x - c.x;
    const dy = mid.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const tip = { x: mid.x + (dx / len) * slant, y: mid.y + (dy / len) * slant };
    body += polygon([a, b, tip], { fill: '#dbeafe' });
  }
  return svgDoc(380, 330, body);
}

// ---------------------------------------------------------------- cube nets

type V3 = [number, number, number];
/** [column, row], rows increase downwards. */
export type Cell = [number, number];

const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
export const key3 = (v: V3) => v.join(',');

/** Folds a net of unit squares into a cube. Returns each cell's outward direction, or null if it isn't a cube net. */
export function foldCube(cells: Cell[]): V3[] | null {
  const idx = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
  const normal: Array<V3 | undefined> = [];
  const east: Array<V3 | undefined> = [];
  const south: Array<V3 | undefined> = [];
  normal[0] = [0, 0, -1];
  east[0] = [1, 0, 0];
  south[0] = [0, 1, 0];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const [cx, cy] = cells[i]!;
    const n = normal[i]!;
    const E = east[i]!;
    const S = south[i]!;
    const moves: Array<[number, number, V3, V3, V3]> = [
      [1, 0, E, neg(n), S],
      [-1, 0, neg(E), n, S],
      [0, 1, S, E, neg(n)],
      [0, -1, neg(S), E, n],
    ];
    for (const [dx, dy, nn, ne, ns] of moves) {
      const j = idx.get(`${cx + dx},${cy + dy}`);
      if (j === undefined || normal[j]) continue;
      normal[j] = nn;
      east[j] = ne;
      south[j] = ns;
      queue.push(j);
    }
  }
  if (normal.length !== cells.length || normal.some((v) => !v)) return null;
  const set = new Set(normal.map((v) => key3(v!)));
  return set.size === 6 ? (normal as V3[]) : null;
}

export const negKey = (v: V3) => key3(neg(v));

let HEXOMINOES: Cell[][] | undefined;

/** All shapes made of six squares joined edge to edge (up to translation), computed once. */
export function hexominoes(): Cell[][] {
  if (HEXOMINOES) return HEXOMINOES;
  const norm = (cells: Cell[]): Cell[] => {
    const mx = Math.min(...cells.map((c) => c[0]));
    const my = Math.min(...cells.map((c) => c[1]));
    return cells.map((c) => [c[0] - mx, c[1] - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  };
  let level = new Map<string, Cell[]>([['0,0', [[0, 0]]]]);
  for (let size = 1; size < 6; size++) {
    const next = new Map<string, Cell[]>();
    for (const cells of level.values()) {
      const have = new Set(cells.map((c) => `${c[0]},${c[1]}`));
      for (const [x, y] of cells) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          if (have.has(`${x + dx},${y + dy}`)) continue;
          const n = norm([...cells, [x + dx, y + dy]]);
          next.set(n.map((c) => c.join(',')).join(';'), n);
        }
      }
    }
    level = next;
  }
  HEXOMINOES = [...level.values()];
  return HEXOMINOES;
}

/** True if the shape contains a 2 × 2 block of squares (an obvious non-net). */
export const has2x2 = (cells: Cell[]) => {
  const s = new Set(cells.map((c) => `${c[0]},${c[1]}`));
  return cells.some(([x, y]) => s.has(`${x + 1},${y}`) && s.has(`${x},${y + 1}`) && s.has(`${x + 1},${y + 1}`));
};

/** Fits in a 5 × 5 box? */
export const fitsBox = (c: Cell[]) => Math.max(...c.map((p) => p[0])) <= 4 && Math.max(...c.map((p) => p[1])) <= 4;

/** Has a straight row (or column) of four squares. */
export const rowOf4 = (c: Cell[]) =>
  c.some(([x, y]) => [1, 2, 3].every((k) => c.some((q) => q[0] === x + k && q[1] === y)) || [1, 2, 3].every((k) => c.some((q) => q[0] === x && q[1] === y + k)));

export function netSvgBody(cells: Cell[], ox: number, oy: number, s: number, letters?: string[]): string {
  let body = '';
  cells.forEach(([x, y], i) => {
    const p = { x: ox + x * s, y: oy + y * s };
    body += polygon([p, { x: p.x + s, y: p.y }, { x: p.x + s, y: p.y + s }, { x: p.x, y: p.y + s }], { fill: '#dbeafe' });
    if (letters) body += label({ x: p.x + s / 2, y: p.y + s / 2 }, letters[i]!, { bold: true, size: 18 });
  });
  return body;
}

/** One net of squares, centred in a figure. */
export function cubeNetFigure(cells: Cell[], letters?: string[]): string {
  const cols = Math.max(...cells.map((c) => c[0])) + 1;
  const rows = Math.max(...cells.map((c) => c[1])) + 1;
  const s = Math.min(56, 320 / cols, 250 / rows);
  return svgDoc(cols * s + 40, rows * s + 40, netSvgBody(cells, 20, 20, s, letters));
}
