import type { Rng } from '../../../rng';
import { round } from '../../format';
import { ACCENT, INK, circle, coordinatePlane, line, label, polygon, svgDoc } from '../../svg';

// Shared helpers for the algebra templates.

/** A linear term for poly()/polyAnswer(). */
export const t = (coef: number, variable = ''): [number, string] => [coef, variable];

/** Money in prose with the dollar sign escaped so it isn't read as maths: 12 → "\$12", 4.5 → "\$4.50". */
export function cash(x: number): string {
  const v = round(x, 2);
  return `\\$${Number.isInteger(v) ? String(v) : v.toFixed(2)}`;
}

export interface Choice {
  text: string;
  /** Why this option is wrong (distractors only). */
  feedback?: string;
}

/**
 * Builds MCQ fields from one correct choice and some distractors. Drops distractors whose text
 * repeats another option, keeps at most `max - 1` of them, shuffles, and labels the options a, b, c, ….
 */
export function mcqFields(rng: Rng, correct: Choice, distractors: Choice[], max = 4) {
  const seen = new Set([correct.text]);
  const kept: Choice[] = [];
  for (const d of distractors) {
    if (seen.has(d.text) || kept.length >= max - 1) continue;
    seen.add(d.text);
    kept.push(d);
  }
  const all = rng.shuffle([{ ...correct, ok: true }, ...kept.map((d) => ({ ...d, ok: false }))]);
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const options = all.map((c, i) => ({ id: ids[i]!, text: c.text }));
  const feedback: Record<string, string> = {};
  all.forEach((c, i) => {
    if (!c.ok && c.feedback) feedback[ids[i]!] = c.feedback;
  });
  return {
    options,
    correct: ids[all.findIndex((c) => c.ok)]!,
    ...(Object.keys(feedback).length ? { feedback } : {}),
  };
}

/** Inequality symbols: plain (for dropdowns), TeX, and words. */
export type Sym = '<' | '>' | '≤' | '≥';
export const SYMS: readonly Sym[] = ['<', '>', '≤', '≥'];
export const symTex: Record<Sym, string> = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' };
export const symWords: Record<Sym, string> = {
  '<': 'less than',
  '>': 'greater than',
  '≤': 'less than or equal to',
  '≥': 'greater than or equal to',
};
/** The symbol you get when both sides are multiplied or divided by a negative number. */
export const flip: Record<Sym, Sym> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };

/**
 * Number line from lo to hi (integers) showing the solution set of x <sym> boundary:
 * an open circle for < and >, a filled circle for ≤ and ≥, and a thick arrow in the solution direction.
 */
export function numberLineSvg(boundary: number, sym: Sym, lo: number, hi: number): string {
  const W = 400;
  const H = 80;
  const pad = 30;
  const y = 32;
  const step = (W - 2 * pad) / (hi - lo);
  const X = (v: number) => pad + (v - lo) * step;
  const arrow = (tipX: number, dir: 1 | -1, colour: string) =>
    polygon(
      [
        { x: tipX, y },
        { x: tipX - dir * 10, y: y - 6 },
        { x: tipX - dir * 10, y: y + 6 },
      ],
      { fill: colour, stroke: colour },
    );
  let body = line({ x: pad - 18, y }, { x: W - pad + 18, y }, { width: 2 });
  body += arrow(W - pad + 22, 1, INK) + arrow(pad - 22, -1, INK);
  for (let v = lo; v <= hi; v++) {
    body += line({ x: X(v), y: y - 6 }, { x: X(v), y: y + 6 }, { width: 1.5 });
    body += label({ x: X(v), y: y + 24 }, String(v).replace('-', '−'), { size: 13 });
  }
  const right = sym === '>' || sym === '≥';
  const bx = X(boundary);
  const end = right ? W - pad + 8 : pad - 8;
  body += line({ x: bx, y }, { x: end, y }, { stroke: ACCENT, width: 5 });
  body += arrow(right ? end + 6 : end - 6, right ? 1 : -1, ACCENT);
  const closed = sym === '≤' || sym === '≥';
  body += circle({ x: bx, y }, 7, { fill: closed ? ACCENT : '#ffffff', stroke: ACCENT });
  return svgDoc(W, H, body);
}

/** The straight line y = mx + c drawn on four-quadrant axes from −range to range. */
export function lineGraphSvg(m: number, c: number, range = 5): string {
  const plane = coordinatePlane({ xMin: -range, xMax: range, yMin: -range, yMax: range, scale: 27 });
  let x1 = -range;
  let x2 = range;
  if (m !== 0) {
    const a = (-range - c) / m;
    const b = (range - c) / m;
    x1 = Math.max(-range, Math.min(a, b));
    x2 = Math.min(range, Math.max(a, b));
  }
  const body =
    plane.body + line(plane.toPx({ x: x1, y: m * x1 + c }), plane.toPx({ x: x2, y: m * x2 + c }), { stroke: ACCENT, width: 3 });
  return svgDoc(plane.width, plane.height, body);
}

/** TeX for y = mx + c with integer or simple fractional m, e.g. "y = -2x + 3", "y = 4". */
export function lineTex(m: number, c: number, variable = 'x'): string {
  const mx = m === 0 ? '' : Number.isInteger(m) ? termTex(m, variable) : `${m < 0 ? '-' : ''}\\tfrac{1}{${Math.round(1 / Math.abs(m))}}${variable}`;
  if (!mx) return `y = ${c}`;
  if (c === 0) return `y = ${mx}`;
  return `y = ${mx} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

function termTex(m: number, v: string): string {
  if (m === 1) return v;
  if (m === -1) return `-${v}`;
  return `${m}${v}`;
}
