import type { QuestionTemplate } from '../../types';
import { checkRightAngle, hypotenuse } from './pythagoras';

// Templates for the measurement strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [hypotenuse, checkRightAngle];
