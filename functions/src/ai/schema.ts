import { QuestionSchema, type Question, type QuestionResponse, type Subject } from '@study-helper/shared';
import { z } from 'zod';

// A flat question shape for structured outputs. Every field is present (nullable or empty), which
// works with both Anthropic and OpenAI strict schemas. It's converted to — and validated as — a real
// Question afterwards.

const Option = z.object({ id: z.string(), text: z.string() });

export const FlatQuestion = z.object({
  type: z.enum(['mcq', 'multi', 'numeric', 'text', 'cloze', 'order', 'match', 'extended']),
  difficulty: z.number(),
  marks: z.number(),
  calculator: z.enum(['allowed', 'not-allowed', 'either']),
  prompt: z.string(),
  hints: z.array(z.string()),
  solution: z.string(),
  options: z.array(Option),
  correct: z.array(z.string()),
  optionFeedback: z.array(z.object({ optionId: z.string(), feedback: z.string() })),
  answerNumber: z.number().nullable(),
  decimals: z.number().nullable(),
  units: z.string().nullable(),
  accepted: z.array(z.string()),
  blanks: z.array(z.object({ id: z.string(), accepted: z.array(z.string()) })),
  items: z.array(Option),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  modelAnswer: z.string().nullable(),
  rubric: z.array(z.object({ criterion: z.string(), marks: z.number() })),
});
export type FlatQuestion = z.infer<typeof FlatQuestion>;

export const FlatQuestionList = z.object({ questions: z.array(FlatQuestion) });

export interface QuestionBase {
  id: string;
  subject: Subject;
  yearLevel: number;
  topicId: string;
}

/** Converts a flat AI question into a validated Question, or returns an error message. */
export function fromFlat(f: FlatQuestion, base: QuestionBase): { question: Question } | { error: string } {
  const common = {
    ...base,
    difficulty: Math.max(1, Math.min(5, Math.round(f.difficulty))),
    marks: Math.max(1, Math.min(6, Math.round(f.marks))),
    ...(f.calculator !== 'either' && { calculator: f.calculator }),
    prompt: f.prompt,
    hints: f.hints.slice(0, 3),
    solution: f.solution,
    tags: ['ai'],
  };
  let candidate: unknown;
  switch (f.type) {
    case 'mcq':
      candidate = {
        ...common,
        type: 'mcq',
        options: f.options,
        correct: f.correct[0],
        feedback: Object.fromEntries(f.optionFeedback.map((x) => [x.optionId, x.feedback])),
      };
      break;
    case 'multi':
      candidate = { ...common, type: 'multi', options: f.options, correct: f.correct };
      break;
    case 'numeric':
      candidate = {
        ...common,
        type: 'numeric',
        answer: f.answerNumber,
        ...(f.decimals !== null && { decimals: Math.round(f.decimals) }),
        ...(f.units && { units: f.units }),
      };
      break;
    case 'text':
      candidate = { ...common, type: 'text', accepted: f.accepted };
      break;
    case 'cloze':
      candidate = { ...common, type: 'cloze', blanks: f.blanks };
      break;
    case 'order':
      candidate = { ...common, type: 'order', items: f.items };
      break;
    case 'match':
      candidate = {
        ...common,
        type: 'match',
        pairs: f.pairs.map((p, i) => ({ left: { id: `l${i}`, text: p.left }, right: { id: `r${i}`, text: p.right } })),
      };
      break;
    case 'extended': {
      const rubric = f.rubric.map((r) => ({ criterion: r.criterion, marks: Math.max(1, Math.round(r.marks)) }));
      candidate = { ...common, type: 'extended', modelAnswer: f.modelAnswer, rubric, marks: rubric.reduce((s, r) => s + r.marks, 0) || 1 };
      break;
    }
  }
  const parsed = QuestionSchema.safeParse(candidate);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  if (parsed.data.type === 'cloze' && parsed.data.blanks.some((b) => !parsed.data.prompt.includes(`[[${b.id}]]`))) {
    return { error: 'cloze markers missing' };
  }
  return { question: parsed.data };
}

// The solver returns its answer in a flat shape too, converted to a QuestionResponse for marking.
export const SolverAnswer = z.object({
  optionIds: z.array(z.string()),
  value: z.string(),
  blanks: z.array(z.object({ id: z.string(), value: z.string() })),
  order: z.array(z.string()),
  pairs: z.array(z.object({ leftId: z.string(), rightId: z.string() })),
  problem: z.string().nullable(),
});
export type SolverAnswer = z.infer<typeof SolverAnswer>;

export function solverResponse(q: Question, a: SolverAnswer): QuestionResponse | null {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', optionId: a.optionIds[0] ?? '' };
    case 'multi':
      return { type: 'multi', optionIds: a.optionIds };
    case 'numeric':
      return { type: 'numeric', value: a.value };
    case 'expression':
      return { type: 'expression', value: a.value };
    case 'text':
      return { type: 'text', value: a.value };
    case 'cloze':
      return { type: 'cloze', values: Object.fromEntries(a.blanks.map((b) => [b.id, b.value])) };
    case 'order':
      return { type: 'order', order: a.order };
    case 'match':
      return { type: 'match', pairs: Object.fromEntries(a.pairs.map((p) => [p.leftId, p.rightId])) };
    case 'extended':
      return null;
  }
}

export const RubricMark = z.object({
  criteria: z.array(z.object({ criterion: z.string(), met: z.boolean(), marks: z.number() })),
  feedback: z.string(),
});

export const WorkingFeedback = z.object({
  readable: z.boolean(),
  methodCorrect: z.boolean(),
  whatWentWell: z.string(),
  firstError: z.string().nullable(),
  nextStep: z.string(),
});

export const NotesAnalysis = z.object({
  title: z.string(),
  summary: z.string(),
  keyTerms: z.array(z.object({ term: z.string(), definition: z.string() })),
  topicIds: z.array(z.string()),
  questions: z.array(FlatQuestion),
});
