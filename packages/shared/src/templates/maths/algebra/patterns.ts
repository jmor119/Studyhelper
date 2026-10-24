import type { QuestionTemplate, TemplateOutput } from '../../types';
import { frac, mixed, ordinal, poly, polyAnswer, tex } from '../../format';
import type { Rng } from '../../../rng';
import { label, line, svgDoc, type Pt } from '../../svg';
import { t } from './helpers';

// m9.alg.patterns — linear sequences: next terms, the constant difference, position-to-term rules
// (tn = dn + c), using rules, and matchstick diagrams.

/** First k terms of dn + c, as "5, 8, 11, 14, …". */
function listTerms(d: number, c: number, k = 4): string {
  return `${Array.from({ length: k }, (_, i) => tex(d * (i + 1) + c)).join(', ')}, \\ldots`;
}

/** TeX for substituting n into dn + c: "3 \times 4 + 2" (no "+ 0"). */
function times(d: number, n: number, c: number): string {
  const prod = `${tex(d)} \\times ${n}`;
  return c === 0 ? prod : `${prod} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

/** Explains how to get the rule dn + c from the first term. */
function ruleSteps(d: number, c: number, first: number): string[] {
  const dn = poly([t(d, 'n')]);
  return [
    `The terms go ${d > 0 ? 'up' : 'down'} by ${Math.abs(d)} each time, so the constant difference is $${tex(d)}$ and the rule starts with $${dn}$.`,
    `When $n = 1$, $${dn} = ${tex(d)}$, but the first term is $${tex(first)}$. ${c === 0 ? 'They are already equal, so nothing needs to be added.' : `To get from $${tex(d)}$ to $${tex(first)}$ you ${c > 0 ? `add ${c}` : `subtract ${-c}`}.`}`,
    `So the rule is $${poly([t(d, 'n'), t(c)])}$.`,
    `Check with $n = 3$: $${times(d, 3, c)} = ${tex(3 * d + c)}$, which matches the third term ✓`,
  ];
}

export const nextTerms: QuestionTemplate = {
  id: 'm9.alg.patterns.next-terms',
  topicId: 'm9.alg.patterns',
  title: 'Continue a linear sequence',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const d = rng.int(2, 9);
      const a = rng.int(1, 20);
      const c = a - d;
      const seq = listTerms(d, c);
      if (rng.chance(0.3)) {
        return {
          type: 'numeric',
          prompt: `What is the constant difference in the sequence $${seq}$?`,
          answer: d,
          calculator: 'not-allowed',
          hints: ['Subtract each term from the next one.'],
          solution: `$${tex(2 * d + c)} - ${tex(d + c)} = ${d}$, and the difference is the same between every pair of terms. The constant difference is ${d}.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `What is the next term in the sequence $${seq}$?`,
        answer: 5 * d + c,
        calculator: 'not-allowed',
        hints: ['Find how much the terms go up by each time.'],
        solution: `The terms go up by ${d} each time, so the next term is $${tex(4 * d + c)} + ${d} = ${tex(5 * d + c)}$.`,
      };
    }
    const d = rng.chance(0.6) ? -rng.int(2, 9) : rng.int(2, 9);
    const a = d < 0 ? rng.int(5, 40) : rng.int(-15, 5);
    const c = a - d;
    const k = rng.int(6, 9);
    const terms = Array.from({ length: k }, (_, i) => d * (i + 1) + c);
    return {
      type: 'numeric',
      prompt: `Find the ${ordinal(k)} term of the sequence $${listTerms(d, c)}$`,
      answer: terms[k - 1]!,
      calculator: 'not-allowed',
      hints: [
        `Find the constant difference first. Is it positive or negative?`,
        `Keep ${d > 0 ? 'adding' : 'subtracting'} ${Math.abs(d)} until you reach the ${ordinal(k)} term.`,
      ],
      solution: [
        `The constant difference is $${tex(d)}$.`,
        `The terms are $${terms.map((x) => tex(x)).join(', ')}$.`,
        `The ${ordinal(k)} term is $${tex(terms[k - 1]!)}$.`,
      ].join('\n\n'),
    };
  },
};

