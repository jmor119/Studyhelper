import type { QuestionTemplate } from '../../types';
import { bracketsAndBothSides, fractionEquations, oneAndTwoStep } from './equations';
import { checkSolution, formingEquations } from './equations-forming';
import { collectLikeTerms, expandBrackets, factorise } from './expressions';
import { integerSolutions, negativeInequalities, readNumberLine, solveInequality } from './inequalities';
import { interceptAndGradient, matchEquation, tableOfValues } from './linear-graphs';
import { matchstickPatterns, nextTerms, nthTermRule, useRule } from './patterns';
import { evaluateExpressions, formulas, rearrangeFormulas } from './substitution';

// Templates for the algebra strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [
  // m9.alg.expressions
  collectLikeTerms,
  expandBrackets,
  factorise,
  // m9.alg.substitution
  evaluateExpressions,
  formulas,
  rearrangeFormulas,
  // m9.alg.equations
  oneAndTwoStep,
  bracketsAndBothSides,
  fractionEquations,
  formingEquations,
  checkSolution,
  // m9.alg.inequalities
  readNumberLine,
  solveInequality,
  negativeInequalities,
  integerSolutions,
  // m9.alg.patterns
  nextTerms,
  nthTermRule,
  useRule,
  matchstickPatterns,
  // m9.alg.linear-graphs
  tableOfValues,
  interceptAndGradient,
  matchEquation,
];
