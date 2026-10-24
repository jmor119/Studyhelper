import type { MarkResult, Question, QuestionOfType, QuestionResponse } from '../questions/schema';
import { describeAnswer } from '../questions/split';
import {
  areEquivalent,
  ExpressionError,
  isExpanded,
  isFactorised,
  isSimplified,
  parseExpression,
} from './expression';
import { isSimplestFraction, normaliseUnit, parseNumber } from './numeric';
import { containsKeyword, textMatches } from './text';

function result(q: Question, score: number, extra: Partial<MarkResult> = {}): MarkResult {
  const clamped = Math.max(0, Math.min(1, score));
  return {
    correct: clamped >= 0.999,
    score: clamped,
    marksAwarded: Math.round(clamped * q.marks * 2) / 2,
    marksAvailable: q.marks,
    expected: describeAnswer(q),
    ...extra,
  };
}

function invalid(q: Question, feedback: string): MarkResult {
  return { ...result(q, 0), invalid: true, feedback };
}

function markNumeric(q: QuestionOfType<'numeric'>, value: string): MarkResult {
  const parsed = parseNumber(value);
  if (!parsed.ok) {
    return invalid(
      q,
      parsed.reason === 'empty' ? 'Enter an answer.' : 'Enter a single number (fractions like 3/4 are fine).',
    );
  }
  let v = parsed.value;
  const expectsPercent = q.units === '%';
  if (parsed.percent && !expectsPercent) v /= 100;

  const tolerance =
    q.tolerance ?? (q.decimals !== undefined ? 0.5 * 10 ** -q.decimals + 1e-9 : 1e-9 * Math.max(1, Math.abs(q.answer)));
  const targets = [q.answer, ...(q.alternatives ?? [])];
  const close = targets.some((t) => Math.abs(v - t) <= tolerance);

  // Units: only judge them when the question names a unit and the student typed one.
  if (close && parsed.unit && q.units && q.units !== '$' && q.units !== '%') {
    if (normaliseUnit(parsed.unit) !== normaliseUnit(q.units)) {
      return result(q, 0, { feedback: `Check your units — the answer should be in ${q.units}.` });
    }
  }

  if (!close) {
    // A common slip: right digits, wrong rounding.
    const dp = q.decimals;
    if (dp !== undefined && targets.some((t) => Math.abs(v - t) <= 10 ** -dp * 1.01)) {
      return result(q, 0, { feedback: `Nearly — check your rounding to ${dp} decimal place${dp === 1 ? '' : 's'}.` });
    }
    return result(q, 0);
  }

  // Form requirements.
  switch (q.form) {
    case 'integer':
      if (parsed.kind !== 'integer') return result(q, 0.5, { feedback: 'Give your answer as a whole number.' });
      break;
    case 'decimal':
      if (parsed.kind === 'fraction' || parsed.kind === 'mixed') {
        return result(q, 0.5, { feedback: 'Give your answer as a decimal.' });
      }
      break;
    case 'fraction':
    case 'simplest-fraction':
    case 'mixed': {
      const isWhole = Number.isInteger(q.answer);
      if (parsed.kind === 'integer' && isWhole) break;
      if (q.form === 'mixed' && parsed.kind !== 'mixed' && Math.abs(q.answer) > 1) {
        return result(q, 0.5, { feedback: 'Give your answer as a mixed number, e.g. 2 1/3.' });
      }
      if (!parsed.fraction) return result(q, 0.5, { feedback: 'Give your answer as a fraction.' });
      if (q.form !== 'fraction' && !isSimplestFraction(parsed.fraction.num, parsed.fraction.den)) {
        return result(q, 0.5, { feedback: 'Correct value — but simplify your fraction fully.' });
      }
      break;
    }
    default:
      break;
  }

  const feedback =
    q.decimals !== undefined && parsed.decimalPlaces > q.decimals
      ? `Correct — remember to round to ${q.decimals} decimal place${q.decimals === 1 ? '' : 's'}.`
      : undefined;
  return result(q, 1, feedback ? { feedback } : {});
}

function markExpression(q: QuestionOfType<'expression'>, value: string): MarkResult {
  let student;
  try {
    student = parseExpression(value, q.variables);
  } catch (e) {
    return invalid(q, e instanceof ExpressionError ? e.message : "That expression couldn't be read.");
  }
  const model = parseExpression(q.answer, q.variables);
  const matches =
    areEquivalent(student, model, q.variables) ||
    (q.alternatives ?? []).some((alt) => areEquivalent(student, parseExpression(alt, q.variables), q.variables));
  if (!matches) return result(q, 0);

  switch (q.form) {
    case 'expanded':
      if (!isExpanded(student)) return result(q, 0.5, { feedback: 'Equivalent, but expand the brackets fully.' });
      break;
    case 'factorised':
      if (!isFactorised(student)) return result(q, 0.5, { feedback: 'Equivalent, but write it in factorised form.' });
      break;
    case 'simplified':
      if (!isSimplified(student, model)) return result(q, 0.5, { feedback: 'Equivalent, but simplify further.' });
      break;
    default:
      break;
  }
  return result(q, 1);
}