function table(positions: number[], values: Array<number | null>, top = 'Position ($n$)', bottom = 'Term'): string {
  const head = `| ${top} | ${positions.join(' | ')} |`;
  const sep = `|---|${positions.map(() => '---').join('|')}|`;
  const row = `| ${bottom} | ${values.map((v) => (v === null ? '?' : v.toString().replace('-', '−'))).join(' | ')} |`;
  return `${head}\n${sep}\n${row}`;
}

export const nthTermRule: QuestionTemplate = {
  id: 'm9.alg.patterns.nth-term-rule',
  topicId: 'm9.alg.patterns',
  title: 'Write a position-to-term rule',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const hints = [
      'Find the constant difference. The rule starts with (difference) × $n$.',
      'Compare (difference) × $n$ with the actual terms to see what you need to add or subtract.',
    ];
    if (difficulty === 2) {
      const d = rng.int(2, 9);
      const c = rng.int(-5, 12);
      return {
        type: 'expression',
        prompt: `Write a rule for the $n$th term of the sequence $${listTerms(d, c)}$`,
        answer: polyAnswer([t(d, 'n'), t(c)]),
        variables: ['n'],
        calculator: 'not-allowed',
        hints,
        solution: ruleSteps(d, c, d + c).join('\n\n'),
      };
    }
    if (difficulty === 3) {
      const d = rng.int(2, 12);
      const c = rng.int(-15, 6);
      const positions = [1, 2, 3, 4, 5];
      return {
        type: 'expression',
        prompt: `The table shows a linear pattern.\n\n${table(positions, positions.map((n) => d * n + c))}\n\nWrite a rule for the term in position $n$.`,
        answer: polyAnswer([t(d, 'n'), t(c)]),
        variables: ['n'],
        marks: 2,
        calculator: 'not-allowed',
        hints,
        solution: ruleSteps(d, c, d + c).join('\n\n'),
      };
    }
    // difficulty 4: decreasing pattern, or a table with every second position
    if (rng.chance(0.6)) {
      const d = -rng.int(2, 9);
      const c = rng.int(5, 40);
      return {
        type: 'expression',
        prompt: `Write a rule for the $n$th term of the sequence $${listTerms(d, c)}$`,
        answer: polyAnswer([t(d, 'n'), t(c)]),
        variables: ['n'],
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The terms go down, so the constant difference is negative.', hints[1]!],
        solution: [...ruleSteps(d, c, d + c), `This rule can also be written $${c} - ${-d === 1 ? '' : -d}n$.`].join('\n\n'),
      };
    }
    const d = rng.int(2, 9);
    const c = rng.int(-10, 10);
    const positions = [2, 4, 6, 8];
    return {
      type: 'expression',
      prompt: `The table shows some terms of a linear pattern.\n\n${table(positions, positions.map((n) => d * n + c))}\n\nWrite a rule for the term in position $n$.`,
      answer: polyAnswer([t(d, 'n'), t(c)]),
      variables: ['n'],
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        'Look carefully at the positions: they go up by 2 each time, not 1.',
        'Divide the change in the terms by the change in position to find the difference for each step of 1.',
      ],
      solution: [
        `From position 2 to position 4 the term goes up by ${tex(2 * d)}. That is 2 steps, so each step adds $${tex(2 * d)} \\div 2 = ${d}$. The rule starts with $${d}n$.`,
        `When $n = 2$, $${d}n = ${2 * d}$, but the term is $${tex(2 * d + c)}$. ${c === 0 ? 'These are equal, so nothing needs to be added.' : `So you ${c > 0 ? `add ${c}` : `subtract ${-c}`}.`}`,
        `The rule is $${poly([t(d, 'n'), t(c)])}$.`,
        `Check with $n = 8$: $${times(d, 8, c)} = ${tex(8 * d + c)}$ ✓`,
      ].join('\n\n'),
    };
  },
};

