import type { QuestionTemplate } from '../../types';
import { experimentalTemplates } from './experimental';
import { theoreticalTemplates } from './theoretical';

// Templates for the probability strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [...theoreticalTemplates, ...experimentalTemplates];
