import type { QuestionTemplate } from '../../../types';
import { NAMES, num, tex } from '../../../format';

// m7.num.powers-roots — exponent notation, evaluating powers, and square roots of square numbers.
// Year 7: positive exponents only. Cube roots and negative exponents are Year 8. No calculators.

const TOPIC = 'm7.num.powers-roots';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] as const;

/** "5 × 5 × 5" in KaTeX. */
const repeated = (b: number, e: number) => Array.from({ length: e }, () => String(b)).join(' \\times ');

/** "5 + 5 + 5" in KaTeX. */
const repeatedAdd = (b: number, e: number) => Array.from({ length: e }, () => String(b)).join(' + ');

/** Working for b^e, e.g. 2 × 2 × 2 × 2 = 4 × 2 × 2 = 8 × 2 = 16. */
function powerSteps(b: number, e: number): string {
  if (e === 1) return `${b}`;
  const parts: string[] = [repeated(b, e)];
  let acc = b * b;
  for (let left = e - 2; left >= 0; left--) {
    parts.push(left === 0 ? tex(acc) : `${tex(acc)} \\times ${repeated(b, left)}`);
    acc *= b;
  }
  return parts.join(' = ');
}

/** Markdown working for b^e. Long chains are listed rather than written out step by step. */
function powerWorking(b: number, e: number): string {
  const head = `$${b}^{${e}} = `;
  if (e <= 4) return `${head}${powerSteps(b, e)}$`;
  const chain: string[] = [];
  let v = b;
  for (let i = 0; i < e; i++) {
    chain.push(num(v));
    v *= b;
  }
  return `${head}${repeated(b, e)} = ${tex(b ** e)}$

Multiply by ${b} each time: ${chain.join(', ')}.`;
}

/** Powers a Year 7 student can work out by hand. */
const NICE: ReadonlyArray<readonly [number, number]> = [
  ...Array.from({ length: 11 }, (_, i) => [i + 2, 2] as const),
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
  [10, 3],
  [2, 4],
  [2, 5],
  [2, 6],
  [2, 7],
  [3, 4],
  [3, 5],
  [10, 4],
];

/** Reads b^e in words, using "squared" and "cubed" where they fit. */
function readPower(b: number, e: number): string {
  if (e === 2) return `${b} squared`;
  if (e === 3) return `${b} cubed`;
  return `${b} to the power of ${e}`;
}

