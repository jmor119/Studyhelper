import type { QuestionTemplate } from '../../types';
import { frac, gcd, lcm, mixed, NAMES } from '../../format';
import { addFractions, fracSigned, mixedTex, properFraction, simp } from './helpers';

// m9.num.fractions — equivalent fractions, simplifying, mixed numbers and the four operations.
// All arithmetic is done on integer numerators/denominators, so answers are exact.

const SMALL_DENS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

/** "= 1\frac{1}{6}" when an improper result is worth showing as a mixed number too. */
function mixedNote(n: number, d: number): string {
  const [a, b] = simp(n, d);
  return b !== 1 && Math.abs(a) > b ? ` = ${mixed(a, b)}` : '';
}

/** Solution lines for a/b ± c/d using the lowest common denominator. */
function addSubSteps(n1: number, d1: number, n2: number, d2: number, op: '+' | '-'): { lines: string[]; top: number; L: number } {
  const { L, a, b, top } = addFractions(n1, d1, n2, d2, op);
  const lines: string[] = [];
  if (d1 !== L || d2 !== L) {
    const conv: string[] = [];
    if (d1 !== L) conv.push(`$${frac(n1, d1, true)} = ${frac(a, L, true)}$`);
    if (d2 !== L) conv.push(`$${frac(n2, d2, true)} = ${frac(b, L, true)}$`);
    lines.push(`The lowest common denominator of ${d1} and ${d2} is ${L}. ${conv.join(' and ')}.`);
  }
  const [sn, sd] = simp(top, L);
  const simplified = sn !== top ? ` = ${frac(sn, sd)}` : '';
  lines.push(`$${frac(a, L, true)} ${op} ${frac(b, L, true)} = ${frac(top, L, true)}${simplified}${mixedNote(top, L)}$`);
  return { lines, top, L };
}

export const equivalentSimplify: QuestionTemplate = {
  id: 'm9.num.fractions.equivalent-simplify',
  topicId: 'm9.num.fractions',
  title: 'Equivalent fractions, simplifying and mixed numbers',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const [n, d] = properFraction(rng, SMALL_DENS);
      const k = rng.int(2, 9);
      const kind = rng.pick(['simplify', 'simplify', 'missingTop', 'missingBottom'] as const);
      if (kind === 'simplify') {
        return {
          type: 'numeric',
          prompt: `Write $\\frac{${k * n}}{${k * d}}$ in simplest form.`,
          answer: n / d,
          form: 'simplest-fraction',
          calculator: 'not-allowed',
          hints: [
            'Find the highest common factor (HCF) of the numerator and the denominator.',
            'Divide the numerator and the denominator by that same number.',
          ],
          solution: `The HCF of ${k * n} and ${k * d} is ${k}. Divide the top and the bottom by ${k}:\n\n$\\frac{${k * n}}{${k * d}} = \\frac{${k * n} \\div ${k}}{${k * d} \\div ${k}} = \\frac{${n}}{${d}}$\n\n${n} and ${d} have no common factor other than 1, so this is the simplest form.`,
        };
      }
      const top = kind === 'missingTop';
      return {
        type: 'numeric',
        prompt: `Find the missing number: $\\frac{${n}}{${d}} = \\frac{${top ? '\\square' : k * n}}{${top ? k * d : '\\square'}}$`,
        answer: top ? k * n : k * d,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          top ? `What has ${d} been multiplied by to get ${k * d}?` : `What has ${n} been multiplied by to get ${k * n}?`,
          'Whatever you multiply the bottom by, you must multiply the top by too (and the other way round).',
        ],
        solution: `${top ? `$${d} \\times ${k} = ${k * d}$, so multiply the numerator by ${k} too: $${n} \\times ${k} = ${k * n}$.` : `$${n} \\times ${k} = ${k * n}$, so multiply the denominator by ${k} too: $${d} \\times ${k} = ${k * d}$.`}\n\n$\\frac{${n}}{${d}} = \\frac{${n} \\times ${k}}{${d} \\times ${k}} = \\frac{${k * n}}{${k * d}}$\n\nThis is multiplying by $\\frac{${k}}{${k}} = 1$, so the value doesn't change.`,
      };
    }
    // difficulty 2: improper ↔ mixed
    const w = rng.int(1, 5);
    const [r, d] = properFraction(rng, SMALL_DENS);
    const top = w * d + r;
    const kind = rng.pick(['toMixed', 'toImproper', 'simplifyToMixed'] as const);
    if (kind === 'toMixed') {
      return {
        type: 'numeric',
        prompt: `Write $\\frac{${top}}{${d}}$ as a mixed number.`,
        answer: top / d,
        form: 'mixed',
        calculator: 'not-allowed',
        hints: [`How many whole times does ${d} go into ${top}?`, 'The remainder becomes the numerator of the fraction part.'],
        solution: `$${top} \\div ${d} = ${w}$ remainder ${r}.\n\nSo $\\frac{${top}}{${d}} = ${mixedTex(w, r, d)}$.`,
      };
    }
    if (kind === 'toImproper') {
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${mixedTex(w, r, d)} = \\frac{\\square}{${d}}$`,
        answer: top,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Each whole is $\\frac{${d}}{${d}}$. How many ${d}ths are in ${w} whole${w > 1 ? 's' : ''}?`, 'Then add the numerator of the fraction part.'],
        solution: `$${w} \\times ${d} + ${r} = ${w * d} + ${r} = ${top}$, so $${mixedTex(w, r, d)} = \\frac{${top}}{${d}}$.`,
      };
    }
    const k = rng.int(2, 4);
    return {
      type: 'numeric',
      prompt: `Simplify $\\frac{${k * top}}{${k * d}}$ and write it as a mixed number.`,
      answer: top / d,
      form: 'mixed',
      calculator: 'not-allowed',
      hints: ['Simplify first: divide the top and bottom by their highest common factor.', 'Then divide the numerator by the denominator; the remainder is the new numerator.'],
      solution: `The HCF of ${k * top} and ${k * d} is ${k * gcd(top, d)}, so $\\frac{${k * top}}{${k * d}} = \\frac{${top}}{${d}}$.\n\n$${top} \\div ${d} = ${w}$ remainder ${r}, so the answer is $${mixedTex(w, r, d)}$.`,
    };
  },
};

