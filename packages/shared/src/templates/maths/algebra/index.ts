import type { QuestionTemplate } from '../../types';
import { bracketsAndBothSides, fractionEquations, oneAndTwoStep } from './equations';

// Templates for the algebra strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [oneAndTwoStep, bracketsAndBothSides, fractionEquations];
