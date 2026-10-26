import type { Rng } from '../../../../rng';
import { NAMES, tex } from '../../../format';
import type { QuestionTemplate } from '../../../types';
import { hintsFor, parse, solutionText, toTex, value, type Tok } from './order-operations-helpers';

// m6.num.order-operations — brackets, then squares, then × and ÷ left to right, then + and −
// left to right. Year 6 has no GEMA name and no negative numbers, so every step is a whole
// number of 0 or more (the helpers reject anything else).

const IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

function retry<T>(fn: () => T | null): T {
  for (let i = 0; i < 1000; i++) {
    const v = fn();
    if (v !== null) return v;
  }
  throw new Error('order-operations: could not generate a question');
}

/** Picks a form, builds it, and keeps it only if every step is a whole number ≥ 0. */
function build(rng: Rng, forms: Array<() => string>, max = 500): Tok[] {
  return retry(() => {
    const toks = parse(rng.pick(forms)());
    const v = value(toks);
    return v === null || v > max ? null : toks;
  });
}

function numericQuestion(toks: Tok[], marks = 1) {
  return {
    type: 'numeric' as const,
    prompt: `Work out $${toTex(toks)}$.`,
    answer: value(toks)!,
    form: 'integer' as const,
    ...(marks > 1 && { marks }),
    calculator: 'not-allowed' as const,
    hints: hintsFor(toks),
    solution: solutionText(toks),
  };
}

// ---------------------------------------------------------------------------------------------

export const twoOps: QuestionTemplate = {
  id: 'm6.num.order-operations.two-ops',
  topicId: 'm6.num.order-operations',
  title: 'Two operations: × and ÷ before + and −, brackets, squares',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const i = (a: number, b: number) => rng.int(a, b);
    if (difficulty === 1) {
      return numericQuestion(
        build(rng, [
          () => `${i(2, 20)} + ${i(2, 9)} × ${i(2, 9)}`,
          () => `${i(2, 9)} × ${i(2, 9)} + ${i(2, 20)}`,
          () => {
            const b = i(2, 9);
            const c = i(2, 9);
            return `${b * c + i(1, 20)} - ${b} × ${c}`;
          },
          () => {
            const c = i(2, 9);
            return `${i(2, 20)} + ${c * i(2, 9)} ÷ ${c}`;
          },
          () => {
            const c = i(2, 9);
            const k = i(2, 9);
            return `${k + i(1, 20)} - ${c * k} ÷ ${c}`;
          },
        ]),
      );
    }
    return numericQuestion(
      build(rng, [
        () => `(${i(2, 12)} + ${i(2, 12)}) × ${i(2, 9)}`,
        () => {
          const b = i(2, 12);
          return `${i(2, 9)} × (${b + i(1, 9)} - ${b})`;
        },
        () => {
          const c = i(2, 9);
          const total = c * i(2, 9);
          const a = i(1, total - 1);
          return `(${a} + ${total - a}) ÷ ${c}`;
        },
        () => {
          const a = i(12, 50);
          return `${a} - ${i(2, a - 1)} + ${i(2, 20)}`;
        },
        () => {
          const b = i(2, 9);
          return `${b * i(2, 9)} ÷ ${b} × ${i(2, 9)}`;
        },
        () => {
          const b = i(2, 15);
          const c = i(2, 15);
          return `${b + c + i(1, 20)} - (${b} + ${c})`;
        },
        () => `${i(2, 30)} + ${i(2, 10)}^2`,
        () => {
          const a = i(3, 12);
          return `${a}^2 - ${i(1, a * a - 1)}`;
        },
      ]),
    );
  },
};

// ---------------------------------------------------------------------------------------------

