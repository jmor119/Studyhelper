import type { QuestionTemplate } from '../../../types';
import { templates as unitsTime } from './units-time';
import { templates as perimeterArea } from './perimeter-area';
import { templates as volume } from './volume';

// Year 7 measurement templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...unitsTime,
  ...perimeterArea,
  ...volume,
];
