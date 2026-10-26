import type { Rng } from '../../../../rng';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { NAMES, ordinal } from '../../../format';
import { INK, label, line, svgDoc } from '../../../svg';

// m6.alg.patterns — growing patterns: the next term, the constant (amount of change), rules in
// words ("start with 3 and add 4 each time"), tables of values from a rule, shape patterns, and
// conjectures about later terms. Year 6 uses term-to-term rules in words only (no letters).
// Far terms use "the number of jumps": term 20 = first term + 19 jumps.

const term = (a: number, d: number, n: number) => a + (n - 1) * d;
const listTerms = (a: number, d: number, k = 4) => `${Array.from({ length: k }, (_, i) => term(a, d, i + 1)).join(', ')}, …`;

/** Horizontal table: Position | 1 | 2 | … and Term | … */
function hTable(positions: number[], values: Array<number | string>, termLabel = 'Term'): string {
  return [
    `| Position | ${positions.join(' | ')} |`,
    `|---|${positions.map(() => '---').join('|')}|`,
    `| ${termLabel} | ${values.join(' | ')} |`,
  ].join('\n');
}

/** Vertical table for cloze blanks (narrow enough for phones). */
function vTable(rows: Array<[number, string]>, termLabel = 'Term'): string {
  return [`| Position | ${termLabel} |`, '|---|---|', ...rows.map(([p, v]) => `| ${p} | ${v} |`)].join('\n');
}

function ruleWords(a: number, d: number, unit = ''): string {
  const u = unit ? ` ${unit}` : '';
  return d >= 0 ? `Start with ${a}${u} and add ${d}${u} each time` : `Start with ${a}${u} and subtract ${-d}${u} each time`;
}

// ---------------------------------------------------------------- next term
export const nextTerm: QuestionTemplate = {
  id: 'm6.alg.patterns.next-term',
  topicId: 'm6.alg.patterns',
  title: 'Continue a growing pattern',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const a = rng.int(1, 20);
      const d = rng.int(2, 10);
      if (rng.chance(0.3)) {
        return {
          type: 'numeric',
          prompt: `Here is a growing pattern:\n\n**${listTerms(a, d)}**\n\nHow much is added each time? (This is the **constant** amount of change.)`,
          answer: d,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Look at two terms next to each other. How far is it from one to the next?'],
          solution: `$${term(a, d, 2)} - ${a} = ${d}$, and every jump is the same, so ${d} is added each time.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Here is a growing pattern:\n\n**${listTerms(a, d)}**\n\nWhat is the next term?`,
        answer: term(a, d, 5),
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Find how much is added each time.', 'Add that amount to the last term.'],
        solution: `The terms go up by ${d} each time, so the next term is $${term(a, d, 4)} + ${d} = ${term(a, d, 5)}$.`,
      };
    }
    const kind = rng.pick(['missing', 'shrinking', 'later'] as const);
    if (kind === 'missing') {
      const a = rng.int(2, 30);
      const d = rng.int(3, 12);
      const gap = rng.int(2, 4);
      const shown = [1, 2, 3, 4, 5].map((n) => (n === gap ? '?' : String(term(a, d, n))));
      return {
        type: 'numeric',
        prompt: `One term is missing from this growing pattern:\n\n**${shown.join(', ')}, …**\n\nWhat is the missing term?`,
        answer: term(a, d, gap),
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Use two terms next to each other that you can see to find the jump.', 'Add the jump to the term just before the gap.'],
        solution: [
          `The jump is $${term(a, d, gap === 4 ? 2 : 5)} - ${term(a, d, gap === 4 ? 1 : 4)} = ${d}$.`,
          `The missing term is $${term(a, d, gap - 1)} + ${d} = ${term(a, d, gap)}$. Check: $${term(a, d, gap)} + ${d} = ${term(a, d, gap + 1)}$ ✓`,
        ].join('\n\n'),
      };
    }
    if (kind === 'shrinking') {
      const d = rng.int(2, 9);
      const last = rng.int(1, 20);
      const a = last + 4 * d;
      return {
        type: 'numeric',
        prompt: `Here is a pattern:\n\n**${listTerms(a, -d)}**\n\nWhat is the next term?`,
        answer: term(a, -d, 5),
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Are the terms getting bigger or smaller?', 'Find how much the terms change by each time.'],
        solution: `The terms go down by ${d} each time, so the next term is $${term(a, -d, 4)} - ${d} = ${term(a, -d, 5)}$.`,
      };
    }
    const a = rng.int(1, 15);
    const d = rng.int(2, 9);
    const k = rng.int(7, 9);
    const terms = Array.from({ length: k }, (_, i) => term(a, d, i + 1));
    return {
      type: 'numeric',
      prompt: `Here is a growing pattern:\n\n**${listTerms(a, d)}**\n\nIf the pattern carries on, what is the ${ordinal(k)} term?`,
      answer: term(a, d, k),
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Find how much is added each time.', `Keep adding until you reach the ${ordinal(k)} term. Count the terms carefully.`],
      solution: `The pattern adds ${d} each time:\n\n${terms.map((x, i) => `${ordinal(i + 1)}: ${x}`).join(', ')}\n\nThe ${ordinal(k)} term is ${term(a, d, k)}.`,
    };
  },
};

