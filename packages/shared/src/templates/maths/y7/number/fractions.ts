import type { QuestionTemplate } from '../../../types';
import { gcd, lcm, NAMES } from '../../../format';
import type { Rng } from '../../../../rng';
import { bothTex, f, fractionBar, listAnd, mcqFields, mixedTex, niceTex, orderItems, partsName, properFraction, simp } from './fractions-helpers';

// m7.num.fractions — equivalent fractions, simplest form, mixed numbers, comparing and ordering,
// fractions as a relationship between amounts, and adding and subtracting fractions and mixed numbers.
// All arithmetic is done on whole-number numerators and denominators, so answers are exact.

const NA = 'not-allowed' as const;
const DENS = [2, 3, 4, 5, 6, 8, 10, 12] as const;
const FRIENDLY = new Set([2, 3, 4, 5, 6, 8, 9, 10, 12]);

function smallestPrimeFactor(n: number): number {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}

/** Numerators x (over L) with lo < x/L < hi whose simplified denominator is friendly and not 1. */
function candidates(L: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let x = lo * L + 1; x < hi * L; x++) {
    const [, b] = simp(x, L);
    if (b !== 1 && FRIENDLY.has(b)) out.push(x);
  }
  return out;
}

/** Solution lines for n1/d1 ± n2/d2 using the lowest common denominator. */
function addSubLines(n1: number, d1: number, n2: number, d2: number, op: '+' | '-') {
  const L = lcm(d1, d2);
  const a = n1 * (L / d1);
  const b = n2 * (L / d2);
  const top = op === '+' ? a + b : a - b;
  const lines: string[] = [];
  if (d1 !== L || d2 !== L) {
    const conv: string[] = [];
    if (d1 !== L) conv.push(`$${f(n1, d1)} = ${f(a, L)}$`);
    if (d2 !== L) conv.push(`$${f(n2, d2)} = ${f(b, L)}$`);
    lines.push(`The lowest common denominator of ${d1} and ${d2} is ${L}. ${listAnd(conv)}.`);
  }
  lines.push(`$${f(a, L)} ${op} ${f(b, L)} = ${f(top, L)}$`);
  const [sn, sd] = simp(top, L);
  if (sn !== top) lines.push(`Simplify by dividing the top and bottom by ${top / sn}: $${f(top, L)} = ${bothTex(top, L)}$`);
  else if (sn > sd) lines.push(`As a mixed number: $${f(top, L)} = ${niceTex(top, L)}$`);
  return { lines, top, L };
}

const ADD_HINTS = [
  'You can only add or subtract fractions when they have the same denominator.',
  'Find a number that both denominators go into. Change both fractions, then add or subtract the numerators only.',
];

