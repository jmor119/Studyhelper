import type { QuestionTemplate } from '../../../types';
import { NAMES } from '../../../format';
import { LETTERS, cash, mcqFields, pickLetters, type Choice } from './notation-helpers';

// m7.alg.substitution — substituting into expressions and formulae, using formulae to find an
// unknown, and rearranging formulae in one or two steps. Year 7 scope: values are positive whole
// numbers (no multiplying negatives), and every answer is a whole number.
//
// Marking note: expression answers must use lowercase single letters, so typed rearranging
// questions use lowercase formulae (y = 3x + 2). Known formulae with capitals (A = lw) are MCQs.

const NO_CALC = { calculator: 'not-allowed' as const };

const SUB_HINTS = ['Replace each letter with its value.', 'A number next to a letter means multiply: $3a$ means $3 \\times a$.'];

interface Eval {
  expr: string;
  values: Array<[string, number]>;
  answer: number;
  working: string;
}

export const evaluate: QuestionTemplate = {
  id: 'm7.alg.substitution.evaluate',
  topicId: 'm7.alg.substitution',
  title: 'Substitute into an expression',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    const [u, w] = pickLetters(rng, 2) as [string, string];
    let e: Eval;

    if (difficulty === 1) {
      const kind = rng.pick(['plus', 'minus-from', 'minus', 'times', 'divide'] as const);
      if (kind === 'plus') {
        const x = rng.int(2, 30);
        const c = rng.int(2, 20);
        e = { expr: `${v} + ${c}`, values: [[v, x]], answer: x + c, working: `${x} + ${c} = ${x + c}` };
      } else if (kind === 'minus-from') {
        const c = rng.int(15, 40);
        const x = rng.int(2, c - 1);
        e = { expr: `${c} - ${v}`, values: [[v, x]], answer: c - x, working: `${c} - ${x} = ${c - x}` };
      } else if (kind === 'minus') {
        const x = rng.int(10, 40);
        const c = rng.int(2, x - 1);
        e = { expr: `${v} - ${c}`, values: [[v, x]], answer: x - c, working: `${x} - ${c} = ${x - c}` };
      } else if (kind === 'times') {
        const c = rng.int(2, 9);
        const x = rng.int(2, 12);
        e = { expr: `${c}${v}`, values: [[v, x]], answer: c * x, working: `${c} \\times ${x} = ${c * x}` };
      } else {
        const c = rng.int(2, 9);
        const k = rng.int(2, 12);
        e = { expr: `\\frac{${v}}{${c}}`, values: [[v, c * k]], answer: k, working: `${c * k} \\div ${c} = ${k}` };
      }
    } else if (difficulty === 2) {
      const kind = rng.pick(['linear-plus', 'linear-minus', 'square', 'two-add', 'two-times', 'two-minus'] as const);
      if (kind === 'linear-plus' || kind === 'linear-minus') {
        const a = rng.int(2, 9);
        const x = rng.int(2, 10);
        const b = kind === 'linear-plus' ? rng.int(1, 20) : rng.int(1, a * x - 1);
        const op = kind === 'linear-plus' ? '+' : '-';
        const ans = kind === 'linear-plus' ? a * x + b : a * x - b;
        e = { expr: `${a}${v} ${op} ${b}`, values: [[v, x]], answer: ans, working: `${a} \\times ${x} ${op} ${b} = ${a * x} ${op} ${b} = ${ans}` };
      } else if (kind === 'square') {
        const x = rng.int(2, 12);
        e = { expr: `${v}^2`, values: [[v, x]], answer: x * x, working: `${x} \\times ${x} = ${x * x}` };
      } else {
        const p = rng.int(2, 9);
        const q = rng.int(2, 9);
        if (kind === 'two-add') e = { expr: `${u} + ${w}`, values: [[u, p], [w, q]], answer: p + q, working: `${p} + ${q} = ${p + q}` };
        else if (kind === 'two-times') e = { expr: `${u}${w}`, values: [[u, p], [w, q]], answer: p * q, working: `${p} \\times ${q} = ${p * q}` };
        else {
          const big = p + q + rng.int(1, 6);
          e = { expr: `${u} - ${w}`, values: [[u, big], [w, q]], answer: big - q, working: `${big} - ${q} = ${big - q}` };
        }
      }
    } else {
      const kind = rng.pick(['two-linear', 'square-plus', 'product-minus', 'cube', 'bracket', 'fraction-sum'] as const);
      if (kind === 'two-linear') {
        const [a, b, p, q] = [rng.int(2, 6), rng.int(2, 6), rng.int(2, 10), rng.int(2, 10)];
        const ans = a * p + b * q;
        e = { expr: `${a}${u} + ${b}${w}`, values: [[u, p], [w, q]], answer: ans, working: `${a} \\times ${p} + ${b} \\times ${q} = ${a * p} + ${b * q} = ${ans}` };
      } else if (kind === 'square-plus') {
        const [p, q] = [rng.int(2, 10), rng.int(2, 20)];
        e = { expr: `${u}^2 + ${w}`, values: [[u, p], [w, q]], answer: p * p + q, working: `${p} \\times ${p} + ${q} = ${p * p} + ${q} = ${p * p + q}` };
      } else if (kind === 'product-minus') {
        const [p, q] = [rng.int(2, 9), rng.int(2, 9)];
        const c = rng.int(1, p * q - 1);
        e = { expr: `${u}${w} - ${c}`, values: [[u, p], [w, q]], answer: p * q - c, working: `${p} \\times ${q} - ${c} = ${p * q} - ${c} = ${p * q - c}` };
      } else if (kind === 'cube') {
        const x = rng.int(2, 5);
        e = { expr: `${v}^3`, values: [[v, x]], answer: x ** 3, working: `${x} \\times ${x} \\times ${x} = ${x * x} \\times ${x} = ${x ** 3}` };
      } else if (kind === 'bracket') {
        const [a, x, b] = [rng.int(2, 6), rng.int(1, 10), rng.int(1, 9)];
        e = { expr: `${a}(${v} + ${b})`, values: [[v, x]], answer: a * (x + b), working: `${a} \\times (${x} + ${b}) = ${a} \\times ${x + b} = ${a * (x + b)}` };
      } else {
        const c = rng.int(2, 5);
        const s = c * rng.int(2, 8);
        const p = rng.int(1, s - 1);
        e = {
          expr: `\\frac{${u} + ${w}}{${c}}`,
          values: [[u, p], [w, s - p]],
          answer: s / c,
          working: `\\frac{${p} + ${s - p}}{${c}} = \\frac{${s}}{${c}} = ${s / c}`,
        };
      }
    }

    const given = e.values.map(([l, x]) => `$${l} = ${x}$`).join(' and ');
    return {
      type: 'numeric',
      ...NO_CALC,
      prompt: `Find the value of $${e.expr}$ when ${given}.`,
      answer: e.answer,
      form: 'integer',
      hints:
        difficulty === 3
          ? [...SUB_HINTS, 'Use the order of operations: brackets, then powers, then × and ÷, then + and −.']
          : SUB_HINTS,
      solution: `Replace ${e.values.length > 1 ? 'each letter with its value' : `$${e.values[0]![0]}$ with ${e.values[0]![1]}`}:\n\n$${e.expr} = ${e.working}$`,
    };
  },
};

