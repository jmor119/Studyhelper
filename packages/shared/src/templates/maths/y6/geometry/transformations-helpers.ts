import type { Rng } from '../../../../rng';
import { ACCENT, FILL, INK, label, line, svgDoc } from '../../../svg';

// Grid shapes for m6.geo.transformations. A shape is a set of grid squares [column, row], with
// rows counted downwards. Mirror lines and centres of rotation sit on grid lines, so every image
// is made of whole squares. The shapes have no symmetry at all, so a reflection, a translation and
// a rotation of the same shape always look different.

export type Cell = [number, number];

const BASE: readonly Cell[][] = [
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
  [[1, 0], [0, 1], [1, 1], [1, 2], [1, 3]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]].slice(0, 4) as Cell[],
];

export const key = (cells: readonly Cell[]) => cells.map(([c, r]) => `${c},${r}`).sort().join(' ');
export const same = (a: readonly Cell[], b: readonly Cell[]) => key(a) === key(b);

function normalise(cells: readonly Cell[]): Cell[] {
  const mc = Math.min(...cells.map(([c]) => c));
  const mr = Math.min(...cells.map(([, r]) => r));
  return cells.map(([c, r]) => [c - mc, r - mr] as Cell);
}

const SYMS: Array<(p: Cell) => Cell> = [
  ([c, r]) => [-c, r],
  ([c, r]) => [c, -r],
  ([c, r]) => [-c, -r],
  ([c, r]) => [r, c],
  ([c, r]) => [-r, c],
  ([c, r]) => [r, -c],
  ([c, r]) => [-r, -c],
];

/** True if the shape has no line or rotational symmetry. */
export function asymmetric(cells: readonly Cell[]): boolean {
  const k = key(normalise(cells));
  return SYMS.every((f) => key(normalise(cells.map(f))) !== k);
}

export const SHAPES: readonly Cell[][] = BASE.filter(asymmetric);

/** A random asymmetric shape in a random orientation, with its top-left corner at (0, 0). */
export function randomShape(rng: Rng): Cell[] {
  let cells = rng.pick(SHAPES);
  const f = rng.pick([([c, r]: Cell): Cell => [c, r], ...SYMS.slice(0, 3)]);
  cells = cells.map(f);
  if (rng.chance(0.5)) cells = cells.map(([c, r]) => [r, c] as Cell);
  return normalise(cells);
}

export const width = (cells: readonly Cell[]) => Math.max(...cells.map(([c]) => c)) - Math.min(...cells.map(([c]) => c)) + 1;
export const height = (cells: readonly Cell[]) => Math.max(...cells.map(([, r]) => r)) - Math.min(...cells.map(([, r]) => r)) + 1;
export const minC = (cells: readonly Cell[]) => Math.min(...cells.map(([c]) => c));
export const maxC = (cells: readonly Cell[]) => Math.max(...cells.map(([c]) => c));
export const minR = (cells: readonly Cell[]) => Math.min(...cells.map(([, r]) => r));
export const maxR = (cells: readonly Cell[]) => Math.max(...cells.map(([, r]) => r));

export const translate = (cells: readonly Cell[], dx: number, dy: number): Cell[] => cells.map(([c, r]) => [c + dx, r + dy]);
/** Reflect in the vertical grid line x = m. */
export const reflectV = (cells: readonly Cell[], m: number): Cell[] => cells.map(([c, r]) => [2 * m - c - 1, r]);
/** Reflect in the horizontal grid line y = m. */
export const reflectH = (cells: readonly Cell[], m: number): Cell[] => cells.map(([c, r]) => [c, 2 * m - r - 1]);
/** Quarter turn clockwise (as seen on the page) about the grid point (px, py). */
export const rotCW = (cells: readonly Cell[], px: number, py: number): Cell[] => cells.map(([c, r]) => [px + py - r - 1, py - px + c]);
/** Quarter turn anticlockwise about the grid point (px, py). */
export const rotACW = (cells: readonly Cell[], px: number, py: number): Cell[] => cells.map(([c, r]) => [px - py + r, px + py - c - 1]);
/** Half turn about the grid point (px, py). */
export const rotHalf = (cells: readonly Cell[], px: number, py: number): Cell[] => cells.map(([c, r]) => [2 * px - c - 1, 2 * py - r - 1]);

export const inside = (cells: readonly Cell[], cols: number, rows: number) => cells.every(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows);
export const overlaps = (a: readonly Cell[], b: readonly Cell[]) => {
  const k = new Set(a.map(([c, r]) => `${c},${r}`));
  return b.some(([c, r]) => k.has(`${c},${r}`));
};
/** True if two shapes overlap or touch along an edge (so they'd be hard to tell apart). */
export const crowded = (a: readonly Cell[], b: readonly Cell[]) =>
  a.some(([c, r]) => b.some(([d, s]) => Math.abs(c - d) + Math.abs(r - s) <= 1));

