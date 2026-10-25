import type { QuestionTemplate } from '../../types';
import { clean, gcd, NAMES, num, PLACES, round, tex } from '../../format';
import { cash, pct, properFraction } from './helpers';

// m9.num.percentages — percentages of amounts, expressing as a percentage, percentage change
// with multipliers, and finding the original amount.

/** A friendly mental strategy for p% of N, or '' if none is obvious. */
function strategy(p: number, N: number): string {
  const ten = clean(N / 10);
  const one = clean(N / 100);
  switch (p) {
    case 50:
      return `50% is a half: $${tex(N)} \\div 2 = ${tex(clean(N / 2))}$.`;
    case 25:
      return `25% is a quarter: $${tex(N)} \\div 4 = ${tex(clean(N / 4))}$.`;
    case 75:
      return `25% is $${tex(N)} \\div 4 = ${tex(clean(N / 4))}$, so 75% is $3 \\times ${tex(clean(N / 4))} = ${tex(clean((3 * N) / 4))}$.`;
    case 10:
      return `10% is a tenth: $${tex(N)} \\div 10 = ${tex(ten)}$.`;
    case 20:
      return `10% is $${tex(ten)}$, so 20% is $2 \\times ${tex(ten)} = ${tex(clean(2 * ten))}$.`;
    case 5:
      return `10% is $${tex(ten)}$, so 5% is half of that: $${tex(clean(ten / 2))}$.`;
    case 1:
      return `1% is a hundredth: $${tex(N)} \\div 100 = ${tex(one)}$.`;
    default:
      if (p % 10 === 0) return `10% is $${tex(ten)}$, so ${p}% is $${p / 10} \\times ${tex(ten)} = ${tex(clean((p / 10) * ten))}$.`;
      if (p % 5 === 0) {
        const tens = Math.floor(p / 10);
        return `10% is $${tex(ten)}$ and 5% is $${tex(clean(ten / 2))}$, so ${p}% is $${tens === 1 ? tex(ten) : `${tens} \\times ${tex(ten)}`} + ${tex(clean(ten / 2))} = ${tex(clean((p * N) / 100))}$.`;
      }
      return '';
  }
}

export const percentOfAmount: QuestionTemplate = {
  id: 'm9.num.percentages.of-amount',
  topicId: 'm9.num.percentages',
  title: 'Find a percentage or fraction of an amount',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const p = rng.pick([10, 50, 25, 20, 75, 5, 1]);
      const step = p === 1 ? 100 : p === 5 ? 20 : p === 25 || p === 75 ? 4 : p === 50 ? 2 : 10;
      const N = step * rng.int(2, p === 1 ? 9 : 25);
      const answer = clean((p * N) / 100);
      return {
        type: 'numeric',
        prompt: `Find ${p}% of ${num(N)}.`,
        answer,
        calculator: 'not-allowed',
        hints: ['Percent means "out of 100".', p === 1 ? 'To find 1%, divide by 100.' : 'Use a friendly fraction: 50% is a half, 25% is a quarter, 10% is a tenth.'],
        solution: strategy(p, N),
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.4)) {
        const [a, b] = properFraction(rng, [3, 4, 5, 6, 8, 10, 12]);
        const unit = rng.int(3, 15);
        const N = b * unit;
        return {
          type: 'numeric',
          prompt: `Find $\\frac{${a}}{${b}}$ of ${N}.`,
          answer: a * unit,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`First find $\\frac{1}{${b}}$ of ${N}.`, `Then multiply by ${a}.`],
          solution: `$\\frac{1}{${b}}$ of ${N} is $${N} \\div ${b} = ${unit}$, so $\\frac{${a}}{${b}}$ of ${N} is $${a} \\times ${unit} = ${a * unit}$.`,
        };
      }
      const p = rng.pick([15, 30, 35, 40, 45, 60, 65, 70, 80, 90]);
      const N = 20 * rng.int(2, 30);
      const answer = clean((p * N) / 100);
      return {
        type: 'numeric',
        prompt: `Find ${p}% of ${num(N)}.`,
        answer,
        calculator: 'not-allowed',
        hints: ['Find 10% first by dividing by 10.', p % 10 === 0 ? `Then multiply by ${p / 10}.` : 'Then build up the percentage using 10% and 5%.'],
        solution: `${strategy(p, N)}\n\nOr use a multiplier: $${tex(N)} \\times ${tex(p / 100)} = ${tex(answer)}$.`,
      };
    }
    // difficulty 3: awkward percentages, money, calculator allowed
    const p = rng.pick([12.5, 17.5, 2.5, 7.5, 12, 18, 23, 34, 46, 85, 3]);
    const N = (p % 1 !== 0 ? 40 : 4) * rng.int(3, 60);
    const answer = round((p * N) / 100, 2);
    const ctx = rng.pick([
      (x: string) => `Find ${pct(p)} of ${x}.`,
      (x: string) => `A charity raffle raised ${x}. ${pct(p)} of this went to pay for the prizes. How much was that?`,
      (x: string) => `${rng.pick(NAMES)} earned ${x} in the holidays and saved ${pct(p)} of it. How much was saved?`,
    ]);
    return {
      type: 'numeric',
      prompt: ctx(cash(N)),
      answer,
      units: '$',
      calculator: 'allowed',
      hints: ['Change the percentage to a decimal by dividing by 100.', 'Multiply the amount by that decimal.'],
      solution: `${pct(p)} as a decimal is $${tex(p)} \\div 100 = ${tex(clean(p / 100))}$.\n\n$${tex(N)} \\times ${tex(clean(p / 100))} = ${tex(answer, Number.isInteger(answer) ? 0 : 2)}$, so the answer is **${cash(answer)}**.`,
    };
  },
};