interface Formula {
  intro: string;
  formula: string;
  ask: string;
  answer: number;
  units?: string;
  working: string;
  /** Second hint, when the default one doesn't fit this case. */
  hint?: string;
}

export const formulae: QuestionTemplate = {
  id: 'm7.alg.substitution.formulae',
  topicId: 'm7.alg.substitution',
  title: 'Use a formula (including finding an unknown value)',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    let f: Formula;
    if (difficulty === 2) {
      const kind = rng.pick(['rect-area', 'square-perimeter', 'square-area', 'prism-volume'] as const);
      if (kind === 'rect-area') {
        const l = rng.int(3, 12);
        const w = rng.int(2, 9);
        f = { intro: 'The area of a rectangle is', formula: 'A = lw', ask: `Find $A$ when $l = ${l}$ cm and $w = ${w}$ cm.`, answer: l * w, units: 'cm²', working: `A = ${l} \\times ${w} = ${l * w}` };
      } else if (kind === 'square-perimeter') {
        const l = rng.int(2, 25);
        f = { intro: 'The perimeter of a square is', formula: 'P = 4l', ask: `Find $P$ when $l = ${l}$ m.`, answer: 4 * l, units: 'm', working: `P = 4 \\times ${l} = ${4 * l}` };
      } else if (kind === 'square-area') {
        const l = rng.int(2, 12);
        f = { intro: 'The area of a square is', formula: 'A = l^2', ask: `Find $A$ when $l = ${l}$ cm.`, answer: l * l, units: 'cm²', working: `A = ${l}^2 = ${l} \\times ${l} = ${l * l}` };
      } else {
        const [l, w, h] = [rng.int(2, 6), rng.int(2, 5), rng.int(2, 5)];
        f = {
          intro: 'The volume of a rectangular prism is',
          formula: 'V = lwh',
          ask: `Find $V$ when $l = ${l}$ cm, $w = ${w}$ cm and $h = ${h}$ cm.`,
          answer: l * w * h,
          units: 'cm³',
          working: `V = ${l} \\times ${w} \\times ${h} = ${l * w} \\times ${h} = ${l * w * h}`,
        };
      }
    } else if (difficulty === 3) {
      const kind = rng.pick(['rect-perimeter', 'triangle-area', 'kayak', 'chairs'] as const);
      if (kind === 'rect-perimeter') {
        const l = rng.int(5, 20);
        const w = rng.int(2, l - 1);
        f = {
          intro: 'The perimeter of a rectangle is',
          formula: 'P = 2(l + w)',
          ask: `A rectangular vegetable garden is ${l} m long and ${w} m wide. Use the formula to find its perimeter.`,
          answer: 2 * (l + w),
          units: 'm',
          working: `P = 2 \\times (${l} + ${w}) = 2 \\times ${l + w} = ${2 * (l + w)}`,
        };
      } else if (kind === 'triangle-area') {
        let b = rng.int(2, 12);
        let h = rng.int(2, 10);
        if ((b * h) % 2 === 1) b += 1;
        if (b === h) h += 2;
        f = {
          intro: 'The area of a triangle is',
          formula: 'A = \\frac{bh}{2}',
          ask: `Find $A$ when the base $b = ${b}$ cm and the height $h = ${h}$ cm.`,
          answer: (b * h) / 2,
          units: 'cm²',
          working: `A = \\frac{${b} \\times ${h}}{2} = \\frac{${b * h}}{2} = ${(b * h) / 2}`,
        };
      } else if (kind === 'kayak') {
        const r = rng.pick([8, 10, 12, 15, 20]);
        const fee = rng.pick([5, 10, 15]);
        const h = rng.int(2, 6);
        f = {
          intro: `The cost, in dollars, of hiring a kayak at the lake for $h$ hours is`,
          formula: `C = ${r}h + ${fee}`,
          ask: `Find the cost of hiring a kayak for ${h} hours.`,
          answer: r * h + fee,
          units: '$',
          working: `C = ${r} \\times ${h} + ${fee} = ${r * h} + ${fee} = ${r * h + fee}`,
        };
      } else {
        const per = rng.pick([2, 4]);
        const extra = per === 2 ? 2 : rng.pick([2, 4]);
        const tables = rng.int(3, 15);
        f = {
          intro: `For a school camp dinner, tables are pushed together in a long row. The number of chairs that fit around $t$ tables is`,
          formula: `c = ${per}t + ${extra}`,
          ask: `How many chairs fit around ${tables} tables?`,
          answer: per * tables + extra,
          working: `c = ${per} \\times ${tables} + ${extra} = ${per * tables} + ${extra} = ${per * tables + extra}`,
        };
      }
    } else if (difficulty === 4) {
      const kind = rng.pick(['area-width', 'square-side', 'prism-height', 'perimeter-width', 'square-area-side', 'triangle-height'] as const);
      if (kind === 'area-width') {
        const l = rng.int(4, 12);
        const w = rng.int(2, 9);
        f = {
          intro: 'The area of a rectangle is',
          formula: 'A = lw',
          ask: `A rectangle has an area of ${l * w} cm² and a length of ${l} cm. Find its width, $w$.`,
          answer: w,
          units: 'cm',
          working: `${l * w} = ${l} \\times w`,
        };
        f.working += `$\n\n$w$ is the number that ${l} is multiplied by to make ${l * w}: $w = ${l * w} \\div ${l} = ${w}`;
      } else if (kind === 'square-side') {
        const l = rng.int(3, 25);
        f = {
          intro: 'The perimeter of a square is',
          formula: 'P = 4l',
          ask: `A square has a perimeter of ${4 * l} m. Find the length of one side, $l$.`,
          answer: l,
          units: 'm',
          working: `${4 * l} = 4 \\times l$, so $l = ${4 * l} \\div 4 = ${l}`,
        };
      } else if (kind === 'prism-height') {
        const [l, w, h] = [rng.int(2, 6), rng.int(2, 5), rng.int(2, 6)];
        f = {
          intro: 'The volume of a rectangular prism is',
          formula: 'V = lwh',
          ask: `A box has a volume of ${l * w * h} cm³. It is ${l} cm long and ${w} cm wide. Find its height, $h$.`,
          answer: h,
          units: 'cm',
          working: `${l * w * h} = ${l} \\times ${w} \\times h = ${l * w} \\times h$, so $h = ${l * w * h} \\div ${l * w} = ${h}`,
        };
      } else if (kind === 'perimeter-width') {
        const l = rng.int(6, 20);
        const w = rng.int(2, l - 1);
        f = {
          intro: 'The perimeter of a rectangle is',
          formula: 'P = 2(l + w)',
          ask: `A rectangular netball court drawn on a plan has a perimeter of ${2 * (l + w)} cm and a length of ${l} cm. Find its width, $w$.`,
          answer: w,
          units: 'cm',
          working: `${2 * (l + w)} = 2 \\times (${l} + w)$, so $${l} + w = ${2 * (l + w)} \\div 2 = ${l + w}$, so $w = ${l + w} - ${l} = ${w}`,
        };
      } else if (kind === 'square-area-side') {
        const l = rng.int(3, 12);
        f = {
          intro: 'The area of a square is',
          formula: 'A = l^2',
          ask: `A square tile has an area of ${l * l} cm². Find the length of one side, $l$.`,
          answer: l,
          units: 'cm',
          working: `${l * l} = l^2$, so $l = \\sqrt{${l * l}} = ${l}$, because $${l} \\times ${l} = ${l * l}`,
        };
      } else {
        const b = rng.int(2, 12);
        let h = rng.int(2, 12);
        if ((b * h) % 2 === 1) h += 1;
        f = {
          intro: 'The area of a triangle is',
          formula: 'A = \\frac{bh}{2}',
          ask: `A triangle has an area of ${(b * h) / 2} cm² and a base of ${b} cm. Find its height, $h$.`,
          answer: h,
          units: 'cm',
          working: `${(b * h) / 2} = \\frac{${b} \\times h}{2}$, so $${b} \\times h = ${(b * h) / 2} \\times 2 = ${b * h}$, so $h = ${b * h} \\div ${b} = ${h}`,
        };
      }
    } else {
      const kind = rng.pick(['same-perimeter', 'same-area', 'triangle-rect', 'kayak-reverse'] as const);
      if (kind === 'same-perimeter') {
        const s = rng.int(4, 15);
        const l = s + rng.int(1, s - 2);
        const w = 2 * s - l;
        f = {
          intro: 'The perimeter of a rectangle is $P = 2(l + w)$ and the perimeter of a square is',
          formula: 'P = 4l',
          ask: `A rectangle is ${l} cm long and ${w} cm wide. A square has the same perimeter as the rectangle. How long is each side of the square?`,
          answer: s,
          units: 'cm',
          working: `\\text{Rectangle: } P = 2 \\times (${l} + ${w}) = 2 \\times ${l + w} = ${4 * s}$\n\nSquare: $${4 * s} = 4 \\times l$, so $l = ${4 * s} \\div 4 = ${s}`,
        };
      } else if (kind === 'same-area') {
        const pairs: Array<[number, number, number]> = [];
        for (let s = 4; s <= 12; s++) {
          for (let L = s + 1; L <= 2 * s * s; L++) {
            if ((s * s) % L === 0 && L <= 36 && s * s / L >= 2) pairs.push([s, L, (s * s) / L]);
          }
        }
        const [s, L, W] = rng.pick(pairs);
        f = {
          intro: 'The area of a square is $A = l^2$ and the area of a rectangle is',
          formula: 'A = lw',
          ask: `A square has sides of ${s} cm. A rectangle has the same area as the square, and it is ${L} cm long. How wide is the rectangle?`,
          answer: W,
          units: 'cm',
          working: `\\text{Square: } A = ${s}^2 = ${s * s}$\n\nRectangle: $${s * s} = ${L} \\times w$, so $w = ${s * s} \\div ${L} = ${W}`,
        };
      } else if (kind === 'triangle-rect') {
        const b = 2 * rng.int(2, 6);
        const h = rng.int(3, 10);
        const area = (b * h) / 2;
        const divs = [2, 3, 4, 5, 6, 8, 9, 10, 12].filter((d) => area % d === 0 && d !== area && area / d !== 1);
        const L = rng.pick(divs.length ? divs : [area]);
        f = {
          intro: 'The area of a triangle is $A = \\frac{bh}{2}$ and the area of a rectangle is',
          formula: 'A = lw',
          ask: `A triangle has a base of ${b} cm and a height of ${h} cm. A rectangle has the same area as the triangle and a length of ${L} cm. How wide is the rectangle?`,
          answer: area / L,
          units: 'cm',
          working: `\\text{Triangle: } A = \\frac{${b} \\times ${h}}{2} = \\frac{${b * h}}{2} = ${area}$\n\nRectangle: $${area} = ${L} \\times w$, so $w = ${area} \\div ${L} = ${area / L}`,
        };
      } else {
        const r = rng.pick([8, 10, 12, 15, 20]);
        const fee = rng.pick([5, 10, 15]);
        const h = rng.int(2, 8);
        const name = rng.pick(NAMES);
        const C = r * h + fee;
        f = {
          intro: 'The cost, in dollars, of hiring a kayak for $h$ hours is',
          formula: `C = ${r}h + ${fee}`,
          ask: `${name} paid ${cash(C)} to hire a kayak. For how many hours did ${name} hire it?`,
          answer: h,
          units: 'hours',
          working: `${C} = ${r}h + ${fee}$\n\nTake away the ${fee}: $${r}h = ${C} - ${fee} = ${r * h}$\n\nDivide by ${r}: $h = ${r * h} \\div ${r} = ${h}`,
          hint: `Undo the steps in reverse order: take away the ${fee} first, then divide.`,
        };
      }
    }

    const finding = difficulty >= 4;
    return {
      type: 'numeric',
      ...NO_CALC,
      marks: difficulty >= 4 ? 2 : 1,
      prompt: `${f.intro} $${f.formula}$.\n\n${f.ask}`,
      answer: f.answer,
      form: 'integer',
      ...(f.units ? { units: f.units } : {}),
      hints: finding
        ? [
            'Write the formula, then put in the values you know.',
            f.hint ??
              (difficulty === 5 ? 'Work out the first shape completely before you start on the second one.' : 'Then ask: what number makes this true? Use the inverse operation.'),
          ]
        : ['Write the formula, then replace each letter with its value.', 'Remember that letters written next to each other are multiplied.'],
      solution: `Substitute into the formula:\n\n$${f.working}$${f.units && f.units !== '$' && f.units !== 'hours' ? `\n\nThe answer is ${f.answer} ${f.units}.` : ''}`,
    };
  },
};

