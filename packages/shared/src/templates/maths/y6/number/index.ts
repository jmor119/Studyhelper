import type { QuestionTemplate } from '../../../types';
import { templates as placeValue } from './place-value';
import { templates as squaresCubes } from './squares-cubes';
import { templates as negatives } from './negatives';
import { templates as orderOperations } from './order-operations';
import { templates as wholeNumbers } from './whole-numbers';
import { templates as division } from './division';
import { templates as decimals } from './decimals';
import { templates as fractions } from './fractions';
import { templates as fractionsOfAmounts } from './fractions-of-amounts';
import { templates as percentages } from './percentages';
import { templates as money } from './money';

// Year 6 number templates: one file per topic (named after the topic id).
export const templates: QuestionTemplate[] = [
  ...placeValue,
  ...squaresCubes,
  ...negatives,
  ...orderOperations,
  ...wholeNumbers,
  ...division,
  ...decimals,
  ...fractions,
  ...fractionsOfAmounts,
  ...percentages,
  ...money,
];