export const expressAsPercentage: QuestionTemplate = {
  id: 'm9.num.percentages.express',
  topicId: 'm9.num.percentages',
  title: 'Write one amount as a fraction or percentage of another',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 70, 75, 80, 85, 90, 95]);
      const g = 100 / gcd(p, 100);
      const total = g * rng.int(1, Math.floor(80 / g) || 1) * (g < 5 ? rng.int(2, 6) : 1);
      const part = (p * total) / 100;
      return {
        type: 'numeric',
        prompt: `What is ${part} out of ${total} as a percentage?`,
        answer: p,
        units: '%',
        calculator: 'not-allowed',
        hints: ['Write it as a fraction first: part over total.', 'Then make an equivalent fraction out of 100, or multiply by 100.'],
        solution: `$\\frac{${part}}{${total}} \\times 100 = ${p}$, so it is ${p}%.`,
      };
    }
    if (difficulty === 3) {
      const name = rng.pick(NAMES);
      if (rng.chance(0.5)) {
        const total = rng.pick([20, 25, 40, 50, 60, 80]);
        const pOptions = [55, 60, 65, 70, 75, 80, 85, 90, 95].filter((q) => Number.isInteger((q * total) / 100));
        const p = rng.pick(pOptions);
        const part = (p * total) / 100;
        const context = rng.pick([
          `In a netball game, ${name} scored ${part} goals from ${total} attempts. What percentage of attempts were goals?`,
          `${name} got ${part} out of ${total} in a maths test. What percentage is that?`,
          `${name} planted ${total} pōhutukawa seedlings and ${part} survived the first year. What percentage survived?`,
        ]);
        return {
          type: 'numeric',
          prompt: context,
          answer: p,
          units: '%',
          calculator: 'not-allowed',
          hints: ['Write the part as a fraction of the total.', 'Multiply the fraction by 100.'],
          solution: `$\\frac{${part}}{${total}} \\times 100 = ${p}$, so the answer is **${p}%**.`,
        };
      }
      const [a, b] = properFraction(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
      const k = rng.int(3, 9);
      return {
        type: 'numeric',
        prompt: `${name} got ${a * k} out of ${b * k} in a quiz. What fraction of the quiz did ${name} get right? Give your answer in simplest form.`,
        answer: a / b,
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: ['Write the score over the total.', 'Simplify by dividing the top and bottom by their highest common factor.'],
        solution: `$\\frac{${a * k}}{${b * k}} = \\frac{${a}}{${b}}$ (dividing the top and bottom by ${k}).`,
      };
    }
    // difficulty 4: convert units first
    const ctx = rng.pick([
      { big: 'h', small: 'min', factor: 60, bigName: 'hour', smallName: 'minutes' },
      { big: 'km', small: 'm', factor: 1000, bigName: 'kilometre', smallName: 'metres' },
      { big: 'kg', small: 'g', factor: 1000, bigName: 'kilogram', smallName: 'grams' },
      { big: '$', small: 'c', factor: 100, bigName: 'dollar', smallName: 'cents' },
      { big: 'L', small: 'mL', factor: 1000, bigName: 'litre', smallName: 'millilitres' },
    ]);
    let B = 1;
    let p = 25;
    let partSmall = 0;
    for (let attempt = 0; attempt < 100; attempt++) {
      B = rng.int(1, 5);
      p = rng.pick([5, 10, 12.5, 15, 20, 25, 30, 37.5, 40, 45, 62.5, 75, 80]);
      partSmall = (p * B * ctx.factor) / 100;
      if (Number.isInteger(partSmall) && partSmall > 0) break;
    }
    const bigText = ctx.big === '$' ? cash(B) : `${B} ${ctx.bigName}${B > 1 ? 's' : ''}`;
    return {
      type: 'numeric',
      prompt: `Write ${num(partSmall)} ${ctx.smallName} as a percentage of ${bigText}.`,
      answer: p,
      units: '%',
      marks: 2,
      calculator: 'allowed',
      hints: [`Both amounts must be in the same units. Change ${bigText} into ${ctx.smallName}.`, 'Then write part ÷ total × 100.'],
      solution: `${bigText} $= ${tex(B * ctx.factor)}$ ${ctx.smallName}.\n\n$\\frac{${tex(partSmall)}}{${tex(B * ctx.factor)}} \\times 100 = ${tex(p)}$, so it is **${pct(p)}**.`,
    };
  },
};

