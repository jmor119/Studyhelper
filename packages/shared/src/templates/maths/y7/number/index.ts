import type { QuestionTemplate } from '../../../types';
import { templates as placeValue } from './place-value';
import { templates as powersRoots } from './powers-roots';
import { templates as primesFactors } from './primes-factors';
import { templates as integers } from './integers';
import { templates as orderOperations } from './order-operations';
import { templates as multiplyDivide } from './multiply-divide';
import { templates as fractions } from './fractions';
import { templates as fractionOperations } from './fraction-operations';
import { templates as decimals } from './decimals';
import { templates as percentages } from './percentages';
import { templates as proportion } from './proportion';
import { templates as money } from './money';

// Year 7 number templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...placeValue,
  ...powersRoots,
  ...primesFactors,
  ...integers,
  ...orderOperations,
  ...multiplyDivide,
  ...fractions,
  ...fractionOperations,
  ...decimals,
  ...percentages,
  ...proportion,
  ...money,
];