export const multiStep: QuestionTemplate = {
  id: 'm6.num.order-operations.multi-step',
  topicId: 'm6.num.order-operations',
  title: 'Three or more operations, and missing numbers',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const i = (a: number, b: number) => rng.int(a, b);
    if (difficulty === 3) {
      return numericQuestion(
        build(rng, [
          () => `${i(2, 20)} + ${i(2, 9)} × ${i(2, 9)} - ${i(1, 20)}`,
          () => `${i(2, 9)} × ${i(2, 9)} + ${i(2, 9)} × ${i(2, 9)}`,
          () => `${i(5, 12)} × ${i(5, 9)} - ${i(2, 6)} × ${i(2, 6)}`,
          () => `(${i(2, 9)} + ${i(2, 9)}) × ${i(2, 6)} - ${i(1, 20)}`,
          () => `${i(2, 10)}^2 + ${i(2, 9)} × ${i(2, 9)}`,
          () => {
            const a = i(2, 8);
            return `(${a} + ${i(1, 12 - a)})^2`;
          },
          () => {
            const b = i(2, 9);
            return `${b * i(2, 9)} ÷ ${b} + ${i(2, 9)} × ${i(2, 9)}`;
          },
        ]),
      );
    }
    // difficulty 4
    if (rng.chance(0.4)) {
      // Missing number: undo the operations in reverse order.
      const m = i(2, 12);
      const kind = rng.pick(['a+mb', 'mb-a', '(m+a)b', 'm/b+a'] as const);
      const a = i(2, 20);
      const b = i(2, 9);
      let lhs: string;
      let R: number;
      let steps: string[];
      switch (kind) {
        case 'a+mb':
          R = a + m * b;
          lhs = `${a} + \\square \\times ${b}`;
          steps = [
            `× comes before +, so ${a} is added to the answer of $\\square \\times ${b}$.`,
            `So $\\square \\times ${b} = ${R} - ${a} = ${m * b}$.`,
            `$${m} \\times ${b} = ${m * b}$, so the missing number is **${m}**.`,
          ];
          break;
        case 'mb-a': {
          const a2 = i(1, m * b - 1);
          R = m * b - a2;
          lhs = `\\square \\times ${b} - ${a2}`;
          steps = [
            `× comes before −, so ${a2} is taken away from the answer of $\\square \\times ${b}$.`,
            `So $\\square \\times ${b} = ${R} + ${a2} = ${m * b}$.`,
            `$${m} \\times ${b} = ${m * b}$, so the missing number is **${m}**.`,
          ];
          break;
        }
        case '(m+a)b':
          R = (m + a) * b;
          lhs = `(\\square + ${a}) \\times ${b}`;
          steps = [
            `The bracket is worked out first, then multiplied by ${b}.`,
            `So the bracket must equal $${R} \\div ${b} = ${m + a}$.`,
            `$\\square + ${a} = ${m + a}$, so the missing number is **${m}**.`,
          ];
          break;
        default:
          R = m + a;
          lhs = `\\square \\div ${b} + ${a}`;
          steps = [
            `÷ comes before +, so ${a} is added to the answer of $\\square \\div ${b}$.`,
            `So $\\square \\div ${b} = ${R} - ${a} = ${m}$.`,
            `$${m * b} \\div ${b} = ${m}$, so the missing number is **${m * b}**.`,
          ];
      }
      const answer = kind === 'm/b+a' ? m * b : m;
      return {
        type: 'numeric',
        prompt: `Find the missing number.\n\n$${lhs} = ${R}$`,
        answer,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Which operation is done last? Undo that one first.', 'Then work out what the part with the box must equal.'],
        solution: `${steps.join('\n\n')}\n\nCheck: put ${answer} in the box and work it out. You get ${R} ✓`,
      };
    }
    return numericQuestion(
      build(rng, [
        () => {
          const b = i(1, 4);
          return `${i(2, 5)} × (${b} + ${i(1, 6 - b)})^2`;
        },
        () => {
          const a = i(2, 5);
          const b = i(1, 4);
          return `${(a + b) * i(2, 9)} ÷ (${a} + ${b}) × ${i(2, 9)}`;
        },
        () => `${i(5, 12)}^2 - ${i(2, 9)} × ${i(2, 9)} + ${i(2, 20)}`,
        () => {
          const d = i(1, 5);
          return `(${i(2, 9)} + ${i(2, 9)}) × (${d + i(1, 6)} - ${d})`;
        },
        () => `${i(2, 30)} + ${rng.pick([4, 6, 8, 10, 12])}^2 ÷ ${rng.pick([2, 4])}`,
        () => `${i(4, 9)} × ${i(4, 9)} - (${i(1, 5)} + ${i(1, 5)}) × ${i(2, 5)}`,
      ]),
      2,
    );
  },
};

