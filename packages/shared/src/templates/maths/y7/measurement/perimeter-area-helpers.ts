// Figure helpers for m7.mea.perimeter-area (also used by m7.mea.volume): rectilinear shapes,
// triangles with a dashed perpendicular height, and labels that sit outside each edge.
// Shapes are given in maths units (x right, y up) with vertices listed anticlockwise.

import { INK, label, line, polygon, rightAngleMark, svgDoc, type Pt } from '../../../svg';

export const HEIGHT_COLOUR = '#2563eb';
const GREY = '#6b7280';

/** Small grey "Not to scale" note. */
export function notToScale(at: Pt, anchor: 'start' | 'middle' | 'end' = 'end'): string {
  return label(at, 'Not to scale', { size: 11, fill: GREY, anchor });
}

/**
 * A label beside segment a–b (pixels), pushed out along the unit normal n (pixels). The gap allows
 * for the width of the text when the label sits beside a vertical edge.
 */
export function edgeLabel(a: Pt, b: Pt, n: Pt, text: string, opts: { offset?: number; fill?: string } = {}): string {
  const size = 14;
  const halfW = (text.length * size * 0.55) / 2;
  const off = (opts.offset ?? 9) + Math.abs(n.x) * halfW + Math.abs(n.y) * size * 0.45;
  return label({ x: (a.x + b.x) / 2 + n.x * off, y: (a.y + b.y) / 2 + n.y * off }, text, {
    ...(opts.fill && { fill: opts.fill }),
  });
}

/** Short tick marks across the middle of a segment (equal-length marks). */
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

/** A dimension line with end ticks and a label (e.g. a total height drawn beside a shape). */
export function dimensionLine(a: Pt, b: Pt, text: string, n: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const tick = (p: Pt) => line({ x: p.x - px * 6, y: p.y - py * 6 }, { x: p.x + px * 6, y: p.y + py * 6 }, { stroke: GREY, width: 1.5 });
  return line(a, b, { stroke: GREY, width: 1.5 }) + tick(a) + tick(b) + edgeLabel(a, b, n, text, { offset: 6 });
}

export interface ShapeSpec {
  /** Vertices in maths units, anticlockwise. */
  verts: Pt[];
  /** Label for edge i (from verts[i] to verts[i + 1]), or null. */
  labels: (string | null)[];
  /** Equal-length tick marks for edge i. */
  ticks?: number[];
  /** Mark the right angles at convex corners. */
  rightAngles?: boolean;
  /** Only mark the right angles at these vertex indices (overrides rightAngles). */
  rightAngleAt?: number[];
  /** Text written in the middle of the shape (e.g. "Area = 48 cm²"). */
  inside?: string;
  /** Where to put the inside text (maths units); defaults to the middle of the bounding box. */
  insideAt?: Pt;
}

export interface FigureFrame {
  toPx: (p: Pt) => Pt;
  /** Outward normal (pixels) of a segment given in maths units, for a shape listed anticlockwise. */
  normal: (a: Pt, b: Pt) => Pt;
}