export const notation: QuestionTemplate = {
  id: `${TOPIC}.notation`,
  topicId: TOPIC,
  title: 'Exponent notation: base, exponent and reading powers',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        const b = rng.int(2, 9);
        let e = rng.int(3, 6);
        while (e === b) e = rng.int(3, 6);
        return {
          type: 'mcq',
          prompt: `Which is the same as $${repeated(b, e)}$?`,
          options: [
            { id: 'a', text: `$${b}^{${e}}$` },
            { id: 'b', text: `$${e}^{${b}}$` },
            { id: 'c', text: `$${b} \\times ${e}$` },
            { id: 'd', text: `$${b}^{${e - 1}}$` },
          ],
          correct: 'a',
          feedback: {
            b: `The base is the number being multiplied (${b}). The exponent is how many of them there are (${e}). This has them the wrong way round.`,
            c: `$${b} \\times ${e}$ means ${e} lots of ${b} added together, not ${b} multiplied by itself.`,
            d: `Count the ${b}s, not the × signs. There are ${e} of them.`,
          },
          calculator: 'not-allowed',
          hints: [`How many ${b}s are multiplied together?`, 'The number being multiplied is the base. The small raised number counts how many there are.'],
          solution: `There are ${e} lots of ${b} multiplied together.\n\nThe base is ${b} and the exponent is ${e}, so $${repeated(b, e)} = ${b}^{${e}}$.`,
        };
      }
      const b = rng.int(2, 12);
      let e = rng.int(2, 9);
      while (e === b) e = rng.int(2, 9);
      const askBase = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `In $${b}^{${e}}$, what is the ${askBase ? 'base' : 'exponent'}?`,
        answer: askBase ? b : e,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['A power has a big number and a small raised number.', 'The base is the number being multiplied. The exponent tells you how many times it is used.'],
        solution: `In $${b}^{${e}}$ the **base** is ${b} (the number being multiplied) and the **exponent** is ${e} (how many ${b}s are multiplied together).\n\n$${b}^{${e}} = ${repeated(b, e)}$`,
      };
    }

    // difficulty 2
    const kind = rng.pick(['expand', 'words', 'squaredCubed', 'mistake'] as const);
    if (kind === 'expand') {
      const b = rng.int(2, 6);
      let e = rng.int(3, 5);
      while (e === b) e = rng.int(3, 5);
      return {
        type: 'mcq',
        prompt: `Which multiplication is the same as $${b}^{${e}}$?`,
        options: [
          { id: 'a', text: `$${repeated(b, e)}$` },
          { id: 'b', text: `$${b} \\times ${e}$` },
          { id: 'c', text: `$${repeatedAdd(b, e)}$` },
          { id: 'd', text: `$${repeated(e, b)}$` },
        ],
        correct: 'a',
        feedback: {
          b: `$${b}^{${e}}$ is not ${b} times ${e}. The exponent tells you how many ${b}s to multiply together.`,
          c: 'An exponent means repeated multiplication, not repeated addition.',
          d: `This is $${e}^{${b}}$. The base and the exponent have been swapped.`,
        },
        calculator: 'not-allowed',
        hints: [`What is the base of $${b}^{${e}}$, and what is the exponent?`, 'The exponent says how many times the base is multiplied by itself.'],
        solution: `The base is ${b} and the exponent is ${e}, so multiply ${e} lots of ${b} together:\n\n$${b}^{${e}} = ${repeated(b, e)}$`,
      };
    }
    if (kind === 'words') {
      const b = rng.int(2, 12);
      let e = rng.int(4, 9);
      while (e === b) e = rng.int(4, 9);
      return {
        type: 'cloze',
        prompt: `Write "${WORDS[b]} to the power of ${WORDS[e]}" using an exponent.\n\nBase: [[b]]\n\nExponent: [[e]]`,
        blanks: [
          { id: 'b', accepted: [String(b)] },
          { id: 'e', accepted: [String(e)] },
        ],
        calculator: 'not-allowed',
        hints: ['"To the power of" comes just before the exponent.', 'The base is the number that gets multiplied.'],
        solution: `"${WORDS[b]} to the power of ${WORDS[e]}" is $${b}^{${e}}$. The base is ${b} and the exponent is ${e}.\n\nIt means $${repeated(b, e)}$.`,
      };
    }
    if (kind === 'squaredCubed') {
      const b = rng.int(2, 12);
      const e = rng.pick([2, 3] as const);
      const word = e === 2 ? 'squared' : 'cubed';
      return {
        type: 'cloze',
        prompt: `Choose the word that finishes the sentence.\n\n$${b}^{${e}}$ can be read as "${b} [[w]]".`,
        blanks: [{ id: 'w', accepted: [word], options: ['squared', 'cubed', 'doubled', 'tripled'] }],
        calculator: 'not-allowed',
        hints: [`Look at the exponent. It is ${e}.`, 'A power of 2 is called "squared" and a power of 3 is called "cubed".'],
        solution: `$${b}^{${e}}$ is "${b} ${word}" (or "${b} to the power of ${e}"). It means $${repeated(b, e)}$.\n\n"${e === 2 ? 'Doubled' : 'Tripled'}" would mean $${b} \\times ${e}$, which is different.`,
      };
    }
    // mistake
    const pairs: Array<[number, number]> = [];
    for (let b = 2; b <= 12; b++) {
      for (let e = 2; e <= 7; e++) {
        if (b !== e && b ** e <= 1000 && b ** e !== e ** b && !(b === 10 && e > 2)) pairs.push([b, e]);
      }
    }
    const [b, e] = rng.pick(pairs);
    const name = rng.pick(NAMES);
    const v = b ** e;
    return {
      type: 'mcq',
      prompt: `${name} says $${b}^{${e}} = ${b * e}$. What mistake has ${name} made?`,
      options: [
        { id: 'a', text: `${name} multiplied ${b} by ${e}. It should be ${e} lots of ${b} multiplied together, which is ${tex(v)}.` },
        { id: 'b', text: `There is no mistake. $${b}^{${e}}$ means $${b} \\times ${e}$, which is ${b * e}.` },
        { id: 'c', text: `${name} should have added: $${b}^{${e}} = ${b} + ${e}$, which is ${b + e}.` },
        { id: 'd', text: `${name} should have used ${b} lots of ${e} multiplied together, which is ${tex(e ** b)}.` },
      ],
      correct: 'a',
      feedback: {
        b: `$${b} \\times ${e}$ is ${e} lots of ${b} added together. A power means multiplying ${b} by itself.`,
        c: 'An exponent never means adding the base and the exponent.',
        d: `That would be $${e}^{${b}}$. In $${b}^{${e}}$ the base is ${b}, so multiply ${b}s together.`,
      },
      calculator: 'not-allowed',
      hints: [`Write $${b}^{${e}}$ as a multiplication.`, `How many ${b}s should be multiplied together?`],
      solution: `$${b}^{${e}}$ means ${e} lots of ${b} multiplied together:\n\n${powerWorking(b, e)}\n\n${name} worked out $${b} \\times ${e} = ${b * e}$ instead.`,
    };
  },
};

