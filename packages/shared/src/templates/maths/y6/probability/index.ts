import type { QuestionTemplate } from '../../../types';
import { templates as chance } from './chance';

// Year 6 probability templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...chance,
];
