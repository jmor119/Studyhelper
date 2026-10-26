import type { Rng } from '../../../../rng';
import { gcd, num, round } from '../../../format';
import { INK, svgDoc } from '../../../svg';

// Helpers for the Year 7 fraction, decimal and percentage templates
// (m7.num.fractions, m7.num.fraction-operations, m7.num.decimals, m7.num.percentages).
// Copied locally so these topics don't depend on other topics' files.

/** Simplifies n/d and makes the denominator positive. */
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

/** LaTeX fraction that is never simplified: (6, 8) → "\frac{6}{8}". */
export function f(n: number, d: number): string {
  return `\\frac{${n}}{${d}}`;
}

/** LaTeX for a mixed number from whole part and proper fraction r/d (no simplifying). */
export function mixedTex(whole: number, r: number, d: number): string {
  return r === 0 ? `${whole}` : whole === 0 ? f(r, d) : `${whole}\\frac{${r}}{${d}}`;
}

/** Simplified LaTeX for n/d: a whole number, a proper fraction, or (if improper) a mixed number. */
export function niceTex(n: number, d: number): string {
  const [a, b] = simp(n, d);
  if (b === 1) return `${a}`;
  if (a > b) return mixedTex(Math.floor(a / b), a % b, b);
  return f(a, b);
}

/** Simplified LaTeX for n/d, showing an improper fraction and its mixed number: "\frac{15}{4} = 3\frac{3}{4}". */
export function bothTex(n: number, d: number): string {
  const [a, b] = simp(n, d);
  if (b === 1) return `${a}`;
  if (a > b) return `${f(a, b)} = ${mixedTex(Math.floor(a / b), a % b, b)}`;
  return f(a, b);
}

/** Money in prose, with the dollar sign escaped so it isn't read as maths: 12 → "\$12", 4.5 → "\$4.50". */
export function cash(x: number): string {
  const v = round(x, 2);
  const abs = Math.abs(v);
  const body = Number.isInteger(abs) ? num(abs) : num(abs, 2);
  return `${v < 0 ? '−' : ''}\\$${body}`;
}

export interface Choice {
  text: string;
  /** Why this option is wrong (distractors only). */
  feedback?: string;
}

/**
 * Builds MCQ fields from one correct choice and candidate distractors. Skips any distractor whose
 * text repeats another option, keeps at most `max − 1`, shuffles, and labels the options a, b, c, ….
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
  let correctId = 'a';
  all.forEach((c, i) => {
    if (c.ok) correctId = ids[i]!;
    else if (c.feedback) feedback[ids[i]!] = c.feedback;
  });
  return { options, correct: correctId, feedback };
}

/** Builds `order` items (in correct order) with ids that don't give the order away. */
export function orderItems(rng: Rng, textsInOrder: string[]) {
  const ids = rng.shuffle(['p', 'q', 'r', 's', 't', 'u', 'v', 'w']);
  return textsInOrder.map((text, i) => ({ id: ids[i]!, text }));
}

/** Joins a list for prose: ["a", "b", "c"] → "a, b and c". */
export function listAnd(items: string[], last = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`;
}

/** A horizontal fraction bar split into `parts` equal parts with the first `shaded` parts shaded. */
export function fractionBar(parts: number, shaded: number): string {
  const x0 = 20;
  const y0 = 14;
  const w = 320;
  const h = 44;
  const pw = w / parts;
  let body = '';
  for (let i = 0; i < parts; i++) {
    const x = Math.round((x0 + pw * i) * 100) / 100;
    body += `<rect x="${x}" y="${y0}" width="${Math.round(pw * 100) / 100}" height="${h}" fill="${i < shaded ? '#60a5fa' : '#ffffff'}" stroke="${INK}" stroke-width="2"/>`;
  }
  return svgDoc(360, 72, body);
}

/** Exact decimal from an integer count of 10^-dp units: (375, 3) → 0.375. */
export function fromUnits(n: number, dp: number): number {
  return Number.parseFloat((n / 10 ** dp).toFixed(dp));
}

/** Rounds a non-negative integer count of small units to a coarser unit, half up: (2346, 10) → 235. */
export function roundUnits(n: number, step: number): number {
  return Math.floor((n + step / 2) / step);
}

/** Decimal expansion of a non-negative fraction n/d by long division, showing `digits` places then "…" if it keeps going. */
export function decimalExpansion(n: number, d: number, digits = 6): string {
  const whole = Math.floor(n / d);
  let r = n % d;
  let out = '';
  while (r !== 0 && out.length < digits) {
    r *= 10;
    out += String(Math.floor(r / d));
    r %= d;
  }
  if (!out) return String(whole);
  return `${whole}.${out}${r !== 0 ? '…' : ''}`;
}

/** True if n/d is a terminating decimal (its simplified denominator has only 2s and 5s as prime factors). */
export function isTerminating(n: number, d: number): boolean {
  let [, b] = simp(n, d);
  while (b % 2 === 0) b /= 2;
  while (b % 5 === 0) b /= 5;
  return b === 1;
}

const PLURAL_NAMES: Record<number, string> = {
  2: 'halves', 3: 'thirds', 4: 'quarters', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths',
  10: 'tenths', 11: 'elevenths', 12: 'twelfths', 15: 'fifteenths', 16: 'sixteenths', 18: 'eighteenths',
  20: 'twentieths', 24: 'twenty-fourths', 25: 'twenty-fifths', 30: 'thirtieths', 36: 'thirty-sixths',
  40: 'fortieths', 50: 'fiftieths', 100: 'hundredths',
};

/** Plural name of a fraction part: 4 → "quarters", 24 → "twenty-fourths". */
export function partsName(d: number): string {
  return PLURAL_NAMES[d] ?? `${d}ths`;
}

/** Singular name of a fraction part: 2 → "half", 4 → "quarter", 24 → "twenty-fourth". */
export function partName(d: number): string {
  const p = partsName(d);
  return p === 'halves' ? 'half' : p.replace(/s$/, '');
}