/** Draws a polygon fitted into about maxW × maxH pixels (not to scale), with labelled edges. */
export function shapeFigure(
  spec: ShapeSpec,
  opts: { maxW?: number; maxH?: number; extra?: (f: FigureFrame) => string; padLeft?: number; padRight?: number; holes?: Pt[][] } = {},
): string {
  const xs = spec.verts.map((p) => p.x);
  const ys = spec.verts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const W = maxX - minX || 1;
  const H = maxY - minY || 1;
  const maxW = opts.maxW ?? 250;
  const maxH = opts.maxH ?? 160;
  const s = Math.min(maxW / W, maxH / H);
  let sx = s;
  let sy = s;
  if (W * sx < 120) sx = 120 / W;
  if (H * sy < 80) sy = 80 / H;
  const padL = opts.padLeft ?? 70;
  const padT = 32;
  const toPx = (p: Pt): Pt => ({ x: padL + (p.x - minX) * sx, y: padT + (maxY - p.y) * sy });
  const normal = (a: Pt, b: Pt): Pt => {
    const pa = toPx(a);
    const pb = toPx(b);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1;
    // Anticlockwise in maths coordinates is clockwise on screen, so the outside is on the left.
    return { x: -dy / len, y: dx / len };
  };
  const px = spec.verts.map(toPx);
  const n = px.length;
  let body = polygon(px);
  for (const hole of opts.holes ?? []) body += polygon(hole.map(toPx), { fill: '#ffffff' });
  for (let i = 0; i < n; i++) {
    const a = px[i]!;
    const b = px[(i + 1) % n]!;
    const text = spec.labels[i];
    if (text) body += edgeLabel(a, b, normal(spec.verts[i]!, spec.verts[(i + 1) % n]!), text);
    const t = spec.ticks?.[i];
    if (t) body += equalTick(a, b, t);
  }
  if (spec.rightAngles || spec.rightAngleAt) {
    for (let i = 0; i < n; i++) {
      if (spec.rightAngleAt && !spec.rightAngleAt.includes(i)) continue;
      const prev = spec.verts[(i + n - 1) % n]!;
      const cur = spec.verts[i]!;
      const next = spec.verts[(i + 1) % n]!;
      const v1 = { x: prev.x - cur.x, y: prev.y - cur.y };
      const v2 = { x: next.x - cur.x, y: next.y - cur.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const cross = (cur.x - prev.x) * (next.y - cur.y) - (cur.y - prev.y) * (next.x - cur.x);
      if (Math.abs(dot) < 1e-9 && cross > 0) body += rightAngleMark(px[i]!, px[(i + n - 1) % n]!, px[(i + 1) % n]!, 10);
    }
  }
  if (spec.inside) {
    const c = spec.insideAt ?? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    body += label(toPx(c), spec.inside, { fill: INK });
  }
  if (opts.extra) body += opts.extra({ toPx, normal });
  const width = padL + W * sx + (opts.padRight ?? 70);
  const height = padT + H * sy + 48;
  body += notToScale({ x: width - 8, y: height - 10 });
  return svgDoc(Math.round(width), Math.round(height), body);
}

/** A rectangle w × h with optional labels on the bottom and right edges (and ticks for a square). */
export function rectFigure(
  w: number,
  h: number,
  labels: { bottom?: string; right?: string; top?: string; left?: string },
  opts: { square?: boolean; inside?: string } = {},
): string {
  return shapeFigure({
    verts: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    labels: [labels.bottom ?? null, labels.right ?? null, labels.top ?? null, labels.left ?? null],
    ...(opts.square && { ticks: [1, 1, 1, 1] }),
    rightAngles: true,
    ...(opts.inside && { inside: opts.inside }),
  });
}

/**
 * A triangle with base b along the bottom and the apex above the point p along the base
 * (0 ≤ p ≤ b; p = 0 or p = b gives a right-angled triangle). The perpendicular height is dashed.
 */
export function triangleFigure(
  b: number,
  h: number,
  p: number,
  labels: { base: string; height: string; left?: string; right?: string; inside?: string },
): string {
  const verts = [
    { x: 0, y: 0 },
    { x: b, y: 0 },
    { x: p, y: h },
  ];
  const right = p <= 1e-9 || Math.abs(p - b) < 1e-9;
  return shapeFigure(
    {
      verts,
      labels: [labels.base, right && p > 0 ? labels.height : labels.right ?? null, right && p <= 1e-9 ? labels.height : labels.left ?? null],
      ...(labels.inside && { inside: labels.inside, insideAt: { x: (b + p) / 2.6, y: h / 3.2 } }),
    },
    {
      maxW: 230,
      maxH: 150,
      extra: ({ toPx }) => {
        const top = toPx({ x: p, y: h });
        const foot = toPx({ x: p, y: 0 });
        const towards = toPx({ x: p < b / 2 ? b : 0, y: 0 });
        let out = '';
        if (!right) {
          out += line(top, foot, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
          // Height label on the wider side of the dashed line.
          const n = p < b / 2 ? { x: 1, y: 0 } : { x: -1, y: 0 };
          out += edgeLabel(top, foot, n, labels.height, { fill: HEIGHT_COLOUR, offset: 6 });
        }
        out += rightAngleMark(foot, towards, top, 10);
        return out;
      },
    },
  );
}