export const equivalent: QuestionTemplate = {
  id: 'm7.num.fractions.equivalent',
  topicId: 'm7.num.fractions',
  title: 'Equivalent fractions and simplest form',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['bar', 'missingTop', 'missingBottom'] as const);
      if (kind === 'bar') {
        const D = rng.pick([4, 6, 8, 9, 10, 12]);
        const choices: number[] = [];
        for (let s = 1; s < D; s++) if (gcd(s, D) > 1) choices.push(s);
        const S = rng.pick(choices);
        const [a, b] = simp(S, D);
        const g = S / a;
        return {
          type: 'numeric',
          prompt: 'What fraction of the bar is shaded? Give your answer in simplest form.',
          figure: { svg: fractionBar(D, S), alt: `A bar split into ${D} equal parts. ${S} of the parts are shaded.` },
          answer: a / b,
          form: 'simplest-fraction',
          calculator: NA,
          hints: [
            'Count the shaded parts and the total number of equal parts. Write that as a fraction.',
            'Then divide the numerator and the denominator by the same number, as far as you can go.',
          ],
          solution: `${S} out of ${D} equal parts are shaded, so the fraction is $${f(S, D)}$.\n\n${S} and ${D} can both be divided by ${g}:\n\n$${f(S, D)} = \\frac{${S} \\div ${g}}{${D} \\div ${g}} = ${f(a, b)}$\n\n${a} and ${b} have no common factor except 1, so $${f(a, b)}$ is in simplest form.`,
        };
      }
      const [n, d] = properFraction(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const k = rng.int(2, 9);
      const top = kind === 'missingTop';
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${f(n, d)} = \\frac{${top ? '\\square' : k * n}}{${top ? k * d : '\\square'}}$`,
        answer: top ? k * n : k * d,
        form: 'integer',
        calculator: NA,
        hints: [
          top ? `What do you multiply ${d} by to get ${k * d}?` : `What do you multiply ${n} by to get ${k * n}?`,
          'Whatever you multiply the denominator by, you must multiply the numerator by too.',
        ],
        solution: `${top ? `$${d} \\times ${k} = ${k * d}$, so multiply the numerator by ${k} as well: $${n} \\times ${k} = ${k * n}$.` : `$${n} \\times ${k} = ${k * n}$, so multiply the denominator by ${k} as well: $${d} \\times ${k} = ${k * d}$.`}\n\n$${f(n, d)} = \\frac{${n} \\times ${k}}{${d} \\times ${k}} = ${f(k * n, k * d)}$\n\nBoth fractions are at the same point on the number line, so they are **equivalent**.`,
      };
    }
    // difficulty 2: simplify a fraction with bigger numbers
    const improper = rng.chance(0.3);
    let n: number;
    let d: number;
    if (improper) {
      d = rng.pick([2, 3, 4, 5, 6, 7, 8, 9]);
      do n = rng.int(d + 1, 3 * d);
      while (gcd(n, d) !== 1);
    } else {
      [n, d] = properFraction(rng, [3, 4, 5, 6, 7, 8, 9, 10, 12]);
    }
    const k = rng.int(2, Math.min(12, Math.max(2, Math.floor(120 / Math.max(n, d)))));
    const p = smallestPrimeFactor(k);
    const steps =
      p !== k
        ? `\n\nYou could also do it in steps. For example, divide the top and bottom by ${p} first, then keep going until nothing else divides into both.`
        : '';
    return {
      type: 'numeric',
      prompt: `Write $${f(k * n, k * d)}$ in simplest form.${improper ? ' You can give an improper fraction or a mixed number.' : ''}`,
      answer: n / d,
      form: 'simplest-fraction',
      calculator: NA,
      hints: [
        `Find the highest common factor (HCF) of ${k * n} and ${k * d}.`,
        'Divide the numerator and the denominator by that same number.',
      ],
      solution: `The highest common factor of ${k * n} and ${k * d} is ${k}. Divide the top and the bottom by ${k}:\n\n$${f(k * n, k * d)} = \\frac{${k * n} \\div ${k}}{${k * d} \\div ${k}} = ${f(n, d)}$${improper ? `\n\nAs a mixed number, $${f(n, d)} = ${niceTex(n, d)}$.` : ''}\n\n${n} and ${d} have no common factor except 1, so this is the simplest form.${steps}`,
    };
  },
};

export const mixedImproper: QuestionTemplate = {
  id: 'm7.num.fractions.mixed-improper',
  topicId: 'm7.num.fractions',
  title: 'Mixed numbers and improper fractions',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const w = rng.int(1, 5);
      const [r, d] = properFraction(rng, [2, 3, 4, 5, 6, 8, 10]);
      const top = w * d + r;
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `Write $${f(top, d)}$ as a mixed number.`,
          answer: top / d,
          form: 'mixed',
          calculator: NA,
          hints: [`How many whole times does ${d} go into ${top}?`, 'The amount left over becomes the numerator of the fraction part.'],
          solution: `$${top} \\div ${d} = ${w}$ remainder ${r}.\n\nSo there are ${w} whole${w > 1 ? 's' : ''} and $${f(r, d)}$ left over: $${f(top, d)} = ${mixedTex(w, r, d)}$.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Find the missing number: $${mixedTex(w, r, d)} = \\frac{\\square}{${d}}$`,
        answer: top,
        form: 'integer',
        calculator: NA,
        hints: [`Each whole is $${f(d, d)}$. How many ${partsName(d)} are in ${w} whole${w > 1 ? 's' : ''}?`, 'Then add on the numerator of the fraction part.'],
        solution: `Each whole is $${f(d, d)}$, so ${w} whole${w > 1 ? 's are' : ' is'} $${f(w * d, d)}$.\n\n$${w} \\times ${d} + ${r} = ${w * d} + ${r} = ${top}$, so $${mixedTex(w, r, d)} = ${f(top, d)}$.`,
      };
    }
    // difficulty 2
    if (rng.chance(0.5)) {
      const w = rng.int(1, 5);
      const [r, d] = properFraction(rng, [2, 3, 4, 5, 6]);
      const top = w * d + r;
      const k = rng.int(2, 4);
      return {
        type: 'numeric',
        prompt: `Write $${f(k * top, k * d)}$ as a mixed number in simplest form.`,
        answer: top / d,
        form: 'mixed',
        calculator: NA,
        hints: ['You can simplify first, or change to a mixed number first and simplify the fraction part after.', `How many whole times does the denominator go into the numerator?`],
        solution: `Simplify first: the HCF of ${k * top} and ${k * d} is ${k}, so $${f(k * top, k * d)} = ${f(top, d)}$.\n\nThen $${top} \\div ${d} = ${w}$ remainder ${r}, so the answer is $${mixedTex(w, r, d)}$.`,
      };
    }
    const w = rng.int(4, 9);
    const [r, d] = properFraction(rng, [6, 7, 8, 9, 10, 12]);
    const top = w * d + r;
    return {
      type: 'numeric',
      prompt: `Write $${mixedTex(w, r, d)}$ as an improper fraction. What is the numerator?\n\n$${mixedTex(w, r, d)} = \\frac{\\square}{${d}}$`,
      answer: top,
      form: 'integer',
      calculator: NA,
      hints: [`How many ${partsName(d)} make one whole? So how many are in ${w} wholes?`, 'Add on the numerator of the fraction part.'],
      solution: `$${w} \\times ${d} = ${w * d}$, so ${w} wholes are $${f(w * d, d)}$.\n\nAdd the $${f(r, d)}$: $${w * d} + ${r} = ${top}$. So $${mixedTex(w, r, d)} = ${f(top, d)}$.`,
    };
  },
};

export const compareOrder: QuestionTemplate = {
  id: 'm7.num.fractions.compare-order',
  topicId: 'm7.num.fractions',
  title: 'Compare and order fractions',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      // Three fractions whose denominators all go into D.
      for (;;) {
        const D = rng.pick([6, 8, 10, 12]);
        const xs = rng.sample(candidates(D, 0, 1), 3);
        const dens = new Set(xs.map((x) => simp(x, D)[1]));
        if (dens.size < 2 || !dens.has(D)) continue;
        const sorted = [...xs].sort((p, q) => p - q);
        let shown = rng.shuffle(xs);
        if (shown.join() === sorted.join()) shown = [sorted[2]!, sorted[0]!, sorted[1]!];
        const t = (x: number) => `$${niceTex(x, D)}$`;
        return {
          type: 'order',
          prompt: `Put these fractions in order from **smallest** to **largest**: ${listAnd(shown.map(t))}.`,
          items: orderItems(rng, sorted.map(t)),
          calculator: NA,
          hints: ['Change the fractions so they all have the same denominator.', `All of the denominators go into ${D}.`],
          solution: `Change each fraction to ${partsName(D)}: ${listAnd(sorted.map((x) => (simp(x, D)[1] === D ? `$${f(x, D)}$ stays the same` : `$${niceTex(x, D)} = ${f(x, D)}$`)))}.\n\nNow compare the numerators. From smallest to largest: ${sorted.map(t).join(', ')}.`,
        };
      }
    }
    if (difficulty === 3) {
      for (;;) {
        const L = rng.pick([12, 18, 20, 24, 30]);
        const xs = rng.sample(candidates(L, 0, 1), 4);
        const fr = xs.map((x) => simp(x, L));
        if (new Set(fr.map(([, b]) => b)).size < 3) continue;
        const largest = rng.chance(0.6);
        const target = largest ? Math.max(...xs) : Math.min(...xs);
        const [tn, td] = simp(target, L);
        const maxDen = Math.max(...fr.map(([, b]) => b));
        const maxNum = Math.max(...fr.map(([a]) => a));
        const minNum = Math.min(...fr.map(([a]) => a));
        const distractors = xs
          .filter((x) => x !== target)
          .map((x) => {
            const [a, b] = simp(x, L);
            let extra = '';
            if (largest && b === maxDen) extra = ' A bigger denominator means the whole is cut into more, smaller pieces. It does not make the fraction bigger.';
            else if (largest && a === maxNum) extra = ' The biggest numerator is not always the biggest fraction. The size of the pieces matters too.';
            else if (!largest && a === minNum) extra = ' The smallest numerator is not always the smallest fraction. The size of the pieces matters too.';
            return {
              text: `$${f(a, b)}$`,
              feedback: `$${f(a, b)} = ${f(x, L)}$, but $${f(tn, td)} = ${f(target, L)}$ is ${largest ? 'bigger' : 'smaller'}.${extra}`,
            };
          });
        const mcq = mcqFields(rng, { text: `$${f(tn, td)}$` }, distractors);
        const shown = rng.shuffle(fr).map(([a, b]) => `$${f(a, b)}$`);
        const sorted = [...xs].sort((p, q) => p - q);
        return {
          type: 'mcq',
          ...mcq,
          prompt: `Which of these fractions is the **${largest ? 'largest' : 'smallest'}**? ${listAnd(shown, 'or')}`,
          calculator: NA,
          hints: ['Change all four fractions so they have the same denominator.', `All of the denominators go into ${L}.`],
          solution: `Change each fraction to ${partsName(L)}: ${listAnd(sorted.map((x) => (simp(x, L)[1] === L ? `$${f(x, L)}$ stays the same` : `$${niceTex(x, L)} = ${f(x, L)}$`)))}.\n\nThe ${largest ? 'largest' : 'smallest'} numerator is ${target}, so the ${largest ? 'largest' : 'smallest'} fraction is $${f(tn, td)}$.`,
        };
      }
    }
    // difficulty 4: order mixed numbers and improper fractions between 1 and 3
    for (;;) {
      const L = rng.pick([12, 18, 20, 24]);
      const xs = rng.sample(candidates(L, 1, 3), 4);
      const asMixed = xs.map(() => rng.chance(0.5));
      if (asMixed.every(Boolean) || asMixed.every((m) => !m)) continue;
      const text = new Map<number, string>();
      xs.forEach((x, i) => {
        const [a, b] = simp(x, L);
        text.set(x, `$${asMixed[i] ? niceTex(a, b) : f(a, b)}$`);
      });
      const sorted = [...xs].sort((p, q) => p - q);
      let shown = rng.shuffle(xs);
      if (shown.join() === sorted.join()) shown = [...sorted].reverse();
      return {
        type: 'order',
        prompt: `Put these numbers in order from **smallest** to **largest**: ${listAnd(shown.map((x) => text.get(x)!))}.`,
        items: orderItems(rng, sorted.map((x) => text.get(x)!)),
        marks: 2,
        calculator: NA,
        hints: ['Change any mixed numbers into improper fractions first.', `Then give them all the same denominator. All of the denominators go into ${L}.`],
        solution: `Write each number as an improper fraction with denominator ${L}:\n\n${sorted.map((x) => `- ${text.get(x)!} $= ${f(x, L)}$`).join('\n')}\n\nCompare the numerators. From smallest to largest: ${sorted.map((x) => text.get(x)!).join(', ')}.`,
      };
    }
  },
};

export const addSubtract: QuestionTemplate = {
  id: 'm7.num.fractions.add-subtract',
  topicId: 'm7.num.fractions',
  title: 'Add and subtract fractions and mixed numbers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2 || difficulty === 3) {
      let n1 = 1;
      let d1 = 2;
      let n2 = 1;
      let d2 = 4;
      for (let attempt = 0; attempt < 200; attempt++) {
        if (difficulty === 2) {
          const b = rng.pick([2, 3, 4, 5, 6]);
          const k = rng.int(2, b <= 3 ? 4 : 2);
          [n1, d1] = properFraction(rng, [b]);
          [n2, d2] = properFraction(rng, [k * b]);
          if (rng.chance(0.5)) [n1, d1, n2, d2] = [n2, d2, n1, d1];
        } else {
          [n1, d1] = properFraction(rng, DENS);
          [n2, d2] = properFraction(rng, DENS);
          const L = lcm(d1, d2);
          if (L === Math.max(d1, d2) || L > 24) continue;
        }
        if (d1 !== d2) break;
      }
      let op = rng.pick(['+', '-'] as const);
      if (op === '-' && n1 * d2 < n2 * d1) [n1, d1, n2, d2] = [n2, d2, n1, d1];
      if (n1 * d2 === n2 * d1) op = '+';
      const { lines, top, L } = addSubLines(n1, d1, n2, d2, op);
      const [an, ad] = simp(top, L);
      return {
        type: 'numeric',
        prompt: `Work out $${f(n1, d1)} ${op} ${f(n2, d2)}$. Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        calculator: NA,
        hints: ADD_HINTS,
        solution: lines.join('\n\n'),
      };
    }
    // difficulty 4: mixed numbers (or improper fractions) with different denominators
    let r1 = 1;
    let d1 = 2;
    let r2 = 1;
    let d2 = 3;
    for (let attempt = 0; attempt < 200; attempt++) {
      [r1, d1] = properFraction(rng, DENS);
      [r2, d2] = properFraction(rng, DENS);
      if (d1 !== d2 && lcm(d1, d2) <= 24) break;
    }
    const op = rng.pick(['+', '-'] as const);
    if (rng.chance(0.7)) {
      const w2 = rng.int(1, 3);
      const w1 = op === '-' ? w2 + rng.int(2, 3) : rng.int(1, 4);
      const N1 = w1 * d1 + r1;
      const N2 = w2 * d2 + r2;
      const { lines, top, L } = addSubLines(N1, d1, N2, d2, op);
      const [an, ad] = simp(top, L);
      return {
        type: 'numeric',
        prompt: `Work out $${mixedTex(w1, r1, d1)} ${op} ${mixedTex(w2, r2, d2)}$. Give your answer as a mixed number in simplest form.`,
        answer: an / ad,
        form: 'mixed',
        marks: 2,
        calculator: NA,
        hints: ['Change both mixed numbers into improper fractions first.', ADD_HINTS[1]!],
        solution: [
          `Change to improper fractions: $${mixedTex(w1, r1, d1)} = ${f(N1, d1)}$ and $${mixedTex(w2, r2, d2)} = ${f(N2, d2)}$.`,
          ...lines,
        ].join('\n\n'),
      };
    }
    // An improper fraction with a proper fraction.
    const w = rng.int(1, 2);
    const N1 = w * d1 + r1;
    const [a1, b1, a2, b2] = op === '-' || rng.chance(0.5) ? [N1, d1, r2, d2] : [r2, d2, N1, d1];
    const { lines, top, L } = addSubLines(a1, b1, a2, b2, op);
    const [an, ad] = simp(top, L);
    return {
      type: 'numeric',
      prompt: `Work out $${f(a1, b1)} ${op} ${f(a2, b2)}$. Give your answer in simplest form. You can give an improper fraction or a mixed number.`,
      answer: an / ad,
      form: 'simplest-fraction',
      marks: 2,
      calculator: NA,
      hints: ADD_HINTS,
      solution: lines.join('\n\n'),
    };
  },
};