export const OBJECT = { fill: FILL, stroke: ACCENT };
export const IMAGE = { fill: '#fed7aa', stroke: '#c2410c' };
const MIRROR = '#dc2626';
const GRID = '#d1d5db';

export interface GridItem {
  cells: readonly Cell[];
  colour: { fill: string; stroke: string };
  text?: string;
  /** Mark the top-left corner of the cell with this index with a dot (to help match corners). */
  dotAt?: number;
}

export interface GridSpec {
  cols: number;
  rows: number;
  items: GridItem[];
  /** Vertical mirror lines at these x grid lines. */
  mirrorV?: number[];
  /** Horizontal mirror lines at these y grid lines. */
  mirrorH?: number[];
  /** Centre of rotation (a grid point). */
  centre?: [number, number];
  /** Names for the mirror lines, drawn at their ends. */
  mirrorLabels?: string[];
}

function gridBody(g: GridSpec, ox: number, oy: number, s: number): string {
  let body = `<rect x="${ox}" y="${oy}" width="${g.cols * s}" height="${g.rows * s}" fill="#ffffff" stroke="${GRID}" stroke-width="1"/>`;
  for (let c = 1; c < g.cols; c++) body += line({ x: ox + c * s, y: oy }, { x: ox + c * s, y: oy + g.rows * s }, { stroke: GRID, width: 1 });
  for (let r = 1; r < g.rows; r++) body += line({ x: ox, y: oy + r * s }, { x: ox + g.cols * s, y: oy + r * s }, { stroke: GRID, width: 1 });
  for (const it of g.items) {
    for (const [c, r] of it.cells) {
      body += `<rect x="${ox + c * s}" y="${oy + r * s}" width="${s}" height="${s}" fill="${it.colour.fill}" stroke="${it.colour.stroke}" stroke-width="1.5"/>`;
    }
    if (it.dotAt !== undefined) {
      const [c, r] = it.cells[it.dotAt]!;
      body += `<circle cx="${ox + c * s}" cy="${oy + r * s}" r="${Math.max(3, s / 6)}" fill="${INK}" stroke="#ffffff" stroke-width="1"/>`;
    }
  }
  for (const it of g.items) {
    if (!it.text) continue;
    const cx = it.cells.reduce((t, [c]) => t + c + 0.5, 0) / it.cells.length;
    const cy = it.cells.reduce((t, [, r]) => t + r + 0.5, 0) / it.cells.length;
    // Put the letter on the square nearest the middle of the shape.
    const [bc, br] = [...it.cells].sort((p, q) => Math.hypot(p[0] + 0.5 - cx, p[1] + 0.5 - cy) - Math.hypot(q[0] + 0.5 - cx, q[1] + 0.5 - cy))[0]!;
    body += label({ x: ox + (bc + 0.5) * s, y: oy + (br + 0.5) * s + 1 }, it.text, { bold: true, size: Math.min(15, s * 0.7) });
  }
  (g.mirrorV ?? []).forEach((m) => {
    body += line({ x: ox + m * s, y: oy - 4 }, { x: ox + m * s, y: oy + g.rows * s + 4 }, { stroke: MIRROR, width: 2.5, dash: true });
  });
  (g.mirrorH ?? []).forEach((m) => {
    body += line({ x: ox - 4, y: oy + m * s }, { x: ox + g.cols * s + 4, y: oy + m * s }, { stroke: MIRROR, width: 2.5, dash: true });
  });
  if (g.centre) {
    const [px, py] = g.centre;
    body += `<circle cx="${ox + px * s}" cy="${oy + py * s}" r="${Math.max(3.5, s / 4.5)}" fill="${INK}" stroke="#ffffff" stroke-width="1.5"/>`;
  }
  return body;
}

/** One grid, drawn at `s` px per square. */
export function drawGrid(g: GridSpec, s = 22): string {
  const pad = 12;
  return svgDoc(g.cols * s + pad * 2, g.rows * s + pad * 2, gridBody(g, pad, pad, s));
}

/** Four (or fewer) grids in a 2 × 2 layout, labelled A, B, C, D. */
export function drawPanels(panels: GridSpec[], s = 13): string {
  const pw = panels[0]!.cols * s;
  const ph = panels[0]!.rows * s;
  const gap = 22;
  const top = 22;
  const W = 2 * pw + 3 * 14;
  const H = Math.ceil(panels.length / 2) * (ph + top) + gap;
  let body = '';
  panels.forEach((p, i) => {
    const ox = 14 + (i % 2) * (pw + 14);
    const oy = top + Math.floor(i / 2) * (ph + top + 4);
    body += label({ x: ox + pw / 2, y: oy - 11 }, `Picture ${'ABCD'[i]}`, { bold: true, size: 13 });
    body += gridBody(p, ox, oy, s);
  });
  return svgDoc(W, H, body);
}

export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
