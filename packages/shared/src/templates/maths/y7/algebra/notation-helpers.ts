import type { Rng } from '../../../../rng';
import { round, tex } from '../../../format';
import { INK, label, line, polygon, sideLabel, svgDoc, type Pt } from '../../../svg';

// Helpers shared by the Year 7 algebra templates (notation, substitution, equations, linear patterns).
// Copied locally rather than imported from the Year 9 algebra helpers, so the two can change separately.

/** A linear term for poly()/polyAnswer(). */
export const t = (coef: number, variable = ''): [number, string] => [coef, variable];

/** Letters used as variables. Leaves out i, l and o (they look like 1 and 0) and e. */
export const LETTERS = ['a', 'b', 'c', 'd', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'w', 'x', 'y', 'z'] as const;

/** n different letters, in alphabetical order. */
export function pickLetters(rng: Rng, n: number): string[] {
  return rng.sample(LETTERS, n).sort();
}

/** Money in prose with the dollar sign escaped so it isn't read as maths: 12 → "\$12", 4.5 → "\$4.50". */
export function cash(x: number): string {
  const v = round(x, 2);
  return `\\$${Number.isInteger(v) ? String(v) : v.toFixed(2)}`;
}

/** "3 \times 4" for a coefficient and a value; just the value when the coefficient is 1. */
export function timesTex(coef: number, value: number): string {
  return coef === 1 ? tex(value) : `${tex(coef)} \\times ${tex(value)}`;
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
    type: 'mcq' as const,
    options,
    correct: ids[all.findIndex((c) => c.ok)]!,
    ...(Object.keys(feedback).length ? { feedback } : {}),
  };
}

const notToScale = (w: number, h: number) => label({ x: w - 8, y: h - 12 }, 'Not to scale', { anchor: 'end', size: 11, fill: '#6b7280' });

/** A rectangle with its top side and right side labelled. */
export function rectangleSvg(top: string, side: string): string {
  const W = 340;
  const H = 200;
  const p: Pt[] = [
    { x: 70, y: 50 },
    { x: 270, y: 50 },
    { x: 270, y: 160 },
    { x: 70, y: 160 },
  ];
  const body =
    polygon(p) +
    sideLabel(p[0]!, p[1]!, top, 16) +
    label({ x: 280, y: 105 }, side, { anchor: 'start' }) +
    notToScale(W, H);
  return svgDoc(W, H, body);
}

/** A triangle with all three sides labelled (left side, right side, base). */
export function triangleSvg(left: string, right: string, base: string): string {
  const W = 360;
  const H = 230;
  const a: Pt = { x: 70, y: 180 };
  const b: Pt = { x: 160, y: 40 };
  const c: Pt = { x: 300, y: 180 };
  const body =
    polygon([a, b, c]) +
    label({ x: (a.x + b.x) / 2 - 14, y: (a.y + b.y) / 2 - 6 }, left, { anchor: 'end' }) +
    label({ x: (b.x + c.x) / 2 + 14, y: (b.y + c.y) / 2 - 6 }, right, { anchor: 'start' }) +
    label({ x: (a.x + c.x) / 2, y: a.y + 20 }, base) +
    notToScale(W, H);
  return svgDoc(W, H, body);
}

/** A row of shapes drawn with matchsticks: patterns 1, 2 and 3 side by side. */
export type StickShape = 'squares' | 'triangles' | 'double-squares';

/** Matchsticks used by pattern n of a StickShape. */
export function sticksFor(shape: StickShape, n: number): number {
  if (shape === 'squares') return 3 * n + 1;
  if (shape === 'triangles') return 2 * n + 1;
  return 5 * n + 2;
}

export function stickPatternSvg(shape: StickShape): string {
  const s = 26;
  const gap = 34;
  const top = 40;
  let x = 20;
  let body = '';
  const stick = (a: Pt, b: Pt) => line(a, b, { stroke: '#b45309', width: 3 });
  for (let n = 1; n <= 3; n++) {
    const start = x;
    if (shape === 'squares' || shape === 'double-squares') {
      const rows = shape === 'squares' ? 1 : 2;
      for (let r = 0; r <= rows; r++) {
        for (let i = 0; i < n; i++) body += stick({ x: x + i * s, y: top + r * s }, { x: x + (i + 1) * s, y: top + r * s });
      }
      for (let i = 0; i <= n; i++) {
        for (let r = 0; r < rows; r++) body += stick({ x: x + i * s, y: top + r * s }, { x: x + i * s, y: top + (r + 1) * s });
      }
      x += n * s;
    } else {
      // n triangles, alternating point-up and point-down, sharing sides.
      const h = 24;
      const base = top + h;
      for (let i = 0; i < n; i++) {
        const lx = x + (i * s) / 2;
        if (i % 2 === 0) {
          body += stick({ x: lx, y: base }, { x: lx + s / 2, y: top });
          body += stick({ x: lx + s / 2, y: top }, { x: lx + s, y: base });
          body += stick({ x: lx, y: base }, { x: lx + s, y: base });
        } else {
          body += stick({ x: lx, y: top }, { x: lx + s / 2, y: base });
          body += stick({ x: lx + s / 2, y: base }, { x: lx + s, y: top });
          body += stick({ x: lx, y: top }, { x: lx + s, y: top });
        }
      }
      x += ((n + 1) * s) / 2;
    }
    const height = shape === 'double-squares' ? 2 * s : shape === 'squares' ? s : 24;
    body += label({ x: (start + x) / 2, y: top + height + 22 }, `Pattern ${n}`, { size: 13, fill: INK });
    x += gap;
  }
  const W = x;
  const H = shape === 'double-squares' ? 140 : 115;
  return svgDoc(W, H, body);
}
