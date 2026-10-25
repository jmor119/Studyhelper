import type { Rng } from '../../../rng';
import { frac, gcd, lcm, num, round } from '../../format';

// Shared helpers for the number-strand templates.

/** Money in prose, with the dollar sign escaped so it isn't read as maths: 12 → "\$12", 4.5 → "\$4.50", 1200 → "\$1,200". */
export function cash(x: number): string {
  const v = round(x, 2);
  const abs = Math.abs(v);
  const body = Number.isInteger(abs) ? num(abs) : num(abs, 2);
  return `${v < 0 ? '−' : ''}\\$${body}`;
}

/** Money in prose, always with cents: 12 → "\$12.00". */
export function cents(x: number): string {
  const v = round(x, 2);
  return `${v < 0 ? '−' : ''}\\$${num(Math.abs(v), 2)}`;
}

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

/** Simplified LaTeX fraction, wrapped in brackets when negative (for use after an operator). */
export function fracSigned(n: number, d: number): string {
  const s = frac(n, d);
  return n * d < 0 ? `\\left(${s}\\right)` : s;
}

/** LaTeX for a mixed number given whole part and proper fraction r/d (no simplifying). */
export function mixedTex(whole: number, r: number, d: number): string {
  return `${whole}\\frac{${r}}{${d}}`;
}

/** Adds or subtracts two fractions exactly. Returns the unsimplified result over the LCM. */
export function addFractions(n1: number, d1: number, n2: number, d2: number, op: '+' | '-') {
  const L = lcm(d1, d2);
  const a = n1 * (L / d1);
  const b = n2 * (L / d2);
  const top = op === '+' ? a + b : a - b;
  return { L, a, b, top };
}

/** Prime factors of n (n ≥ 2), with repeats. */
export function primeFactors(n: number): number[] {
  const out: number[] = [];
  let m = Math.abs(n);
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p);
      m /= p;
    }
  }
  if (m > 1) out.push(m);
  return out;
}

/** True if n/d (any form) is a terminating decimal. */
export function isTerminating(n: number, d: number): boolean {
  const [, b] = simp(n, d);
  return primeFactors(b).every((p) => p === 2 || p === 5);
}

/**
 * Decimal expansion of a non-negative fraction n/d by long division. Terminating decimals are
 * exact; recurring ones show `digits` decimal places followed by "…".
 */
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

/** Percentage text for prose: 37.5 → "37.5%". */
export function pct(x: number): string {
  return `${num(x)}%`;
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

/** Cold NZ towns for winter temperature contexts. */
export const COLD_PLACES = [
  'Ōhakune', 'Lake Tekapo', 'Twizel', 'Ranfurly', 'Queenstown', 'Alexandra', 'Wānaka', 'Methven', 'Naseby', 'Waiouru',
] as const;
