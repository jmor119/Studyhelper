import type { QuestionTemplate } from '../../../types';
import { poly, polyAnswer } from '../../../format';
import { LETTERS, cash, mcqFields, pickLetters, rectangleSvg, t, triangleSvg } from './notation-helpers';

// m7.alg.notation — variables, the notation conventions (3b, ab, a², a/b), collecting like terms and
// writing expressions from words. Year 7 scope: every collected coefficient stays positive (no
// negative coefficients), and there are no brackets to expand.
//
// Marking note: typed expression answers are marked by value plus a "simplified" check, which can't
// tell 3b from b × 3 or ab from ba. Questions that are about the conventions themselves are MCQs.

const NO_CALC = { calculator: 'not-allowed' as const };

/** Rotates a list of terms so the first one is positive (so the shown expression never starts with −). */
function positiveFirst(terms: Array<[number, string]>): Array<[number, string]> {
  const i = terms.findIndex(([c]) => c > 0);
  return [...terms.slice(i), ...terms.slice(0, i)];
}

export const conventions: QuestionTemplate = {
  id: 'm7.alg.notation.conventions',
  topicId: 'm7.alg.notation',
  title: 'Algebraic notation conventions (MCQ)',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    const kind =
      difficulty === 1
        ? rng.pick(['repeat-add', 'times-number', 'power'] as const)
        : rng.pick(['letters', 'divide', 'one', 'meaning-power', 'times-number'] as const);

    if (kind === 'repeat-add') {
      const k = rng.int(3, 6);
      const shown = Array.from({ length: k }, () => v).join(' + ');
      return {
        ...NO_CALC,
        prompt: `What is the usual way to write $${shown}$ in algebra?`,
        ...mcqFields(rng, { text: `$${k}${v}$` }, [
          { text: `$${v}^${k}$`, feedback: `$${v}^${k}$ means ${k} lots of $${v}$ **multiplied** together. Here they are added.` },
          { text: `$${v}${k}$`, feedback: 'Nearly. In algebra the number always goes in front of the letter.' },
          { text: `$${v} + ${k}$`, feedback: `$${v} + ${k}$ means "$${v}$ plus ${k}". You have ${k} lots of $${v}$.` },
        ]),
        hints: [`Count how many lots of $${v}$ are being added.`, 'A number in front of a letter tells you how many lots of that letter there are.'],
        solution: `There are ${k} lots of $${v}$ added together, which is $${k} \\times ${v}$.\n\nIn algebra we leave out the × sign and put the number first: $${shown} = ${k}${v}$.`,
      };
    }

    if (kind === 'times-number') {
      const c = rng.int(2, 9);
      const reversed = rng.chance(0.5);
      const shown = reversed ? `${v} \\times ${c}` : `${c} \\times ${v}`;
      return {
        ...NO_CALC,
        prompt: `What is the usual way to write $${shown}$ in algebra?`,
        ...mcqFields(rng, { text: `$${c}${v}$` }, [
          { text: `$${v}${c}$`, feedback: 'Nearly. In algebra the number always goes in front of the letter.' },
          { text: `$${c} + ${v}$`, feedback: `This is adding. $${shown}$ is multiplying.` },
          { text: `$${v}^${c}$`, feedback: `$${v}^${c}$ means $${v}$ multiplied by itself ${c} times, not ${c} lots of $${v}$.` },
        ]),
        hints: ['In algebra we leave out the × sign.', 'Which goes first: the number or the letter?'],
        solution: `Leave out the × sign and write the number first: $${shown} = ${c}${v}$.${reversed ? `\n\n$${v} \\times ${c}$ is the same as $${c} \\times ${v}$, because you can multiply in any order.` : ''}`,
      };
    }

    if (kind === 'power') {
      const n = rng.pick([2, 3] as const);
      const shown = Array.from({ length: n }, () => v).join(' \\times ');
      const word = n === 2 ? 'squared' : 'cubed';
      return {
        ...NO_CALC,
        prompt: `What is the usual way to write $${shown}$ in algebra?`,
        ...mcqFields(rng, { text: `$${v}^${n}$` }, [
          { text: `$${n}${v}$`, feedback: `$${n}${v}$ means ${n} lots of $${v}$ added together. Here the $${v}$'s are multiplied.` },
          { text: `$${v}^${5 - n}$`, feedback: `Count how many $${v}$'s are multiplied together. There are ${n}.` },
          { text: `$${v} + ${n}$`, feedback: `This adds ${n} to $${v}$. Nothing is added in $${shown}$.` },
        ]),
        hints: [`How many $${v}$'s are multiplied together?`, 'Repeated multiplication of the same letter is written with a small raised number.'],
        solution: `$${shown}$ is ${n} lots of $${v}$ multiplied together, so we write $${v}^${n}$ ("$${v}$ ${word}").`,
      };
    }

    if (kind === 'letters') {
      const c = rng.int(2, 9);
      const [u, w] = pickLetters(rng, 2) as [string, string];
      const shown = rng.pick([
        `${c} \\times ${u} \\times ${w}`,
        `${u} \\times ${c} \\times ${w}`,
        `${w} \\times ${u} \\times ${c}`,
        `${u} \\times ${w} \\times ${c}`,
        `${w} \\times ${c} \\times ${u}`,
      ]);
      return {
        ...NO_CALC,
        prompt: `What is the usual way to write $${shown}$ in algebra?`,
        ...mcqFields(rng, { text: `$${c}${u}${w}$` }, [
          { text: `$${u}${w}${c}$`, feedback: 'The letters are right, but the number always goes first.' },
          { text: `$${c} + ${u}${w}$`, feedback: 'Every part is multiplied, so nothing is added.' },
          { text: `$${c}${u} + ${w}$`, feedback: `Every part is multiplied. $${w}$ is multiplied too, not added.` },
        ]),
        hints: ['Leave out the × signs.', 'Write the number first, then the letters in alphabetical order.'],
        solution: `Everything is multiplied, so leave out the × signs. Write the number first, then the letters in alphabetical order:\n\n$${shown} = ${c}${u}${w}$`,
      };
    }

    if (kind === 'divide') {
      const c = rng.int(2, 9);
      const letterOnTop = rng.chance(0.6);
      const [top, bottom] = letterOnTop ? [v, String(c)] : [String(c), v];
      return {
        ...NO_CALC,
        prompt: `What is the usual way to write $${top} \\div ${bottom}$ in algebra?`,
        ...mcqFields(rng, { text: `$\\frac{${top}}{${bottom}}$` }, [
          { text: `$\\frac{${bottom}}{${top}}$`, feedback: `This is $${bottom} \\div ${top}$. The number you divide by goes on the bottom.` },
          { text: `$${c}${v}$`, feedback: `$${c}${v}$ means $${c} \\times ${v}$. This question is dividing.` },
          { text: `$${top} - ${bottom}$`, feedback: 'This is subtracting. The question is dividing.' },
        ]),
        hints: ['Division is written as a fraction in algebra.', 'Which number goes on the bottom of the fraction: the one you divide, or the one you divide by?'],
        solution: `Dividing is written as a fraction. The number you divide by goes on the bottom:\n\n$${top} \\div ${bottom} = \\frac{${top}}{${bottom}}$`,
      };
    }

    if (kind === 'one') {
      if (rng.chance(0.5)) {
        return {
          ...NO_CALC,
          prompt: `What is the simplest way to write $1 \\times ${v}$?`,
          ...mcqFields(rng, { text: `$${v}$` }, [
            { text: `$1${v}$`, feedback: `This has the right value, but we never write the 1. $1${v}$ is just $${v}$.` },
            { text: `$${v} + 1$`, feedback: 'This adds 1. Multiplying by 1 keeps a number the same.' },
            { text: '$0$', feedback: 'Multiplying by 0 gives 0. Multiplying by 1 keeps a number the same.' },
          ]),
          hints: ['What happens to any number when you multiply it by 1?'],
          solution: `Multiplying by 1 doesn't change a number, so $1 \\times ${v} = ${v}$. That's why we write $${v}$, not $1${v}$.`,
        };
      }
      return {
        ...NO_CALC,
        prompt: `What is the simplest way to write $${v} \\div ${v}$? (Assume $${v}$ is not 0.)`,
        ...mcqFields(rng, { text: '$1$' }, [
          { text: '$0$', feedback: `$${v} - ${v}$ is 0. Dividing a number by itself gives 1.` },
          { text: `$${v}$`, feedback: `Try a number: if $${v} = 6$, then $6 \\div 6 = 1$, not 6.` },
          { text: `$${v}^2$`, feedback: `$${v}^2$ means $${v} \\times ${v}$. This question is dividing.` },
        ]),
        hints: [`Try a number for $${v}$, like 5. What is $5 \\div 5$?`],
        solution: `Any number (except 0) divided by itself is 1. For example, $5 \\div 5 = 1$. So $${v} \\div ${v} = \\frac{${v}}{${v}} = 1$.`,
      };
    }

    // meaning-power
    const n = rng.pick([2, 3] as const);
    const product = Array.from({ length: n }, () => v).join(' \\times ');
    const sum = Array.from({ length: n }, () => v).join(' + ');
    return {
      ...NO_CALC,
      prompt: `What does $${v}^${n}$ mean?`,
      ...mcqFields(rng, { text: `$${product}$` }, [
        { text: `$${v} \\times ${n}$`, feedback: `$${v} \\times ${n}$ is $${n}${v}$. The small ${n} means $${v}$ multiplied by itself.` },
        { text: `$${v} + ${n}$`, feedback: 'A power is about multiplying, not adding.' },
        { text: `$${sum}$`, feedback: `$${sum}$ is $${n}${v}$. In $${v}^${n}$ the $${v}$'s are multiplied.` },
      ]),
      hints: ['The small raised number tells you how many times the letter is multiplied by itself.'],
      solution: `$${v}^${n}$ means ${n} lots of $${v}$ multiplied together: $${v}^${n} = ${product}$.\n\nFor example, if $${v} = 4$ then $${v}^${n} = ${4 ** n}$, but $${n}${v} = ${4 * n}$.`,
    };
  },
};

