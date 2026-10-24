import type { QuestionTemplate } from '../../types';
import { frac, poly, tex, texSigned } from '../../format';

// m9.alg.equations — solving linear equations. Each template picks the solution first, then
// builds the equation from it, so answers are always exact.

export const oneAndTwoStep: QuestionTemplate = {
  id: 'm9.alg.equations.two-step',
  topicId: 'm9.alg.equations',
  title: 'One- and two-step linear equations',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const x = rng.int(-12, 15);
    if (difficulty === 1) {
      const kind = rng.pick(['add', 'mult'] as const);
      if (kind === 'add') {
        const b = rng.nonZeroInt(-15, 15);
        const c = x + b;
        return {
          type: 'numeric',
          prompt: `Solve $${poly([[1, 'x'], [b, '']])} = ${tex(c)}$.`,
          answer: x,
          calculator: 'not-allowed',
          hints: [`Undo the ${b > 0 ? `+ ${b}` : `− ${-b}`} by doing the opposite to both sides.`],
          solution: `${b > 0 ? `Subtract ${b}` : `Add ${-b}`} on both sides:\n\n$x = ${tex(c)} ${b > 0 ? '-' : '+'} ${Math.abs(b)} = ${tex(x)}$`,
        };
      }
      const a = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -4, -5]);
      const c = a * x;
      return {
        type: 'numeric',
        prompt: `Solve $${poly([[a, 'x']])} = ${tex(c)}$.`,
        answer: x,
        calculator: 'not-allowed',
        hints: [`$${poly([[a, 'x']])}$ means ${a} × x. Undo it by dividing.`],
        solution: `Divide both sides by $${tex(a)}$:\n\n$x = ${tex(c)} \\div ${texSigned(a)} = ${tex(x)}$`,
      };
    }
    // difficulty 2: ax + b = c
    const a = rng.pick([2, 3, 4, 5, 6, 7, 8, -2, -3, -4, -5]);
    const b = rng.nonZeroInt(-20, 20);
    const c = a * x + b;
    return {
      type: 'numeric',
      prompt: `Solve $${poly([[a, 'x'], [b, '']])} = ${tex(c)}$.`,
      answer: x,
      calculator: 'not-allowed',
      hints: [
        `First undo the ${b > 0 ? `+ ${b}` : `− ${-b}`} on both sides.`,
        `Then divide both sides by $${tex(a)}$.`,
      ],
      solution: [
        `${b > 0 ? `Subtract ${b}` : `Add ${-b}`} on both sides: $${poly([[a, 'x']])} = ${tex(c - b)}$`,
        `Divide both sides by $${tex(a)}$: $x = ${tex(x)}$`,
        `Check: $${tex(a)} \\times ${texSigned(x)} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${tex(c)}$ ✓`,
      ].join('\n\n'),
    };
  },
};

