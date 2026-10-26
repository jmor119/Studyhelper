import type { Rng } from '../../../../rng';
import { num, round, tex } from '../../../format';

// Helpers for the Year 6 whole-number, division and money templates
// (m6.num.whole-numbers, m6.num.division, m6.num.money). Kept local so other topics' files
// and the shared format.ts stay untouched.

export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Money in prose (Markdown), with an escaped dollar sign: 12 → "\$12", 4.5 → "\$4.50". */
export function cash(x: number): string {
  const v = round(x, 2);
  return `\\$${Number.isInteger(v) ? num(v) : num(v, 2)}`;
}

/** Money from a whole number of cents, in prose: 450 → "\$4.50", 2000 → "\$20". */
export const cashC = (c: number): string => cash(c / 100);

/** Money in KaTeX with two decimal places, from cents: 450 → "4.50", 2000 → "20.00". */
export const texC = (c: number): string => tex(round(c / 100, 2), 2);

/** Dollars (as a number) from cents, free of floating-point noise. */
export const dollars = (c: number): number => round(c / 100, 2);

/** Accepted text forms of a whole number for a cloze blank: "1283" and "1 283" (commas normalise to spaces). */
export function wholeAccepted(n: number): string[] {
  const plain = String(n);
  const spaced = num(n).replace(/,/g, ' ');
  return spaced === plain ? [plain] : [plain, spaced];
}

export interface Choice {
  text: string;
  /** Why this option is wrong (distractors only). */
  feedback?: string;
}

/** Shuffled MCQ options with one correct answer and up to max − 1 distinct distractors. */
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

/** Place names, ones first. */
export const PLACES_PLURAL = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'] as const;
export const PLACES_SINGULAR = ['one', 'ten', 'hundred', 'thousand', 'ten thousand', 'hundred thousand', 'million'] as const;

/** Digits of a whole number, ones first: 4203 → [3, 0, 2, 4]. */
export function digitsOf(n: number): number[] {
  return String(n)
    .split('')
    .reverse()
    .map((c) => Number(c));
}

/** Number from digits, ones first. */
export function fromDigits(d: number[]): number {
  return d.reduce((s, x, i) => s + x * 10 ** i, 0);
}

/** A number with a random digit pattern of exactly `len` digits (no leading zero). */
export function randomDigits(rng: Rng, len: number): number {
  let n = rng.int(1, 9);
  for (let i = 1; i < len; i++) n = n * 10 + rng.int(0, 9);
  return n;
}

/**
 * Column layout in KaTeX, e.g. columnTex([[ '', 4582 ], [ '+', 2739 ]], [7321]).
 * Each row is [operator, value]; the lines after the first rule are the result rows
 * (and an optional second rule before the last one, for long multiplication).
 */
export function columnTex(rows: Array<[string, number]>, result: Array<[string, number]>, ruleBeforeLast = false): string {
  const fmt = ([op, v]: [string, number]) => `${op} & ${tex(v)}`;
  const top = rows.map(fmt).join(' \\\\ ');
  const res = result.map(fmt);
  const resTex =
    ruleBeforeLast && res.length > 1 ? `${res.slice(0, -1).join(' \\\\ ')} \\\\ \\hline ${res[res.length - 1]}` : res.join(' \\\\ ');
  return `$$\\begin{array}{rr} ${top} \\\\ \\hline ${resTex} \\end{array}$$`;
}

/** Column-by-column explanation of a + b. */
export function additionSteps(a: number, b: number): string[] {
  const da = digitsOf(a);
  const db = digitsOf(b);
  const n = Math.max(da.length, db.length);
  const lines: string[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const terms = [da[i], db[i]].filter((x): x is number => x !== undefined);
    if (carry) terms.push(carry);
    const s = terms.reduce((p, q) => p + q, 0);
    const sumTex = terms.length > 1 ? `$${terms.join(' + ')} = ${s}$` : `$${s}$`;
    const place = cap(PLACES_PLURAL[i]!);
    if (s >= 10) {
      lines.push(
        `**${place}:** ${sumTex}. Write ${s - 10} and regroup 10 ${PLACES_PLURAL[i]} as 1 ${PLACES_SINGULAR[i + 1]} in the next column.`,
      );
      carry = 1;
    } else {
      lines.push(`**${place}:** ${sumTex}. Write ${s}.`);
      carry = 0;
    }
  }
  if (carry) lines.push(`The last 1 goes in the ${PLACES_PLURAL[n]} place.`);
  return lines;
}

/** Column-by-column explanation of a − b (a > b), including renaming across zeros. */
export function subtractionSteps(a: number, b: number): string[] {
  const top = digitsOf(a);
  const bot = digitsOf(b);
  const lines: string[] = [];
  for (let i = 0; i < top.length; i++) {
    const y = bot[i] ?? 0;
    const place = cap(PLACES_PLURAL[i]!);
    // The leading column can end up as 0 after renaming; nothing to write there.
    if (i === top.length - 1 && i >= bot.length && top[i] === 0) break;
    if (i >= bot.length) {
      lines.push(`**${place}:** nothing to take away, so write ${top[i]}.`);
      continue;
    }
    let note = '';
    if (top[i]! < y) {
      let j = i + 1;
      while (top[j] === 0) j++;
      if (j === i + 1) {
        note = `${top[i]} is smaller than ${y}, so rename 1 ${PLACES_SINGULAR[i + 1]} as 10 ${PLACES_PLURAL[i]}. Now there are ${top[i]! + 10} ${PLACES_PLURAL[i]}. `;
      } else {
        const zeroPlaces = PLACES_PLURAL.slice(i + 1, j);
        const chain: string[] = [];
        for (let k = j; k > i; k--) chain.push(`1 ${PLACES_SINGULAR[k]} as 10 ${PLACES_PLURAL[k - 1]}`);
        const now = [`${top[i]! + 10} ${PLACES_PLURAL[i]}`, ...zeroPlaces.map((p) => `9 ${p}`)];
        note = `${top[i]} is smaller than ${y}, and there are 0 ${zeroPlaces.join(' and ')}. Rename ${chain.join(', then ')}. Now there are ${now
          .slice(0, -1)
          .join(', ')} and ${now[now.length - 1]}. `;
      }
      top[j]! -= 1;
      for (let k = i + 1; k < j; k++) top[k] = 9;
      top[i]! += 10;
    }
    lines.push(`**${place}:** ${note}$${top[i]} - ${y} = ${top[i]! - y}$.`);
  }
  return lines;
}

