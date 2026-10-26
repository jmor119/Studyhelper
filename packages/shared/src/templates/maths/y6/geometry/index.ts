import type { QuestionTemplate } from '../../../types';
import { templates as shapes } from './shapes';
import { templates as transformations } from './transformations';
import { templates as maps } from './maps';

// Year 6 geometry templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...shapes,
  ...transformations,
  ...maps,
];
