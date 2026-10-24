import { z } from 'zod';
import { SUBJECTS } from '../types';

// Full question definitions (including answers). Only Cloud Functions and seed tooling see these;
// the browser receives `PublicQuestion` (see split.ts).

export const QUESTION_TYPES = [
  'mcq',
  'multi',
  'numeric',
  'expression',
  'text',
  'cloze',
  'order',
  'match',
  'extended',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9._~:-]{2,120}$/, 'lowercase letters, digits, . _ ~ : - only');
const markdown = z.string().min(1);

export const FigureSchema = z.object({
  /** Inline SVG markup. Rendered via <img src="data:…"> so scripts never run. */
  svg: z.string().min(20).max(60_000),
  alt: z.string().min(3),
  caption: z.string().optional(),
});
export type Figure = z.infer<typeof FigureSchema>;

const OptionSchema = z.object({ id: z.string().min(1).max(20), text: markdown });

const base = {
  id,
  subject: z.enum(SUBJECTS),
  yearLevel: z.number().int().min(1).max(13),
  topicId: z.string().min(3),
  difficulty: z.number().int().min(1).max(5),
  marks: z.number().int().min(1).max(12).default(1),
  /** undefined = calculator optional. */
  calculator: z.enum(['allowed', 'not-allowed']).optional(),
  /** Shared context for a multi-part question; repeated on each part. */
  stem: markdown.optional(),
  groupId: z.string().optional(),
  part: z.string().max(4).optional(),
  prompt: markdown,
  figure: FigureSchema.optional(),
  hints: z.array(markdown).max(4).default([]),
  /** Worked solution shown after an attempt. */
  solution: markdown,
  tags: z.array(z.string()).default([]),
};

export const McqSchema = z.object({
  ...base,
  type: z.literal('mcq'),
  options: z.array(OptionSchema).min(2).max(6),
  correct: z.string(),
  /** Optional per-option feedback explaining a misconception. */
  feedback: z.record(z.string(), z.string()).optional(),
  shuffle: z.boolean().default(true),
});

export const MultiSchema = z.object({
  ...base,
  type: z.literal('multi'),
  options: z.array(OptionSchema).min(3).max(8),
  correct: z.array(z.string()).min(1),
  shuffle: z.boolean().default(true),
});

export const NUMERIC_FORMS = ['any', 'integer', 'decimal', 'fraction', 'simplest-fraction', 'mixed'] as const;

export const NumericSchema = z.object({
  ...base,
  type: z.literal('numeric'),
  answer: z.number().refine(Number.isFinite, 'answer must be finite'),
  /** Other acceptable values (e.g. both roots). */
  alternatives: z.array(z.number()).optional(),
  /** Absolute tolerance. Defaults to half a unit in the last place when `decimals` is set. */
  tolerance: z.number().nonnegative().optional(),
  /** Expected rounding, e.g. 2 for "give your answer to 2 decimal places". */
  decimals: z.number().int().min(0).max(6).optional(),
  /** Unit shown after the input, e.g. "cm²", "$", "%". */
  units: z.string().max(12).optional(),
  form: z.enum(NUMERIC_FORMS).default('any'),
});

export const ExpressionSchema = z.object({
  ...base,
  type: z.literal('expression'),
  /** Correct expression in mathjs syntax, e.g. "3*x + 6". */
  answer: z.string().min(1),
  variables: z.array(z.string().regex(/^[a-z]$/)).min(1).max(3),
  form: z.enum(['any', 'expanded', 'factorised', 'simplified']).default('any'),
  /** Accepted equivalent answers that should also count (rarely needed). */
  alternatives: z.array(z.string()).optional(),
});

export const TextSchema = z.object({
  ...base,
  type: z.literal('text'),
  accepted: z.array(z.string().min(1)).min(1),
  /** Alternative to exact matches: every `all` keyword (and at least one `any`) must appear. */
  keywords: z
    .object({ all: z.array(z.string()).optional(), any: z.array(z.string()).optional() })
    .optional(),
  allowTypos: z.boolean().default(true),
  /** Ask the AI to mark when no rule matches (needs an AI key). */
  aiMark: z.boolean().default(false),
});

export const ClozeSchema = z.object({
  ...base,
  type: z.literal('cloze'),
  /** The prompt contains [[blankId]] markers. */
  blanks: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9]+$/),
        accepted: z.array(z.string().min(1)).min(1),
        /** If given, the blank is a dropdown. */
        options: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  allowTypos: z.boolean().default(true),
});

export const OrderSchema = z.object({
  ...base,
  type: z.literal('order'),
  /** Items in the CORRECT order; shown shuffled. */
  items: z.array(OptionSchema).min(3).max(8),
});

export const MatchSchema = z.object({
  ...base,
  type: z.literal('match'),
  pairs: z
    .array(z.object({ left: OptionSchema, right: OptionSchema }))
    .min(3)
    .max(8),
});

export const ExtendedSchema = z.object({
  ...base,
  type: z.literal('extended'),
  modelAnswer: markdown,
  rubric: z.array(z.object({ criterion: z.string().min(3), marks: z.number().int().min(1) })).min(1),
});

export const QuestionSchema = z.discriminatedUnion('type', [
  McqSchema,
  MultiSchema,
  NumericSchema,
  ExpressionSchema,
  TextSchema,
  ClozeSchema,
  OrderSchema,
  MatchSchema,
  ExtendedSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionInput = z.input<typeof QuestionSchema>;
export type QuestionOfType<T extends QuestionType> = Extract<Question, { type: T }>;

// ---- Student responses ----

export const ResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), optionId: z.string().max(20) }),
  z.object({ type: z.literal('multi'), optionIds: z.array(z.string().max(20)).max(8) }),
  z.object({ type: z.literal('numeric'), value: z.string().max(80) }),
  z.object({ type: z.literal('expression'), value: z.string().max(300) }),
  z.object({ type: z.literal('text'), value: z.string().max(600) }),
  z.object({ type: z.literal('cloze'), values: z.record(z.string(), z.string().max(120)) }),
  z.object({ type: z.literal('order'), order: z.array(z.string().max(20)).max(8) }),
  z.object({ type: z.literal('match'), pairs: z.record(z.string(), z.string().max(20)) }),
  z.object({ type: z.literal('extended'), value: z.string().max(4000) }),
]);
export type QuestionResponse = z.infer<typeof ResponseSchema>;

export interface MarkResult {
  correct: boolean;
  /** 0–1. Partial credit for multi-part types. */
  score: number;
  marksAwarded: number;
  marksAvailable: number;
  /** Short feedback for the student (e.g. a misconception note or "check your units"). */
  feedback?: string;
  /** Per-blank / per-pair / per-option correctness. */
  details?: Record<string, boolean>;
  /** Human-readable correct answer. */
  expected?: string;
  /** Extended answers that need AI or self-marking. */
  needsReview?: boolean;
  /** The response couldn't be understood (e.g. not a number) — don't count it as wrong. */
  invalid?: boolean;
}
