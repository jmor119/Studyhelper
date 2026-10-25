import type { QuestionTemplate } from '../../types';
import { negativeSquares, orderOfOperations, signedArithmetic } from './integers';
import { fractionBar, integerContexts, reciprocals } from './integers-extra';
import { addSubtract, equivalentSimplify, multiplyDivide } from './fractions';
import { decimalOperations, estimation, knownFact, remainders, rounding } from './decimals';
import { betweenAndRecurring, convertFdp, numberLine, orderFdp } from './fdp';
import { evaluatePowers, scientificNotation, squareRoots } from './powers';
import { expressAsPercentage, percentageChange, percentOfAmount, reversePercentage } from './percentages';
import { rates, shareInRatio, simplifyRatios } from './ratios';
import { discountMarkup, gst, simpleInterest, wages } from './financial';

// Templates for the number strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [
  // m9.num.integers
  signedArithmetic,
  orderOfOperations,
  negativeSquares,
  reciprocals,
  integerContexts,
  fractionBar,
  // m9.num.fractions
  equivalentSimplify,
  addSubtract,
  multiplyDivide,
  // m9.num.decimals
  decimalOperations,
  knownFact,
  rounding,
  remainders,
  estimation,
  // m9.num.fdp
  convertFdp,
  numberLine,
  orderFdp,
  betweenAndRecurring,
  // m9.num.powers
  evaluatePowers,
  squareRoots,
  scientificNotation,
  // m9.num.percentages
  percentOfAmount,
  expressAsPercentage,
  percentageChange,
  reversePercentage,
  // m9.num.ratios-rates
  simplifyRatios,
  shareInRatio,
  rates,
  // m9.num.financial
  discountMarkup,
  gst,
  simpleInterest,
  wages,
];