export const percentageChange: QuestionTemplate = {
  id: 'm9.num.percentages.change',
  topicId: 'm9.num.percentages',
  title: 'Percentage increase and decrease with multipliers',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const up = rng.chance(0.5);
    if (difficulty === 2) {
      const p = rng.pick([2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 60, 75]);
      const multiplier = clean(up ? 1 + p / 100 : 1 - p / 100);
      return {
        type: 'numeric',
        prompt: `What decimal multiplier would you use to ${up ? 'increase' : 'decrease'} an amount by ${p}%?`,
        answer: multiplier,
        calculator: 'not-allowed',
        hints: ['The original amount is 100%.', up ? `After the increase you have $100\\% + ${p}\\%$.` : `After the decrease you have $100\\% - ${p}\\%$.`],
        solution: `$100\\% ${up ? '+' : '-'} ${p}\\% = ${100 + (up ? p : -p)}\\%$, and ${100 + (up ? p : -p)}% as a decimal is $${tex(multiplier)}$.\n\nSo multiply by **${tex(multiplier)}**.`,
      };
    }
    if (difficulty === 3) {
      const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 12, 8, 35]);
      const N = 20 * rng.int(3, 60);
      const multiplier = clean(up ? 1 + p / 100 : 1 - p / 100);
      const answer = clean(N * multiplier);
      const place = rng.pick(PLACES);
      const context = rng.pick([
        { text: `The roll at a ${place} school was ${num(N)} students. Next year it ${up ? 'increased' : 'decreased'} by ${p}%. What was the new roll?`, ok: Number.isInteger(answer) },
        { text: `A kiwi sanctuary had ${num(N)} visitors in March. In April the number of visitors ${up ? 'went up' : 'went down'} by ${p}%. How many visitors were there in April?`, ok: Number.isInteger(answer) },
        { text: `${up ? 'Increase' : 'Decrease'} ${num(N)} by ${p}%.`, ok: true },
      ]);
      return {
        type: 'numeric',
        prompt: context.ok ? context.text : `${up ? 'Increase' : 'Decrease'} ${num(N)} by ${p}%.`,
        answer,
        calculator: 'allowed',
        hints: [`Find the multiplier: $100\\% ${up ? '+' : '-'} ${p}\\% = ${100 + (up ? p : -p)}\\%$.`, 'Multiply the original amount by the multiplier.'],
        solution: `Multiplier: $${tex(multiplier)}$ (because $100\\% ${up ? '+' : '-'} ${p}\\% = ${100 + (up ? p : -p)}\\%$).\n\n$${tex(N)} \\times ${tex(multiplier)} = ${tex(answer)}$`,
      };
    }
    // difficulty 4: find the percentage change
    const item = rng.pick([
      { what: 'The price of a pair of sneakers', money: true, lo: 4, hi: 12 },
      { what: 'The price of a rugby ball', money: true, lo: 2, hi: 4 },
      { what: 'The price of a mountain bike', money: true, lo: 15, hi: 60 },
      { what: 'The number of tūī counted in a park', money: false, lo: 2, hi: 15 },
    ]);
    const p = item.money ? rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 12, 8, 35, 60]) : rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60]);
    const O = 20 * rng.int(item.lo, item.hi);
    const N = clean(O * (up ? 1 + p / 100 : 1 - p / 100));
    const change = clean(Math.abs(N - O));
    const show = (x: number) => (item.money ? cash(x) : num(x));
    return {
      type: 'numeric',
      prompt: `${item.what} ${up ? 'went up' : 'went down'} from ${show(O)} to ${show(N)}. Find the percentage ${up ? 'increase' : 'decrease'}.`,
      answer: p,
      units: '%',
      marks: 2,
      calculator: 'allowed',
      hints: ['Find the change first: new − original (ignore the sign).', 'Percentage change = change ÷ original amount × 100. Always divide by the original, not the new amount.'],
      solution: `Change: $${tex(Math.max(N, O))} - ${tex(Math.min(N, O))} = ${tex(change)}$.\n\nPercentage ${up ? 'increase' : 'decrease'}: $\\frac{${tex(change)}}{${tex(O)}} \\times 100 = ${p}$, so it is **${p}%**.`,
    };
  },
};

