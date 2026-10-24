import type { QuestionTemplate } from '../../types';
import { gcd, poly, polyAnswer, term, tex, texSigned } from '../../format';
import { mcqFields, t } from './helpers';

// m9.alg.expressions — collecting like terms, expanding a single term times a bracket, and
// factorising by taking out a common factor. Year 9 scope: no products of two brackets.
//
// Marking notes:
// - A letter right before a bracket ("3x(2y + 1)") is read by the parser as a function call, so any
//   factorised answer with a letter outside the bracket is asked as an MCQ instead.
// - The "factorised" form check doesn't test that the factor is the HCF, so typed factorising
//   questions use a prime HCF (no partial factorisation is possible); composite HCFs are MCQs.

const LETTERS = ['x', 'a', 'm', 'n', 'p', 'y', 'b', 't', 'k'] as const;
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['a', 'b'],
  ['x', 'y'],
  ['m', 'n'],
  ['p', 'q'],
  ['s', 't'],
  ['c', 'd'],
];

/** A term in brackets if it is negative, for showing products: (−2y). */
function signedTerm(coef: number, v: string): string {
  const s = poly([t(coef, v)]);
  return coef < 0 ? `(${s})` : s;
}

export const collectLikeTerms: QuestionTemplate = {
  id: 'm9.alg.expressions.collect-like-terms',
  topicId: 'm9.alg.expressions',
  title: 'Simplify by collecting like terms',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const v = rng.pick(LETTERS);
      const k = rng.pick([2, 3]);
      const coefs = Array.from({ length: k }, () => rng.int(1, 9));
      if (k === 3 && rng.chance(0.5)) coefs[2] = -rng.int(1, Math.min(9, coefs[0]! + coefs[1]! - 1));
      const total = coefs.reduce((s, c) => s + c, 0);
      const constant = rng.chance(0.5) ? rng.int(1, 9) * (rng.chance(0.3) ? -1 : 1) : 0;
      const shown = coefs.map((c) => t(c, v));
      if (constant) shown.splice(rng.int(1, shown.length), 0, t(constant));
      const result = poly([t(total, v), t(constant)]);
      return {
        type: 'expression',
        prompt: `Simplify $${poly(shown)}$.`,
        answer: polyAnswer([t(total, v), t(constant)]),
        variables: [v],
        form: 'simplified',
        calculator: 'not-allowed',
        hints: [
          'Like terms have exactly the same letter part.',
          `Add the coefficients (the numbers in front) of the $${v}$ terms.`,
        ],
        solution: [
          `The $${v}$ terms are like terms: $${poly(coefs.map((c) => t(c, v)))} = ${poly([t(total, v)])}$`,
          constant ? `The number $${tex(constant)}$ has no letter, so it is not a like term and stays as it is.` : '',
          `So $${poly(shown)} = ${result}$.`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }

    if (difficulty === 2) {
      const [u, w] = rng.pick(PAIRS);
      let cu = [1, 1];
      let cw = [1, 1];
      for (;;) {
        cu = [rng.int(1, 9), rng.nonZeroInt(-9, 9)];
        cw = [rng.nonZeroInt(-9, 9), rng.nonZeroInt(-9, 9)];
        if (cu[0]! + cu[1]! !== 0 && cw[0]! + cw[1]! !== 0) break;
      }
      const su = cu[0]! + cu[1]!;
      const sw = cw[0]! + cw[1]!;
      const shown = [t(cu[0]!, u), ...rng.shuffle([t(cu[1]!, u), t(cw[0]!, w), t(cw[1]!, w)])];
      const result = poly([t(su, u), t(sw, w)]);
      return {
        type: 'expression',
        prompt: `Simplify $${poly(shown)}$.`,
        answer: polyAnswer([t(su, u), t(sw, w)]),
        variables: [u, w],
        form: 'simplified',
        calculator: 'not-allowed',
        hints: [
          `Group the $${u}$ terms together and the $${w}$ terms together. Keep each term's sign with it.`,
          `$${u}$ terms and $${w}$ terms are not like terms, so they can't be combined with each other.`,
        ],
        solution: [
          `Collect the $${u}$ terms: $${poly(shown.filter(([, s]) => s === u))} = ${poly([t(su, u)])}$`,
          `Collect the $${w}$ terms: $${poly(shown.filter(([, s]) => s === w))} = ${poly([t(sw, w)])}$`,
          `So the expression simplifies to $${result}$.`,
        ].join('\n\n'),
      };
    }

    // difficulty 3
    if (rng.chance(0.5)) {
      // squared terms and plain terms are unlike
      const v = rng.pick(['x', 'a', 'm', 'n', 'y'] as const);
      const sq = `${v}^2`;
      let [a1, a2, b1, b2] = [1, 1, 1, 1];
      for (;;) {
        [a1, a2, b1, b2] = [rng.int(1, 8), rng.nonZeroInt(-6, 6), rng.nonZeroInt(-9, 9), rng.nonZeroInt(-9, 9)];
        if (a1 + a2 !== 0 && b1 + b2 !== 0) break;
      }
      const k = rng.int(-9, 9);
      const shown = [t(a1, sq), ...rng.shuffle([t(b1, v), t(a2, sq), t(b2, v), ...(k ? [t(k)] : [])])];
      const result = poly([t(a1 + a2, sq), t(b1 + b2, v), t(k)]);
      return {
        type: 'expression',
        prompt: `Simplify $${poly(shown)}$.`,
        answer: polyAnswer([t(a1 + a2, sq), t(b1 + b2, v), t(k)]),
        variables: [v],
        form: 'simplified',
        calculator: 'not-allowed',
        hints: [
          `$${v}^2$ and $${v}$ are **not** like terms: their letter parts are different.`,
          `Collect the $${v}^2$ terms, then the $${v}$ terms${k ? ', then the number' : ''}.`,
        ],
        solution: [
          `$${v}^2$ means $${v} \\times ${v}$, which is different from $${v}$, so the $${v}^2$ terms and $${v}$ terms are collected separately.`,
          `$${v}^2$ terms: $${poly([t(a1, sq), t(a2, sq)])} = ${poly([t(a1 + a2, sq)])}$`,
          `$${v}$ terms: $${poly([t(b1, v), t(b2, v)])} = ${poly([t(b1 + b2, v)])}$`,
          `So the expression simplifies to $${result}$.`,
        ].join('\n\n'),
      };
    }
    // commutative: ab and ba are like terms
    const [u, w] = rng.pick(PAIRS);
    let [a1, a2] = [1, 1];
    for (;;) {
      [a1, a2] = [rng.int(1, 9), rng.nonZeroInt(-7, 9)];
      if (a1 + a2 !== 0) break;
    }
    const b1 = rng.nonZeroInt(-9, 9);
    const b2 = rng.nonZeroInt(-9, 9);
    const shown = [t(a1, u + w), ...rng.shuffle([t(b1, u), t(a2, w + u), t(b2, w)])];
    const result = poly([t(a1 + a2, u + w), t(b1, u), t(b2, w)]);
    return {
      type: 'expression',
      prompt: `Simplify $${poly(shown)}$.`,
      answer: polyAnswer([t(a1 + a2, `${u}*${w}`), t(b1, u), t(b2, w)]),
      variables: [u, w],
      form: 'simplified',
      calculator: 'not-allowed',
      hints: [
        `Is $${w}${u}$ the same as $${u}${w}$? Think about the order you multiply in.`,
        `$${u}${w}$, $${u}$ and $${w}$ are three different kinds of term.`,
      ],
      solution: [
        `$${w}${u}$ means $${w} \\times ${u}$, which equals $${u} \\times ${w}$ because multiplication is **commutative**. So $${poly([t(a1, u + w)])}$ and $${poly([t(a2, w + u)])}$ are like terms:`,
        `$${poly([t(a1, u + w), t(a2, w + u)])} = ${poly([t(a1 + a2, u + w)])}$`,
        `The $${u}$ term and the $${w}$ term have no like terms to combine with.`,
        `So the expression simplifies to $${result}$.`,
      ].join('\n\n'),
    };
  },
};