export const bracketsAndBothSides: QuestionTemplate = {
  id: 'm9.alg.equations.brackets-both-sides',
  topicId: 'm9.alg.equations',
  title: 'Equations with brackets or unknowns on both sides',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const x = rng.int(-9, 12);
    if (difficulty === 3) {
      // a(x + b) = c
      const a = rng.pick([2, 3, 4, 5, 6, -2, -3]);
      const b = rng.nonZeroInt(-9, 9);
      const c = a * (x + b);
      return {
        type: 'numeric',
        prompt: `Solve $${tex(a)}(${poly([[1, 'x'], [b, '']])}) = ${tex(c)}$.`,
        answer: x,
        calculator: 'not-allowed',
        hints: [
          `You can divide both sides by $${tex(a)}$ first, or expand the bracket.`,
          `Dividing by $${tex(a)}$ gives $${poly([[1, 'x'], [b, '']])} = ${tex(c / a)}$.`,
        ],
        solution: [
          `Divide both sides by $${tex(a)}$: $${poly([[1, 'x'], [b, '']])} = ${tex(x + b)}$`,
          `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $x = ${tex(x)}$`,
        ].join('\n\n'),
      };
    }
    // difficulty 4: ax + b = cx + d, a ≠ c
    let a = rng.int(2, 9);
    let c = rng.int(-5, 8);
    if (a === c) c = a - 1;
    if (rng.chance(0.3)) [a, c] = [c === 0 ? -1 : c, a];
    const b = rng.nonZeroInt(-15, 15);
    const d = a * x + b - c * x;
    const left = poly([[a, 'x'], [b, '']]);
    const right = poly([[c, 'x'], [d, '']]);
    const diff = a - c;
    return {
      type: 'numeric',
      prompt: `Solve $${left} = ${right}$.`,
      answer: x,
      calculator: 'not-allowed',
      hints: [
        `Get all the $x$ terms on one side: ${c >= 0 ? `subtract $${poly([[c, 'x']])}$` : `add $${poly([[-c, 'x']])}$`} from both sides.`,
        'Then collect the numbers on the other side and divide.',
      ],
      solution: [
        `${c >= 0 ? `Subtract $${poly([[c, 'x']])}$` : `Add $${poly([[-c, 'x']])}$`} on both sides: $${poly([[diff, 'x'], [b, '']])} = ${tex(d)}$`,
        `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $${poly([[diff, 'x']])} = ${tex(d - b)}$`,
        `Divide by $${tex(diff)}$: $x = ${tex(x)}$`,
      ].join('\n\n'),
    };
  },
};

export const fractionEquations: QuestionTemplate = {
  id: 'm9.alg.equations.fractions',
  topicId: 'm9.alg.equations',
  title: 'Equations with fractions (rational coefficients)',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 4) {
      // (x + a) / b = c  → x = bc − a
      const b = rng.pick([2, 3, 4, 5, 6]);
      const cVal = rng.int(-6, 9);
      const a = rng.nonZeroInt(-9, 9);
      const x = b * cVal - a;
      return {
        type: 'numeric',
        prompt: `Solve $\\dfrac{${poly([[1, 'x'], [a, '']])}}{${b}} = ${tex(cVal)}$.`,
        answer: x,
        calculator: 'not-allowed',
        hints: [`Multiply both sides by ${b} to clear the fraction.`],
        solution: [
          `Multiply both sides by ${b}: $${poly([[1, 'x'], [a, '']])} = ${tex(b * cVal)}$`,
          `${a > 0 ? `Subtract ${a}` : `Add ${-a}`}: $x = ${tex(x)}$`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: (p/q)x + r = s with a fractional solution
    const q = rng.pick([2, 3, 4, 5]);
    let p = rng.pick([1, 2, 3, 4, 5, 7]);
    if (p % q === 0) p += 1;
    const r = rng.nonZeroInt(-8, 8);
    const s = rng.int(-10, 12);
    // x = q(s − r)/p
    const num = q * (s - r);
    const answer = num / p;
    return {
      type: 'numeric',
      prompt: `Solve $${frac(p, q, true)}x ${r > 0 ? '+' : '-'} ${Math.abs(r)} = ${tex(s)}$.\n\nGive your answer as a fraction or a decimal.`,
      answer,
      decimals: Number.isInteger(answer * 100) ? undefined : 2,
      calculator: 'not-allowed',
      hints: [
        `First ${r > 0 ? `subtract ${r}` : `add ${-r}`} on both sides.`,
        `To undo multiplying by $${frac(p, q, true)}$, multiply by its reciprocal $${frac(q, p, true)}$.`,
      ],
      solution: [
        `${r > 0 ? `Subtract ${r}` : `Add ${-r}`}: $${frac(p, q, true)}x = ${tex(s - r)}$`,
        `Multiply both sides by $${frac(q, p, true)}$: $x = ${tex(s - r)} \\times ${frac(q, p, true)} = ${frac(num, p)}$`,
      ].join('\n\n'),
    };
  },
};