export const likeTermsMcq: QuestionTemplate = {
  id: 'm7.alg.notation.like-terms-mcq',
  topicId: 'm7.alg.notation',
  title: 'Recognise like terms (MCQ)',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const [u, w] = rng.shuffle(pickLetters(rng, 2)) as [string, string];
    const a = rng.int(2, 9);
    let b = rng.int(2, 9);
    while (b === a) b = rng.int(2, 9);
    if (difficulty === 1) {
      return {
        ...NO_CALC,
        prompt: `Which term is a **like term** with $${a}${u}$?`,
        ...mcqFields(rng, { text: `$${b}${u}$` }, [
          { text: `$${a}${w}$`, feedback: 'Like terms must have the same letter. The number in front can be different.' },
          { text: `$${a}${u}^2$`, feedback: `$${u}^2$ means $${u} \\times ${u}$, which is a different letter part from $${u}$.` },
          { text: `$${a}$`, feedback: 'A number on its own has no letter, so it is not a like term with a letter term.' },
        ]),
        hints: ['Like terms have exactly the same letter part.', 'The number in front (the coefficient) does not have to match.'],
        solution: `Like terms have exactly the same letter part. $${b}${u}$ and $${a}${u}$ both have just $${u}$, so they are like terms. They can be collected: $${a}${u} + ${b}${u} = ${a + b}${u}$.`,
      };
    }
    return {
      ...NO_CALC,
      prompt: `Which expression simplifies to $${a + b}${u}$?`,
      ...mcqFields(rng, { text: `$${a}${u} + ${b}${u}$` }, [
        { text: `$${a}${u} + ${b}${w}$`, feedback: `$${u}$ and $${w}$ are different letters, so these are not like terms. They can't be collected.` },
        { text: `$${a}${u} + ${b}$`, feedback: `${b} is a number with no letter, so it is not a like term with $${a}${u}$.` },
        { text: `$${a}${u} \\times ${b}${u}$`, feedback: `This is multiplying: $${a}${u} \\times ${b}${u} = ${a * b}${u}^2$. Collecting like terms means adding or subtracting them.` },
      ]),
      hints: ['Only like terms can be collected into one term.', 'Like terms have exactly the same letter part.'],
      solution: `$${a}${u}$ and $${b}${u}$ are like terms (they both have just $${u}$), so add the numbers in front: $${a}${u} + ${b}${u} = ${a + b}${u}$.\n\nThe other expressions can't be collected into one $${u}$ term.`,
    };
  },
};

