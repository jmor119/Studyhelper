import type { QuestionTemplate } from '../../../types';
import { templates as units } from './units';
import { templates as areaVolume } from './area-volume';
import { templates as angles } from './angles';
import { templates as time } from './time';

// Year 6 measurement templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...units,
  ...areaVolume,
  ...angles,
  ...time,
];
