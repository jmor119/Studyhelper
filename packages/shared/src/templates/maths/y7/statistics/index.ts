import type { QuestionTemplate } from '../../../types';
import { templates as averages } from './averages';
import { templates as graphs } from './graphs';
import { templates as interpreting } from './interpreting';

// Year 7 statistics templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...averages,
  ...graphs,
  ...interpreting,
];