export const collectLikeTerms: QuestionTemplate = {
  id: 'm7.alg.notation.collect-like-terms',
  topicId: 'm7.alg.notation',
  title: 'Simplify by collecting like terms',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const v = rng.pick(LETTERS);
      let coefs: number[];
      if (rng.chance(0.6)) {
        const k = rng.pick([2, 3]);
        coefs = Array.from({ length: k }, () => rng.int(1, 9));
        if (rng.chance(0.4)) coefs[rng.int(1, k - 1)] = 1;
      } else {
        const a = rng.int(3, 12);
        coefs = [a, -rng.int(1, a - 1)];
      }
      const total = coefs.reduce((s, c) => s + c, 0);
      const shown = poly(coefs.map((c) => t(c, v)));
      const hasOne = coefs.some((c) => Math.abs(c) === 1);
      const sumText = coefs.map((c, i) => (i === 0 ? `${c}` : c < 0 ? ` - ${-c}` : ` + ${c}`)).join('');
      return {
        type: 'expression',
        ...NO_CALC,
        prompt: `Simplify $${shown}$.`,
        answer: polyAnswer([t(total, v)]),
        variables: [v],
        form: 'simplified',
        hints: [
          `All these terms have the letter $${v}$, so they are like terms.`,
          `Work with the numbers in front of the $${v}$'s.${hasOne ? ` Remember $${v}$ means $1${v}$.` : ''}`,
        ],
        solution: [
          hasOne ? `$${v}$ on its own means $1${v}$.` : '',
          `All the terms are like terms, so collect them: $${sumText} = ${total}$.`,
          `So $${shown} = ${poly([t(total, v)])}$.${total === 1 ? ` (We write $1${v}$ as just $${v}$.)` : ''}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }

    if (difficulty === 2) {
      const v = rng.pick(LETTERS);
      const a = rng.int(2, 9);
      const b = rng.int(1, 8);
      const letterTerms: Array<[number, string]> = rng.chance(0.6) || b >= a ? [t(a, v), t(b, v)] : [t(a, v), t(-b, v)];
      const c1 = rng.int(2, 12);
      const twoConsts = rng.chance(0.5);
      const c2 = twoConsts ? (rng.chance(0.5) ? rng.int(1, 9) : -rng.int(1, c1 - 1)) : 0;
      const numTerms: Array<[number, string]> = twoConsts ? [t(c1), t(c2)] : [t(c1)];
      const A = letterTerms.reduce((s, [c]) => s + c, 0);
      const C = c1 + c2;
      const shown = poly(positiveFirst(rng.shuffle([...letterTerms, ...numTerms])));
      const result = poly([t(A, v), t(C)]);
      return {
        type: 'expression',
        ...NO_CALC,
        prompt: `Simplify $${shown}$.`,
        answer: polyAnswer([t(A, v), t(C)]),
        variables: [v],
        form: 'simplified',
        hints: [
          `Collect the $${v}$ terms together. ${twoConsts ? 'Then collect the numbers.' : 'A number on its own is not a like term with a letter term.'}`,
          'Keep each + or − sign with the term just after it.',
        ],
        solution: [
          `The $${v}$ terms: $${poly(letterTerms)} = ${poly([t(A, v)])}$.`,
          twoConsts ? `The numbers: $${poly(numTerms)} = ${C}$.` : `The number ${c1} has no letter, so it stays as it is.`,
          `So $${shown} = ${result}$.`,
        ].join('\n\n'),
      };
    }

    // difficulty 3: two letters
    const [u, w] = pickLetters(rng, 2) as [string, string];
    const a1 = rng.int(2, 9);
    const a2 = rng.chance(0.5) ? rng.int(1, 6) : -rng.int(1, a1 - 1);
    const b1 = rng.int(2, 9);
    const b2 = rng.chance(0.5) ? rng.int(1, 6) : -rng.int(1, b1 - 1);
    const uTerms: Array<[number, string]> = [t(a1, u), t(a2, u)];
    const wTerms: Array<[number, string]> = [t(b1, w), t(b2, w)];
    const shown = poly([t(a1, u), ...positiveFirst(rng.shuffle([t(b1, w), t(a2, u), t(b2, w)]))]);
    const result = poly([t(a1 + a2, u), t(b1 + b2, w)]);
    return {
      type: 'expression',
      ...NO_CALC,
      prompt: `Simplify $${shown}$.`,
      answer: polyAnswer([t(a1 + a2, u), t(b1 + b2, w)]),
      variables: [u, w],
      form: 'simplified',
      hints: [
        `Group the $${u}$ terms together and the $${w}$ terms together. Keep each sign with its term.`,
        `$${u}$ terms and $${w}$ terms are not like terms, so they stay separate.`,
      ],
      solution: [
        `The $${u}$ terms: $${poly(uTerms)} = ${poly([t(a1 + a2, u)])}$.`,
        `The $${w}$ terms: $${poly(wTerms)} = ${poly([t(b1 + b2, w)])}$.`,
        `So $${shown} = ${result}$.`,
      ].join('\n\n'),
    };
  },
};

interface WordItem {
  text: string;
  answer: Array<[number, string]> | string;
  explain: string;
}

export const writeFromWords: QuestionTemplate = {
  id: 'm7.alg.notation.write-from-words',
  topicId: 'm7.alg.notation',
  title: 'Write an expression from words',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const v: string = rng.pick(LETTERS);
    const c = rng.int(2, 12);
    const b = rng.int(2, 15);
    let item: WordItem;
    let vars: string[] = [v];

    if (difficulty === 2) {
      const items: WordItem[] = [
        { text: `${c} more than $${v}$`, answer: [t(1, v), t(c)], explain: `"${c} more than $${v}$" means start with $${v}$ and add ${c}.` },
        { text: `$${v}$ increased by ${c}`, answer: [t(1, v), t(c)], explain: `"Increased by ${c}" means add ${c}.` },
        { text: `${c} less than $${v}$`, answer: [t(1, v), t(-c)], explain: `"${c} less than $${v}$" means start with $${v}$ and take away ${c}. It is not $${c} - ${v}$.` },
        { text: `$${v}$ decreased by ${c}`, answer: [t(1, v), t(-c)], explain: `"Decreased by ${c}" means subtract ${c}.` },
        { text: `$${v}$ multiplied by ${c}`, answer: [t(c, v)], explain: `Multiply $${v}$ by ${c}, and write the number first.` },
        { text: `${c} lots of $${v}$`, answer: [t(c, v)], explain: `${c} lots of $${v}$ is $${c} \\times ${v}$, written with the number first.` },
        { text: `$${v}$ divided by ${c}`, answer: `${v}/${c}`, explain: 'Division is written as a fraction, with the number you divide by on the bottom.' },
        { text: `$${v}$ squared`, answer: `${v}^2`, explain: `"Squared" means multiplied by itself: $${v} \\times ${v} = ${v}^2$.` },
        { text: `double $${v}$`, answer: [t(2, v)], explain: `Double means 2 lots of: $2 \\times ${v}$.` },
        { text: `half of $${v}$`, answer: `${v}/2`, explain: 'Half of a number is the number divided by 2.' },
      ];
      item = rng.pick(items);
    } else if (difficulty === 3) {
      const [p, q] = pickLetters(rng, 2) as [string, string];
      const items: Array<WordItem & { vars?: string[] }> = [
        { text: `multiply $${v}$ by ${c}, then add ${b}`, answer: [t(c, v), t(b)], explain: `Multiplying $${v}$ by ${c} gives $${c}${v}$. Then add ${b}.` },
        { text: `multiply $${v}$ by ${c}, then subtract ${b}`, answer: [t(c, v), t(-b)], explain: `Multiplying $${v}$ by ${c} gives $${c}${v}$. Then subtract ${b}.` },
        { text: `divide $${v}$ by ${c}, then add ${b}`, answer: `${v}/${c} + ${b}`, explain: `Dividing $${v}$ by ${c} gives $\\frac{${v}}{${c}}$. Then add ${b}.` },
        { text: `square $${v}$, then add ${b}`, answer: `${v}^2 + ${b}`, explain: `Squaring $${v}$ gives $${v}^2$. Then add ${b}.` },
        { text: `subtract $${v}$ from ${b}`, answer: [t(b), t(-1, v)], explain: `"Subtract $${v}$ from ${b}" means start with ${b} and take away $${v}$.` },
        { text: `${b} more than ${c} times $${v}$`, answer: [t(c, v), t(b)], explain: `${c} times $${v}$ is $${c}${v}$, and ${b} more means add ${b}.` },
        { text: `the sum of $${p}$ and $${q}$`, answer: [t(1, p), t(1, q)], explain: 'The **sum** is what you get when you add.', vars: [p, q] },
        { text: `the product of $${p}$ and $${q}$`, answer: `${p}*${q}`, explain: 'The **product** is what you get when you multiply. Leave out the × sign and write the letters in alphabetical order.', vars: [p, q] },
        { text: `the product of $${p}$, $${q}$ and ${c}`, answer: `${c}*${p}*${q}`, explain: 'The **product** is what you get when you multiply. Write the number first, then the letters in alphabetical order.', vars: [p, q] },
      ];
      const picked = rng.pick(items);
      item = picked;
      if (picked.vars) vars = picked.vars;
    } else {
      const name = rng.pick(['Hemi', 'Aroha', 'Tama', 'Mere', 'Sione', 'Priya', 'Liam', 'Isla', 'Kai', 'Grace']);
      const n2 = rng.pick(['Nikau', 'Ana', 'Wiremu', 'Losa', 'Jack', 'Ruby', 'Leo', 'Talia']);
      const k = rng.int(3, 6);
      const cost = rng.int(2, 6);
      const contexts: Array<WordItem & { vars?: string[] }> = [
        {
          text: `Mince pies cost $${v}$ dollars each. ${name} buys ${k} pies and a drink that costs ${cash(cost)}. Write an expression for the total cost in dollars.`,
          answer: [t(k, v), t(cost)],
          explain: `${k} pies cost $${k} \\times ${v} = ${k}${v}$ dollars. Add ${cost} dollars for the drink.`,
        },
        {
          text: `${name} has $${v}$ stickers. ${n2} has ${k} times as many stickers as ${name}, plus ${b} more. Write an expression for the number of stickers ${n2} has.`,
          answer: [t(k, v), t(b)],
          explain: `${k} times as many as $${v}$ is $${k}${v}$. Then add the ${b} extra stickers.`,
        },
        {
          text: `A tray holds $${v}$ muffins. ${name} bakes ${k} full trays, and the whānau eats ${b} muffins. Write an expression for the number of muffins left.`,
          answer: [t(k, v), t(-b)],
          explain: `${k} trays hold $${k}${v}$ muffins. Take away the ${b} that were eaten.`,
        },
        {
          text: `${name} is $${v}$ years old. Their cousin is ${c} years older than ${name}. Write an expression for the cousin's age in ${k} years' time.`,
          answer: [t(1, v), t(c + k)],
          explain: `The cousin is $${v} + ${c}$ now. In ${k} years they will be $${v} + ${c} + ${k}$. Collect the numbers: $${v} + ${c + k}$.`,
        },
        {
          text: `${name} gets $${v}$ dollars of pocket money each week. ${name} saves it all for ${k} weeks, then spends ${cash(b)} at the school gala. Write an expression for the amount left, in dollars.`,
          answer: [t(k, v), t(-b)],
          explain: `${k} weeks of pocket money is $${k}${v}$ dollars. Subtract the ${b} dollars spent.`,
        },
        {
          text: `A school hall has $${'r'}$ rows of chairs, with $${'s'}$ chairs in each row. Write an expression for the total number of chairs.`,
          answer: 'r*s',
          explain: '$r$ rows of $s$ chairs is $r \\times s$. Leave out the × sign: $rs$.',
          vars: ['r', 's'],
        },
        {
          text: `A square garden bed has sides that are $${v}$ metres long. ${name} puts a fence all the way around it, plus a ${c} m fence down the middle. Write an expression for the total length of fence in metres.`,
          answer: [t(4, v), t(c)],
          explain: `A square has 4 equal sides, so the edge is $${v} + ${v} + ${v} + ${v} = 4${v}$ metres. Add the ${c} m down the middle.`,
        },
      ];
      const picked = rng.pick(contexts);
      item = picked;
      if (picked.vars) vars = picked.vars;
    }

    const answer = typeof item.answer === 'string' ? item.answer : polyAnswer(item.answer);
    const answerTex =
      typeof item.answer === 'string'
        ? item.answer
            .replace(/^(\w)\/(\d+)/, '\\frac{$1}{$2}')
            .replace(/\*/g, '')
        : poly(item.answer);
    const prompt = difficulty === 4 ? item.text : `Write an expression for: ${item.text}.`;
    return {
      type: 'expression',
      ...NO_CALC,
      ...(difficulty === 4 ? { marks: 2 } : {}),
      prompt,
      answer,
      variables: vars,
      form: 'simplified',
      hints:
        difficulty === 4
          ? ['Start with what one item, person or week gives, then think about how many there are.', 'Write numbers in front of letters, and leave out the × sign.']
          : ['Look for the key words: "more than", "less than", "times", "divided by", "sum", "product".', 'Write it the algebra way: no × sign, and the number goes in front of the letter.'],
      solution: `${item.explain}\n\nThe expression is $${answerTex}$.`,
    };
  },
};

export const perimeter: QuestionTemplate = {
  id: 'm7.alg.notation.perimeter',
  topicId: 'm7.alg.notation',
  title: 'Perimeter as an expression (collect like terms)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const shape = rng.pick(['rectangle', 'triangle'] as const);
    const hintsBase = ['The perimeter is the total distance around the outside: add up every side.'];
    if (difficulty === 3) {
      const v = rng.pick(LETTERS);
      if (shape === 'rectangle') {
        const a = rng.int(2, 9);
        // The figure draws the top side as the long side, so keep the short side's coefficient smaller.
        const b = rng.int(1, a - 1);
        const P = 2 * (a + b);
        const L = poly([t(a, v)]);
        const W = poly([t(b, v)]);
        return {
          type: 'expression',
          ...NO_CALC,
          prompt: 'Write an expression for the perimeter of this rectangle. Simplify your answer.',
          figure: { svg: rectangleSvg(L, W), alt: `A rectangle with a long side labelled ${L} and a short side labelled ${W}.` },
          answer: polyAnswer([t(P, v)]),
          variables: [v],
          form: 'simplified',
          hints: [...hintsBase, 'A rectangle has two long sides and two short sides. Opposite sides are the same length.'],
          solution: `The four sides are $${L}$, $${W}$, $${L}$ and $${W}$.\n\n$${L} + ${W} + ${L} + ${W} = ${P}${v}$`,
        };
      }
      let [a, b, c] = [rng.int(2, 9), rng.int(1, 9), rng.int(2, 9)];
      // Keep it a real triangle: the longest side is shorter than the other two together.
      while (2 * Math.max(a, b, c) >= a + b + c) [a, b, c] = [rng.int(2, 9), rng.int(1, 9), rng.int(2, 9)];
      const P = a + b + c;
      const labels = [poly([t(a, v)]), poly([t(b, v)]), poly([t(c, v)])] as const;
      return {
        type: 'expression',
        ...NO_CALC,
        prompt: 'Write an expression for the perimeter of this triangle. Simplify your answer.',
        figure: { svg: triangleSvg(...labels), alt: `A triangle with sides labelled ${labels.join(', ')}.` },
        answer: polyAnswer([t(P, v)]),
        variables: [v],
        form: 'simplified',
        hints: [...hintsBase, `All three sides are $${v}$ terms, so they are like terms.`],
        solution: `$${labels.join(' + ')} = ${P}${v}$`,
      };
    }

    // difficulty 4
    if (shape === 'rectangle') {
      if (rng.chance(0.5)) {
        const [u, w] = pickLetters(rng, 2) as [string, string];
        const a = rng.int(2, 9);
        const b = rng.int(1, 6);
        const L = poly([t(a, u)]);
        const W = poly([t(b, w)]);
        return {
          type: 'expression',
          ...NO_CALC,
          marks: 2,
          prompt: 'Write an expression for the perimeter of this rectangle. Simplify your answer.',
          figure: { svg: rectangleSvg(L, W), alt: `A rectangle with a long side labelled ${L} and a short side labelled ${W}.` },
          answer: polyAnswer([t(2 * a, u), t(2 * b, w)]),
          variables: [u, w],
          form: 'simplified',
          hints: [...hintsBase, `Collect the $${u}$ terms and the $${w}$ terms separately.`],
          solution: `The four sides are $${L}$, $${W}$, $${L}$ and $${W}$.\n\n$${L} + ${L} = ${2 * a}${u}$ and $${W} + ${W} = ${poly([t(2 * b, w)])}$.\n\nThe perimeter is $${poly([t(2 * a, u), t(2 * b, w)])}$. These are unlike terms, so that is as simple as it gets.`,
        };
      }
      const v = rng.pick(LETTERS);
      const a = rng.int(2, 6);
      const c = rng.int(1, 9);
      const b = rng.int(1, a); // so the side drawn short (bv) really is shorter than av + c
      const L = poly([t(a, v), t(c)]);
      const W = poly([t(b, v)]);
      return {
        type: 'expression',
        ...NO_CALC,
        marks: 2,
        prompt: 'Write an expression for the perimeter of this rectangle. Simplify your answer.',
        figure: { svg: rectangleSvg(L, W), alt: `A rectangle with a long side labelled ${L} and a short side labelled ${W}.` },
        answer: polyAnswer([t(2 * a + 2 * b, v), t(2 * c)]),
        variables: [v],
        form: 'simplified',
        hints: [...hintsBase, `Collect the $${v}$ terms, then the numbers.`],
        solution: `The four sides are $${L}$, $${W}$, $${L}$ and $${W}$.\n\n$${v}$ terms: $${a}${v} + ${poly([t(b, v)])} + ${a}${v} + ${poly([t(b, v)])} = ${2 * a + 2 * b}${v}$\n\nNumbers: $${c} + ${c} = ${2 * c}$\n\nThe perimeter is $${poly([t(2 * a + 2 * b, v), t(2 * c)])}$.`,
      };
    }
    const v = rng.pick(LETTERS);
    const [a, b] = [rng.int(2, 9), rng.int(1, 9)];
    const c = rng.int(3, 15);
    const labels = [poly([t(a, v)]), poly([t(b, v)]), `${c}`] as const;
    return {
      type: 'expression',
      ...NO_CALC,
      marks: 2,
      prompt: 'Write an expression for the perimeter of this triangle. Simplify your answer.',
      figure: { svg: triangleSvg(...labels), alt: `A triangle with sides labelled ${labels.join(', ')}.` },
      answer: polyAnswer([t(a + b, v), t(c)]),
      variables: [v],
      form: 'simplified',
      hints: [...hintsBase, `The number side is not a like term with the $${v}$ sides.`],
      solution: `$${labels.join(' + ')} = ${poly([t(a + b, v), t(c)])}$\n\nThe $${v}$ terms collect to $${a + b}${v}$. The ${c} has no letter, so it stays separate.`,
    };
  },
};

export const multiplyDivide: QuestionTemplate = {
  id: 'm7.alg.notation.multiply-divide',
  topicId: 'm7.alg.notation',
  title: 'Simplify products, quotients and squared terms',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const v = rng.pick(LETTERS);
    if (difficulty === 4) {
      const kind = rng.pick(['times', 'times-rev', 'divide', 'fraction'] as const);
      const a = rng.int(2, 9);
      const c = rng.int(2, 6);
      if (kind === 'times' || kind === 'times-rev') {
        const shown = kind === 'times' ? `${c} \\times ${a}${v}` : `${a}${v} \\times ${c}`;
        return {
          type: 'expression',
          ...NO_CALC,
          prompt: `Simplify $${shown}$.`,
          answer: `${a * c}*${v}`,
          variables: [v],
          form: 'simplified',
          hints: [`$${a}${v}$ means $${a} \\times ${v}$.`, 'Multiply the numbers together, then write the letter after.'],
          solution: `$${shown} = ${kind === 'times' ? `${c} \\times ${a} \\times ${v}` : `${a} \\times ${v} \\times ${c}`}$\n\nMultiply the numbers: $${a} \\times ${c} = ${a * c}$. So the answer is $${a * c}${v}$.`,
        };
      }
      const shown = kind === 'divide' ? `${a * c}${v} \\div ${c}` : `\\frac{${a * c}${v}}{${c}}`;
      return {
        type: 'expression',
        ...NO_CALC,
        prompt: `Simplify $${shown}$.`,
        answer: `${a}*${v}`,
        variables: [v],
        form: 'simplified',
        hints: [`$${a * c}${v}$ means ${a * c} lots of $${v}$.`, `Share those lots of $${v}$ into ${c} equal groups.`],
        solution: `$${a * c}${v}$ is ${a * c} lots of $${v}$. Dividing by ${c}: $${a * c} \\div ${c} = ${a}$.\n\nSo $${shown} = ${a}${v}$.\n\nCheck: $${c} \\times ${a}${v} = ${a * c}${v}$ ✓`,
      };
    }

    const kind = rng.pick(['two-letters', 'square', 'collect-squares', 'times-then-collect'] as const);
    if (kind === 'two-letters') {
      const [u, w] = pickLetters(rng, 2) as [string, string];
      const a = rng.int(2, 6);
      const b = rng.int(2, 6);
      return {
        type: 'expression',
        ...NO_CALC,
        marks: 2,
        prompt: `Simplify $${a}${u} \\times ${b}${w}$.`,
        answer: `${a * b}*${u}*${w}`,
        variables: [u, w],
        form: 'simplified',
        hints: [`Write it out in full: $${a} \\times ${u} \\times ${b} \\times ${w}$.`, 'You can multiply in any order. Do the numbers first, then the letters.'],
        solution: `$${a}${u} \\times ${b}${w} = ${a} \\times ${b} \\times ${u} \\times ${w} = ${a * b}${u}${w}$`,
      };
    }
    if (kind === 'square') {
      const a = rng.int(2, 9);
      const rev = rng.chance(0.5);
      const shown = rev ? `${v} \\times ${a}${v}` : `${a}${v} \\times ${v}`;
      return {
        type: 'expression',
        ...NO_CALC,
        marks: 2,
        prompt: `Simplify $${shown}$.`,
        answer: `${a}*${v}^2`,
        variables: [v],
        form: 'simplified',
        hints: [`Write it out in full, with every × sign.`, `How do we write $${v} \\times ${v}$?`],
        solution: `$${shown} = ${a} \\times ${v} \\times ${v}$, and $${v} \\times ${v} = ${v}^2$.\n\nSo the answer is $${a}${v}^2$.`,
      };
    }
    if (kind === 'collect-squares') {
      const sq = `${v}^2`;
      const [a1, a2, b1, b2] = [rng.int(1, 6), rng.int(1, 6), rng.int(1, 9), rng.int(1, 9)];
      const shown = poly([t(a1, sq), ...rng.shuffle([t(b1, v), t(a2, sq), t(b2, v)])]);
      const result = poly([t(a1 + a2, sq), t(b1 + b2, v)]);
      return {
        type: 'expression',
        ...NO_CALC,
        marks: 2,
        prompt: `Simplify $${shown}$.`,
        answer: polyAnswer([t(a1 + a2, sq), t(b1 + b2, v)]),
        variables: [v],
        form: 'simplified',
        hints: [`Are $${v}^2$ and $${v}$ like terms? Think about what each one means.`, `Collect the $${v}^2$ terms and the $${v}$ terms separately.`],
        solution: [
          `$${v}^2$ means $${v} \\times ${v}$, which is different from $${v}$. So $${v}^2$ terms and $${v}$ terms are **unlike** terms.`,
          `$${v}^2$ terms: $${poly([t(a1, sq), t(a2, sq)])} = ${poly([t(a1 + a2, sq)])}$`,
          `$${v}$ terms: $${poly([t(b1, v), t(b2, v)])} = ${poly([t(b1 + b2, v)])}$`,
          `So the answer is $${result}$.`,
        ].join('\n\n'),
      };
    }
    const a = rng.int(2, 5);
    const b = rng.int(2, 6);
    const c = rng.int(1, 9);
    return {
      type: 'expression',
      ...NO_CALC,
      marks: 2,
      prompt: `Simplify $${a} \\times ${b}${v} + ${poly([t(c, v)])}$.`,
      answer: `${a * b + c}*${v}`,
      variables: [v],
      form: 'simplified',
      hints: ['Multiplying comes before adding.', `Work out $${a} \\times ${b}${v}$ first, then collect the like terms.`],
      solution: `Multiply first: $${a} \\times ${b}${v} = ${a * b}${v}$.\n\nThen collect like terms: $${a * b}${v} + ${poly([t(c, v)])} = ${a * b + c}${v}$.`,
    };
  },
};

export const templates: QuestionTemplate[] = [conventions, likeTermsMcq, collectLikeTerms, writeFromWords, perimeter, multiplyDivide];
