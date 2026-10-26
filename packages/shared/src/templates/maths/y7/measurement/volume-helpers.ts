// Figure helpers for m7.mea.volume: rectangular prisms (optionally drawn as unit cubes) and
// step-shaped prisms, in an oblique projection. x goes across, y goes up and z goes back
// (drawn up and to the right). Faces use three shades of blue so the solid reads as 3D.

import { FILL, INK, label, line, svgDoc, type Pt } from '../../../svg';
import { notToScale } from './perimeter-area-helpers';

const TOP = '#bfdbfe';
const SIDE = '#93c5fd';
const r2 = (n: number) => Math.round(n * 100) / 100;

interface P3 {
  x: number;
  y: number;
  z: number;
}

function face(points: Pt[], fill: string): string {
  return `<polygon points="${points.map((p) => `${r2(p.x)},${r2(p.y)}`).join(' ')}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
}

const halfWidth = (text: string) => (text.length * 14 * 0.55) / 2;

/** Oblique projection fitted into roughly maxW × maxH pixels. */
function projector(dims: { x: number; y: number; z: number }, maxW: number, maxH: number, padL: number, padT: number) {
  const k = 0.55;
  const cos = Math.cos((35 * Math.PI) / 180);
  const sin = Math.sin((35 * Math.PI) / 180);
  const s = Math.min(maxW / (dims.x + dims.z * k * cos), maxH / (dims.y + dims.z * k * sin));
  const depthUp = dims.z * k * sin * s;
  const to = (p: P3): Pt => ({ x: padL + p.x * s + p.z * k * cos * s, y: padT + depthUp + (dims.y - p.y) * s - p.z * k * sin * s });
  const width = padL + (dims.x + dims.z * k * cos) * s;
  const height = padT + depthUp + dims.y * s;
  return { to, width, height };
}

/** Stretches small dimensions so that every edge is visible (the drawing is then "not to scale"). */
function displayDims(l: number, w: number, h: number): { x: number; y: number; z: number } {
  const m = Math.max(l, w, h);
  const f = (v: number) => Math.max(v, 0.4 * m);
  return { x: f(l), y: f(h), z: f(w) };
}

/**
 * A rectangular prism l long (across), w wide (going back) and h high. With `grid`, it is drawn
 * to scale as unit cubes; otherwise the edges are labelled.
 */
export function boxFigure(
  l: number,
  w: number,
  h: number,
  labels: { l?: string; w?: string; h?: string },
  opts: { grid?: boolean } = {},
): string {
  const dims = opts.grid ? { x: l, y: h, z: w } : displayDims(l, w, h);
  const padL = 70;
  const padT = 20;
  const { to, width, height } = projector(dims, opts.grid ? 220 : 210, opts.grid ? 160 : 140, padL, padT);
  const { x: X, y: Y, z: Z } = dims;
  let body = '';
  body += face([to({ x: 0, y: Y, z: 0 }), to({ x: X, y: Y, z: 0 }), to({ x: X, y: Y, z: Z }), to({ x: 0, y: Y, z: Z })], TOP);
  body += face([to({ x: X, y: 0, z: 0 }), to({ x: X, y: 0, z: Z }), to({ x: X, y: Y, z: Z }), to({ x: X, y: Y, z: 0 })], SIDE);
  body += face([to({ x: 0, y: 0, z: 0 }), to({ x: X, y: 0, z: 0 }), to({ x: X, y: Y, z: 0 }), to({ x: 0, y: Y, z: 0 })], FILL);
  if (opts.grid) {
    const g = (a: P3, b: P3) => line(to(a), to(b), { width: 1 });
    for (let i = 1; i < X; i++) body += g({ x: i, y: 0, z: 0 }, { x: i, y: Y, z: 0 }) + g({ x: i, y: Y, z: 0 }, { x: i, y: Y, z: Z });
    for (let j = 1; j < Y; j++) body += g({ x: 0, y: j, z: 0 }, { x: X, y: j, z: 0 }) + g({ x: X, y: j, z: 0 }, { x: X, y: j, z: Z });
    for (let k = 1; k < Z; k++) body += g({ x: 0, y: Y, z: k }, { x: X, y: Y, z: k }) + g({ x: X, y: 0, z: k }, { x: X, y: Y, z: k });
  }
  if (labels.l) {
    const a = to({ x: 0, y: 0, z: 0 });
    const b = to({ x: X, y: 0, z: 0 });
    body += label({ x: (a.x + b.x) / 2, y: a.y + 18 }, labels.l);
  }
  if (labels.h) {
    const a = to({ x: 0, y: 0, z: 0 });
    const b = to({ x: 0, y: Y, z: 0 });
    body += label({ x: a.x - 10 - halfWidth(labels.h), y: (a.y + b.y) / 2 }, labels.h);
  }
  if (labels.w) {
    const a = to({ x: X, y: 0, z: 0 });
    const b = to({ x: X, y: 0, z: Z });
    body += label({ x: (a.x + b.x) / 2 + 10 + halfWidth(labels.w), y: (a.y + b.y) / 2 + 8 }, labels.w);
  }
  const W = width + 80;
  const H = height + (opts.grid ? 24 : 44);
  if (!opts.grid) body += notToScale({ x: W - 8, y: H - 10 });
  return svgDoc(Math.round(W), Math.round(H), body);
}

export interface StepLabels {
  bottom?: string | null;
  left?: string | null;
  top?: string | null;
  stepUp?: string | null;
  stepAcross?: string | null;
  right?: string | null;
  depth?: string | null;
}

/**
 * A step-shaped prism: its front face is a W × H rectangle with an a × b piece missing from the
 * top-right corner, and it is D deep. Labels go on the outside edges.
 */
export function stepPrismFigure(W: number, H: number, a: number, b: number, D: number, labels: StepLabels): string {
  const padL = 64;
  const padT = 34;
  const dims = { x: W, y: H, z: Math.max(D, 0.35 * Math.max(W, H)) };
  const { to, width, height } = projector(dims, 230, 150, padL, padT);
  const Z = dims.z;
  const front: Array<[number, number]> = [
    [0, 0],
    [W, 0],
    [W, H - b],
    [W - a, H - b],
    [W - a, H],
    [0, H],
  ];
  const q = (x: number, y: number, z: number) => to({ x, y, z });
  let body = '';
  // Faces that can be seen: the right side, the top of the step, the side of the tall part, the top.
  body += face([q(W, 0, 0), q(W, 0, Z), q(W, H - b, Z), q(W, H - b, 0)], SIDE);
  body += face([q(W - a, H - b, 0), q(W, H - b, 0), q(W, H - b, Z), q(W - a, H - b, Z)], TOP);
  body += face([q(W - a, H - b, 0), q(W - a, H - b, Z), q(W - a, H, Z), q(W - a, H, 0)], SIDE);
  body += face([q(0, H, 0), q(W - a, H, 0), q(W - a, H, Z), q(0, H, Z)], TOP);
  body += face(front.map(([x, y]) => q(x, y, 0)), FILL);
  const mid = (p1: Pt, p2: Pt) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  if (labels.bottom) {
    const m = mid(q(0, 0, 0), q(W, 0, 0));
    body += label({ x: m.x, y: m.y + 18 }, labels.bottom);
  }
  if (labels.left) {
    const m = mid(q(0, 0, 0), q(0, H, 0));
    body += label({ x: m.x - 10 - halfWidth(labels.left), y: m.y }, labels.left);
  }
  if (labels.top) {
    const m = mid(q(0, H, Z), q(W - a, H, Z));
    body += label({ x: m.x, y: m.y - 13 }, labels.top);
  }
  if (labels.stepUp) {
    const m = mid(q(W - a, H - b, Z), q(W - a, H, Z));
    body += label({ x: m.x + 9 + halfWidth(labels.stepUp), y: m.y }, labels.stepUp);
  }
  if (labels.stepAcross) {
    const m = mid(q(W - a, H - b, Z), q(W, H - b, Z));
    body += label({ x: m.x + 10, y: m.y - 13 }, labels.stepAcross);
  }
  if (labels.right) {
    const m = mid(q(W, 0, Z), q(W, H - b, Z));
    body += label({ x: m.x + 9 + halfWidth(labels.right), y: m.y }, labels.right);
  }
  if (labels.depth) {
    const m = mid(q(W, 0, 0), q(W, 0, Z));
    body += label({ x: m.x + 10 + halfWidth(labels.depth), y: m.y + 9 }, labels.depth);
  }
  const Wpx = width + 80;
  const Hpx = height + 44;
  body += notToScale({ x: Wpx - 8, y: Hpx - 10 });
  return svgDoc(Math.round(Wpx), Math.round(Hpx), body);
}