export const useRule: QuestionTemplate = {
  id: 'm9.alg.patterns.use-rule',
  topicId: 'm9.alg.patterns',
  title: 'Use a rule to find terms and test conjectures',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const d = rng.int(2, 9);
    const c = rng.int(-8, 12);
    const rule = poly([t(d, 'n'), t(c)]);
    if (difficulty === 3) {
      const k = rng.pick([10, 12, 15, 20, 25, 30, 40, 50, 100]);
      const value = d * k + c;
      return {
        type: 'numeric',
        prompt: `The $n$th term of a sequence is $${rule}$. Find the ${ordinal(k)} term.`,
        answer: value,
        calculator: 'not-allowed',
        hints: [`Substitute $n = ${k}$ into the rule.`],
        solution: `$${times(d, k, c)} = ${tex(value)}$\n\nThe ${ordinal(k)} term is $${tex(value)}$.`,
      };
    }
    if (difficulty === 4) {
      const k = rng.int(12, 60);
      const value = d * k + c;
      return {
        type: 'numeric',
        prompt: `Which term of the sequence $${listTerms(d, c)}$ is equal to ${tex(value)}?\n\nGive the position number, $n$.`,
        answer: k,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['First find the rule for the $n$th term.', `Then set the rule equal to ${tex(value)} and solve for $n$.`],
        solution: [
          `The constant difference is ${d} and the first term is $${tex(d + c)}$, so the rule is $${rule}$.`,
          `Solve $${rule} = ${tex(value)}$:`,
          c === 0
            ? `Divide by ${d}: $n = ${k}$`
            : `${c > 0 ? `Subtract ${c}` : `Add ${-c}`}: $${d}n = ${tex(value - c)}$, then divide by ${d}: $n = ${k}$`,
          `${tex(value)} is the ${ordinal(k)} term.`,
        ].join('\n\n'),
      };
    }
    // difficulty 5
    if (rng.chance(0.5)) {
      // Is V a term?
      const k = rng.int(15, 80);
      const isTerm = rng.chance(0.5);
      const V = d * k + c + (isTerm ? 0 : rng.int(1, d - 1));
      const name = rng.pick(['Aroha', 'Tama', 'Priya', 'Sione', 'Mia', 'Hemi', 'Ruby', 'Kai']);
      return {
        type: 'mcq',
        prompt: `${name} says that ${tex(V)} is a term in the sequence $${listTerms(d, c)}$. Is ${name} right?`,
        options: [
          { id: 'yes', text: `Yes, ${tex(V)} is a term of the sequence` },
          { id: 'no', text: `No, ${tex(V)} is not a term of the sequence` },
        ],
        correct: isTerm ? 'yes' : 'no',
        shuffle: false,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the rule for the $n$th term.', `Set the rule equal to ${tex(V)}. Is $n$ a whole number?`],
        solution: [
          `The rule is $${rule}$.`,
          `If ${tex(V)} is a term, then $${rule} = ${tex(V)}$, so $${d}n = ${tex(V - c)}$ and $n = ${tex(V - c)} \\div ${d} = ${isTerm ? k : `${frac(V - c, d)} = ${mixed(V - c, d)}`}$.`,
          isTerm
            ? `$n = ${k}$ is a whole number, so ${tex(V)} **is** a term: it is the ${ordinal(k)} term.`
            : `Positions must be whole numbers, and ${tex(V - c)} is not a multiple of ${d}. So ${tex(V)} is **not** a term. (The ${ordinal(k)} term is ${tex(d * k + c)} and the ${ordinal(k + 1)} term is ${tex(d * (k + 1) + c)}.)`,
        ].join('\n\n'),
      };
    }
    // first term greater than L
    const L = rng.int(10, 50) * 10;
    let n = Math.floor((L - c) / d) + 1;
    while (d * n + c <= L) n++;
    const value = d * n + c;
    return {
      type: 'numeric',
      prompt: `What is the first term of the sequence $${listTerms(d, c)}$ that is greater than ${L}?`,
      answer: value,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the rule for the $n$th term.', `Find the position where the rule first goes past ${L}.`],
      solution: [
        `The rule is $${rule}$.`,
        `We need $${rule} > ${L}$, so $${d}n > ${tex(L - c)}$ and $n > ${(L - c) % d === 0 ? tex((L - c) / d) : `${frac(L - c, d)} = ${mixed(L - c, d)}`}$.`,
        `The first whole number position that works is $n = ${n}$.`,
        `Term: $${times(d, n, c)} = ${tex(value)}$. (The term before it is ${tex(value - d)}, which is not greater than ${L}.)`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Matchstick diagrams

interface Shape {
  name: string;
  /** Matches = d·n + c. */
  d: number;
  c: number;
  /** Width of pattern n in units. */
  width: (n: number) => number;
  height: number;
  segments: (n: number) => Array<[Pt, Pt]>;
  describe: string;
}

const H = Math.sqrt(3) / 2;

const SHAPES: Shape[] = [
  {
    name: 'squares',
    d: 3,
    c: 1,
    width: (n) => n,
    height: 1,
    segments: (n) => {
      const s: Array<[Pt, Pt]> = [];
      for (let i = 0; i < n; i++) {
        s.push([{ x: i, y: 0 }, { x: i + 1, y: 0 }], [{ x: i, y: 1 }, { x: i + 1, y: 1 }]);
      }
      for (let i = 0; i <= n; i++) s.push([{ x: i, y: 0 }, { x: i, y: 1 }]);
      return s;
    },
    describe: 'a row of squares',
  },
  {
    name: 'triangles',
    d: 2,
    c: 1,
    width: (n) => (n + 1) / 2,
    height: H,
    segments: (n) => {
      const s: Array<[Pt, Pt]> = [];
      for (let i = 0; i < Math.ceil(n / 2); i++) s.push([{ x: i, y: H }, { x: i + 1, y: H }]);
      for (let i = 0; i < Math.floor(n / 2); i++) s.push([{ x: i + 0.5, y: 0 }, { x: i + 1.5, y: 0 }]);
      for (let i = 0; i <= n; i++) {
        s.push([
          { x: i * 0.5, y: i % 2 === 0 ? H : 0 },
          { x: (i + 1) * 0.5, y: (i + 1) % 2 === 0 ? H : 0 },
        ]);
      }
      return s;
    },
    describe: 'a row of triangles',
  },
  {
    name: 'houses',
    d: 5,
    c: 1,
    width: (n) => n,
    height: 1 + H,
    segments: (n) => {
      const s: Array<[Pt, Pt]> = [];
      for (let i = 0; i < n; i++) {
        s.push([{ x: i, y: H }, { x: i + 1, y: H }], [{ x: i, y: 1 + H }, { x: i + 1, y: 1 + H }]);
        s.push([{ x: i, y: H }, { x: i + 0.5, y: 0 }], [{ x: i + 0.5, y: 0 }, { x: i + 1, y: H }]);
      }
      for (let i = 0; i <= n; i++) s.push([{ x: i, y: H }, { x: i, y: 1 + H }]);
      return s;
    },
    describe: 'a row of houses',
  },
  {
    name: 'double squares',
    d: 5,
    c: 2,
    width: (n) => n,
    height: 2,
    segments: (n) => {
      const s: Array<[Pt, Pt]> = [];
      for (let i = 0; i < n; i++) for (let y = 0; y <= 2; y++) s.push([{ x: i, y }, { x: i + 1, y }]);
      for (let i = 0; i <= n; i++) for (let y = 0; y < 2; y++) s.push([{ x: i, y }, { x: i, y: y + 1 }]);
      return s;
    },
    describe: 'two rows of squares',
  },
];

function matchFigure(shape: Shape): string {
  const u = 30;
  const gap = 44;
  const margin = 24;
  const top = 14;
  const widths = [1, 2, 3].map((n) => shape.width(n) * u);
  const W = margin * 2 + widths.reduce((a, b) => a + b, 0) + gap * 2;
  const shapeH = shape.height * u;
  const Hpx = top + shapeH + 40;
  let x0 = margin;
  let body = '';
  [1, 2, 3].forEach((n, i) => {
    for (const [a, b] of shape.segments(n)) {
      body += line({ x: x0 + a.x * u, y: top + a.y * u }, { x: x0 + b.x * u, y: top + b.y * u }, { stroke: '#92400e', width: 4 });
    }
    body += label({ x: x0 + widths[i]! / 2, y: top + shapeH + 22 }, `Pattern ${n}`, { size: 13 });
    x0 += widths[i]! + gap;
  });
  return svgDoc(Math.round(W), Math.round(Hpx), body);
}

function matchstickQuestion(rng: Rng, difficulty: number): TemplateOutput {
  const shape = rng.pick(SHAPES);
  const { d, c } = shape;
  const count = (n: number) => d * n + c;
  const figure = {
    svg: matchFigure(shape),
    alt: `Matchstick patterns made from ${shape.describe}: Pattern 1 uses ${count(1)} matches, Pattern 2 uses ${count(2)} and Pattern 3 uses ${count(3)}.`,
  };
  const rule = poly([t(d, 'n'), t(c)]);
  const ruleExplain = [
    `Count the matches: Pattern 1 has ${count(1)}, Pattern 2 has ${count(2)} and Pattern 3 has ${count(3)}.`,
    `Each new pattern adds ${d} matches, so the rule starts with $${d}n$. For Pattern 1, $${d} \\times 1 = ${d}$, and there are ${count(1)} matches, so add ${c}.`,
    `Rule: $m = ${rule}$`,
  ];

  if (difficulty === 2) {
    if (rng.chance(0.2)) {
      return {
        type: 'numeric',
        prompt: 'How many matches are added each time you go from one pattern to the next?',
        figure,
        answer: d,
        calculator: 'not-allowed',
        hints: ['Count the matches in Pattern 1 and Pattern 2, then find the difference.'],
        solution: `Pattern 1 has ${count(1)} matches, Pattern 2 has ${count(2)} and Pattern 3 has ${count(3)}. Each time, ${d} matches are added.`,
      };
    }
    const k = rng.int(4, 10);
    const list = Array.from({ length: k }, (_, i) => count(i + 1));
    return {
      type: 'numeric',
      prompt: `How many matches are needed for Pattern ${k}?`,
      figure,
      answer: count(k),
      calculator: 'not-allowed',
      hints: ['Count the matches in the first three patterns.', 'How many matches are added each time?'],
      solution: [
        `The patterns use ${list.slice(0, 3).join(', ')} matches, so ${d} matches are added each time.`,
        `Continuing: ${list.join(', ')}.`,
        `Pattern ${k} needs ${count(k)} matches. (Or use the rule $m = ${rule}$: $${d} \\times ${k} + ${c} = ${count(k)}$.)`,
      ].join('\n\n'),
    };
  }
  if (difficulty === 3) {
    const k = rng.int(10, 40);
    return {
      type: 'numeric',
      prompt: `How many matches are needed for Pattern ${k}?`,
      figure,
      answer: count(k),
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Counting on would take a long time. Find a rule for the number of matches in Pattern $n$.', 'How many matches are added each time? How many extra are there?'],
      solution: [...ruleExplain, `Pattern ${k}: $m = ${d} \\times ${k} + ${c} = ${count(k)}$ matches.`].join('\n\n'),
    };
  }
  // difficulty 4
  if (rng.chance(0.3)) {
    return {
      type: 'expression',
      prompt: 'Write a rule for the number of matches, $m$, needed for Pattern $n$.',
      figure,
      answer: polyAnswer([t(d, 'n'), t(c)]),
      variables: ['n'],
      marks: 2,
      calculator: 'not-allowed',
      hints: ['How many matches are added each time? That number goes in front of $n$.', 'Compare your rule with Pattern 1 to find the number to add.'],
      solution: [...ruleExplain, `Check with Pattern 3: $${d} \\times 3 + ${c} = ${count(3)}$ ✓`].join('\n\n'),
    };
  }
  const k = rng.int(12, 60);
  const M = count(k);
  return {
    type: 'numeric',
    prompt: `Which pattern number uses exactly ${M} matches?`,
    figure,
    answer: k,
    marks: 2,
    calculator: 'not-allowed',
    hints: ['Find a rule for the number of matches in Pattern $n$.', `Set your rule equal to ${M} and solve for $n$.`],
    solution: [...ruleExplain, `Solve $${rule} = ${M}$: subtract ${c} to get $${d}n = ${M - c}$, then divide by ${d}: $n = ${k}$.`, `Pattern ${k} uses ${M} matches.`].join('\n\n'),
  };
}

export const matchstickPatterns: QuestionTemplate = {
  id: 'm9.alg.patterns.matchsticks',
  topicId: 'm9.alg.patterns',
  title: 'Matchstick patterns from diagrams',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    return matchstickQuestion(rng, difficulty);
  },
};