interface Rearr {
  rhs: string;
  answer: string;
  answerTex: string;
  steps: string[];
}

export const rearrange: QuestionTemplate = {
  id: 'm7.alg.substitution.rearrange',
  topicId: 'm7.alg.substitution',
  title: 'Rearrange a formula (change the subject)',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const [y, x] = rng.pick([
      ['y', 'x'],
      ['t', 'n'],
      ['c', 'n'],
      ['c', 'h'],
      ['m', 'k'],
      ['p', 'b'],
      ['w', 'a'],
      ['d', 's'],
      ['k', 'm'],
      ['q', 'p'],
    ] as const);
    const a = rng.int(2, 9);
    const b = rng.int(1, 12);

    if ((difficulty === 3 || difficulty === 5) && rng.chance(0.4)) {
      // Known formulae with capital letters: multiple choice.
      type Item = { formula: string; subject: string; correct: string; wrong: Choice[]; why: string };
      const items: Item[] =
        difficulty === 3
          ? [
              {
                formula: 'A = lw',
                subject: 'w',
                correct: 'w = \\frac{A}{l}',
                wrong: [
                  { text: '$w = Al$', feedback: '$w$ is multiplied by $l$, so to undo it you divide by $l$, not multiply.' },
                  { text: '$w = \\frac{l}{A}$', feedback: 'This divides the wrong way round. $A$ is divided by $l$.' },
                  { text: '$w = A - l$', feedback: '$w$ is multiplied by $l$, not added to it. The inverse of × is ÷.' },
                ],
                why: '$A = l \\times w$. To get $w$ on its own, divide both sides by $l$.',
              },
              {
                formula: 'A = lw',
                subject: 'l',
                correct: 'l = \\frac{A}{w}',
                wrong: [
                  { text: '$l = Aw$', feedback: '$l$ is multiplied by $w$, so to undo it you divide by $w$, not multiply.' },
                  { text: '$l = \\frac{w}{A}$', feedback: 'This divides the wrong way round. $A$ is divided by $w$.' },
                  { text: '$l = A - w$', feedback: '$l$ is multiplied by $w$, not added to it. The inverse of × is ÷.' },
                ],
                why: '$A = l \\times w$. To get $l$ on its own, divide both sides by $w$.',
              },
              {
                formula: 'P = 4l',
                subject: 'l',
                correct: 'l = \\frac{P}{4}',
                wrong: [
                  { text: '$l = 4P$', feedback: '$l$ is multiplied by 4, so to undo it you divide by 4, not multiply.' },
                  { text: '$l = P - 4$', feedback: '$4l$ means $4 \\times l$, so you divide by 4, not subtract 4.' },
                  { text: '$l = \\frac{4}{P}$', feedback: 'This divides the wrong way round. $P$ is divided by 4.' },
                ],
                why: '$P = 4 \\times l$. To get $l$ on its own, divide both sides by 4.',
              },
              {
                formula: 'V = lwh',
                subject: 'h',
                correct: 'h = \\frac{V}{lw}',
                wrong: [
                  { text: '$h = Vlw$', feedback: '$h$ is multiplied by $lw$, so to undo it you divide by $lw$.' },
                  { text: '$h = \\frac{lw}{V}$', feedback: 'This divides the wrong way round. $V$ is divided by $lw$.' },
                  { text: '$h = V - lw$', feedback: '$h$ is multiplied by $lw$, not added to it. The inverse of × is ÷.' },
                ],
                why: '$V = lw \\times h$. To get $h$ on its own, divide both sides by $lw$.',
              },
            ]
          : [
              {
                formula: 'P = 2(l + w)',
                subject: 'l',
                correct: 'l = \\frac{P}{2} - w',
                wrong: [
                  { text: '$l = \\frac{P}{2} + w$', feedback: '$w$ is added to $l$, so the inverse is to subtract $w$.' },
                  { text: '$l = P - 2w$', feedback: 'Close, but $P - 2w$ is $2l$. You still need to halve it.' },
                  { text: '$l = 2P - w$', feedback: 'The bracket is multiplied by 2, so the inverse is to divide by 2, not multiply.' },
                ],
                why: 'First divide both sides by 2: $\\frac{P}{2} = l + w$. Then subtract $w$ from both sides.',
              },
              {
                formula: 'A = \\frac{bh}{2}',
                subject: 'h',
                correct: 'h = \\frac{2A}{b}',
                wrong: [
                  { text: '$h = \\frac{A}{2b}$', feedback: 'The 2 is dividing, so to undo it you multiply $A$ by 2.' },
                  { text: '$h = \\frac{Ab}{2}$', feedback: '$h$ is multiplied by $b$, so you divide by $b$, not multiply.' },
                  { text: '$h = 2Ab$', feedback: 'Multiplying by 2 is right, but $h$ is multiplied by $b$, so you divide by $b$.' },
                ],
                why: 'First multiply both sides by 2: $2A = bh$. Then divide both sides by $b$.',
              },
            ];
      const item = rng.pick(items);
      return {
        ...NO_CALC,
        ...(difficulty === 5 ? { marks: 2 } : {}),
        prompt: `Make $${item.subject}$ the subject of the formula $${item.formula}$.`,
        ...mcqFields(rng, { text: `$${item.correct}$` }, item.wrong),
        hints: [`What is being done to $${item.subject}$ in the formula?`, 'Undo it with the inverse operation, doing the same to both sides.'],
        solution: `${item.why}\n\nSo $${item.correct}$.`,
      };
    }

    let r: Rearr;
    if (difficulty === 3) {
      const kind = rng.pick(['plus', 'minus', 'times', 'divide'] as const);
      if (kind === 'plus') {
        r = { rhs: `${x} + ${b}`, answer: `${y} - ${b}`, answerTex: `${y} - ${b}`, steps: [`$${x}$ has had ${b} added to it. The inverse is to subtract ${b}.`, `Subtract ${b} from both sides: $${y} - ${b} = ${x}$.`] };
      } else if (kind === 'minus') {
        r = { rhs: `${x} - ${b}`, answer: `${y} + ${b}`, answerTex: `${y} + ${b}`, steps: [`$${x}$ has had ${b} taken away. The inverse is to add ${b}.`, `Add ${b} to both sides: $${y} + ${b} = ${x}$.`] };
      } else if (kind === 'times') {
        r = { rhs: `${a}${x}`, answer: `${y}/${a}`, answerTex: `\\frac{${y}}{${a}}`, steps: [`$${a}${x}$ means $${a} \\times ${x}$. The inverse of × ${a} is ÷ ${a}.`, `Divide both sides by ${a}: $\\frac{${y}}{${a}} = ${x}$.`] };
      } else {
        r = { rhs: `\\frac{${x}}{${a}}`, answer: `${a}*${y}`, answerTex: `${a}${y}`, steps: [`$${x}$ has been divided by ${a}. The inverse of ÷ ${a} is × ${a}.`, `Multiply both sides by ${a}: $${a}${y} = ${x}$.`] };
      }
    } else if (difficulty === 4) {
      const kind = rng.pick(['ax+b', 'ax-b', 'x/a+b', 'x/a-b'] as const);
      if (kind === 'ax+b') {
        r = {
          rhs: `${a}${x} + ${b}`,
          answer: `(${y} - ${b})/${a}`,
          answerTex: `\\frac{${y} - ${b}}{${a}}`,
          steps: [`Undo the + ${b} first: $${y} - ${b} = ${a}${x}$.`, `Then undo the × ${a}: $\\frac{${y} - ${b}}{${a}} = ${x}$.`],
        };
      } else if (kind === 'ax-b') {
        r = {
          rhs: `${a}${x} - ${b}`,
          answer: `(${y} + ${b})/${a}`,
          answerTex: `\\frac{${y} + ${b}}{${a}}`,
          steps: [`Undo the − ${b} first: $${y} + ${b} = ${a}${x}$.`, `Then undo the × ${a}: $\\frac{${y} + ${b}}{${a}} = ${x}$.`],
        };
      } else if (kind === 'x/a+b') {
        r = {
          rhs: `\\frac{${x}}{${a}} + ${b}`,
          answer: `${a}*(${y} - ${b})`,
          answerTex: `${a}(${y} - ${b})`,
          steps: [`Undo the + ${b} first: $${y} - ${b} = \\frac{${x}}{${a}}$.`, `Then undo the ÷ ${a} by multiplying both sides by ${a}: $${a}(${y} - ${b}) = ${x}$.`],
        };
      } else {
        r = {
          rhs: `\\frac{${x}}{${a}} - ${b}`,
          answer: `${a}*(${y} + ${b})`,
          answerTex: `${a}(${y} + ${b})`,
          steps: [`Undo the − ${b} first: $${y} + ${b} = \\frac{${x}}{${a}}$.`, `Then undo the ÷ ${a} by multiplying both sides by ${a}: $${a}(${y} + ${b}) = ${x}$.`],
        };
      }
    } else {
      const kind = rng.pick(['a(x+b)', '(x+b)/a', 'a(x-b)'] as const);
      if (kind === 'a(x+b)') {
        r = {
          rhs: `${a}(${x} + ${b})`,
          answer: `${y}/${a} - ${b}`,
          answerTex: `\\frac{${y}}{${a}} - ${b}`,
          steps: [`The bracket is multiplied by ${a}. Undo that first by dividing both sides by ${a}: $\\frac{${y}}{${a}} = ${x} + ${b}$.`, `Then undo the + ${b}: $\\frac{${y}}{${a}} - ${b} = ${x}$.`],
        };
      } else if (kind === 'a(x-b)') {
        r = {
          rhs: `${a}(${x} - ${b})`,
          answer: `${y}/${a} + ${b}`,
          answerTex: `\\frac{${y}}{${a}} + ${b}`,
          steps: [`The bracket is multiplied by ${a}. Undo that first by dividing both sides by ${a}: $\\frac{${y}}{${a}} = ${x} - ${b}$.`, `Then undo the − ${b}: $\\frac{${y}}{${a}} + ${b} = ${x}$.`],
        };
      } else {
        r = {
          rhs: `\\frac{${x} + ${b}}{${a}}`,
          answer: `${a}*${y} - ${b}`,
          answerTex: `${a}${y} - ${b}`,
          steps: [`The top is divided by ${a}. Undo that first by multiplying both sides by ${a}: $${a}${y} = ${x} + ${b}$.`, `Then undo the + ${b}: $${a}${y} - ${b} = ${x}$.`],
        };
      }
    }
    return {
      type: 'expression',
      ...NO_CALC,
      ...(difficulty >= 4 ? { marks: 2 } : {}),
      prompt: `Make $${x}$ the subject of $${y} = ${r.rhs}$.`,
      answer: r.answer,
      variables: [y],
      form: 'any',
      hints: [
        `Ask: what has been done to $${x}$, and in what order?`,
        difficulty === 3 ? 'Do the inverse (opposite) operation to both sides.' : 'Undo the operations in reverse order, doing the same thing to both sides each time.',
      ],
      solution: `${r.steps.join('\n\n')}\n\nSo $${x} = ${r.answerTex}$.`,
    };
  },
};

