import type { QuestionTemplate } from '../../../types';
import { templates as notation } from './notation';
import { templates as substitution } from './substitution';
import { templates as equations } from './equations';
import { templates as linearPatterns } from './linear-patterns';

// Year 7 algebra templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...notation,
  ...substitution,
  ...equations,
  ...linearPatterns,
];
