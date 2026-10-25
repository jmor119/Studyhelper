import { createRng, hashString } from '../rng';
import type { QuestionSource, QuestionStatus } from '../types';
import type { Figure, Question, QuestionType } from './schema';

// What the browser is allowed to see: everything needed to render and answer a question,
// nothing that reveals the answer.

interface PublicBase {
  id: string;
  type: QuestionType;
  subject: Question['subject'];
  yearLevel: number;
  topicId: string;
  difficulty: number;
  marks: number;
  calculator?: 'allowed' | 'not-allowed';
  stem?: string;
  groupId?: string;
  part?: string;
  prompt: string;
  figure?: Figure;
  hints: string[];
  tags: string[];
  status?: QuestionStatus;
  source?: QuestionSource;
}

export interface PublicOption {
  id: string;
  text: string;
}

export type PublicQuestion =
  | (PublicBase & { type: 'mcq'; options: PublicOption[]; shuffle: boolean })
  | (PublicBase & { type: 'multi'; options: PublicOption[]; selectCount: number; shuffle: boolean })
  | (PublicBase & {
      type: 'numeric';
      units?: string;
      decimals?: number;
      form: string;
    })
  | (PublicBase & { type: 'expression'; variables: string[]; form: string })
  | (PublicBase & { type: 'text' })
  | (PublicBase & { type: 'cloze'; blanks: { id: string; options?: string[] }[] })
  | (PublicBase & { type: 'order'; items: PublicOption[] })
  | (PublicBase & { type: 'match'; left: PublicOption[]; right: PublicOption[] })
  | (PublicBase & { type: 'extended'; rubric: { criterion: string; marks: number }[] });

/** Stable shuffle seeded by the question id, guaranteed to differ from the original order. */
function stableShuffle<T>(items: readonly T[], key: string): T[] {
  if (items.length < 2) return [...items];
  const rng = createRng(hashString(key));
  for (let attempt = 0; attempt < 10; attempt++) {
    const out = rng.shuffle(items);
    if (out.some((item, i) => item !== items[i])) return out;
  }
  return [...items.slice(1), items[0]!];
}

export function toPublicQuestion(
  q: Question,
  meta: { status?: QuestionStatus; source?: QuestionSource } = {},
): PublicQuestion {
  const base: PublicBase = {
    id: q.id,
    type: q.type,
    subject: q.subject,
    yearLevel: q.yearLevel,
    topicId: q.topicId,
    difficulty: q.difficulty,
    marks: q.marks,
    prompt: q.prompt,
    hints: q.hints,
    tags: q.tags,
    ...(q.calculator && { calculator: q.calculator }),
    ...(q.stem && { stem: q.stem }),
    ...(q.groupId && { groupId: q.groupId }),
    ...(q.part && { part: q.part }),
    ...(q.figure && { figure: q.figure }),
    ...(meta.status && { status: meta.status }),
    ...(meta.source && { source: meta.source }),
  };
  switch (q.type) {
    case 'mcq':
      return { ...base, type: 'mcq', options: q.options, shuffle: q.shuffle };
    case 'multi':
      return {
        ...base,
        type: 'multi',
        options: q.options,
        selectCount: q.correct.length,
        shuffle: q.shuffle,
      };
    case 'numeric':
      return {
        ...base,
        type: 'numeric',
        form: q.form,
        ...(q.units !== undefined && { units: q.units }),
        ...(q.decimals !== undefined && { decimals: q.decimals }),
      };
    case 'expression':
      return { ...base, type: 'expression', variables: q.variables, form: q.form };
    case 'text':
      return { ...base, type: 'text' };
    case 'cloze':
      return {
        ...base,
        type: 'cloze',
        blanks: q.blanks.map((b) => (b.options ? { id: b.id, options: b.options } : { id: b.id })),
      };
    case 'order':
      return { ...base, type: 'order', items: stableShuffle(q.items, `${q.id}:order`) };
    case 'match':
      return {
        ...base,
        type: 'match',
        left: q.pairs.map((p) => p.left),
        right: stableShuffle(
          q.pairs.map((p) => p.right),
          `${q.id}:match`,
        ),
      };
    case 'extended':
      return { ...base, type: 'extended', rubric: q.rubric };
  }
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-NZ');
  return String(Number(n.toPrecision(10)));
}

/** Best rational approximation (continued fractions) with a small denominator, or null. */
function asFraction(x: number, maxDen = 1000): [number, number] | null {
  const sign = x < 0 ? -1 : 1;
  let v = Math.abs(x);
  let [h1, h0, k1, k0] = [1, 0, 0, 1];
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(v);
    [h1, h0] = [a * h1 + h0, h1];
    [k1, k0] = [a * k1 + k0, k1];
    if (k1 > maxDen) return null;
    if (Math.abs(h1 / k1 - Math.abs(x)) < 1e-9) return [sign * h1, k1];
    v = 1 / (v - a);
    if (!Number.isFinite(v)) break;
  }
  return Math.abs(h1 / k1 - Math.abs(x)) < 1e-9 ? [sign * h1, k1] : null;
}

/** Fraction-form answers display as fractions (LaTeX), e.g. 0.1 → $\frac{1}{10}$, 1.75 → $1\frac{3}{4}$. */
function fractionAnswer(value: number, mixed: boolean): string | null {
  const f = asFraction(value);
  if (!f) return null;
  const [n, d] = f;
  const neg = n < 0 ? '-' : '';
  const an = Math.abs(n);
  if (mixed && an > d) {
    const whole = Math.floor(an / d);
    const rem = an % d;
    return `$${neg}${whole}${rem ? `\\frac{${rem}}{${d}}` : ''}$`;
  }
  return `$${neg}\\frac{${an}}{${d}}$`;
}

/** A human-readable statement of the correct answer, shown after an attempt. */
export function describeAnswer(q: Question): string {
  switch (q.type) {
    case 'mcq':
      return q.options.find((o) => o.id === q.correct)?.text ?? q.correct;
    case 'multi':
      return q.options
        .filter((o) => q.correct.includes(o.id))
        .map((o) => o.text)
        .join('; ');
    case 'numeric': {
      if (['fraction', 'simplest-fraction', 'mixed'].includes(q.form) && !Number.isInteger(q.answer)) {
        const frac = fractionAnswer(q.answer, q.form === 'mixed');
        if (frac) return q.units && q.units !== '$' ? `${frac} ${q.units}` : frac;
      }
      let value = q.decimals !== undefined ? q.answer.toFixed(q.decimals) : formatNumber(q.answer);
      // Recurring decimals like 0.3333333333 read better as fractions (common in probability).
      if (q.decimals === undefined && !Number.isInteger(q.answer) && (value.split('.')[1]?.length ?? 0) > 4) {
        const frac = fractionAnswer(q.answer, false);
        if (frac) value = `${frac} (≈ ${q.answer.toFixed(3)})`;
      }
      if (!q.units) return value;
      if (q.units === '$') return `$${value}`;
      if (q.units === '°' || q.units === '%') return `${value}${q.units}`;
      return `${value} ${q.units}`;
    }
    case 'expression':
      return q.answer.replace(/\*/g, '');
    case 'text':
      return q.accepted[0]!;
    case 'cloze':
      return q.blanks.map((b) => b.accepted[0]).join(', ');
    case 'order':
      return q.items.map((i) => i.text).join(' → ');
    case 'match':
      return q.pairs.map((p) => `${p.left.text} — ${p.right.text}`).join('; ');
    case 'extended':
      return q.modelAnswer;
  }
}