export const spotMistake: QuestionTemplate = {
  id: 'm7.alg.substitution.spot-mistake',
  topicId: 'm7.alg.substitution',
  title: 'Spot the substitution mistake (MCQ)',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const v = rng.pick(LETTERS);
    let prompt: string;
    let correct: number;
    let wrong: Array<{ value: number; feedback: string }>;
    let solution: string;

    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const c = rng.int(2, 5);
        const x = rng.int(2, 9);
        const digits = Number(`${c}${x}`);
        prompt = `${name} is finding the value of $${c}${v}$ when $${v} = ${x}$. ${name} writes $${c}${v} = ${digits}$. What is the correct value of $${c}${v}$?`;
        correct = c * x;
        wrong = [
          { value: digits, feedback: `$${c}${v}$ doesn't mean the digits ${c} and ${x} side by side. A number next to a letter means multiply.` },
          { value: c + x, feedback: `$${c}${v}$ means $${c} \\times ${v}$, not $${c} + ${v}$.` },
          ...(x ** c <= 999 ? [{ value: x ** c, feedback: `That is $${v}^${c}$. $${c}${v}$ means ${c} lots of $${v}$.` }] : []),
          { value: c * x + c, feedback: `Check the multiplication: $${c} \\times ${x}$.` },
        ];
        solution = `$${c}${v}$ means $${c} \\times ${v}$, so $${c}${v} = ${c} \\times ${x} = ${c * x}$.\n\n${name} wrote the digits side by side instead of multiplying.`;
      } else {
        const [u, w] = pickLetters(rng, 2) as [string, string];
        const p = rng.int(2, 9);
        const q = rng.int(2, 9);
        const digits = Number(`${p}${q}`);
        prompt = `${name} is finding the value of $${u}${w}$ when $${u} = ${p}$ and $${w} = ${q}$. ${name} writes $${u}${w} = ${digits}$. What is the correct value of $${u}${w}$?`;
        correct = p * q;
        wrong = [
          { value: digits, feedback: `$${u}${w}$ doesn't mean the digits side by side. Letters written next to each other are multiplied.` },
          { value: p + q, feedback: `$${u}${w}$ means $${u} \\times ${w}$, not $${u} + ${w}$.` },
          { value: Number(`${q}${p}`), feedback: 'Letters next to each other are multiplied, not written side by side.' },
          { value: p * q + 1, feedback: `Check the multiplication: $${p} \\times ${q}$.` },
        ];
        solution = `$${u}${w}$ means $${u} \\times ${w}$, so $${u}${w} = ${p} \\times ${q} = ${p * q}$.`;
      }
    } else if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const x = rng.int(3, 12);
        prompt = `${name} says that when $${v} = ${x}$, $${v}^2 = ${2 * x}$. What is the correct value of $${v}^2$?`;
        correct = x * x;
        wrong = [
          { value: 2 * x, feedback: `${name} doubled ${x}. $${v}^2$ means $${v} \\times ${v}$, not $${v} \\times 2$.` },
          { value: x + 2, feedback: `$${v}^2$ means $${v} \\times ${v}$, not $${v} + 2$.` },
          { value: Number(`${x}2`), feedback: `The small 2 is a power. It isn't a digit to write after ${x}.` },
        ];
        solution = `$${v}^2$ means $${v} \\times ${v}$, so $${v}^2 = ${x} \\times ${x} = ${x * x}$.\n\n${name} worked out $${x} \\times 2$ instead.`;
      } else {
        const b = rng.int(2, 9);
        const c = rng.int(2, 6);
        const x = rng.int(2, 9);
        prompt = `${name} is finding the value of $${b} + ${c}${v}$ when $${v} = ${x}$. ${name} works out $${b} + ${c} = ${b + c}$, then $${b + c} \\times ${x} = ${(b + c) * x}$. What is the correct value?`;
        correct = b + c * x;
        wrong = [
          { value: (b + c) * x, feedback: 'This adds first. Multiplying comes before adding, so work out the multiplication first.' },
          { value: b + c + x, feedback: `$${c}${v}$ means $${c} \\times ${v}$, not $${c} + ${v}$.` },
          { value: b * c * x, feedback: `The ${b} is added, not multiplied.` },
        ];
        solution = `$${c}${v}$ means $${c} \\times ${v}$, and multiplying comes before adding.\n\n$${b} + ${c} \\times ${x} = ${b} + ${c * x} = ${b + c * x}$`;
      }
    } else {
      const kind = rng.pick(['perimeter', 'triangle', 'cost'] as const);
      if (kind === 'perimeter') {
        const l = rng.int(5, 15);
        const w = rng.int(2, l - 1);
        prompt = `${name} uses $P = 2(l + w)$ to find the perimeter of a rectangle with $l = ${l}$ and $w = ${w}$. ${name} writes $P = 2 \\times ${l} + ${w} = ${2 * l + w}$. What is the correct perimeter?`;
        correct = 2 * (l + w);
        wrong = [
          { value: 2 * l + w, feedback: 'The brackets mean you add $l + w$ first, then double the whole lot.' },
          { value: 2 * l * w, feedback: '$l$ and $w$ are added inside the brackets, not multiplied.' },
          { value: l + w, feedback: 'You still need to multiply by 2. There are two lengths and two widths.' },
        ];
        solution = `Brackets first: $l + w = ${l} + ${w} = ${l + w}$.\n\nThen multiply by 2: $P = 2 \\times ${l + w} = ${2 * (l + w)}$.\n\n${name} only doubled the length, not the width as well.`;
      } else if (kind === 'triangle') {
        const b = 2 * rng.int(2, 7);
        let h = rng.int(3, 11);
        if (h === b) h += 1;
        prompt = `${name} uses $A = \\frac{bh}{2}$ to find the area of a triangle with $b = ${b}$ and $h = ${h}$. ${name} gets $A = ${b * h}$. What is the correct area?`;
        correct = (b * h) / 2;
        wrong = [
          { value: b * h, feedback: 'This is $bh$. The formula then divides by 2.' },
          { value: b + h, feedback: '$bh$ means $b \\times h$, not $b + h$.' },
          { value: b * h * 2, feedback: 'The formula divides $bh$ by 2. It doesn\'t multiply by 2.' },
        ];
        solution = `$A = \\frac{${b} \\times ${h}}{2} = \\frac{${b * h}}{2} = ${(b * h) / 2}$\n\n${name} forgot to divide by 2.`;
      } else {
        const r = rng.int(3, 9);
        const fee = rng.int(2, 9);
        const h = rng.int(2, 6);
        prompt = `A formula for a cost in dollars is $C = ${r}h + ${fee}$. ${name} finds $C$ when $h = ${h}$ and writes $C = ${r} \\times (${h} + ${fee}) = ${r * (h + fee)}$. What is the correct value of $C$?`;
        correct = r * h + fee;
        wrong = [
          { value: r * (h + fee), feedback: `There are no brackets. Multiply $${r} \\times ${h}$ first, then add ${fee}.` },
          { value: r + h + fee, feedback: `$${r}h$ means $${r} \\times h$, not $${r} + h$.` },
          { value: Number(`${r}${h}`) + fee, feedback: `$${r}h$ means $${r} \\times h$, not the digits ${r} and ${h} side by side.` },
        ];
        solution = `Multiply first, then add: $C = ${r} \\times ${h} + ${fee} = ${r * h} + ${fee} = ${r * h + fee}$.`;
      }
    }

    const distractors = wrong.filter((d) => d.value !== correct).map((d) => ({ text: `$${d.value}$`, feedback: d.feedback }));
    return {
      ...NO_CALC,
      ...(difficulty === 4 ? { marks: 2 } : {}),
      prompt,
      ...mcqFields(rng, { text: `$${correct}$` }, distractors),
      hints: ['Write out the substitution with every × sign showing.', 'Use the order of operations: brackets first, then × and ÷, then + and −.'],
      solution,
    };
  },
};

export const templates: QuestionTemplate[] = [evaluate, formulae, rearrange, spotMistake];