export const addSubtract: QuestionTemplate = {
  id: 'm9.num.fractions.add-subtract',
  topicId: 'm9.num.fractions',
  title: 'Add and subtract fractions and mixed numbers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const commonHints = [
      'You can only add or subtract fractions once they have the same denominator.',
      'Use the lowest common multiple of the denominators as the new denominator.',
    ];
    if (difficulty === 2 || difficulty === 3) {
      let n1 = 1;
      let d1 = 2;
      let n2 = 1;
      let d2 = 3;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (difficulty === 2) {
          // one denominator is a multiple of the other
          const b = rng.int(2, 6);
          const k = rng.int(2, 4);
          [n1, d1] = properFraction(rng, [b]);
          [n2, d2] = properFraction(rng, [k * b]);
          if (rng.chance(0.5)) [n1, d1, n2, d2] = [n2, d2, n1, d1];
        } else {
          [n1, d1] = properFraction(rng, SMALL_DENS);
          [n2, d2] = properFraction(rng, SMALL_DENS);
          if (lcm(d1, d2) === Math.max(d1, d2)) continue;
        }
        if (d1 !== d2) break;
      }
      let op = rng.pick(['+', '-'] as const);
      if (op === '-' && n1 * d2 < n2 * d1) [n1, d1, n2, d2] = [n2, d2, n1, d1];
      if (n1 * d2 === n2 * d1) op = '+';
      const { lines, top, L } = addSubSteps(n1, d1, n2, d2, op);
      const [an, ad] = simp(top, L);
      return {
        type: 'numeric',
        prompt: `Work out $\\frac{${n1}}{${d1}} ${op} \\frac{${n2}}{${d2}}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: commonHints,
        solution: lines.join('\n\n'),
      };
    }
    // difficulty 4: mixed numbers, or negative fractions
    if (rng.chance(0.6)) {
      const op = rng.pick(['+', '-'] as const);
      let [r1, d1] = properFraction(rng, SMALL_DENS);
      let [r2, d2] = properFraction(rng, SMALL_DENS);
      while (d2 === d1) [r2, d2] = properFraction(rng, SMALL_DENS);
      let w1 = rng.int(1, 4);
      let w2 = rng.int(1, 3);
      if (op === '-') {
        if (w1 < w2) [w1, w2, r1, d1, r2, d2] = [w2, w1, r2, d2, r1, d1];
        if (w1 < w2 + 2) w1 = w2 + 2;
      }
      const N1 = w1 * d1 + r1;
      const N2 = w2 * d2 + r2;
      const { L, a, b, top } = addFractions(N1, d1, N2, d2, op);
      const [an, ad] = simp(top, L);
      return {
        type: 'numeric',
        prompt: `Work out $${mixedTex(w1, r1, d1)} ${op} ${mixedTex(w2, r2, d2)}$. Give your answer as a mixed number in simplest form.`,
        answer: an / ad,
        form: 'mixed',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Change both mixed numbers into improper fractions.', commonHints[1]!],
        solution: [
          `Improper fractions: $${mixedTex(w1, r1, d1)} = \\frac{${N1}}{${d1}}$ and $${mixedTex(w2, r2, d2)} = \\frac{${N2}}{${d2}}$.`,
          `Common denominator ${L}: $\\frac{${a}}{${L}} ${op} \\frac{${b}}{${L}} = \\frac{${top}}{${L}}${an !== top ? ` = ${frac(an, ad)}` : ''}$.`,
          `As a mixed number: $${mixed(an, ad)}$.`,
        ].join('\n\n'),
      };
    }
    let [n1, d1] = properFraction(rng, SMALL_DENS);
    let [n2, d2] = properFraction(rng, SMALL_DENS);
    while (d2 === d1) [n2, d2] = properFraction(rng, SMALL_DENS);
    const form = rng.pick(['negFirst', 'subtractBigger'] as const);
    let op: '+' | '-';
    let promptTex: string;
    let s1 = n1;
    if (form === 'negFirst') {
      s1 = -n1;
      op = rng.pick(['+', '-'] as const);
      promptTex = `-\\frac{${n1}}{${d1}} ${op} \\frac{${n2}}{${d2}}`;
    } else {
      if (n1 * d2 > n2 * d1) [n1, d1, n2, d2] = [n2, d2, n1, d1];
      s1 = n1;
      op = '-';
      promptTex = `\\frac{${n1}}{${d1}} - \\frac{${n2}}{${d2}}`;
    }
    const { L, a, b, top } = addFractions(s1, d1, n2, d2, op);
    const [an, ad] = simp(top, L);
    return {
      type: 'numeric',
      prompt: `Work out $${promptTex}$. Give your answer in simplest form.`,
      answer: an / ad,
      form: 'simplest-fraction',
      marks: 2,
      calculator: 'not-allowed',
      hints: [commonHints[1]!, 'Then work with the numerators as integers, e.g. $-9 + 2 = -7$.'],
      solution: [
        `The lowest common denominator is ${L}. ${[
          d1 !== L ? `$${frac(s1, d1, true)} = ${frac(a, L, true)}$` : '',
          d2 !== L ? `$\\frac{${n2}}{${d2}} = \\frac{${b}}{${L}}$` : '',
        ]
          .filter(Boolean)
          .join(' and ')}.`,
        `$${frac(a, L, true)} ${op} \\frac{${b}}{${L}} = \\frac{${a} ${op} ${b}}{${L}} = ${frac(top, L, true)}${an !== top ? ` = ${frac(an, ad)}` : ''}$`,
        ...(top < 0 ? ['Write the negative sign in front of the fraction (or on the numerator), never on the denominator.'] : []),
      ].join('\n\n'),
    };
  },
};

export const multiplyDivide: QuestionTemplate = {
  id: 'm9.num.fractions.multiply-divide',
  topicId: 'm9.num.fractions',
  title: 'Multiply and divide fractions',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const [a, b] = properFraction(rng, SMALL_DENS);
        const m = rng.int(2, 12);
        const N = b * m;
        return {
          type: 'numeric',
          prompt: `Work out $\\frac{${a}}{${b}}$ of ${N}.`,
          answer: a * m,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['"Of" means multiply.', `Find $\\frac{1}{${b}}$ of ${N} first by dividing by ${b}.`],
          solution: `$\\frac{1}{${b}}$ of ${N} is $${N} \\div ${b} = ${m}$.\n\nSo $\\frac{${a}}{${b}}$ of ${N} is $${a} \\times ${m} = ${a * m}$.`,
        };
      }
      const [a, b] = properFraction(rng, SMALL_DENS);
      const [c, d] = properFraction(rng, SMALL_DENS);
      const [an, ad] = simp(a * c, b * d);
      return {
        type: 'numeric',
        prompt: `Work out $\\frac{${a}}{${b}} \\times \\frac{${c}}{${d}}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: ['Multiply the numerators together, and multiply the denominators together.', 'Then simplify (or cancel common factors first).'],
        solution: `$\\frac{${a}}{${b}} \\times \\frac{${c}}{${d}} = \\frac{${a} \\times ${c}}{${b} \\times ${d}} = \\frac{${a * c}}{${b * d}}${an !== a * c ? ` = ${frac(an, ad)}` : ''}$`,
      };
    }
    if (difficulty === 3) {
      const divHints = [
        'Dividing by a fraction is the same as multiplying by its reciprocal.',
        'Keep the first number, change ÷ to ×, and flip the second fraction.',
      ];
      if (rng.chance(0.35)) {
        const [c, d] = properFraction(rng, SMALL_DENS);
        const N = c * rng.int(2, 6);
        const answer = (N * d) / c;
        return {
          type: 'numeric',
          prompt: `Work out $${N} \\div \\frac{${c}}{${d}}$.`,
          answer,
          form: 'simplest-fraction',
          calculator: 'not-allowed',
          hints: divHints,
          solution: `$${N} \\div \\frac{${c}}{${d}} = ${N} \\times \\frac{${d}}{${c}} = \\frac{${N * d}}{${c}} = ${answer}$\n\nCheck: there are ${d} lots of $\\frac{1}{${d}}$ in every whole, so dividing by a fraction less than 1 gives a bigger answer.`,
        };
      }
      const [a, b] = properFraction(rng, SMALL_DENS);
      let [c, d] = properFraction(rng, SMALL_DENS);
      while (c === a && d === b) [c, d] = properFraction(rng, SMALL_DENS);
      const [an, ad] = simp(a * d, b * c);
      return {
        type: 'numeric',
        prompt: `Work out $\\frac{${a}}{${b}} \\div \\frac{${c}}{${d}}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: divHints,
        solution: `$\\frac{${a}}{${b}} \\div \\frac{${c}}{${d}} = \\frac{${a}}{${b}} \\times \\frac{${d}}{${c}} = \\frac{${a * d}}{${b * c}}${an !== a * d ? ` = ${frac(an, ad)}` : ''}${mixedNote(an, ad)}$`,
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.4)) {
        // Word problem: how many pieces?
        let n = 1;
        let d = 4;
        let k = 5;
        for (let attempt = 0; attempt < 50; attempt++) {
          [n, d] = properFraction(rng, [3, 4, 5, 6, 8]);
          k = rng.int(3, 12);
          if ((k * n) % d !== 0 && k * n > d) break;
        }
        const [p, q] = simp(k * n, d);
        const name = rng.pick(NAMES);
        return {
          type: 'numeric',
          prompt: `${name} has a piece of timber $${mixed(p, q)}$ m long. ${name} cuts it into pieces that are each $\\frac{${n}}{${d}}$ m long. How many pieces does ${name} get?`,
          answer: k,
          form: 'integer',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['"How many pieces of this size fit into that length?" is a division.', 'Write the mixed number as an improper fraction, then multiply by the reciprocal.'],
          solution: `Work out $${mixed(p, q)} \\div \\frac{${n}}{${d}}$.\n\n$${mixed(p, q)} = \\frac{${p}}{${q}}$, so $\\frac{${p}}{${q}} \\times \\frac{${d}}{${n}} = \\frac{${p * d}}{${q * n}} = ${k}$.\n\n${name} gets **${k} pieces**.`,
        };
      }
      const op = rng.pick(['\\times', '\\div'] as const);
      const w1 = rng.int(1, 3);
      const [r1, d1] = properFraction(rng, [2, 3, 4, 5, 6]);
      const useMixed2 = rng.chance(0.6);
      const w2 = useMixed2 ? rng.int(1, 3) : 0;
      const [r2, d2] = properFraction(rng, [2, 3, 4, 5, 6, 8]);
      const N1 = w1 * d1 + r1;
      const N2 = w2 * d2 + r2;
      const second = useMixed2 ? mixedTex(w2, r2, d2) : `\\frac{${r2}}{${d2}}`;
      const [pn, pd] = op === '\\times' ? [N1 * N2, d1 * d2] : [N1 * d2, d1 * N2];
      const [an, ad] = simp(pn, pd);
      const step2 = op === '\\times' ? `\\frac{${N1}}{${d1}} \\times \\frac{${N2}}{${d2}}` : `\\frac{${N1}}{${d1}} \\times \\frac{${d2}}{${N2}}`;
      return {
        type: 'numeric',
        prompt: `Work out $${mixedTex(w1, r1, d1)} ${op} ${second}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          'Change any mixed numbers into improper fractions first.',
          op === '\\times' ? 'Then multiply the numerators and the denominators.' : 'Then multiply by the reciprocal of the second fraction.',
        ],
        solution: [
          `Improper fractions: $${mixedTex(w1, r1, d1)} = \\frac{${N1}}{${d1}}$${useMixed2 ? ` and $${second} = \\frac{${N2}}{${d2}}$` : ''}.`,
          `$${step2} = \\frac{${pn}}{${pd}}${an !== pn ? ` = ${frac(an, ad)}` : ''}${mixedNote(an, ad)}$`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: (a/b ± c/d) × or ÷ e/f
    for (let attempt = 0; attempt < 100; attempt++) {
      const [a, b] = properFraction(rng, SMALL_DENS);
      const [c, d] = properFraction(rng, SMALL_DENS);
      if (b === d) continue;
      const [e, f] = properFraction(rng, [2, 3, 4, 5, 6, 8, 9]);
      const op1 = rng.pick(['+', '-'] as const);
      const op2 = rng.pick(['\\times', '\\div'] as const);
      const { L, top } = addFractions(a, b, c, d, op1);
      if (top === 0) continue;
      const [sn, sd] = simp(top, L);
      const [pn, pd] = op2 === '\\times' ? [sn * e, sd * f] : [sn * f, sd * e];
      const [an, ad] = simp(pn, pd);
      const steps = addSubSteps(a, b, c, d, op1).lines;
      return {
        type: 'numeric',
        prompt: `Work out $\\left(\\frac{${a}}{${b}} ${op1} \\frac{${c}}{${d}}\\right) ${op2} \\frac{${e}}{${f}}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        marks: 3,
        calculator: 'not-allowed',
        hints: [
          'Brackets first: find a common denominator and work out the bracket.',
          op2 === '\\times' ? 'Then multiply by the fraction outside.' : 'Then divide by multiplying by the reciprocal of the fraction outside.',
        ],
        solution: [
          '**Bracket.**',
          ...steps,
          `**Then ${op2 === '\\times' ? 'multiply' : 'divide'}.** $${fracSigned(sn, sd)} ${op2} \\frac{${e}}{${f}} = ${op2 === '\\times' ? '' : `${fracSigned(sn, sd)} \\times \\frac{${f}}{${e}} = `}${frac(pn, pd, true)}${an !== pn || ad !== pd ? ` = ${frac(an, ad)}` : ''}$`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: 'Work out $\\left(\\frac{2}{3} + \\frac{1}{4}\\right) \\div \\frac{5}{6}$. Give your answer in simplest form.',
      answer: 11 / 10,
      form: 'simplest-fraction',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['Brackets first: find a common denominator and work out the bracket.'],
      solution: '$\\frac{2}{3} + \\frac{1}{4} = \\frac{8}{12} + \\frac{3}{12} = \\frac{11}{12}$, then $\\frac{11}{12} \\times \\frac{6}{5} = \\frac{66}{60} = \\frac{11}{10}$.',
    };
  },
};
