import type { QuestionTemplate } from '../../../types';
import { templates as meanRange } from './mean-range';
import { templates as graphs } from './graphs';

// Year 6 statistics templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...meanRange,
  ...graphs,
];