export const evaluate: QuestionTemplate = {
  id: `${TOPIC}.evaluate`,
  topicId: TOPIC,
  title: 'Evaluate squares, cubes and other powers',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const b = rng.int(2, 12);
      const inWords = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: inWords ? `What is ${b} squared?` : `Work out $${b}^2$.`,
        answer: b * b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Squaring a number means multiplying it by itself.', `Work out $${b} \\times ${b}$.`],
        solution: `$${b}^2 = ${b} \\times ${b} = ${b * b}$`,
      };
    }
    if (difficulty === 2) {
      const choices: Array<[number, number]> = [
        [2, 3],
        [3, 3],
        [4, 3],
        [5, 3],
        [10, 3],
        [2, 4],
        [2, 5],
        [2, 6],
        [2, 7],
        [3, 4],
        [10, 4],
        [10, 5],
        [10, 6],
        [1, rng.int(4, 9)],
      ];
      const [b, e] = rng.pick(choices);
      const inWords = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: inWords ? `What is ${readPower(b, e)}?` : `Work out $${b}^{${e}}$.`,
        answer: b ** e,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Write it as a multiplication: ${e} lots of ${b}.`, 'Multiply two numbers at a time, from the left.'],
        solution: `${powerWorking(b, e)}${b === 1 ? `\n\n1 multiplied by itself is always 1, however many times you do it.` : ''}`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        // Missing exponent.
        const options: Array<[number, number]> = [
          ...[3, 4, 5, 6, 7].map((e) => [2, e] as [number, number]),
          ...[2, 3, 4, 5].map((e) => [3, e] as [number, number]),
          ...[2, 3, 4].map((e) => [5, e] as [number, number]),
          ...[2, 3, 4, 5, 6].map((e) => [10, e] as [number, number]),
        ];
        const [b, e] = rng.pick(options);
        return {
          type: 'numeric',
          prompt: `$${b}^{\\square} = ${tex(b ** e)}$\n\nWhat number goes in the box?`,
          answer: e,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Start with ${b} and keep multiplying by ${b} until you reach ${tex(b ** e)}.`, `Count how many ${b}s you multiplied together.`],
          solution: `${powerWorking(b, e)}\n\nThat is ${e} lots of ${b}, so $${b}^{${e}} = ${tex(b ** e)}$.`,
        };
      }
      // Compare two powers.
      let p1: readonly [number, number];
      let p2: readonly [number, number];
      if (rng.chance(0.5)) {
        // b^e against e^b: a common mix-up.
        const swaps: Array<[number, number]> = [
          [2, 3],
          [2, 4],
          [2, 5],
          [2, 6],
          [3, 4],
          [2, 7],
          [3, 5],
          [2, 9],
        ];
        const [b, e] = rng.pick(swaps);
        [p1, p2] = rng.chance(0.5) ? [[b, e], [e, b]] : [[e, b], [b, e]];
      } else {
        do {
          [p1, p2] = rng.sample(NICE, 2) as [readonly [number, number], readonly [number, number]];
        } while (p1[0] ** p1[1] > 1000 || p2[0] ** p2[1] > 1000 || Math.abs(p1[0] ** p1[1] - p2[0] ** p2[1]) > 60);
      }
      const v1 = p1[0] ** p1[1];
      const v2 = p2[0] ** p2[1];
      const sym = v1 === v2 ? '=' : v1 > v2 ? '>' : '<';
      return {
        type: 'cloze',
        prompt: `Choose the symbol that makes this true.\n\n$${p1[0]}^{${p1[1]}}$ [[s]] $${p2[0]}^{${p2[1]}}$`,
        blanks: [{ id: 's', accepted: [sym], options: ['<', '>', '='] }],
        calculator: 'not-allowed',
        hints: ['Work out each power on its own first.', 'Then compare the two answers.'],
        solution: `${powerWorking(p1[0], p1[1])}\n\n${powerWorking(p2[0], p2[1])}\n\nSo $${p1[0]}^{${p1[1]}}$ ${sym} $${p2[0]}^{${p2[1]}}$.`,
      };
    }
    // difficulty 4
    if (rng.chance(0.5)) {
      // Order four powers.
      let picks: Array<readonly [number, number]> = [];
      for (let attempt = 0; attempt < 100; attempt++) {
        picks = rng.sample(
          NICE.filter(([b, e]) => b ** e <= 1000),
          4,
        );
        const values = picks.map(([b, e]) => b ** e);
        if (new Set(values).size === 4) break;
      }
      const sorted = [...picks].sort((x, y) => x[0] ** x[1] - y[0] ** y[1]);
      return {
        type: 'order',
        prompt: 'Put these powers in order from **smallest** to **largest**.',
        items: sorted.map(([b, e]) => ({ id: `p${b}e${e}`, text: `$${b}^{${e}}$` })),
        calculator: 'not-allowed',
        hints: ['Work out the value of each power first.', 'A bigger exponent does not always mean a bigger number. Check each one.'],
        solution: `${sorted.map(([b, e]) => `$${b}^{${e}} = ${tex(b ** e)}$`).join(', ')}\n\nSmallest to largest: ${sorted.map(([b, e]) => `$${b}^{${e}}$`).join(', ')}.`,
      };
    }
    // Add or subtract two powers.
    const small = NICE.filter(([b, e]) => b ** e <= 150 && b !== 10);
    let [p, q] = rng.sample(small, 2) as [readonly [number, number], readonly [number, number]];
    const op = rng.pick(['+', '-'] as const);
    if (op === '-' && p[0] ** p[1] < q[0] ** q[1]) [p, q] = [q, p];
    const vp = p[0] ** p[1];
    const vq = q[0] ** q[1];
    const answer = op === '+' ? vp + vq : vp - vq;
    return {
      type: 'numeric',
      prompt: `Work out $${p[0]}^{${p[1]}} ${op} ${q[0]}^{${q[1]}}$.`,
      answer,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Work out each power first (exponents come before adding and subtracting).', `Then ${op === '+' ? 'add' : 'subtract'} the two values.`],
      solution: `$${p[0]}^{${p[1]}} = ${tex(vp)}$ and $${q[0]}^{${q[1]}} = ${tex(vq)}$.\n\n$${tex(vp)} ${op} ${tex(vq)} = ${tex(answer)}$`,
    };
  },
};

