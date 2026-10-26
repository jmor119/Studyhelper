import type { Rng } from '../../../../rng';
import { num, round, tex } from '../../../format';

// Small helpers shared by the Year 7 templates for order of operations, multiplying and dividing,
// money and proportion. Copied locally so these files don't depend on other topics' helpers.

/** Money in prose (escaped for Markdown): 4.5 → "\$4.50", 20 → "\$20". */
export function cash(x: number): string {
  const v = round(x, 2);
  const abs = Math.abs(v);
  const body = Number.isInteger(abs) ? num(abs) : num(abs, 2);
  return `${v < 0 ? '−' : ''}\\$${body}`;
}

/** Money in prose, always with cents: 20 → "\$20.00". */
export function cents(x: number): string {
  const v = round(x, 2);
  return `${v < 0 ? '−' : ''}\\$${num(Math.abs(v), 2)}`;
}

/** Money as a number inside KaTeX, always with cents: 4.5 → "4.50". */
export function texMoney(x: number): string {
  return tex(round(x, 2), 2);
}

/** Money inside KaTeX: whole dollars plainly, otherwise with cents (20 → "20", 4.5 → "4.50"). */
export function texCash(x: number): string {
  const v = round(x, 2);
  return Number.isInteger(v) ? tex(v) : tex(v, 2);
}

/** Integer cents → dollars without floating-point noise. */
export function dollars(c: number): number {
  return Math.round(c) / 100;
}

/** Capitalises the first letter. */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "1 bus" / "3 buses" style plurals. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
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
