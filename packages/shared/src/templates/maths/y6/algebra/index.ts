import type { QuestionTemplate } from '../../../types';
import { templates as numberSentences } from './number-sentences';
import { templates as patterns } from './patterns';
import { templates as coordinates } from './coordinates';

// Year 6 algebra templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...numberSentences,
  ...patterns,
  ...coordinates,
];
