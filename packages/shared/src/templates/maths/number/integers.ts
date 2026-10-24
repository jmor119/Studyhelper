import type { QuestionTemplate } from '../../types';
import { tex, texSigned } from '../../format';

// m9.num.integers — operations with negative numbers and the order of operations (GEMA).

export const signedArithmetic: QuestionTemplate = {
  id: 'm9.num.integers.signed-arithmetic',
  topicId: 'm9.num.integers',
  title: 'Add, subtract, multiply and divide integers',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const a = rng.nonZeroInt(-20, 20);
      const b = rng.nonZeroInt(-20, 20);
      const op = rng.pick(['+', '-'] as const);
      const answer = op === '+' ? a + b : a - b;
      const rewritten =
        op === '-' && b < 0
          ? `Subtracting a negative is the same as adding: $${tex(a)} - (${tex(b)}) = ${tex(a)} + ${tex(-b)}$.`
          : op === '+' && b < 0
            ? `Adding a negative is the same as subtracting: $${tex(a)} + (${tex(b)}) = ${tex(a)} - ${tex(-b)}$.`
            : `Count along the number line from $${tex(a)}$.`;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(a)} ${op} ${texSigned(b)}$.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Think of a number line: adding moves right, subtracting moves left.',
          op === '-' && b < 0 ? 'Two negatives side by side, "− (−)", become a plus.' : 'Check the sign of each number carefully.',
        ],
        solution: `${rewritten}\n\n$${tex(a)} ${op} ${texSigned(b)} = ${tex(answer)}$`,
      };
    }
    // difficulty 2: multiplication and division
    const a = rng.nonZeroInt(-12, 12);
    const b = rng.nonZeroInt(-12, 12);
    if (rng.chance(0.5)) {
      const answer = a * b;
      const rule = (a < 0) === (b < 0) ? 'same signs give a positive' : 'different signs give a negative';
      return {
        type: 'numeric',
        prompt: `Work out $${tex(a)} \\times ${texSigned(b)}$.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Multiply the numbers without signs first.', 'Same signs → positive answer; different signs → negative answer.'],
        solution: `$${Math.abs(a)} \\times ${Math.abs(b)} = ${Math.abs(answer)}$, and ${rule}.\n\nSo $${tex(a)} \\times ${texSigned(b)} = ${tex(answer)}$.`,
      };
    }
    const product = a * b;
    const rule = (product < 0) === (b < 0) ? 'same signs give a positive' : 'different signs give a negative';
    return {
      type: 'numeric',
      prompt: `Work out $${tex(product)} \\div ${texSigned(b)}$.`,
      answer: a,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Divide the numbers without signs first.', 'The sign rules for dividing are the same as for multiplying.'],
      solution: `$${Math.abs(product)} \\div ${Math.abs(b)} = ${Math.abs(a)}$, and ${rule}.\n\nSo $${tex(product)} \\div ${texSigned(b)} = ${tex(a)}$.`,
    };
  },
};

export const orderOfOperations: QuestionTemplate = {
  id: 'm9.num.integers.order-of-operations',
  topicId: 'm9.num.integers',
  title: 'Order of operations with integers (GEMA)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      // a ± b × c
      const a = rng.int(-15, 20);
      const b = rng.nonZeroInt(-9, 9);
      const c = rng.nonZeroInt(-9, 9);
      const op = rng.pick(['+', '-'] as const);
      const product = b * c;
      const answer = op === '+' ? a + product : a - product;
      return {
        type: 'numeric',
        prompt: `Work out $${tex(a)} ${op} ${texSigned(b)} \\times ${texSigned(c)}$.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['GEMA: multiplication comes before addition and subtraction.', `Start with $${texSigned(b)} \\times ${texSigned(c)}$.`],
        solution: `Multiply first: $${texSigned(b)} \\times ${texSigned(c)} = ${tex(product)}$.\n\nThen $${tex(a)} ${op} ${texSigned(product)} = ${tex(answer)}$.`,
      };
    }
    if (difficulty === 3) {
      // (a + b) × c − d ÷ e, with d divisible by e
      const a = rng.int(-8, 8);
      const b = rng.nonZeroInt(-8, 8);
      const c = rng.nonZeroInt(-6, 6);
      const e = rng.nonZeroInt(-6, 6);
      const q = rng.nonZeroInt(-8, 8);
      const d = e * q;
      const bracket = a + b;
      const first = bracket * c;
      const answer = first - q;
      return {
        type: 'numeric',
        prompt: `Work out $(${tex(a)} + ${texSigned(b)}) \\times ${texSigned(c)} - ${texSigned(d)} \\div ${texSigned(e)}$.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'G for Grouping: do the bracket first.',
          'Then do × and ÷ (left to right) before the subtraction.',
        ],
        solution: [
          `Bracket: $${tex(a)} + ${texSigned(b)} = ${tex(bracket)}$.`,
          `Multiply: $${texSigned(bracket)} \\times ${texSigned(c)} = ${tex(first)}$.`,
          `Divide: $${texSigned(d)} \\div ${texSigned(e)} = ${tex(q)}$.`,
          `Subtract: $${tex(first)} - ${texSigned(q)} = ${tex(answer)}$.`,
        ].join('\n\n'),
      };
    }
    // difficulty 4: exponents with negatives, e.g. (−3)² − 2 × (−4) or −3² + …
    const base = rng.int(2, 6);
    const bracketed = rng.chance(0.5);
    const squared = bracketed ? base * base : -(base * base);
    const m = rng.nonZeroInt(-7, 7);
    const n = rng.nonZeroInt(-7, 7);
    const answer = squared - m * n;
    const powerTex = bracketed ? `(-${base})^2` : `-${base}^2`;
    const powerNote = bracketed
      ? `$(-${base})^2 = (-${base}) \\times (-${base}) = ${base * base}$ — the bracket means the negative is squared too.`
      : `$-${base}^2 = -(${base} \\times ${base}) = ${-base * base}$ — only the ${base} is squared, then the result is made negative.`;
    return {
      type: 'numeric',
      prompt: `Work out $${powerTex} - ${texSigned(m)} \\times ${texSigned(n)}$.`,
      answer,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        'E for Exponents: deal with the power before multiplying or subtracting.',
        bracketed ? 'The negative sign is inside the bracket, so it gets squared.' : 'Without a bracket, only the number is squared — the minus sign stays.',
      ],
      solution: [
        powerNote,
        `Multiply: $${texSigned(m)} \\times ${texSigned(n)} = ${tex(m * n)}$.`,
        `Subtract: $${tex(squared)} - ${texSigned(m * n)} = ${tex(answer)}$.`,
      ].join('\n\n'),
    };
  },
};

export const negativeSquares: QuestionTemplate = {
  id: 'm9.num.integers.negative-squares',
  topicId: 'm9.num.integers',
  title: 'Compare (−a)² and −a²',
  difficulties: [2],
  variety: 8,
  generate({ rng }) {
    const a = rng.int(2, 9);
    const options = [
      { id: 'a', text: `$(-${a})^2 = ${a * a}$ and $-${a}^2 = ${-a * a}$` },
      { id: 'b', text: `Both equal $${a * a}$` },
      { id: 'c', text: `Both equal $${-a * a}$` },
      { id: 'd', text: `$(-${a})^2 = ${-a * a}$ and $-${a}^2 = ${a * a}$` },
    ];
    return {
      type: 'mcq',
      prompt: `Which statement about $(-${a})^2$ and $-${a}^2$ is correct?`,
      options,
      correct: 'a',
      feedback: {
        b: `$-${a}^2$ means $-(${a}^2)$: square first, then apply the minus sign.`,
        c: `In $(-${a})^2$ the bracket means you square $-${a}$, and a negative times a negative is positive.`,
        d: 'These are the right numbers but swapped — check which one has the bracket.',
      },
      calculator: 'not-allowed',
      hints: ['Exponents are done before applying a minus sign — unless a bracket says otherwise.'],
      solution: `$(-${a})^2 = (-${a}) \\times (-${a}) = ${a * a}$.\n\n$-${a}^2 = -(${a} \\times ${a}) = ${-a * a}$.\n\nSo they are **not** equal.`,
    };
  },
};