const FAMILIES = [
  [2, 4, 8],
  [2, 3, 6],
  [3, 4, 6, 12],
  [2, 4, 5, 10],
  [2, 3, 4],
] as const;

interface Story {
  kind: 'left' | 'combine';
  units: 'm' | 'km' | 'L' | 'kg';
  text: (name: string, T: string, a: string, b: string, c: string) => string;
  answerWord: string;
}

const STORIES: Story[] = [
  {
    kind: 'left',
    units: 'm',
    text: (name, T, a, b) => `${name} has ${T} m of rope. ${name} cuts off $${a}$ m to make a swing and $${b}$ m to tie up a kayak. How many metres of rope are left?`,
    answerWord: 'rope left',
  },
  {
    kind: 'left',
    units: 'km',
    text: (name, T, a, b) => `The walking track to the hut is ${T} km long. ${name} walks $${a}$ km before morning tea and $${b}$ km more before lunch. How many kilometres does ${name} still have to walk?`,
    answerWord: 'still to walk',
  },
  {
    kind: 'left',
    units: 'm',
    text: (name, T, a, b) => `${name} has a roll of ribbon ${T} m long for the school gala. ${name} uses $${a}$ m on one stall and $${b}$ m on another. How many metres of ribbon are left?`,
    answerWord: 'ribbon left',
  },
  {
    kind: 'combine',
    units: 'L',
    text: (name, _T, a, b, c) => `For a class party, ${name} pours $${a}$ L of orange juice and $${b}$ L of lemonade into a punch bowl. The class drinks $${c}$ L. How many litres of punch are left?`,
    answerWord: 'punch left',
  },
  {
    kind: 'combine',
    units: 'kg',
    text: (name, _T, a, b, c) => `${name} picks $${a}$ kg of feijoas and $${b}$ kg of apples. ${name}'s whānau uses $${c}$ kg of the fruit to make a crumble. How many kilograms of fruit are left?`,
    answerWord: 'fruit left',
  },
];