// ---------------------------------------------------------------- rule in words
export const ruleInWords: QuestionTemplate = {
  id: 'm6.alg.patterns.rule-in-words',
  topicId: 'm6.alg.patterns',
  title: 'Describe a pattern with a rule in words',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const a = rng.int(2, 15);
      const d = rng.int(2, 9);
      const useTable = rng.chance(0.4);
      const shown = useTable ? `\n\n${hTable([1, 2, 3, 4], [1, 2, 3, 4].map((n) => term(a, d, n)))}\n\n` : `\n\n**${listTerms(a, d)}**\n\n`;
      const correct = `Start with ${a} and add ${d} each time.`;
      const pool: Array<{ text: string; why: string }> = [
        { text: `Start with ${a + d} and add ${d} each time.`, why: `${a + d} is the second term. The pattern starts with ${a}.` },
        { text: `Start with ${a} and add ${2 * d} each time.`, why: `${2 * d} is the jump between every second term. Terms next to each other go up by ${d}.` },
        { text: `Start with ${a} and add ${d + 1} each time.`, why: `Check the jumps: $${term(a, d, 2)} - ${a} = ${d}$.` },
      ];
      if (a !== d) {
        pool.push({ text: `Start with ${d} and add ${a} each time.`, why: `This mixes up the two numbers. The pattern starts at ${a} and goes up by ${d} each time.` });
        pool.push({
          text: `Multiply the position number by ${d}.`,
          why: `That gives ${d}, ${2 * d}, ${3 * d}, …, which is not this pattern. It starts at ${a}, not ${d}.`,
        });
      }
      const distractors = rng.sample(pool, 3);
      const ids = ['a', 'b', 'c', 'd'];
      const options = [{ text: correct, why: '' }, ...distractors].map((o, i) => ({ id: ids[i]!, text: o.text }));
      const feedback = Object.fromEntries(distractors.map((o, i) => [ids[i + 1]!, o.why]));
      return {
        type: 'mcq',
        prompt: `Which rule describes this growing pattern?${shown}`.trimEnd(),
        options,
        correct: 'a',
        feedback,
        calculator: 'not-allowed',
        hints: ['What is the first term?', 'How much does the pattern go up by from one term to the next?'],
        solution: `The first term is ${a}. Each term is ${d} more than the one before ($${term(a, d, 2)} - ${a} = ${d}$).\n\nRule: **${correct}**`,
      };
    }
    const down = rng.chance(0.4);
    const d = rng.int(2, 9);
    const a = down ? rng.int(5 * d + 1, 5 * d + 30) : rng.int(1, 30);
    const step = down ? -d : d;
    return {
      type: 'cloze',
      prompt: `The table shows a pattern.\n\n${hTable([1, 2, 3, 4, 5], [1, 2, 3, 4, 5].map((n) => term(a, step, n)))}\n\nComplete the rule in words:\n\nStart with [[s]] and [[op]] [[c]] each time.`,
      blanks: [
        { id: 's', accepted: [String(a)] },
        { id: 'op', accepted: [down ? 'subtract' : 'add'], options: ['add', 'subtract'] },
        { id: 'c', accepted: [String(d)] },
      ],
      calculator: 'not-allowed',
      hints: ['The rule starts with the term in position 1.', 'Are the terms getting bigger or smaller? By how much each time?'],
      solution: `Position 1 has ${a}. Each term is ${d} ${down ? 'less' : 'more'} than the one before ($${down ? `${a} - ${term(a, step, 2)}` : `${term(a, step, 2)} - ${a}`} = ${d}$).\n\nRule: **${ruleWords(a, step)}.**`,
    };
  },
};

