import type { Rng } from '../../../../rng';
import { gcd, num, round } from '../../../format';
import { INK, label, line, svgDoc } from '../../../svg';

// Helpers shared by the Year 6 decimals, fractions, fractions-of-amounts and percentages templates.

/** Simplifies n/d (denominator positive). */
export function simp(n: number, d: number): [number, number] {
  if (d === 0) throw new Error('simp: zero denominator');
  const g = gcd(n, d) || 1;
  let a = n / g;
  let b = d / g;
  if (b < 0) {
    a = -a;
    b = -b;
  }
  return [a === 0 ? 0 : a, b];
}

/** A random proper fraction in simplest form whose denominator comes from `dens`. */
export function properFraction(rng: Rng, dens: readonly number[]): [number, number] {
  const d = rng.pick(dens);
  const nums: number[] = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) nums.push(n);
  return [rng.pick(nums), d];
}

/** LaTeX \frac without simplifying. */
export const fr = (n: number | string, d: number | string) => `\\frac{${n}}{${d}}`;

/** LaTeX mixed number from whole, numerator and denominator (no simplifying). */
export const mx = (w: number, n: number, d: number) => (n === 0 ? `${w}` : w === 0 ? fr(n, d) : `${w}${fr(n, d)}`);

/** LaTeX for n/d in simplest form, as a mixed number when it is bigger than 1. */
export function fracOrMixed(n: number, d: number): string {
  const [a, b] = simp(n, d);
  if (b === 1) return `${a}`;
  if (a < b) return fr(a, b);
  return mx(Math.floor(a / b), a % b, b);
}

/** Money in prose, with the dollar sign escaped: 12 → "\$12", 4.5 → "\$4.50". */
export function cash(x: number): string {
  const v = round(x, 2);
  const body = Number.isInteger(v) ? num(v) : num(v, 2);
  return `\\$${body}`;
}

/** A decimal from a whole number of thousandths, for KaTeX: 2305 → "2.305", 2300 → "2.3". */
export function th(thousandths: number): string {
  return num(thousandths / 1000).replace(/,/g, '{,}');
}

export interface Choice {
  text: string;
  feedback?: string;
}

/** Shuffled MCQ options with distinct texts. Distractors that repeat the correct text (or each other) are dropped. */
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
  let correctId = 'a';
  all.forEach((c, i) => {
    if (c.ok) correctId = ids[i]!;
    else if (c.feedback) feedback[ids[i]!] = c.feedback;
  });
  return { options, correct: correctId, ...(Object.keys(feedback).length ? { feedback } : {}) };
}

/** `order` items (given in the correct order) with ids that don't give the order away. */
export function orderItems(rng: Rng, textsInOrder: string[]) {
  const ids = rng.shuffle(['p', 'q', 'r', 's', 't', 'u', 'v', 'w']);
  return textsInOrder.map((text, i) => ({ id: ids[i]!, text }));
}

/** The comparison symbols used in dropdowns. */
export const CMP = ['<', '>', '='] as const;
export type Cmp = (typeof CMP)[number];
export const cmp = (a: number, b: number): Cmp => (Math.abs(a - b) < 1e-9 ? '=' : a < b ? '<' : '>');
export const cmpWords: Record<Cmp, string> = { '<': 'is less than', '>': 'is greater than', '=': 'is equal to' };

const SHADE = '#93c5fd';

/** A bar split into `parts` equal pieces with the first `shaded` coloured. */
export function fractionBar(parts: number, shaded: number, width = 360): string {
  const h = 50;
  const pad = 10;
  const w = (width - pad * 2) / parts;
  let body = '';
  for (let i = 0; i < parts; i++) {
    const x = pad + i * w;
    body += `<rect x="${round(x, 2)}" y="${pad}" width="${round(w, 2)}" height="${h}" fill="${i < shaded ? SHADE : '#ffffff'}" stroke="${INK}" stroke-width="2"/>`;
  }
  return svgDoc(width, h + pad * 2, body);
}