/** A random mixed number (or proper fraction if maxWhole is 0) with denominator from `dens`, as [numerator, denominator] improper. */
function randomMixed(rng: Rng, dens: readonly number[], minWhole: number, maxWhole: number): [number, number, string] {
  const [r, d] = properFraction(rng, dens);
  const w = rng.int(minWhole, maxWhole);
  return [w * d + r, d, mixedTex(w, r, d)];
}

export const wordProblems: QuestionTemplate = {
  id: 'm7.num.fractions.word-problems',
  topicId: 'm7.num.fractions',
  title: 'Two-step fraction word problems',
  difficulties: [5],
  generate({ rng }) {
    for (;;) {
      const story = rng.pick(STORIES);
      const fam = rng.pick(FAMILIES);
      const name = rng.pick(NAMES);
      const [aN, aD, aT] = randomMixed(rng, fam, 1, 2);
      const [bN, bD, bT] = randomMixed(rng, fam, 0, 2);
      if (aD === bD) continue;
      if (story.kind === 'left') {
        const L = lcm(aD, bD);
        const used = aN * (L / aD) + bN * (L / bD);
        const T = Math.ceil(used / L) + rng.int(1, 3);
        const left = T * L - used;
        const [an, ad] = simp(left, L);
        const [un, ud] = simp(used, L);
        return {
          type: 'numeric',
          prompt: `${story.text(name, String(T), aT, bT, '')} Give your answer in simplest form.`,
          answer: an / ad,
          form: 'simplest-fraction',
          units: story.units,
          marks: 3,
          calculator: NA,
          hints: [
            'Step 1: add the two amounts to find how much is used altogether.',
            `Step 2: take that away from ${T}. Use a common denominator of ${L} the whole way through.`,
          ],
          solution: [
            `**Step 1: amount used.** $${aT} + ${bT} = ${f(aN * (L / aD), L)} + ${f(bN * (L / bD), L)} = ${f(used, L)}$${un !== used ? ` $= ${bothTex(un, ud)}$` : ''} ${story.units}.`,
            `**Step 2: amount left.** ${T} ${story.units} is $${f(T * L, L)}$, so $${f(T * L, L)} - ${f(used, L)} = ${f(left, L)}$${an !== left ? ` $= ${bothTex(an, ad)}$` : ''}.`,
            `So the ${story.answerWord} is $${niceTex(an, ad)}$ ${story.units}.`,
          ].join('\n\n'),
        };
      }
      const [cN, cD, cT] = randomMixed(rng, fam, 0, 2);
      const L = lcm(lcm(aD, bD), cD);
      const total = aN * (L / aD) + bN * (L / bD);
      const take = cN * (L / cD);
      const left = total - take;
      if (left * 4 < L) continue; // keep at least a quarter left
      const [an, ad] = simp(left, L);
      const [tn, td] = simp(total, L);
      return {
        type: 'numeric',
        prompt: `${story.text(name, '', aT, bT, cT)} Give your answer in simplest form.`,
        answer: an / ad,
        form: 'simplest-fraction',
        units: story.units,
        marks: 3,
        calculator: NA,
        hints: ['Step 1: add the first two amounts.', `Step 2: subtract the amount used. A common denominator of ${L} works for all three fractions.`],
        solution: [
          `**Step 1: total.** $${aT} + ${bT} = ${f(aN * (L / aD), L)} + ${f(bN * (L / bD), L)} = ${f(total, L)}$${tn !== total ? ` $= ${bothTex(tn, td)}$` : ''} ${story.units}.`,
          `**Step 2: subtract.** $${cT} = ${f(take, L)}$, so $${f(total, L)} - ${f(take, L)} = ${f(left, L)}$${an !== left ? ` $= ${bothTex(an, ad)}$` : ''}.`,
          `So the ${story.answerWord} is $${niceTex(an, ad)}$ ${story.units}.`,
        ].join('\n\n'),
      };
    }
  },
};

