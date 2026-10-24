import type { Question, QuestionResponse } from '../questions/schema';
import { gcd } from '../templates/format';

/** Approximates a decimal as a fraction (continued fractions), for building fraction-form answers. */
function toFraction(x: number, maxDen = 10_000): [number, number] {
  const sign = x < 0 ? -1 : 1;
  let v = Math.abs(x);
  let [h1, h0, k1, k0] = [1, 0, 0, 1];
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(v);
    [h1, h0] = [a * h1 + h0, h1];
    [k1, k0] = [a * k1 + k0, k1];
    if (k1 > maxDen) break;
    if (Math.abs(h1 / k1 - Math.abs(x)) < 1e-12) break;
    v = 1 / (v - a);
    if (!Number.isFinite(v)) break;
  }
  const g = gcd(h1, k1) || 1;
  return [(sign * h1) / g, k1 / g];
}

/** The response a student would give if they answered perfectly. Used by tests and content validation. */
export function correctResponseFor(q: Question): QuestionResponse | null {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', optionId: q.correct };
    case 'multi':
      return { type: 'multi', optionIds: q.correct };
    case 'numeric': {
      if (['fraction', 'simplest-fraction', 'mixed'].includes(q.form) && !Number.isInteger(q.answer)) {
        const [n, d] = toFraction(q.answer);
        if (q.form === 'mixed' && Math.abs(n) > d) {
          const whole = Math.trunc(Math.abs(n) / d);
          const rem = Math.abs(n) % d;
          return { type: 'numeric', value: `${n < 0 ? '-' : ''}${whole} ${rem}/${d}` };
        }
        return { type: 'numeric', value: `${n}/${d}` };
      }
      const value = q.decimals !== undefined ? q.answer.toFixed(q.decimals) : String(q.answer);
      return { type: 'numeric', value: q.units === '%' ? `${value}%` : value };
    }
    case 'expression':
      return { type: 'expression', value: q.answer };
    case 'text':
      return { type: 'text', value: q.accepted[0]! };
    case 'cloze':
      return { type: 'cloze', values: Object.fromEntries(q.blanks.map((b) => [b.id, b.accepted[0]!])) };
    case 'order':
      return { type: 'order', order: q.items.map((i) => i.id) };
    case 'match':
      return { type: 'match', pairs: Object.fromEntries(q.pairs.map((p) => [p.left.id, p.right.id])) };
    case 'extended':
      return null;
  }
}

/** A response that should be marked wrong, to check marking isn't accepting everything. */
export function wrongResponseFor(q: Question): QuestionResponse | null {
  switch (q.type) {
    case 'mcq': {
      const other = q.options.find((o) => o.id !== q.correct);
      return other ? { type: 'mcq', optionId: other.id } : null;
    }
    case 'numeric': {
      const delta = Math.max(1, Math.abs(q.answer) * 0.5);
      return { type: 'numeric', value: String(q.answer + delta) };
    }
    case 'expression':
      return { type: 'expression', value: `${q.answer} + 1` };
    case 'text':
      return { type: 'text', value: 'zzqx not an answer' };
    default:
      return null;
  }
}
