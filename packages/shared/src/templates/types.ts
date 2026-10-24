import type { Rng } from '../rng';
import type { QuestionInput } from '../questions/schema';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What a template's generate() returns: a full question minus the fields the registry fills in. */
export type TemplateOutput = DistributiveOmit<
  QuestionInput,
  'id' | 'subject' | 'yearLevel' | 'topicId' | 'difficulty'
>;

export interface TemplateContext {
  rng: Rng;
  /** 1 (warm-up) … 5 (challenge). Only values listed in `difficulties` are requested. */
  difficulty: number;
}

/**
 * A parameterised question generator. The answer is computed by code from the random
 * parameters, so every instance is correct by construction.
 */
export interface QuestionTemplate {
  /** Unique, e.g. "m9.alg.equations.two-step". Lowercase, dots and dashes only. */
  id: string;
  topicId: string;
  /** Short description for admin/debug views. */
  title: string;
  difficulties: readonly number[];
  /** Rough number of distinct questions it can produce, if fewer than 20 (e.g. a conceptual MCQ). */
  variety?: number;
  generate(ctx: TemplateContext): TemplateOutput;
}