export const squareRoots: QuestionTemplate = {
  id: `${TOPIC}.square-roots`,
  topicId: TOPIC,
  title: 'Square roots of square numbers',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const n = rng.int(1, 12);
      const inWords = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: inWords ? `What is the square root of ${n * n}?` : `Work out $\\sqrt{${n * n}}$.`,
        answer: n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Which number multiplied by itself makes ${n * n}?`, 'Go through your square numbers: 1, 4, 9, 16, 25, …'],
        solution: `$${n} \\times ${n} = ${n * n}$, so $\\sqrt{${n * n}} = ${n}$.\n\nFinding a square root undoes squaring.`,
      };
    }
    if (difficulty === 2) {
      const kind = rng.pick(['missingBase', 'missingUnder', 'bigger'] as const);
      if (kind === 'bigger') {
        const n = rng.pick([13, 14, 15, 20, 30, 40, 50] as const);
        return {
          type: 'numeric',
          prompt: `Work out $\\sqrt{${tex(n * n)}}$.`,
          answer: n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Which number multiplied by itself makes ${tex(n * n)}?`, n % 10 === 0 ? `$${tex(n * n)}$ ends in two zeros. Try a number that ends in one zero.` : `It is a little more than $\\sqrt{144} = 12$.`],
          solution: `$${n} \\times ${n} = ${tex(n * n)}$, so $\\sqrt{${tex(n * n)}} = ${n}$.`,
        };
      }
      const n = rng.int(2, 12);
      if (kind === 'missingBase') {
        return {
          type: 'numeric',
          prompt: `$\\square^2 = ${n * n}$\n\nWhat number goes in the box?`,
          answer: n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The box is a number that is multiplied by itself.', `So the box is the square root of ${n * n}.`],
          solution: `$${n}^2 = ${n} \\times ${n} = ${n * n}$, so the missing number is ${n}.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `$\\sqrt{\\square} = ${n}$\n\nWhat number goes in the box?`,
        answer: n * n,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Squaring undoes a square root.', `Which number has a square root of ${n}?`],
        solution: `If $\\sqrt{\\square} = ${n}$, then the box is $${n}^2 = ${n} \\times ${n} = ${n * n}$.\n\nCheck: $\\sqrt{${n * n}} = ${n}$ ✓`,
      };
    }
    if (difficulty === 3) {
      const kind = rng.pick(['sum', 'difference', 'product', 'hundreds'] as const);
      if (kind === 'hundreds') {
        const k = rng.int(2, 9);
        const big = k * k * 100;
        return {
          type: 'numeric',
          prompt: `Work out $\\sqrt{${tex(big)}}$.`,
          answer: 10 * k,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`$${tex(big)} = ${k * k} \\times 100$.`, `What is $\\sqrt{${k * k}}$? What is $\\sqrt{100}$?`],
          solution: `$${10 * k} \\times ${10 * k} = ${tex(big)}$, so $\\sqrt{${tex(big)}} = ${10 * k}$.\n\nYou can also split it up: $\\sqrt{${k * k}} = ${k}$ and $\\sqrt{100} = 10$, and $${k} \\times 10 = ${10 * k}$.`,
        };
      }
      let [a, b] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2) as [number, number];
      if (kind === 'difference' && a < b) [a, b] = [b, a];
      if (kind === 'product') {
        a = rng.int(2, 6);
        b = rng.int(2, 9);
        if (a === b) b = a + 1;
      }
      const sym = kind === 'sum' ? '+' : kind === 'difference' ? '-' : '\\times';
      const answer = kind === 'sum' ? a + b : kind === 'difference' ? a - b : a * b;
      return {
        type: 'numeric',
        prompt: `Work out $\\sqrt{${a * a}} ${sym} \\sqrt{${b * b}}$.`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Find each square root first.', `Then ${kind === 'sum' ? 'add' : kind === 'difference' ? 'subtract' : 'multiply'} them.`],
        solution: `$\\sqrt{${a * a}} = ${a}$ and $\\sqrt{${b * b}} = ${b}$.\n\n$${a} ${sym} ${b} = ${answer}$`,
      };
    }
    // difficulty 4: square roots of numbers that are not square numbers.
    let n = 0;
    let k = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      k = rng.int(2, 11);
      const offset = rng.int(1, 2);
      n = rng.chance(0.5) ? k * k + offset : (k + 1) * (k + 1) - offset;
      if (n > k * k && n < (k + 1) * (k + 1)) break;
    }
    const closest = n - k * k < (k + 1) * (k + 1) - n ? k : k + 1;
    if (rng.chance(0.5)) {
      return {
        type: 'cloze',
        prompt: `${n} is not a square number, so $\\sqrt{${n}}$ is not a whole number.\n\nFill in the gaps: $\\sqrt{${n}}$ is between [[a]] and [[b]].\n\nPut the smaller whole number first.`,
        blanks: [
          { id: 'a', accepted: [String(k)] },
          { id: 'b', accepted: [String(k + 1)] },
        ],
        calculator: 'not-allowed',
        hints: [`Which square numbers are just below and just above ${n}?`, 'Take the square root of each of those square numbers.'],
        solution: `$${k}^2 = ${k * k}$ and $${k + 1}^2 = ${(k + 1) * (k + 1)}$.\n\n${n} is between ${k * k} and ${(k + 1) * (k + 1)}, so $\\sqrt{${n}}$ is between ${k} and ${k + 1}.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `Which whole number is $\\sqrt{${n}}$ closest to?`,
      answer: closest,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`Find the square numbers just below and just above ${n}.`, `Which of those square numbers is ${n} closer to?`],
      solution: `$${k}^2 = ${k * k}$ and $${k + 1}^2 = ${(k + 1) * (k + 1)}$, so $\\sqrt{${n}}$ is between ${k} and ${k + 1}.\n\n${n} is closer to ${closest * closest} than to ${closest === k ? (k + 1) * (k + 1) : k * k}, so $\\sqrt{${n}}$ is closest to **${closest}**.`,
    };
  },
};

