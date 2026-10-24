import type { QuestionTemplate } from '../../types';
import { negativeSquares, orderOfOperations, signedArithmetic } from './integers';

// Templates for the number strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [signedArithmetic, orderOfOperations, negativeSquares];