const CLASS_FACTS = [
  'walk to school',
  'have a pet cat',
  'play a winter sport',
  'have been to the snow',
  'bring their lunch from home',
  'were born in summer',
  'can swim 50 metres',
] as const;

const FOR_EVERY = [
  { where: 'a fruit bowl', a: 'apples', b: 'kiwifruit', all: 'the fruit' },
  { where: 'the school choir', a: 'Year 7 students', b: 'Year 8 students', all: 'the choir' },
  { where: 'a jar of jellybeans', a: 'red jellybeans', b: 'green jellybeans', all: 'the jellybeans' },
  { where: 'a paddock', a: 'sheep', b: 'cows', all: 'the animals' },
  { where: 'a box of pens', a: 'blue pens', b: 'black pens', all: 'the pens' },
] as const;

export const partOfWhole: QuestionTemplate = {
  id: 'm7.num.fractions.part-of-whole',
  topicId: 'm7.num.fractions',
  title: 'A fraction describes how two amounts are related',
  difficulties: [1, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const N = rng.int(20, 32);
      let k = rng.int(2, N - 2);
      for (let attempt = 0; attempt < 20 && gcd(k, N) === 1 && rng.chance(0.8); attempt++) k = rng.int(2, N - 2);
      const [a, b] = simp(k, N);
      const fact = rng.pick(CLASS_FACTS);
      const room = rng.int(1, 24);
      const g = k / a;
      return {
        type: 'numeric',
        prompt: `There are ${N} students in Room ${room}. ${k} of them ${fact}. What fraction of the class ${fact}? Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: NA,
        hints: ['The part goes on top (numerator). The whole class goes on the bottom (denominator).', 'Then simplify if you can.'],
        solution: `${k} out of ${N} students, so the fraction is $${f(k, N)}$.${g > 1 ? `\n\nThe HCF of ${k} and ${N} is ${g}, so $${f(k, N)} = ${f(a, b)}$.` : `\n\n${k} and ${N} have no common factor except 1, so $${f(k, N)}$ is already in simplest form.`}`,
      };
    }
    const kind = rng.pick(['forEvery', 'wonLost', 'reverse'] as const);
    if (kind === 'forEvery') {
      const c = rng.pick(FOR_EVERY);
      let a = rng.int(2, 7);
      let b = rng.int(2, 9);
      while (a === b || gcd(a, b) !== 1) {
        a = rng.int(2, 7);
        b = rng.int(2, 9);
      }
      const askA = rng.chance(0.6);
      const part = askA ? a : b;
      return {
        type: 'numeric',
        prompt: `In ${c.where} there are ${a} ${c.a} for every ${b} ${c.b}, and nothing else. What fraction of ${c.all} are ${askA ? c.a : c.b}?`,
        answer: part / (a + b),
        form: 'simplest-fraction',
        calculator: NA,
        hints: [`Think about one small group: ${a} ${c.a} and ${b} ${c.b}. How many is that altogether?`, 'The fraction is the part out of the whole group, not one part out of the other part.'],
        solution: `Each small group has $${a} + ${b} = ${a + b}$ things. ${part} of them are ${askA ? c.a : c.b}.\n\nSo $${f(part, a + b)}$ of ${c.all} are ${askA ? c.a : c.b}. This stays the same however many groups there are.\n\n**Watch out:** $${f(a, b)}$ compares one part with the other part, not with the whole.`,
      };
    }
    if (kind === 'wonLost') {
      const team = rng.pick(['netball', 'rugby', 'hockey', 'football', 'basketball'] as const);
      let won = rng.int(4, 18);
      let lost = rng.int(2, 12);
      while (gcd(won, won + lost) === 1) {
        won = rng.int(4, 18);
        lost = rng.int(2, 12);
      }
      const total = won + lost;
      const askWon = rng.chance(0.5);
      const part = askWon ? won : lost;
      const [a, b] = simp(part, total);
      return {
        type: 'numeric',
        prompt: `A school ${team} team won ${won} games and lost ${lost} games this season. There were no draws. What fraction of their games did they **${askWon ? 'win' : 'lose'}**? Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: NA,
        hints: ['First work out how many games they played altogether.', 'Write the fraction, then simplify.'],
        solution: `They played $${won} + ${lost} = ${total}$ games. They ${askWon ? 'won' : 'lost'} ${part} of them.\n\n$${f(part, total)}${part !== a ? ` = ${f(a, b)}$ (divide the top and bottom by ${part / a})` : '$'}.`,
      };
    }
    let [p, q] = properFraction(rng, [3, 4, 5, 7, 8, 9, 10]);
    while (p < 2) [p, q] = properFraction(rng, [3, 4, 5, 7, 8, 9, 10]);
    const c = rng.pick(FOR_EVERY);
    return {
      type: 'numeric',
      prompt: `In ${c.where}, $${f(p, q)}$ of ${c.all} are ${c.a}. The rest are ${c.b}. For every ${p} ${c.a}, how many ${c.b} are there?`,
      answer: q - p,
      form: 'integer',
      calculator: NA,
      hints: [`Imagine a small group of ${q}. How many of them are ${c.a}?`, `The rest of the ${q} are ${c.b}.`],
      solution: `$${f(p, q)}$ means ${p} out of every ${q} are ${c.a}. The other $${q} - ${p} = ${q - p}$ are ${c.b}.\n\nSo there are ${q - p} ${c.b} for every ${p} ${c.a}.`,
    };
  },
};

export const templates: QuestionTemplate[] = [equivalent, mixedImproper, compareOrder, addSubtract, wordProblems, partOfWhole];
