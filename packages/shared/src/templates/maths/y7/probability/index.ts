import type { QuestionTemplate } from '../../../types';
import { templates as theoretical } from './theoretical';
import { templates as experimental } from './experimental';

// Year 7 probability templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...theoretical,
  ...experimental,
];