// ---------------------------------------------------------------- table from a rule
export const tableFromRule: QuestionTemplate = {
  id: 'm6.alg.patterns.table-from-rule',
  topicId: 'm6.alg.patterns',
  title: 'Make a table of values from a rule in words',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const down = rng.chance(0.35);
      const d = rng.int(2, 9);
      const a = down ? rng.int(4 * d + 2, 4 * d + 40) : rng.int(1, 25);
      const step = down ? -d : d;
      const rows: Array<[number, string]> = [1, 2, 3, 4, 5].map((n) => [n, n === 1 ? String(a) : `[[p${n}]]`]);
      return {
        type: 'cloze',
        prompt: `The rule for a pattern is: **${ruleWords(a, step)}.**\n\nFill in the table of values.\n\n${vTable(rows)}`,
        blanks: [2, 3, 4, 5].map((n) => ({ id: `p${n}`, accepted: [String(term(a, step, n))] })),
        calculator: 'not-allowed',
        hints: [`Position 1 is the starting number, ${a}.`, `To get each new term, ${down ? 'subtract' : 'add'} ${d} to the term before it.`],
        solution: `${[1, 2, 3, 4, 5].map((n) => `Position ${n}: ${term(a, step, n)}`).join('\n\n')}\n\nEach term is ${d} ${down ? 'less' : 'more'} than the one before.`,
      };
    }
    const a = rng.int(2, 20);
    const d = rng.int(3, 9);
    const far = rng.pick([10, 12, 15, 20]);
    const mid = rng.int(5, 7);
    const rows: Array<[number, string]> = [
      [1, String(a)],
      [2, String(term(a, d, 2))],
      [3, '[[p3]]'],
      [mid, `[[p${mid}]]`],
      [far, `[[p${far}]]`],
    ];
    return {
      type: 'cloze',
      prompt: `The rule for a pattern is: **${ruleWords(a, d)}.**\n\nFill in the gaps in the table. Look carefully at the position numbers.\n\n${vTable(rows)}`,
      blanks: [3, mid, far].map((n) => ({ id: `p${n}`, accepted: [String(term(a, d, n))] })),
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        'The positions jump, so you cannot just add once each row.',
        `How many jumps of ${d} are there from position 1 to position ${far}?`,
      ],
      solution: [
        `Position 3: $${term(a, d, 2)} + ${d} = ${term(a, d, 3)}$`,
        `Position ${mid}: from position 1 there are ${mid - 1} jumps of ${d}, so $${a} + ${mid - 1} \\times ${d} = ${a} + ${(mid - 1) * d} = ${term(a, d, mid)}$`,
        `Position ${far}: from position 1 there are ${far - 1} jumps of ${d}, so $${a} + ${far - 1} \\times ${d} = ${a} + ${(far - 1) * d} = ${term(a, d, far)}$`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- shape patterns
export interface Shape {
  name: string;
  thing: 'tiles' | 'matches';
  d: number;
  /** Number in Pattern 1. */
  first: number;
  /** Tile cells [col, row] (row 0 at the top), or matchstick segments in grid units. */
  cells?: (n: number) => Array<[number, number]>;
  segments?: (n: number) => Array<[[number, number], [number, number]]>;
  size: (n: number) => [number, number];
}

const H = Math.sqrt(3) / 2;

export const SHAPES: Shape[] = [
  {
    name: 'an L shape',
    thing: 'tiles',
    d: 2,
    first: 3,
    cells: (n) => [...Array.from({ length: n + 1 }, (_, r) => [0, r] as [number, number]), ...Array.from({ length: n }, (_, c) => [c + 1, n] as [number, number])],
    size: (n) => [n + 1, n + 1],
  },
  {
    name: 'a plus sign',
    thing: 'tiles',
    d: 4,
    first: 5,
    cells: (n) => {
      const out: Array<[number, number]> = [[n, n]];
      for (let k = 1; k <= n; k++) out.push([n + k, n], [n - k, n], [n, n + k], [n, n - k]);
      return out;
    },
    size: (n) => [2 * n + 1, 2 * n + 1],
  },
  {
    name: 'a T shape',
    thing: 'tiles',
    d: 3,
    first: 4,
    cells: (n) => [...Array.from({ length: 2 * n + 1 }, (_, c) => [c, 0] as [number, number]), ...Array.from({ length: n }, (_, r) => [n, r + 1] as [number, number])],
    size: (n) => [2 * n + 1, n + 1],
  },
  {
    name: 'two rows of tiles',
    thing: 'tiles',
    d: 2,
    first: 4,
    cells: (n) => Array.from({ length: n + 1 }, (_, c) => [[c, 0] as [number, number], [c, 1] as [number, number]]).flat(),
    size: (n) => [n + 1, 2],
  },
  {
    name: 'a frame of tiles around a gap',
    thing: 'tiles',
    d: 2,
    first: 8,
    cells: (n) => {
      const out: Array<[number, number]> = [];
      for (let c = 0; c < n + 2; c++) out.push([c, 0], [c, 2]);
      out.push([0, 1], [n + 1, 1]);
      return out;
    },
    size: (n) => [n + 2, 3],
  },
  {
    name: 'a row of houses',
    thing: 'matches',
    d: 5,
    first: 6,
    segments: (n) => {
      const s: Array<[[number, number], [number, number]]> = [];
      for (let i = 0; i < n; i++) {
        s.push([[i, H], [i + 1, H]], [[i, 1 + H], [i + 1, 1 + H]]);
        s.push([[i, H], [i + 0.5, 0]], [[i + 0.5, 0], [i + 1, H]]);
      }
      for (let i = 0; i <= n; i++) s.push([[i, H], [i, 1 + H]]);
      return s;
    },
    size: (n) => [n, 1 + H],
  },
  {
    name: 'a row of squares',
    thing: 'matches',
    d: 3,
    first: 4,
    segments: (n) => {
      const s: Array<[[number, number], [number, number]]> = [];
      for (let i = 0; i < n; i++) s.push([[i, 0], [i + 1, 0]], [[i, 1], [i + 1, 1]]);
      for (let i = 0; i <= n; i++) s.push([[i, 0], [i, 1]]);
      return s;
    },
    size: (n) => [n, 1],
  },
  {
    name: 'a row of triangles',
    thing: 'matches',
    d: 2,
    first: 3,
    segments: (n) => {
      const s: Array<[[number, number], [number, number]]> = [];
      for (let i = 0; i < Math.ceil(n / 2); i++) s.push([[i, H], [i + 1, H]]);
      for (let i = 0; i < Math.floor(n / 2); i++) s.push([[i + 0.5, 0], [i + 1.5, 0]]);
      for (let i = 0; i <= n; i++) s.push([[i * 0.5, i % 2 === 0 ? H : 0], [(i + 1) * 0.5, (i + 1) % 2 === 0 ? H : 0]]);
      return s;
    },
    size: (n) => [(n + 1) / 2, H],
  },
];

const countOf = (s: Shape, n: number) => s.first + (n - 1) * s.d;

export function shapeFigure(s: Shape): string {
  const widths = [1, 2, 3].map((n) => s.size(n)[0]);
  const heights = [1, 2, 3].map((n) => s.size(n)[1]);
  const margin = 18;
  const gap = 34;
  const unit = Math.min(s.thing === 'matches' ? 34 : 18, Math.floor((400 - 2 * margin - 2 * gap) / widths.reduce((a, b) => a + b, 0)));
  const maxH = Math.max(...heights) * unit;
  const top = 14;
  const W = margin * 2 + gap * 2 + widths.reduce((a, b) => a + b, 0) * unit;
  let x0 = margin;
  let body = '';
  [1, 2, 3].forEach((n, i) => {
    const y0 = top + maxH - heights[i]! * unit;
    if (s.cells) {
      for (const [c, r] of s.cells(n)) {
        body += `<rect x="${x0 + c * unit}" y="${y0 + r * unit}" width="${unit}" height="${unit}" fill="#fdba74" stroke="${INK}" stroke-width="1.5"/>`;
      }
    } else if (s.segments) {
      for (const [a, b] of s.segments(n)) {
        body += line({ x: x0 + a[0] * unit, y: y0 + a[1] * unit }, { x: x0 + b[0] * unit, y: y0 + b[1] * unit }, { stroke: '#92400e', width: 4 });
      }
    }
    body += label({ x: x0 + (widths[i]! * unit) / 2, y: top + maxH + 20 }, `Pattern ${n}`, { size: 13 });
    x0 += widths[i]! * unit + gap;
  });
  return svgDoc(Math.round(W), Math.round(top + maxH + 36), body);
}

export const shapePatterns: QuestionTemplate = {
  id: 'm6.alg.patterns.shape-patterns',
  topicId: 'm6.alg.patterns',
  title: 'Growing patterns made from tiles or matchsticks',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const s = rng.pick(SHAPES);
    const things = s.thing;
    const figure = {
      svg: shapeFigure(s),
      alt: `A growing pattern of ${things} making ${s.name}. Pattern 1 has ${countOf(s, 1)} ${things}, Pattern 2 has ${countOf(s, 2)} and Pattern 3 has ${countOf(s, 3)}.`,
    };
    const counts = `Pattern 1 has ${countOf(s, 1)} ${things}, Pattern 2 has ${countOf(s, 2)} and Pattern 3 has ${countOf(s, 3)}.`;
    const intro = `Here is a growing pattern made from ${things}.`;
    if (difficulty === 2) {
      if (rng.chance(0.35)) {
        return {
          type: 'numeric',
          prompt: `${intro} How many ${things} are added each time you go to the next pattern?`,
          figure,
          answer: s.d,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`Count the ${things} in Pattern 1 and Pattern 2.`, 'Find the difference.'],
          solution: `${counts}\n\nEach time, ${s.d} ${things} are added.`,
        };
      }
      const k = rng.int(4, 6);
      const seq = Array.from({ length: k }, (_, i) => countOf(s, i + 1));
      return {
        type: 'numeric',
        prompt: `${intro} If the pattern carries on, how many ${things} will Pattern ${k} have?`,
        figure,
        answer: countOf(s, k),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Count the ${things} in the first three patterns.`, `How many ${things} are added each time? Keep adding.`],
        solution: `${counts} The pattern adds ${s.d} each time.\n\nCarrying on: ${seq.join(', ')}.\n\nPattern ${k} has **${countOf(s, k)}** ${things}.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.45)) {
        return {
          type: 'cloze',
          prompt: `${intro} Complete the rule for the number of ${things}.\n\nStart with [[s]] ${things} and add [[c]] ${things} each time.`,
          figure,
          blanks: [
            { id: 's', accepted: [String(s.first)] },
            { id: 'c', accepted: [String(s.d)] },
          ],
          calculator: 'not-allowed',
          hints: ['The rule starts with the number in Pattern 1.', `How many more ${things} does Pattern 2 have than Pattern 1?`],
          solution: `${counts}\n\nRule: **start with ${s.first} ${things} and add ${s.d} ${things} each time.**`,
        };
      }
      const k = rng.int(8, 12);
      return {
        type: 'numeric',
        prompt: `${intro} How many ${things} will Pattern ${k} have?`,
        figure,
        answer: countOf(s, k),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Make a table: pattern number and number of ' + things + '.', `From Pattern 1 to Pattern ${k}, how many times do you add ${things}?`],
        solution: [
          counts,
          `${s.d} ${things} are added each time. From Pattern 1 to Pattern ${k} there are ${k - 1} jumps.`,
          `$${s.first} + ${k - 1} \\times ${s.d} = ${s.first} + ${(k - 1) * s.d} = ${countOf(s, k)}$`,
          `Pattern ${k} has **${countOf(s, k)}** ${things}.`,
        ].join('\n\n'),
      };
    }
    // difficulty 4: test a conjecture, or work backwards
    if (rng.chance(0.5)) {
      const name = rng.pick(NAMES);
      const x = countOf(s, 5);
      const t10 = countOf(s, 10);
      return {
        type: 'mcq',
        prompt: `${intro}\n\nPattern 5 has ${x} ${things}. ${name} makes a **conjecture**: "Pattern 10 is double Pattern 5, so it must have ${2 * x} ${things}." Is ${name} right?`,
        figure,
        options: [
          { id: 'a', text: `No. Pattern 10 has ${t10} ${things}.` },
          { id: 'b', text: `Yes. Double the pattern number means double the ${things}.` },
          { id: 'c', text: `No. Pattern 10 has ${x + 5} ${things}.` },
          { id: 'd', text: `No. Pattern 10 has ${10 * s.d} ${things}.` },
        ],
        correct: 'a',
        feedback: {
          b: `Check it with the first patterns: Pattern 2 has ${countOf(s, 2)} ${things}, which is not double ${countOf(s, 1)}. Doubling doesn't work for this pattern.`,
          c: `From Pattern 5 to Pattern 10 is 5 jumps, but each jump adds ${s.d} ${things}, not 1.`,
          d: `$10 \\times ${s.d} =${10 * s.d}$ forgets that Pattern 1 starts with ${s.first} ${things}, not ${s.d}.`,
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Test the idea on smaller patterns first. Is Pattern 2 double Pattern 1?', `From Pattern 5 to Pattern 10, how many jumps are there?`],
        solution: [
          `${counts} Each pattern adds ${s.d} ${things}.`,
          `Doubling doesn't work: Pattern 2 (${countOf(s, 2)}) is not double Pattern 1 (${countOf(s, 1)}).`,
          `From Pattern 5 to Pattern 10 there are 5 jumps of ${s.d}: $${x} + 5 \\times ${s.d} = ${t10}$.`,
          `So ${name} is wrong. Pattern 10 has **${t10}** ${things}.`,
        ].join('\n\n'),
      };
    }
    const k = rng.int(8, 20);
    const N = countOf(s, k);
    return {
      type: 'numeric',
      prompt: `${intro} Which pattern number uses exactly ${N} ${things}?`,
      figure,
      answer: k,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Pattern 1 has ${s.first} ${things}. How many more do you need to reach ${N}?`, `Each jump adds ${s.d}. How many jumps is that?`],
      solution: [
        counts,
        `From Pattern 1 you need $${N} - ${s.first} = ${N - s.first}$ more ${things}.`,
        `Each jump adds ${s.d}, so that is $${N - s.first} \\div ${s.d} = ${k - 1}$ jumps.`,
        `${k - 1} jumps after Pattern 1 is Pattern **${k}**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- predicting later terms
function farTerm(rng: Rng): TemplateOutput {
  const a = rng.int(1, 15);
  const d = rng.int(2, 9);
  const k = rng.pick([12, 15, 20, 25, 30, 50]);
  return {
    type: 'numeric',
    prompt: `Here is a growing pattern:\n\n**${listTerms(a, d)}**\n\nWhat is the ${ordinal(k)} term?`,
    answer: term(a, d, k),
    form: 'integer',
    marks: 2,
    calculator: 'not-allowed',
    hints: [`Writing out ${k} terms would take a long time. How many jumps are there from the 1st term to the ${ordinal(k)} term?`, 'Multiply the number of jumps by the jump size, then add it to the first term.'],
    solution: [
      `The pattern starts with ${a} and adds ${d} each time.`,
      `From the 1st term to the ${ordinal(k)} term there are ${k - 1} jumps (not ${k}).`,
      `$${a} + ${k - 1} \\times ${d} = ${a} + ${(k - 1) * d} = ${term(a, d, k)}$`,
      `Check with the 4th term: $${a} + 3 \\times ${d} = ${term(a, d, 4)}$ ✓`,
    ].join('\n\n'),
  };
}

interface Context {
  text: string;
  ask: string;
  unit: string;
  start: number;
  step: number;
  /** Number of steps asked about (forward), or the target value (backward). */
  answer: number;
  solution: string[];
  hints: string[];
}

function contextQuestion(rng: Rng, backwards: boolean): TemplateOutput {
  const name = rng.pick(NAMES);
  const kind = rng.pick(['savings', 'seedling', 'tables'] as const);
  let c: Context;
  if (kind === 'savings') {
    const start = rng.int(5, 25);
    const step = rng.int(3, 8);
    if (!backwards) {
      const w = rng.int(8, 15);
      c = {
        text: `${name} has \\$${start} in a money box. ${name} adds \\$${step} every week.`,
        ask: `How much money will be in the money box after ${w} weeks?`,
        unit: '$',
        start,
        step,
        answer: start + w * step,
        hints: ['Make a table: weeks and dollars. Week 0 is the start.', `Each week adds \\$${step}. How much do ${w} weeks add?`],
        solution: [`After 1 week: \\$${start + step}. After 2 weeks: \\$${start + 2 * step}. The rule is: start with \\$${start} and add \\$${step} each week.`, `${w} weeks add $${w} \\times ${step} = ${w * step}$ dollars.`, `$${start} + ${w * step} = ${start + w * step}$, so there will be **\\$${start + w * step}**.`],
      };
    } else {
      const w = rng.int(6, 14);
      const target = start + w * step - rng.int(0, step - 1);
      c = {
        text: `${name} has \\$${start} in a money box. ${name} adds \\$${step} every week.`,
        ask: `After how many weeks will ${name} have **at least** \\$${target}?`,
        unit: '',
        start,
        step,
        answer: w,
        hints: [`How much more than \\$${start} does ${name} need?`, `How many lots of \\$${step} make at least that much?`],
        solution: [
          `${name} needs $${target} - ${start} = ${target - start}$ dollars more.`,
          `$${w - 1} \\times ${step} = ${(w - 1) * step}$ is not enough, but $${w} \\times ${step} = ${w * step}$ is enough.`,
          `After ${w} weeks ${name} has $${start} + ${w * step} = ${start + w * step}$ dollars, so the answer is **${w} weeks**.`,
        ],
      };
    }
  } else if (kind === 'seedling') {
    const start = rng.int(2, 9);
    const step = rng.int(2, 5);
    const w = rng.int(6, 14);
    if (!backwards) {
      c = {
        text: `A kōwhai seedling is ${start} cm tall. It grows ${step} cm every week.`,
        ask: `How tall will it be after ${w} weeks?`,
        unit: 'cm',
        start,
        step,
        answer: start + w * step,
        hints: ['Start with the height now, then add the growth for each week.', `How much does it grow in ${w} weeks?`],
        solution: [`Rule: start with ${start} cm and add ${step} cm each week.`, `In ${w} weeks it grows $${w} \\times ${step} = ${w * step}$ cm.`, `$${start} + ${w * step} = ${start + w * step}$, so it will be **${start + w * step} cm** tall.`],
      };
    } else {
      const target = start + w * step;
      c = {
        text: `A kōwhai seedling is ${start} cm tall. It grows ${step} cm every week.`,
        ask: `After how many weeks will it be ${target} cm tall?`,
        unit: '',
        start,
        step,
        answer: w,
        hints: [`How many centimetres does it need to grow from ${start} cm?`, `How many lots of ${step} cm is that?`],
        solution: [`It needs to grow $${target} - ${start} = ${target - start}$ cm.`, `$${target - start} \\div ${step} = ${w}$`, `So it will be ${target} cm tall after **${w} weeks**.`],
      };
    }
  } else {
    // Tables pushed end to end: 1 table seats 6, each extra table adds 4 seats.
    const per = rng.pick([[6, 4], [4, 2], [8, 6]] as const);
    const [first, step] = per;
    if (!backwards) {
      const n = rng.int(8, 15);
      c = {
        text: `For a whānau dinner at the marae, tables are pushed together in a long row. 1 table seats ${first} people, 2 tables seat ${first + step}, and 3 tables seat ${first + 2 * step}.`,
        ask: `How many people can sit at ${n} tables?`,
        unit: '',
        start: first,
        step,
        answer: first + (n - 1) * step,
        hints: ['How many extra seats does each new table add?', `From 1 table to ${n} tables, how many tables are added?`],
        solution: [`Rule: start with ${first} and add ${step} each time.`, `From 1 table to ${n} tables, ${n - 1} tables are added: $${n - 1} \\times ${step} = ${(n - 1) * step}$ extra seats.`, `$${first} + ${(n - 1) * step} = ${first + (n - 1) * step}$, so **${first + (n - 1) * step} people** can sit.`],
      };
    } else {
      const n = rng.int(8, 15);
      const people = first + (n - 1) * step - rng.int(0, step - 1);
      c = {
        text: `For a whānau dinner at the marae, tables are pushed together in a long row. 1 table seats ${first} people, 2 tables seat ${first + step}, and 3 tables seat ${first + 2 * step}.`,
        ask: `${people} people are coming. What is the smallest number of tables they need?`,
        unit: '',
        start: first,
        step,
        answer: n,
        hints: [`The first table seats ${first}. How many more seats are needed after that?`, `Each extra table adds ${step} seats. How many extra tables give at least that many?`],
        solution: [
          `After the first table, they need ${people} − ${first} = ${people - first} more seats.`,
          `$${n - 2} \\times ${step} = ${(n - 2) * step}$ is not enough, but $${n - 1} \\times ${step} = ${(n - 1) * step}$ is enough. So they need ${n - 1} extra tables.`,
          `$1 + ${n - 1} = ${n}$ tables (seating ${first + (n - 1) * step} people).`,
        ],
      };
    }
  }
  return {
    type: 'numeric',
    prompt: `${c.text}\n\n${c.ask}`,
    answer: c.answer,
    form: 'integer',
    ...(c.unit ? { units: c.unit } : {}),
    marks: 2,
    calculator: 'not-allowed',
    hints: c.hints,
    solution: c.solution.join('\n\n'),
  };
}

function whichTerm(rng: Rng): TemplateOutput {
  const a = rng.int(1, 12);
  const d = rng.int(3, 9);
  const k = rng.int(10, 30);
  const N = term(a, d, k);
  return {
    type: 'numeric',
    prompt: `Here is a growing pattern:\n\n**${listTerms(a, d)}**\n\nThe pattern carries on. Which term number is ${N}? (Give the position, e.g. 3 for the 3rd term.)`,
    answer: k,
    form: 'integer',
    marks: 2,
    calculator: 'not-allowed',
    hints: [`How far is ${N} from the first term?`, `How many jumps of ${d} is that? Then remember the 1st term has had no jumps.`],
    solution: [
      `From the first term, ${a}, to ${N} is $${N} - ${a} = ${N - a}$.`,
      `$${N - a} \\div ${d} = ${k - 1}$ jumps.`,
      `${k - 1} jumps after the 1st term is the **${ordinal(k)}** term.`,
      `Check: $${a} + ${k - 1} \\times ${d} = ${N}$ ✓`,
    ].join('\n\n'),
  };
}

export const predictTerms: QuestionTemplate = {
  id: 'm6.alg.patterns.predict',
  topicId: 'm6.alg.patterns',
  title: 'Predict later terms and work backwards',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 4) return rng.chance(0.5) ? farTerm(rng) : contextQuestion(rng, false);
    return rng.chance(0.4) ? whichTerm(rng) : contextQuestion(rng, true);
  },
};

export const templates: QuestionTemplate[] = [nextTerm, ruleInWords, tableFromRule, shapePatterns, predictTerms];