// ---------------------------------------------------------------------------------------------

interface Mistake {
  toks: Tok[];
  wrong: number;
  right: string;
  options: Array<{ text: string; why: string }>;
}

export const spotMistake: QuestionTemplate = {
  id: 'm6.num.order-operations.spot-mistake',
  topicId: 'm6.num.order-operations',
  title: 'Spot the mistake in the order of operations',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const i = (a: number, b: number) => rng.int(a, b);
    const m: Mistake = retry((): Mistake | null => {
      const kind = difficulty === 2 ? rng.pick(['a+bc', 'a-bc'] as const) : rng.pick(['a-b+c', 'a/b*c', '(a+b)^2', 'a*b^2'] as const);
      if (kind === 'a+bc') {
        const [a, b, c] = [i(2, 15), i(2, 9), i(2, 9)];
        const v = a + b * c;
        const w = (a + b) * c;
        const sum = a + b + c;
        if (w === v || sum === v || sum === w) return null;
        return {
          toks: parse(`${a} + ${b} × ${c}`),
          wrong: w,
          right: `No. Multiply first: ${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${v}.`,
          options: [
            { text: 'Yes. You always work from left to right.', why: 'Left to right is only for operations with the same rank. × comes before +.' },
            { text: 'Yes. Adding comes before multiplying.', why: "It's the other way round: × and ÷ come before + and −." },
            { text: `No. Add all three numbers: the answer is ${sum}.`, why: "There is a × sign, so you can't just add the numbers." },
          ],
        };
      }
      if (kind === 'a-bc') {
        const [b, c] = [i(2, 6), i(2, 6)];
        const a = b * c + i(b, 20);
        const v = a - b * c;
        const w = (a - b) * c;
        const sub = a - b - c;
        if (w === v || sub === v || sub === w) return null;
        return {
          toks: parse(`${a} - ${b} × ${c}`),
          wrong: w,
          right: `No. Multiply first: ${b} × ${c} = ${b * c}, then ${a} − ${b * c} = ${v}.`,
          options: [
            { text: 'Yes. You always work from left to right.', why: 'Left to right is only for operations with the same rank. × comes before −.' },
            { text: 'Yes. Subtracting comes before multiplying.', why: "It's the other way round: × and ÷ come before + and −." },
            { text: `No. Take away both numbers: the answer is ${sub}.`, why: `There is a × sign, so ${c} isn't taken away on its own. Work out ${b} × ${c} first.` },
          ],
        };
      }
      if (kind === 'a-b+c') {
        const b = i(3, 12);
        const c = i(2, 12);
        const a = b + c + i(2, 25);
        const v = a - b + c;
        const w = a - (b + c);
        return {
          toks: parse(`${a} - ${b} + ${c}`),
          wrong: w,
          right: `No. Work from left to right: ${a} − ${b} = ${a - b}, then ${a - b} + ${c} = ${v}.`,
          options: [
            { text: 'Yes. Always add before you subtract.', why: '+ and − have the same rank, so work from left to right.' },
            { text: "Yes. The order doesn't matter when there is no × or ÷.", why: `It does matter: ${a} − ${b} + ${c} is ${v}, but ${a} − (${b} + ${c}) is ${w}.` },
            { text: `No. Add all three numbers: the answer is ${a + b + c}.`, why: 'There is a − sign, so you need to take away the second number.' },
          ],
        };
      }
      if (kind === 'a/b*c') {
        const b = i(2, 5);
        const c = i(2, 5);
        const a = b * c * i(2, 6);
        const v = (a / b) * c;
        const w = a / (b * c);
        const all = a * b * c;
        if (all > 999) return null;
        return {
          toks: parse(`${a} ÷ ${b} × ${c}`),
          wrong: w,
          right: `No. Work from left to right: ${a} ÷ ${b} = ${a / b}, then ${a / b} × ${c} = ${v}.`,
          options: [
            { text: 'Yes. Always multiply before you divide.', why: '× and ÷ have the same rank, so work from left to right.' },
            { text: "Yes. The order doesn't matter for × and ÷.", why: `It does matter: ${a} ÷ ${b} × ${c} is ${v}, but ${a} ÷ (${b} × ${c}) is ${w}.` },
            { text: `No. Multiply all three numbers: the answer is ${all}.`, why: 'There is a ÷ sign, so you need to divide by the second number.' },
          ],
        };
      }
      if (kind === '(a+b)^2') {
        const a = i(1, 7);
        const b = i(2, 12 - a);
        const s = a + b;
        const v = s * s;
        const w = a * a + b * b;
        const dbl = 2 * s;
        if (dbl === w || w === v) return null;
        return {
          toks: parse(`(${a} + ${b})^2`),
          wrong: w,
          right: `No. Brackets first: ${a} + ${b} = ${s}, then ${s}² = ${s} × ${s} = ${v}.`,
          options: [
            { text: 'Yes. Square each number, then add.', why: 'The small 2 is outside the brackets, so it squares the answer to the bracket.' },
            { text: 'Yes. Squares always come before brackets.', why: 'Brackets come first, then squares.' },
            { text: `No. The answer is ${dbl}, because squaring means doubling.`, why: `Squaring means multiplying a number by itself: ${s} × ${s}, not ${s} × 2.` },
          ],
        };
      }
      // a × b²
      const a = i(2, 6);
      const b = i(3, 9);
      const v = a * b * b;
      const w = (a * b) ** 2;
      const dbl = a * b * 2;
      if (w > 999 || dbl === v) return null;
      return {
        toks: parse(`${a} × ${b}^2`),
        wrong: w,
        right: `No. Square first: ${b}² = ${b * b}, then ${a} × ${b * b} = ${v}.`,
        options: [
          { text: 'Yes. Multiply first, then square.', why: `Squares come before × and ÷. The small 2 is only on the ${b}.` },
          { text: 'Yes. You always work from left to right.', why: 'Squares come before × and ÷, even when they are on the right.' },
          { text: `No. The answer is ${dbl}, because squaring means doubling.`, why: `Squaring means multiplying a number by itself: ${b} × ${b}, not ${b} × 2.` },
        ],
      };
    });
    const all = rng.shuffle([{ text: m.right, why: '' }, ...m.options]);
    const correctIdx = all.findIndex((o) => o.text === m.right);
    return {
      type: 'mcq',
      prompt: `${name} worked out $${toTex(m.toks)}$ and got **${m.wrong}**. Is ${name} right?`,
      options: all.map((o, k) => ({ id: IDS[k]!, text: o.text })),
      correct: IDS[correctIdx]!,
      feedback: Object.fromEntries(all.map((o, k) => [IDS[k]!, o.why] as const).filter((_, k) => k !== correctIdx)),
      calculator: 'not-allowed',
      hints: ['Work it out yourself first, using the order of operations.', ...hintsFor(m.toks).slice(0, 1)],
      solution: `${name} is not right.\n\n${solutionText(m.toks)}`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

/** Every way to put one or two pairs of brackets into a b c d with ops o1 o2 o3 (plus none). */
function placements(n: number[], o: string[]): string[] {
  const spans: Array<Array<[number, number]>> = [[], [[0, 1]], [[1, 2]], [[2, 3]], [[0, 2]], [[1, 3]], [[0, 1], [2, 3]]];
  return spans.map((sp) => {
    let s = '';
    for (let k = 0; k < n.length; k++) {
      if (sp.some(([a]) => a === k)) s += '(';
      s += String(n[k]);
      if (sp.some(([, b]) => b === k)) s += ')';
      if (k < o.length) s += ` ${o[k]} `;
    }
    return s;
  });
}

export const brackets: QuestionTemplate = {
  id: 'm6.num.order-operations.brackets',
  topicId: 'm6.num.order-operations',
  title: 'Use brackets to change the answer',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const i = (a: number, b: number) => rng.int(a, b);
    if (difficulty === 3) {
      // Which calculation has the answer T?
      const pick = retry(() => {
        const [a, b, c] = [i(2, 9), i(2, 9), i(2, 9)];
        const [o1, o2] = rng.pick([
          ['+', '×'],
          ['×', '+'],
          ['-', '×'],
          ['×', '-'],
        ] as const);
        const forms = [
          `(${a} ${o1} ${b}) ${o2} ${c}`,
          `${a} ${o1} ${b} ${o2} ${c}`,
          `${a} ${o1} (${b} ${o2} ${c})`,
          `(${a} ${o2} ${b}) ${o1} ${c}`,
          `${a} ${o2} (${b} ${o1} ${c})`,
          `${a} ${o2} ${b} ${o1} ${c}`,
        ].map((s) => ({ toks: parse(s), v: value(parse(s)) }));
        const valid = forms.filter((f): f is { toks: Tok[]; v: number } => f.v !== null);
        const candidates = valid.filter((f) => f.toks.some((t) => t.k === '(') && valid.filter((g) => g.v === f.v).length === 1);
        if (!candidates.length) return null;
        const correct = rng.pick(candidates);
        if (correct.v === 0) return null;
        const others = rng.shuffle(valid.filter((f) => f.v !== correct.v));
        if (others.length < 3) return null;
        return { correct, others: others.slice(0, 3) };
      });
      const all = rng.shuffle([pick.correct, ...pick.others]);
      const correctIdx = all.indexOf(pick.correct);
      return {
        type: 'mcq',
        prompt: `Which calculation has the answer **${pick.correct.v}**?`,
        options: all.map((f, k) => ({ id: IDS[k]!, text: `$${toTex(f.toks)}$` })),
        correct: IDS[correctIdx]!,
        feedback: Object.fromEntries(all.map((f, k) => [IDS[k]!, `$${toTex(f.toks)} = ${tex(f.v)}$`] as const).filter((_, k) => k !== correctIdx)),
        calculator: 'not-allowed',
        hints: ['Work out each calculation using the order of operations.', 'Brackets first, then × and ÷, then + and −.'],
        solution: solutionText(pick.correct.toks),
      };
    }

    // difficulty 4: where do the brackets go?
    const pick = retry(() => {
      const n = [i(2, 9), i(2, 9), i(2, 9), i(1, 9)];
      const o = rng.pick([
        ['+', '×', '-'],
        ['×', '+', '×'],
        ['-', '+', '×'],
        ['+', '×', '+'],
        ['×', '-', '+'],
      ] as const);
      const forms = placements(n, [...o]).map((s, k) => ({ toks: parse(s), v: value(parse(s)), none: k === 0 }));
      const valid = forms.filter((f): f is { toks: Tok[]; v: number; none: boolean } => f.v !== null && f.v <= 300);
      const plain = forms[0]!;
      if (plain.v === null) return null;
      const candidates = valid.filter((f) => !f.none && valid.filter((g) => g.v === f.v).length === 1);
      if (!candidates.length) return null;
      const correct = rng.pick(candidates);
      const others = rng.shuffle(valid.filter((f) => f.v !== correct.v && !f.none));
      if (others.length < 2) return null;
      const distractors = [...others.slice(0, 2), plain as { toks: Tok[]; v: number; none: boolean }];
      return { correct, distractors, plain };
    });
    const all = rng.shuffle([pick.correct, ...pick.distractors]);
    const correctIdx = all.indexOf(pick.correct);
    const label = (f: { toks: Tok[]; none: boolean }) => (f.none ? `$${toTex(f.toks)}$ (no brackets needed)` : `$${toTex(f.toks)}$`);
    return {
      type: 'mcq',
      prompt: `Where do the brackets go to make this true?\n\n$${toTex(pick.plain.toks)} = ${pick.correct.v}$`,
      options: all.map((f, k) => ({ id: IDS[k]!, text: label(f) })),
      correct: IDS[correctIdx]!,
      feedback: Object.fromEntries(
        all.map((f, k) => [IDS[k]!, `$${toTex(f.toks)} = ${tex(f.v)}$, not ${pick.correct.v}.`] as const).filter((_, k) => k !== correctIdx),
      ),
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Try each option. Work out the brackets first, then use the order of operations.', `Without brackets, the answer would be ${pick.plain.v}. Which part needs to be done first to change it?`],
      solution: `Without brackets, $${toTex(pick.plain.toks)} = ${tex(pick.plain.v!)}$.\n\nWith the brackets in the right place:\n\n${solutionText(pick.correct.toks)}`,
    };
  },
};

// ---------------------------------------------------------------------------------------------

export const wordProblems: QuestionTemplate = {
  id: 'm6.num.order-operations.word-problems',
  topicId: 'm6.num.order-operations',
  title: 'Word problems that need more than one operation',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const i = (a: number, b: number) => rng.int(a, b);
    if (difficulty === 4) {
      const kind = rng.pick(['change', 'stickers', 'vans', 'eggs'] as const);
      let story: string;
      let expr: string;
      let units: string | undefined;
      let intro: string;
      if (kind === 'change') {
        const { p, c, d, note } = retry(() => {
          const p = i(2, 5);
          const c = i(3, 6);
          const d = i(2, 4);
          const note = rng.pick([20, 50]);
          return p * c + d < note ? { p, c, d, note } : null;
        });
        story = `${name} buys ${p} mince pies at \\$${c} each and a drink for \\$${d}. ${name} pays with a \\$${note} note. How much change does ${name} get?`;
        expr = `${note} - (${p} × ${c} + ${d})`;
        units = '$';
        intro = `The cost is ${p} × ${c} + ${d}. The change is \\$${note} take away the cost, so the cost goes in brackets.`;
      } else if (kind === 'stickers') {
        const { p, q, f, g } = retry(() => {
          const p = i(3, 9);
          const q = rng.pick([6, 8, 10, 12]);
          const f = i(2, 6);
          const g = i(2, 5);
          return p * q > f * g + 4 ? { p, q, f, g } : null;
        });
        story = `${name} has ${p} packs of stickers with ${q} stickers in each pack. ${name} gives ${g} stickers to each of ${f} friends. How many stickers does ${name} have left?`;
        expr = `${p} × ${q} - ${f} × ${g}`;
        intro = `Stickers at the start: ${p} × ${q}. Stickers given away: ${f} × ${g}. Both multiplications are done before the subtraction, so no brackets are needed.`;
      } else if (kind === 'vans') {
        const v = i(5, 9);
        const n = i(3, 8);
        const t = i(2, 5);
        const s = v * n - t;
        story = `${s} students and ${t} teachers are going on school camp. Each van carries ${v} people, and every van will be full. How many vans do they need?`;
        expr = `(${s} + ${t}) ÷ ${v}`;
        intro = `First find how many people are going, then divide by ${v}. The adding has to happen first, so it goes in brackets.`;
      } else {
        const e = i(2, 4);
        const r = i(2, 6);
        const mm = i(2, 6);
        const room = i(3, 18);
        story = `A muffin recipe uses ${e} eggs. Room ${room} makes ${r} batches for the school fair and ${mm} more batches for the marae open day. How many eggs do they need altogether?`;
        expr = `(${r} + ${mm}) × ${e}`;
        intro = `First find the total number of batches, then multiply by ${e} eggs. The adding has to happen first, so it goes in brackets.`;
      }
      const toks = parse(expr);
      return {
        type: 'numeric',
        prompt: story,
        answer: value(toks)!,
        form: 'integer',
        ...(units && { units }),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Write the problem as one calculation. Which part has to be worked out first?', 'Use brackets for any part that must be done first.'],
        solution: `${intro}\n\n${solutionText(toks)}`,
      };
    }

    // difficulty 5
    const kind = rng.pick(['tickets', 'share', 'which'] as const);
    if (kind === 'tickets') {
      const { A, C, x, y, note } = retry(() => {
        const A = i(12, 20);
        const C = i(5, 9);
        const x = i(2, 3);
        const y = i(2, 4);
        const note = rng.pick([50, 100]);
        return x * A + y * C < note ? { A, C, x, y, note } : null;
      });
      const toks = parse(`${note} - (${x} × ${A} + ${y} × ${C})`);
      return {
        type: 'numeric',
        prompt: `Entry to the aquarium costs \\$${A} for an adult and \\$${C} for a child. ${name}'s whānau buys ${x} adult tickets and ${y} child tickets. They pay with \\$${note}. How much change do they get?`,
        answer: value(toks)!,
        form: 'integer',
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['First work out the total cost of the tickets.', 'Then take the total cost away from the money they paid.'],
        solution: `Total cost: ${x} × ${A} + ${y} × ${C}. The change is \\$${note} take away the total, so the total goes in brackets.\n\n${solutionText(toks)}`,
      };
    }
    if (kind === 'share') {
      const { pizza, q, b, n } = retry(() => {
        const n = i(2, 5);
        const q = i(2, 5);
        const b = i(2, 4);
        const pizza = i(12, 30);
        return (pizza + q * b) % n === 0 ? { pizza, q, b, n } : null;
      });
      const toks = parse(`(${pizza} + ${q} × ${b}) ÷ ${n}`);
      return {
        type: 'numeric',
        prompt: `${n} friends buy a family pizza for \\$${pizza} and ${q} drinks at \\$${b} each. They share the total cost equally. How much does each friend pay?`,
        answer: value(toks)!,
        form: 'integer',
        units: '$',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['First find the total cost: the pizza plus the drinks.', `Then share the total equally between ${n} friends.`],
        solution: `Total cost: ${pizza} + ${q} × ${b}. The whole total is shared, so it goes in brackets before dividing by ${n}.\n\n${solutionText(toks)}`,
      };
    }
    // Which calculation matches the story?
    const { p, c, d, note } = retry(() => {
      const p = i(2, 5);
      const c = i(3, 6);
      const d = i(2, 4);
      const note = rng.pick([20, 50]);
      return p * c + d < note && p !== c ? { p, c, d, note } : null;
    });
    const right = `${note} - (${p} × ${c} + ${d})`;
    const opts = [
      { s: right, why: '' },
      { s: `${note} - ${p} × ${c} + ${d}`, why: `Without brackets, the \\$${d} is added back on at the end instead of being taken away.` },
      { s: `(${note} - ${p}) × ${c} + ${d}`, why: `This takes the number of sausage rolls away from the money, which doesn't make sense.` },
      { s: `${note} - (${p} + ${c}) × ${d}`, why: `This adds the number of sausage rolls to the price of one, then multiplies by the price of the juice.` },
    ];
    const all = rng.shuffle(opts);
    const correctIdx = all.findIndex((o) => o.s === right);
    const toks = parse(right);
    return {
      type: 'mcq',
      prompt: `${name} buys ${p} sausage rolls at \\$${c} each and a juice for \\$${d}. ${name} pays with a \\$${note} note.\n\nWhich calculation gives ${name}'s change?`,
      options: all.map((o, k) => ({ id: IDS[k]!, text: `$${toTex(parse(o.s))}$` })),
      correct: IDS[correctIdx]!,
      feedback: Object.fromEntries(all.map((o, k) => [IDS[k]!, o.why] as const).filter((_, k) => k !== correctIdx)),
      marks: 2,
      calculator: 'not-allowed',
      hints: ['What is the total cost? Write that part first.', 'The change is the money paid take away the total cost. Does the total need brackets?'],
      solution: `The total cost is ${p} × ${c} + ${d}. The change is \\$${note} take away the **whole** cost, so the cost goes in brackets: $${toTex(toks)}$.\n\n${solutionText(toks)}\n\n${name} gets \\$${value(toks)} change.`,
    };
  },
};

export const templates: QuestionTemplate[] = [twoOps, multiStep, spotMistake, brackets, wordProblems];