export const expandBrackets: QuestionTemplate = {
  id: 'm9.alg.expressions.expand',
  topicId: 'm9.alg.expressions',
  title: 'Expand a single bracket, then simplify',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);

    if (difficulty === 2) {
      const a = rng.int(2, 9);
      const b = rng.nonZeroInt(-9, 9);
      const constFirst = b > 0 && rng.chance(0.25);
      const inner = constFirst ? poly([t(b), t(1, v)]) : poly([t(1, v), t(b)]);
      const result = constFirst ? poly([t(a * b), t(a, v)]) : poly([t(a, v), t(a * b)]);
      return {
        type: 'expression',
        prompt: `Expand $${a}(${inner})$.`,
        answer: polyAnswer([t(a, v), t(a * b)]),
        variables: [v],
        form: 'expanded',
        calculator: 'not-allowed',
        hints: [
          'Multiply **every** term inside the bracket by the number outside.',
          `Work out $${a} \\times ${v}$ and $${a} \\times ${texSigned(b)}$.`,
        ],
        solution: [
          `Multiply each term in the bracket by $${a}$:`,
          `$${a} \\times ${v} = ${a}${v}$ and $${a} \\times ${texSigned(b)} = ${tex(a * b)}$`,
          `So $${a}(${inner}) = ${result}$.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 3) {
      const a = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8]);
      const twoVars = rng.chance(0.3);
      const [u, w] = twoVars ? rng.pick(PAIRS) : [v, ''];
      const p = rng.int(1, 5);
      const q = twoVars ? rng.nonZeroInt(-7, 7) : rng.nonZeroInt(-9, 9);
      const inner = poly([t(p, u), t(q, w)]);
      const result = poly([t(a * p, u), t(a * q, w)]);
      return {
        type: 'expression',
        prompt: `Expand $${tex(a)}(${inner})$.`,
        answer: polyAnswer([t(a * p, u), t(a * q, w)]),
        variables: twoVars ? [u, w] : [u],
        form: 'expanded',
        calculator: 'not-allowed',
        hints: [
          'Multiply **every** term inside the bracket by the number outside, including its sign.',
          a < 0
            ? 'The number outside is negative, so each term inside changes sign: negative × positive = negative, negative × negative = positive.'
            : `Watch the sign of the second term in the bracket.`,
        ],
        solution: [
          `Multiply each term in the bracket by $${tex(a)}$:`,
          `$${texSigned(a)} \\times ${poly([t(p, u)])} = ${poly([t(a * p, u)])}$`,
          `$${texSigned(a)} \\times ${signedTerm(q, w)} = ${poly([t(a * q, w)])}$`,
          `So $${tex(a)}(${inner}) = ${result}$.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 4) {
      const a = rng.int(2, 6);
      const b = rng.nonZeroInt(-8, 8);
      const bracket1 = `${a}(${poly([t(1, v), t(b)])})`;
      if (rng.chance(0.5)) {
        // a(x + b) + cx + d
        let c = rng.nonZeroInt(-5, 7);
        if (a + c === 0) c = 1;
        const d = rng.int(-9, 9);
        const prompt = `${bracket1}${term(c, v, false)}${d ? term(d, '', false) : ''}`;
        const expanded = poly([t(a, v), t(a * b), t(c, v), t(d)]);
        const result = poly([t(a + c, v), t(a * b + d)]);
        return {
          type: 'expression',
          prompt: `Expand and simplify $${prompt}$.`,
          answer: polyAnswer([t(a + c, v), t(a * b + d)]),
          variables: [v],
          form: 'simplified',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Expand the bracket first.', `Then collect the $${v}$ terms and the number terms.`],
          solution: [
            `Expand the bracket: $${bracket1} = ${poly([t(a, v), t(a * b)])}$`,
            `So the expression is $${expanded}$.`,
            `Collect the $${v}$ terms: $${poly([t(a, v), t(c, v)])} = ${poly([t(a + c, v)])}$`,
            d
              ? `Collect the numbers: $${poly([t(a * b), t(d)])} = ${tex(a * b + d)}$`
              : `The only number term is $${tex(a * b)}$.`,
            `Answer: $${result}$`,
          ].join('\n\n'),
        };
      }
      // a(x + b) + c(x + d)
      const c = rng.int(2, 6);
      const d = rng.nonZeroInt(-8, 8);
      const bracket2 = `${c}(${poly([t(1, v), t(d)])})`;
      const result = poly([t(a + c, v), t(a * b + c * d)]);
      return {
        type: 'expression',
        prompt: `Expand and simplify $${bracket1} + ${bracket2}$.`,
        answer: polyAnswer([t(a + c, v), t(a * b + c * d)]),
        variables: [v],
        form: 'simplified',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Expand each bracket separately.', `Then collect the $${v}$ terms and the number terms.`],
        solution: [
          `Expand each bracket: $${bracket1} = ${poly([t(a, v), t(a * b)])}$ and $${bracket2} = ${poly([t(c, v), t(c * d)])}$`,
          `So the expression is $${poly([t(a, v), t(a * b), t(c, v), t(c * d)])}$.`,
          `Collect the $${v}$ terms: $${poly([t(a, v), t(c, v)])} = ${poly([t(a + c, v)])}$`,
          `Collect the numbers: $${poly([t(a * b), t(c * d)])} = ${tex(a * b + c * d)}$`,
          `Answer: $${result}$`,
        ].join('\n\n'),
      };
    }

    // difficulty 5
    const kind = rng.pick(['subtract', 'letter', 'two'] as const);
    if (kind === 'letter') {
      // k·u(m·w + n): a letter outside the bracket, no squared terms
      const [u, w] = rng.pick(PAIRS);
      const k = rng.int(2, 6);
      const m = rng.int(1, 5);
      const n = rng.nonZeroInt(-9, 9);
      const inner = poly([t(m, w), t(n)]);
      const result = poly([t(k * m, u + w), t(k * n, u)]);
      return {
        type: 'expression',
        prompt: `Expand $${k}${u}(${inner})$.`,
        answer: polyAnswer([t(k * m, `${u}*${w}`), t(k * n, u)]),
        variables: [u, w],
        form: 'expanded',
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          `Multiply each term inside the bracket by $${k}${u}$.`,
          'Multiply the numbers together, then write the letters next to each other.',
        ],
        solution: [
          `Multiply each term in the bracket by $${k}${u}$:`,
          `$${k}${u} \\times ${poly([t(m, w)])} = ${k} \\times ${m} \\times ${u} \\times ${w} = ${poly([t(k * m, u + w)])}$`,
          `$${k}${u} \\times ${texSigned(n)} = ${poly([t(k * n, u)])}$`,
          `So $${k}${u}(${inner}) = ${result}$.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'subtract') {
      // p·x + s − q(x + r)
      const p = rng.int(3, 9);
      let q = rng.int(2, 6);
      if (q === p) q = p - 1;
      const r = rng.nonZeroInt(-9, 9);
      const s = rng.chance(0.4) ? rng.nonZeroInt(-9, 9) : 0;
      const bracket = `${q}(${poly([t(1, v), t(r)])})`;
      const result = poly([t(p - q, v), t(s - q * r)]);
      return {
        type: 'expression',
        prompt: `Expand and simplify $${poly([t(p, v), t(s)])} - ${bracket}$.`,
        answer: polyAnswer([t(p - q, v), t(s - q * r)]),
        variables: [v],
        form: 'simplified',
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          `The $-${q}$ in front of the bracket multiplies **both** terms inside it.`,
          `$-${q} \\times ${texSigned(r)}$ — check the sign carefully.`,
        ],
        solution: [
          `Multiply both terms in the bracket by $-${q}$: $-${q} \\times ${v} = -${q}${v}$ and $-${q} \\times ${texSigned(r)} = ${tex(-q * r)}$`,
          `So the expression is $${poly([t(p, v), t(s), t(-q, v), t(-q * r)])}$.`,
          `Collect the $${v}$ terms: $${poly([t(p, v), t(-q, v)])} = ${poly([t(p - q, v)])}$`,
          s
            ? `Collect the numbers: $${poly([t(s), t(-q * r)])} = ${tex(s - q * r)}$`
            : `The only number term is $${tex(-q * r)}$.`,
          `Answer: $${result}$`,
        ].join('\n\n'),
      };
    }
    // a(x + b) − c(x + d)
    const a = rng.int(2, 7);
    let c = rng.int(2, 6);
    if (c === a) c = a === 2 ? 3 : a - 1;
    const b = rng.nonZeroInt(-8, 8);
    const d = rng.nonZeroInt(-8, 8);
    const b1 = `${a}(${poly([t(1, v), t(b)])})`;
    const b2 = `${c}(${poly([t(1, v), t(d)])})`;
    const result = poly([t(a - c, v), t(a * b - c * d)]);
    return {
      type: 'expression',
      prompt: `Expand and simplify $${b1} - ${b2}$.`,
      answer: polyAnswer([t(a - c, v), t(a * b - c * d)]),
      variables: [v],
      form: 'simplified',
      marks: 3,
      calculator: 'not-allowed',
      hints: [
        `Expand the first bracket. For the second, multiply both terms by $-${c}$, not $${c}$.`,
        `Then collect the $${v}$ terms and the number terms.`,
      ],
      solution: [
        `First bracket: $${b1} = ${poly([t(a, v), t(a * b)])}$`,
        `Second bracket, multiplying by $-${c}$: $-${b2} = ${poly([t(-c, v), t(-c * d)])}$`,
        `So the expression is $${poly([t(a, v), t(a * b), t(-c, v), t(-c * d)])}$.`,
        `Collect the $${v}$ terms: $${poly([t(a, v), t(-c, v)])} = ${poly([t(a - c, v)])}$`,
        `Collect the numbers: $${poly([t(a * b), t(-c * d)])} = ${tex(a * b - c * d)}$`,
        `Answer: $${result}$`,
      ].join('\n\n'),
    };
  },
};

/** "6x ÷ 3 = 2x" for each term when dividing out a factor. */
function divideLine(terms: Array<[number, string]>, by: string, inner: Array<[number, string]>): string {
  return terms.map(([c, v], i) => `$${poly([t(c, v)])} \\div ${by} = ${poly([inner[i]!])}$`).join(' and ');
}

export const factorise: QuestionTemplate = {
  id: 'm9.alg.expressions.factorise',
  topicId: 'm9.alg.expressions',
  title: 'Factorise by taking out a common factor',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);

    if (difficulty === 2 || difficulty === 3) {
      // Prime HCF, so the only way to factorise is the right way.
      let p = rng.pick([2, 3, 5, 7]);
      let inner: Array<[number, string]>;
      let variables: string[];
      if (difficulty === 2) {
        let [b, c] = [1, 1];
        do {
          b = rng.int(1, 6);
          c = rng.nonZeroInt(-9, 9);
        } while (gcd(b, c) !== 1);
        inner = c > 0 && rng.chance(0.25) ? [t(c), t(b, v)] : [t(b, v), t(c)];
        variables = [v];
      } else {
        const kind = rng.pick(['two-letters', 'three-terms', 'one'] as const);
        if (kind === 'one') {
          p = rng.pick([2, 3, 5, 7, 11]);
          inner = [t(rng.int(2, 9), v), t(rng.sign())];
          variables = [v];
        } else if (kind === 'two-letters') {
          const [u, w] = rng.pick(PAIRS);
          let [b, c] = [1, 1];
          do {
            b = rng.int(1, 6);
            c = rng.nonZeroInt(-7, 7);
          } while (gcd(b, c) !== 1);
          inner = [t(b, u), t(c, w)];
          variables = [u, w];
        } else {
          const [u, w] = rng.pick(PAIRS);
          let [b, c, d] = [1, 1, 1];
          do {
            b = rng.int(1, 5);
            c = rng.nonZeroInt(-5, 5);
            d = rng.nonZeroInt(-9, 9);
          } while (gcd(gcd(b, c), d) !== 1);
          inner = [t(b, u), t(c, w), t(d)];
          variables = [u, w];
        }
      }
      const outer = inner.map(([k, s]) => t(p * k, s));
      const absTerms = outer.map(([k, s]) => poly([t(Math.abs(k), s)]));
      const hasOne = inner.some(([k, s]) => !s && Math.abs(k) === 1);
      return {
        type: 'expression',
        prompt: `Factorise $${poly(outer)}$.`,
        answer: `${p}*(${polyAnswer(inner)})`,
        variables,
        form: 'factorised',
        calculator: 'not-allowed',
        hints: [
          `Find the highest common factor (HCF) of ${absTerms.map((s) => `$${s}$`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`,
          hasOne
            ? 'Write the HCF in front of a bracket. If a term is equal to the HCF, dividing leaves 1, so a 1 goes inside the bracket.'
            : 'Write the HCF in front of a bracket. Divide each term by the HCF to find what goes inside.',
        ],
        solution: [
          `The highest common factor of the terms is $${p}$.`,
          `Divide each term by $${p}$: ${divideLine(outer, String(p), inner)}`,
          `So $${poly(outer)} = ${p}(${poly(inner)})$.`,
          `Check by expanding: $${p}(${poly(inner)}) = ${poly(outer)}$ ✓`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 4) {
      // Composite HCF: MCQ with partial factorisations as distractors.
      const h = rng.pick([4, 6, 8, 9, 10, 12, 14, 15]);
      const sp = [2, 3, 5, 7].find((q) => h % q === 0)!;
      let [b, c] = [1, 1];
      do {
        b = rng.int(1, 5);
        c = rng.nonZeroInt(-7, 7);
      } while (gcd(b, c) !== 1);
      const inner = [t(b, v), t(c)];
      const outer = inner.map(([k, s]) => t(h * k, s));
      const expr = poly(outer);
      const partial = (f: number) => `$${f}(${poly(inner.map(([k, s]) => t((h / f) * k, s)))})$`;
      const partialFeedback = (f: number) =>
        `This is factorised, but not **fully**: the terms in the bracket still have a common factor of ${h / f}.`;
      const mcq = mcqFields(rng, { text: `$${h}(${poly(inner)})$` }, [
        { text: partial(sp), feedback: partialFeedback(sp) },
        { text: partial(h / sp), feedback: partialFeedback(h / sp) },
        {
          text: `$${h}(${poly([t(b, v), t(-c)])})$`,
          feedback: `Expand it to check: it gives $${poly([t(h * b, v), t(-h * c)])}$, so a sign is wrong.`,
        },
        {
          text: `$${h}(${poly([t(b, v), t(h * c)])})$`,
          feedback: `Every term must be divided by ${h}, including the number term.`,
        },
      ]);
      return {
        type: 'mcq',
        prompt: `Factorise **fully** $${expr}$.`,
        ...mcq,
        calculator: 'not-allowed',
        hints: [
          `Find the **highest** common factor of ${h * b} and ${Math.abs(h * c)}, not just any common factor.`,
          'After factorising, check that the terms inside the bracket have no common factor left.',
        ],
        solution: [
          `The highest common factor of ${h * b} and ${Math.abs(h * c)} is ${h}.`,
          `Divide each term by ${h}: ${divideLine(outer, String(h), inner)}`,
          `So $${expr} = ${h}(${poly(inner)})$.`,
          `Taking out only ${sp}${h / sp !== sp ? ` or ${h / sp}` : ''} leaves a bracket that can still be factorised, so it isn't **fully** factorised.`,
        ].join('\n\n'),
      };
    }

    // difficulty 5: a letter in the common factor (MCQ, see note at the top)
    const [u, w] = rng.pick(PAIRS);
    const k = rng.int(2, 6);
    let [m, n] = [1, 1];
    do {
      m = rng.int(1, 5);
      n = rng.nonZeroInt(-7, 7);
    } while (gcd(m, n) !== 1);
    const outer = [t(k * m, u + w), t(k * n, u)];
    const expr = poly(outer);
    const inner = [t(m, w), t(n)];
    const mcq = mcqFields(rng, { text: `$${k}${u}(${poly(inner)})$` }, [
      {
        text: `$${k}(${poly([t(m, u + w), t(n, u)])})$`,
        feedback: `$${u}$ is also a factor of both terms, so it should be taken out too.`,
      },
      {
        text: `$${u}(${poly([t(k * m, w), t(k * n)])})$`,
        feedback: `${k * m} and ${Math.abs(k * n)} still have a common factor of ${k}.`,
      },
      {
        text: `$${k}${u}(${poly([t(m, u + w), t(n)])})$`,
        feedback: `When you take $${u}$ out, it must be removed from **every** term. Expanding this doesn't give the original expression.`,
      },
    ]);
    return {
      type: 'mcq',
      prompt: `Factorise **fully** $${expr}$.`,
      ...mcq,
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        `Find the HCF of the numbers ${k * m} and ${Math.abs(k * n)}.`,
        'Then look for a letter that appears in **every** term. It is part of the common factor too.',
      ],
      solution: [
        `The HCF of ${k * m} and ${Math.abs(k * n)} is ${k}, and $${u}$ is in both terms, so the HCF of the terms is $${k}${u}$.`,
        `Divide each term by $${k}${u}$: $${poly([outer[0]!])} \\div ${k}${u} = ${poly([inner[0]!])}$ and $${poly([outer[1]!])} \\div ${k}${u} = ${tex(n)}$`,
        `So $${expr} = ${k}${u}(${poly(inner)})$.`,
        `Check by expanding: $${k}${u} \\times ${poly([inner[0]!])} = ${poly([outer[0]!])}$ and $${k}${u} \\times ${texSigned(n)} = ${poly([outer[1]!])}$ ✓`,
      ].join('\n\n'),
    };
  },
};
