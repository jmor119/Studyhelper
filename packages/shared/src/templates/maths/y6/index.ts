import type { QuestionTemplate } from '../../types';
import { templates as number } from './number';
import { templates as algebra } from './algebra';
import { templates as measurement } from './measurement';
import { templates as geometry } from './geometry';
import { templates as statistics } from './statistics';
import { templates as probability } from './probability';

// All Year 6 maths templates.
export const templates: QuestionTemplate[] = [...number, ...algebra, ...measurement, ...geometry, ...statistics, ...probability];
