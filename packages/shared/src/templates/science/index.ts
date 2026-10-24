import type { QuestionTemplate } from '../types';
import { templates as biology } from './biology';
import { templates as chemistry } from './chemistry';
import { templates as physics } from './physics';

// Calculation templates for science topics (speed, density, F = ma, magnification, …).
export const templates: QuestionTemplate[] = [...physics, ...chemistry, ...biology];