/** Step-by-step short division of n by a one-digit d. */
export function shortDivisionSteps(n: number, d: number): { lines: string[]; q: number; r: number } {
  const digits = String(n).split('').map(Number);
  const lines: string[] = [];
  let rem = 0;
  let q = 0;
  let started = false;
  digits.forEach((dig, i) => {
    const cur = rem * 10 + dig;
    const qd = Math.floor(cur / d);
    rem = cur % d;
    q = q * 10 + qd;
    const last = i === digits.length - 1;
    const curText = i > 0 && cur !== dig ? `${cur}` : `${dig}`;
    if (qd === 0 && !started && !last) {
      lines.push(`${d} doesn't go into ${dig}, so carry the ${dig} to the next digit.`);
      return;
    }
    started = true;
    if (qd === 0) {
      lines.push(
        last
          ? `${d} doesn't go into ${curText}, so write 0. That leaves a remainder of ${rem}.`
          : `${d} doesn't go into ${curText}, so write 0 and carry the ${rem} to the next digit.`,
      );
      return;
    }
    const eq = `$${curText} \\div ${d} = ${qd}$${rem ? ` remainder ${rem}` : ''}`;
    if (last) lines.push(`${eq}. Write ${qd}.${rem ? ` The ${rem} left over is the remainder.` : ''}`);
    else lines.push(`${eq}. Write ${qd}${rem ? ` and carry the ${rem} to the next digit` : ''}.`);
  });
  return { lines, q, r: rem };
}

/** Counting-up steps for change: from priceC up to paidC (both in cents). */
export function countUpSteps(priceC: number, paidC: number): { lines: string[]; parts: number[] } {
  const lines: string[] = [];
  const parts: number[] = [];
  let at = priceC;
  if (at % 100 !== 0) {
    const next = Math.min(paidC, Math.ceil(at / 100) * 100);
    lines.push(`From ${cashC(at)} up to ${cashC(next)} is ${next - at}c.`);
    parts.push(next - at);
    at = next;
  }
  if (at < paidC && at % 1000 !== 0) {
    const next = Math.min(paidC, Math.ceil(at / 1000) * 1000);
    if (next > at) {
      lines.push(`From ${cashC(at)} up to ${cashC(next)} is ${cashC(next - at)}.`);
      parts.push(next - at);
      at = next;
    }
  }
  if (at < paidC) {
    lines.push(`From ${cashC(at)} up to ${cashC(paidC)} is ${cashC(paidC - at)}.`);
    parts.push(paidC - at);
  }
  return { lines, parts };
}

/** "60c + \$2 + \$10" for the counting-up parts. */
export function partsText(parts: number[]): string {
  return parts.map((p) => (p < 100 ? `${p}c` : cashC(p))).join(' + ');
}

/** NZ kai and shop items with realistic prices, in cents (multiples of 10). */
export const SNACKS = [
  { name: 'mince and cheese pie', lo: 450, hi: 650 },
  { name: 'sausage roll', lo: 300, hi: 450 },
  { name: 'sushi roll', lo: 250, hi: 400 },
  { name: 'bottle of water', lo: 200, hi: 350 },
  { name: 'ice block', lo: 150, hi: 350 },
  { name: 'muffin', lo: 300, hi: 450 },
  { name: 'sandwich', lo: 550, hi: 850 },
  { name: 'fruit juice', lo: 200, hi: 380 },
  { name: 'scoop of hot chips', lo: 300, hi: 500 },
  { name: 'banana', lo: 60, hi: 120 },
] as const;

export const SHOP_ITEMS = [
  { name: 'netball', lo: 1800, hi: 3500 },
  { name: 'drink bottle', lo: 900, hi: 1800 },
  { name: 'pencil case', lo: 400, hi: 900 },
  { name: 'book', lo: 1200, hi: 2500 },
  { name: 'cap', lo: 1500, hi: 3000 },
  { name: 'pair of jandals', lo: 800, hi: 2000 },
  { name: 'kite', lo: 1200, hi: 2500 },
  { name: 'set of felt pens', lo: 500, hi: 1200 },
  { name: 'soccer ball', lo: 1500, hi: 3500 },
  { name: 'beach towel', lo: 1500, hi: 2800 },
] as const;

/** A price in cents (a multiple of 10) between lo and hi. */
export function priceIn(rng: Rng, item: { lo: number; hi: number }): number {
  return 10 * rng.int(item.lo / 10, item.hi / 10);
}

/** "a" or "an" for an item name. */
export const article = (name: string): string => (/^[aeiou]/i.test(name) ? 'an' : 'a');