/** A 10 × 10 hundred square with the first `shaded` squares coloured, filling row by row. */
export function hundredSquare(shaded: number): string {
  const s = 18;
  const pad = 10;
  let body = '';
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10);
    const c = i % 10;
    body += `<rect x="${pad + c * s}" y="${pad + r * s}" width="${s}" height="${s}" fill="${i < shaded ? SHADE : '#ffffff'}" stroke="${INK}" stroke-width="1"/>`;
  }
  body += `<rect x="${pad}" y="${pad}" width="${s * 10}" height="${s * 10}" fill="none" stroke="${INK}" stroke-width="2"/>`;
  return svgDoc(s * 10 + pad * 2, s * 10 + pad * 2, body);
}

/**
 * A number line from `start` to `start + steps × step` (in thousandths), with a tick at every step,
 * end labels, and an arrow pointing at tick `at`.
 */
export function decimalLine(startTh: number, stepTh: number, steps: number, at: number): string {
  const width = 400;
  const pad = 30;
  const y = 60;
  const gap = (width - pad * 2) / steps;
  let body = line({ x: pad - 8, y }, { x: width - pad + 8, y });
  for (let i = 0; i <= steps; i++) {
    const x = pad + i * gap;
    const big = i === 0 || i === steps;
    body += line({ x, y: y - (big ? 12 : 8) }, { x, y: y + (big ? 12 : 8) }, { width: big ? 2 : 1.5 });
  }
  body += label({ x: pad, y: y + 28 }, num((startTh) / 1000));
  body += label({ x: width - pad, y: y + 28 }, num((startTh + steps * stepTh) / 1000));
  const ax = pad + at * gap;
  body += line({ x: ax, y: 14 }, { x: ax, y: y - 14 }, { stroke: '#2563eb', width: 2.5 });
  body += `<polygon points="${round(ax - 6, 2)},${y - 22} ${round(ax + 6, 2)},${y - 22} ${round(ax, 2)},${y - 12}" fill="#2563eb"/>`;
  return svgDoc(width, 100, body);
}

/** `count` bars stacked one above the other, each split into `parts`, with `shaded` parts coloured in total. */
export function fractionBars(parts: number, shaded: number, count: number): string {
  const width = 360;
  const h = 34;
  const gap = 12;
  const pad = 10;
  const w = (width - pad * 2) / parts;
  let body = '';
  for (let b = 0; b < count; b++) {
    const y = pad + b * (h + gap);
    for (let i = 0; i < parts; i++) {
      const x = pad + i * w;
      const on = b * parts + i < shaded;
      body += `<rect x="${round(x, 2)}" y="${y}" width="${round(w, 2)}" height="${h}" fill="${on ? SHADE : '#ffffff'}" stroke="${INK}" stroke-width="2"/>`;
    }
  }
  return svgDoc(width, pad * 2 + count * h + (count - 1) * gap, body);
}

/**
 * A bar model: a bar split into `parts`, the first `shaded` coloured, a bracket over the shaded
 * part labelled `partLabel`, and a bracket under the whole bar labelled `wholeLabel`.
 */
export function barModel(parts: number, shaded: number, partLabel: string, wholeLabel: string): string {
  const width = 380;
  const pad = 20;
  const top = 44;
  const h = 44;
  const w = (width - pad * 2) / parts;
  let body = '';
  for (let i = 0; i < parts; i++) {
    const x = pad + i * w;
    body += `<rect x="${round(x, 2)}" y="${top}" width="${round(w, 2)}" height="${h}" fill="${i < shaded ? SHADE : '#ffffff'}" stroke="${INK}" stroke-width="2"/>`;
  }
  const x2 = pad + shaded * w;
  body += line({ x: pad, y: top - 10 }, { x: x2, y: top - 10 }, { width: 1.5 });
  body += line({ x: pad, y: top - 16 }, { x: pad, y: top - 4 }, { width: 1.5 });
  body += line({ x: x2, y: top - 16 }, { x: x2, y: top - 4 }, { width: 1.5 });
  body += label({ x: (pad + x2) / 2, y: top - 26 }, partLabel, { bold: true });
  const yb = top + h + 10;
  body += line({ x: pad, y: yb }, { x: width - pad, y: yb }, { width: 1.5 });
  body += line({ x: pad, y: yb - 6 }, { x: pad, y: yb + 6 }, { width: 1.5 });
  body += line({ x: width - pad, y: yb - 6 }, { x: width - pad, y: yb + 6 }, { width: 1.5 });
  body += label({ x: width / 2, y: yb + 18 }, wholeLabel, { bold: true });
  return svgDoc(width, yb + 34, body);
}