export const reversePercentage: QuestionTemplate = {
  id: 'm9.num.percentages.find-whole',
  topicId: 'm9.num.percentages',
  title: 'Find the whole (or the original amount) from a part',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const p = rng.pick([10, 20, 25, 40, 5, 50, 75, 30, 60]);
      const g = 100 / gcd(p, 100);
      const W = g * rng.int(2, 30);
      const part = (p * W) / 100;
      return {
        type: 'numeric',
        prompt: `${p}% of a number is ${num(part)}. What is the number?`,
        answer: W,
        calculator: 'not-allowed',
        hints: [`Find 1% (or another easy percentage like 10%) first.`, 'Then scale up to 100%.'],
        solution: `${p}% is ${num(part)}, so 1% is $${tex(part)} \\div ${p} = ${tex(clean(part / p))}$.\n\n100% is $${tex(clean(part / p))} \\times 100 = ${tex(W)}$.`,
      };
    }
    if (difficulty === 4) {
      const p = rng.pick([15, 35, 45, 12, 24, 36, 65, 85]);
      const g = 100 / gcd(p, 100);
      const W = g * rng.int(2, Math.max(2, Math.floor(1200 / g)));
      const part = (p * W) / 100;
      const name = rng.pick(NAMES);
      const context = rng.pick([
        `${p}% of the students at a school walk to school. If ${num(part)} students walk, how many students are at the school?`,
        `${name} has read ${p}% of a book, which is ${num(part)} pages. How many pages are in the book?`,
        `A club spent ${cash(part)} on new uniforms. This was ${p}% of its budget. What was the whole budget?`,
      ]);
      const money = context.startsWith('A club');
      return {
        type: 'numeric',
        prompt: context,
        answer: W,
        ...(money ? { units: '$' } : {}),
        marks: 2,
        calculator: 'allowed',
        hints: [`${p}% of the whole is ${num(part)}. Find 1% first.`, 'Multiply 1% by 100 to get the whole.'],
        solution: `1%: $${tex(part)} \\div ${p} = ${tex(clean(part / p))}$.\n\n100%: $${tex(clean(part / p))} \\times 100 = ${tex(W)}$.\n\nCheck: ${p}% of ${num(W)} is $${tex(W)} \\times ${tex(p / 100)} = ${tex(part)}$ ✓`,
      };
    }
    // difficulty 5: original price before a percentage change
    const up = rng.chance(0.5);
    const p = up ? rng.pick([10, 15, 20, 25, 30, 50]) : rng.pick([10, 15, 20, 25, 30, 40]);
    const multiplier = clean(up ? 1 + p / 100 : 1 - p / 100);
    const O = rng.int(2, 60) * 20;
    const N = clean(O * multiplier);
    const what = rng.pick(['a bike', 'a pair of headphones', 'a tent', 'a skateboard', 'a guitar']);
    return {
      type: 'numeric',
      prompt: up
        ? `After a ${p}% price increase, ${what} costs ${cash(N)}. What was the price before the increase?`
        : `In a sale, ${what} is ${p}% off and now costs ${cash(N)}. What was the original price?`,
      answer: O,
      units: '$',
      marks: 3,
      calculator: 'allowed',
      hints: [
        `The new price is ${100 + (up ? p : -p)}% of the original price.`,
        `Divide by the multiplier $${tex(multiplier)}$ to undo the change. Don't just ${up ? 'take' : 'add'} ${p}% of the new price!`,
      ],
      solution: `The original price is 100%. After the change the price is $100\\% ${up ? '+' : '-'} ${p}\\% = ${100 + (up ? p : -p)}\\%$ of the original, so new price = original × ${tex(multiplier)}.\n\nUndo it by dividing: $${tex(N)} \\div ${tex(multiplier)} = ${tex(O)}$, so the original price was **${cash(O)}**.\n\nCheck: $${tex(O)} \\times ${tex(multiplier)} = ${tex(N)}$ ✓`,
    };
  },
};
