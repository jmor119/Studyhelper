import type { QuestionTemplate } from '../../../types';
import { templates as triangles } from './triangles';
import { templates as angles } from './angles';
import { templates as polygons } from './polygons';
import { templates as transformations } from './transformations';
import { templates as nets } from './nets';
import { templates as position } from './position';

// Year 7 geometry templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...triangles,
  ...angles,
  ...polygons,
  ...transformations,
  ...nets,
  ...position,
];