export const squareProblems: QuestionTemplate = {
  id: `${TOPIC}.square-problems`,
  topicId: TOPIC,
  title: 'Problems with squares and square roots',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const s = rng.int(3, 12);
    const area = s * s;
    if (difficulty === 3) {
      const kind = rng.pick(['garden', 'tiles', 'chairs', 'photo'] as const);
      if (kind === 'tiles' || kind === 'chairs') {
        const name = rng.pick(NAMES);
        const prompt =
          kind === 'tiles'
            ? `${name} has ${area} square tiles. ${name} uses all of them to make one big square, with no gaps.\n\nHow many tiles are along each side of the big square?`
            : `The school hall has ${area} chairs. They are set out in a square, with the same number of rows as chairs in each row.\n\nHow many chairs are in each row?`;
        return {
          type: 'numeric',
          prompt,
          answer: s,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The number along each side is multiplied by itself to give the total.', `Find $\\sqrt{${area}}$.`],
          solution: `A square with $n$ along each side has $n \\times n = n^2$ altogether.\n\n$${s} \\times ${s} = ${area}$, so $\\sqrt{${area}} = ${s}$. There are **${s}** along each side.`,
        };
      }
      const [thing, unit] = kind === 'garden' ? (['vegetable garden', 'm'] as const) : (['photo', 'cm'] as const);
      return {
        type: 'numeric',
        prompt: `A square ${thing} has an area of ${area} ${unit}².\n\nHow long is each side?`,
        answer: s,
        units: unit,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['The area of a square is side × side.', `Which number multiplied by itself gives ${area}?`],
        solution: `Area = side × side, so side × side = ${area}.\n\n$\\sqrt{${area}} = ${s}$ because $${s} \\times ${s} = ${area}$. Each side is **${s} ${unit}**.`,
      };
    }
    if (difficulty === 4) {
      const [thing, unit] = rng.pick([
        ['sandpit', 'm'],
        ['paddock', 'm'],
        ['patch of lawn', 'm'],
        ['tile', 'cm'],
        ['photo', 'cm'],
      ] as const);
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `A square ${thing} has an area of ${area} ${unit}².\n\nWhat is its perimeter?`,
          answer: 4 * s,
          units: unit,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Find the length of one side first: which number squared gives ${area}?`, 'The perimeter is the distance all the way around. A square has 4 equal sides.'],
          solution: `Side length: $\\sqrt{${area}} = ${s}$ ${unit}, because $${s} \\times ${s} = ${area}$.\n\nPerimeter: $4 \\times ${s} = ${4 * s}$ ${unit}.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `A square ${thing} has a perimeter of ${4 * s} ${unit}.\n\nWhat is its area?`,
        answer: area,
        units: `${unit}²`,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['A square has 4 equal sides. Find the length of one side first.', 'Area of a square = side × side = side².'],
        solution: `Side length: $${4 * s} \\div 4 = ${s}$ ${unit}.\n\nArea: $${s}^2 = ${s} \\times ${s} = ${area}$ ${unit}².`,
      };
    }
    // difficulty 5: identical squares in a row make a rectangle.
    const k = rng.int(2, 4);
    const side = rng.int(3, 10);
    const sq = side * side;
    const [thing, unit] = rng.pick([
      ['square photos', 'cm'],
      ['square tiles', 'cm'],
      ['square garden beds', 'm'],
      ['square cushions', 'cm'],
    ] as const);
    const L = k * side;
    const per = 2 * (L + side);
    return {
      type: 'numeric',
      prompt: `${WORDS[k]![0]!.toUpperCase()}${WORDS[k]!.slice(1)} ${thing} are placed side by side in a row, touching, to make a rectangle. Each one has an area of ${sq} ${unit}².\n\nWhat is the perimeter of the rectangle?`,
      answer: per,
      units: unit,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`Find the side length of one square first: which number squared gives ${sq}?`, `The rectangle is ${k} squares long and 1 square high. Sketch it and label its sides.`],
      solution: `Each square has side $\\sqrt{${sq}} = ${side}$ ${unit}.\n\nThe rectangle is $${k} \\times ${side} = ${L}$ ${unit} long and ${side} ${unit} high.\n\nPerimeter: $${L} + ${side} + ${L} + ${side} = ${per}$ ${unit}.`,
    };
  },
};

export const templates: QuestionTemplate[] = [notation, evaluate, squareRoots, squareProblems];