function markText(q: QuestionOfType<'text'>, value: string): MarkResult {
  if (!value.trim()) return invalid(q, 'Enter an answer.');
  if (q.accepted.some((a) => textMatches(value, a, q.allowTypos))) return result(q, 1);
  if (q.keywords) {
    const all = q.keywords.all ?? [];
    const any = q.keywords.any ?? [];
    const allOk = all.every((k) => containsKeyword(value, k, q.allowTypos));
    const anyOk = !any.length || any.some((k) => containsKeyword(value, k, q.allowTypos));
    if (all.length + any.length > 0 && allOk && anyOk) return result(q, 1);
  }
  return result(q, 0, q.aiMark ? { needsReview: true } : {});
}

export function markResponse(q: Question, response: QuestionResponse): MarkResult {
  if (q.type !== response.type) return invalid(q, 'Answer type does not match the question.');

  switch (q.type) {
    case 'mcq': {
      const r = response as Extract<QuestionResponse, { type: 'mcq' }>;
      const ok = r.optionId === q.correct;
      const feedback = q.feedback?.[r.optionId];
      return result(q, ok ? 1 : 0, feedback ? { feedback } : {});
    }
    case 'multi': {
      const r = response as Extract<QuestionResponse, { type: 'multi' }>;
      const chosen = new Set(r.optionIds);
      const details: Record<string, boolean> = {};
      let right = 0;
      let wrong = 0;
      for (const o of q.options) {
        const should = q.correct.includes(o.id);
        const did = chosen.has(o.id);
        if (did) details[o.id] = should;
        if (did && should) right++;
        if (did && !should) wrong++;
      }
      const exact = right === q.correct.length && wrong === 0;
      const score = exact ? 1 : Math.max(0, (right - wrong) / q.correct.length) * 0.99;
      return result(q, score, { details });
    }
    case 'numeric':
      return markNumeric(q, (response as Extract<QuestionResponse, { type: 'numeric' }>).value);
    case 'expression':
      return markExpression(q, (response as Extract<QuestionResponse, { type: 'expression' }>).value);
    case 'text':
      return markText(q, (response as Extract<QuestionResponse, { type: 'text' }>).value);
    case 'cloze': {
      const r = response as Extract<QuestionResponse, { type: 'cloze' }>;
      const details: Record<string, boolean> = {};
      for (const b of q.blanks) {
        const given = r.values[b.id] ?? '';
        details[b.id] = b.options
          ? b.accepted.some((a) => a === given)
          : b.accepted.some((a) => textMatches(given, a, q.allowTypos));
      }
      const right = Object.values(details).filter(Boolean).length;
      return result(q, right / q.blanks.length, { details });
    }
    case 'order': {
      const r = response as Extract<QuestionResponse, { type: 'order' }>;
      const details: Record<string, boolean> = {};
      q.items.forEach((item, i) => {
        details[item.id] = r.order[i] === item.id;
      });
      const right = Object.values(details).filter(Boolean).length;
      return result(q, right === q.items.length ? 1 : (right / q.items.length) * 0.99, { details });
    }
    case 'match': {
      const r = response as Extract<QuestionResponse, { type: 'match' }>;
      const details: Record<string, boolean> = {};
      for (const p of q.pairs) details[p.left.id] = r.pairs[p.left.id] === p.right.id;
      const right = Object.values(details).filter(Boolean).length;
      return result(q, right / q.pairs.length, { details });
    }
    case 'extended': {
      const r = response as Extract<QuestionResponse, { type: 'extended' }>;
      if (!r.value.trim()) return invalid(q, 'Write your answer first.');
      // Extended answers are marked by the AI (if a key is available) or self-marked against the model answer.
      return { ...result(q, 0), correct: false, needsReview: true };
    }
  }
}

/** Score for a self-marked or AI-marked extended answer, given marks awarded against the rubric. */
export function markFromRubric(q: Question, marksAwarded: number, feedback?: string): MarkResult {
  const score = q.marks ? marksAwarded / q.marks : 0;
  return result(q, score, feedback ? { feedback } : {});
}
