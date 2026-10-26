import type { Rng } from '../../../../rng';
import type { QuestionTemplate } from '../../../types';
import { gcd, lcm, NAMES, num, tex } from '../../../format';
import { cash, f, fromUnits, listAnd, mcqFields, orderItems } from './fractions-helpers';

// m7.num.percentages — converting between fractions, decimals and percentages, comparing and
// ordering them, finding percentages of whole numbers, and finding the whole from a percentage.
// Percentages are handled as whole numbers or halves of a per cent, so all answers are exact.

const NA = 'not-allowed' as const;

/** Fractions with tidy percentages (as [n, d, percent]). */
const NICE: Array<[number, number, number]> = [
  [1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [3, 5, 60], [4, 5, 80],
  [1, 10, 10], [3, 10, 30], [7, 10, 70], [9, 10, 90], [1, 20, 5], [3, 20, 15], [7, 20, 35],
  [9, 20, 45], [11, 20, 55], [13, 20, 65], [17, 20, 85], [1, 25, 4], [3, 25, 12], [6, 25, 24],
  [1, 8, 12.5], [3, 8, 37.5], [5, 8, 62.5], [7, 8, 87.5], [5, 4, 125], [3, 2, 150],
];

/** Percentage → decimal, exactly: 37.5 → 0.375. */
const pToDec = (p: number) => fromUnits(Math.round(p * 10), 3);

/** Display a value (given as a percentage) as a fraction, decimal or percentage, in KaTeX. */
function show(p: number, form: 'fraction' | 'decimal' | 'percent'): string {
  if (form === 'fraction') {
    const nice = NICE.find(([, , q]) => q === p);
    if (!nice) throw new Error(`no tidy fraction for ${p}%`);
    return `$${f(nice[0], nice[1])}$`;
  }
  if (form === 'decimal') return `$${tex(pToDec(p))}$`;
  return `$${tex(p)}\\%$`;
}

function explainAsPercent(p: number, form: 'fraction' | 'decimal' | 'percent'): string {
  return form === 'percent' ? show(p, form) : `${show(p, form)} $= ${tex(p)}\\%$`;
}

export const convert: QuestionTemplate = {
  id: 'm7.num.percentages.convert',
  topicId: 'm7.num.percentages',
  title: 'Convert between fractions, decimals and percentages',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      if (rng.chance(0.5)) {
        let p = rng.int(1, 99);
        if (rng.chance(0.25)) p = rng.int(1, 9) * 10;
        const d = pToDec(p);
        return {
          type: 'numeric',
          prompt: `Write $${p}\\%$ as a decimal.`,
          answer: d,
          form: 'decimal',
          calculator: NA,
          hints: ['Per cent means "out of 100".', `So $${p}\\%$ is ${p} hundredth${p === 1 ? "" : "s"}. Divide by 100.`],
          solution: `$${p}\\% = ${f(p, 100)} = ${p} \\div 100 = ${tex(d)}$`,
        };
      }
      let p = rng.int(1, 99);
      if (rng.chance(0.3)) p = rng.int(1, 9) * 10;
      const d = pToDec(p);
      return {
        type: 'numeric',
        prompt: `Write $${tex(d)}$ as a percentage.`,
        answer: p,
        units: '%',
        calculator: NA,
        hints: ['A percentage is a number of hundredths.', 'Multiply the decimal by 100.'],
        solution: `$${tex(d)} = ${f(p, 100)}$, which is ${p} hundredth${p === 1 ? "" : "s"}.\n\nSo $${tex(d)} = ${tex(d)} \\times 100\\% = ${p}\\%$.${p % 10 === 0 ? `\n\n**Watch out:** $${tex(d)}$ is ${p}%, not ${p / 10}%. ${p / 10} tenth${p === 10 ? "" : "s"} ${p === 10 ? "is" : "are"} the same as ${p} hundredths.` : ''}`,
      };
    }
    if (difficulty === 2) {
      const pool = NICE.filter(([, d, p]) => [2, 4, 5, 10, 20, 25].includes(d) && p < 100);
      const [n, d, p] = rng.pick(pool);
      const k = 100 / d;
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `Write $${f(n, d)}$ as a percentage.`,
          answer: p,
          units: '%',
          calculator: NA,
          hints: ['Make an equivalent fraction with a denominator of 100.', `What do you multiply ${d} by to get 100?`],
          solution: `$${d} \\times ${k} = 100$, so $${f(n, d)} = \\frac{${n} \\times ${k}}{${d} \\times ${k}} = ${f(n * k, 100)} = ${p}\\%$`,
        };
      }
      return {
        type: 'numeric',
        prompt: `Write $${p}\\%$ as a fraction in simplest form.`,
        answer: n / d,
        form: 'simplest-fraction',
        calculator: NA,
        hints: ['Write the percentage as a fraction out of 100.', 'Then simplify by dividing the top and bottom by their highest common factor.'],
        solution: `$${p}\\% = ${f(p, 100)}$.\n\nThe HCF of ${p} and 100 is ${k}, so $${f(p, 100)} = ${f(n, d)}$.`,
      };
    }
    // difficulty 3: harder conversions (eighths, halves of a per cent, more than 100%)
    const kind = rng.pick(['fracToPct', 'pctToDec', 'decToPct', 'pctToFrac'] as const);
    if (kind === 'fracToPct') {
      const [n, d, p] = rng.pick(NICE.filter(([nn, dd]) => dd === 8 || dd === 25 || nn > dd));
      return {
        type: 'numeric',
        prompt: `Write $${f(n, d)}$ as a percentage.`,
        answer: p,
        units: '%',
        calculator: NA,
        hints: [
          d === 8 ? `Start from a fraction you know: $${f(1, 8)}$ is half of $${f(1, 4)}$.` : 'Make an equivalent fraction out of 100, or divide the numerator by the denominator.',
          'Then multiply by 100 to get a percentage.',
        ],
        solution:
          d === 8
            ? `$${f(1, 4)} = 25\\%$, so $${f(1, 8)}$ is half of that: $12.5\\%$.\n\n$${f(n, 8)} = ${n} \\times 12.5\\% = ${tex(p)}\\%$`
            : `$${f(n, d)} = ${f(n * (100 / d), 100)} = ${tex(p)}\\%$`,
      };
    }
    if (kind === 'pctToDec') {
      const p = rng.pick([2.5, 7.5, 12.5, 17.5, 22.5, 37.5, 62.5, 87.5, 4, 6, 8, 105, 110, 120, 125, 150, 175, 240, 300]);
      return {
        type: 'numeric',
        prompt: `Write $${tex(p)}\\%$ as a decimal.`,
        answer: pToDec(p),
        form: 'decimal',
        calculator: NA,
        hints: ['Per cent means "out of 100", so divide by 100.', 'Dividing by 100 moves every digit two places to the right.'],
        solution: `$${tex(p)}\\% = ${tex(p)} \\div 100 = ${tex(pToDec(p))}$${p > 100 ? `\n\nMore than 100% gives a decimal bigger than 1.` : ''}`,
      };
    }
    if (kind === 'decToPct') {
      const p = rng.pick([2.5, 7.5, 12.5, 17.5, 32.5, 45.5, 3, 5, 8, 105, 120, 125, 135, 150, 180, 240, 310]);
      return {
        type: 'numeric',
        prompt: `Write $${tex(pToDec(p))}$ as a percentage.`,
        answer: p,
        units: '%',
        calculator: NA,
        hints: ['Multiply the decimal by 100.', 'Multiplying by 100 moves every digit two places to the left.'],
        solution: `$${tex(pToDec(p))} \\times 100 = ${tex(p)}$, so $${tex(pToDec(p))} = ${tex(p)}\\%$.${p > 100 ? '\n\nA decimal bigger than 1 is more than 100%.' : ''}`,
      };
    }
    const [n, d, p] = rng.pick(NICE.filter(([, dd, pp]) => dd === 8 || dd === 25 || pp > 100));
    return {
      type: 'numeric',
      prompt: `Write $${tex(p)}\\%$ as a fraction in simplest form.${p > 100 ? ' You can give an improper fraction or a mixed number.' : ''}`,
      answer: n / d,
      form: 'simplest-fraction',
      calculator: NA,
      hints: [
        Number.isInteger(p) ? 'Write it as a fraction out of 100.' : `Write it as a fraction out of 100, then double the top and bottom to get rid of the half: $${f(p * 2, 200)}$.`,
        'Simplify by dividing the top and bottom by their highest common factor.',
      ],
      solution: Number.isInteger(p)
        ? `$${p}\\% = ${f(p, 100)}$. The HCF of ${p} and 100 is ${gcd(p, 100)}, so $${f(p, 100)} = ${f(n, d)}$.`
        : `$${tex(p)}\\% = \\frac{${tex(p)}}{100} = ${f(p * 2, 200)}$. The HCF of ${p * 2} and 200 is ${gcd(p * 2, 200)}, so $${f(p * 2, 200)} = ${f(n, d)}$.`,
    };
  },
};

type Form = 'fraction' | 'decimal' | 'percent';

/** Picks a display form for value p; fractions only when p has a tidy fraction. */
function pickForm(rng: Rng, p: number, allowed: Form[]): Form {
  const ok = allowed.filter((fm) => fm !== 'fraction' || NICE.some(([, , q]) => q === p));
  return rng.pick(ok.length ? ok : ['decimal']);
}

export const compareOrder: QuestionTemplate = {
  id: 'm7.num.percentages.compare-order',
  topicId: 'm7.num.percentages',
  title: 'Compare and order fractions, decimals and percentages',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      for (;;) {
        const fr = rng.pick(NICE.filter(([, d, p]) => d <= 20 && p < 100));
        const others = [rng.int(1, 19) * 5, rng.int(1, 99), rng.int(1, 99)];
        const values = [fr[2], ...others];
        const sortedV = [...values].sort((a, b) => a - b);
        if (sortedV.some((v, i) => i > 0 && v - sortedV[i - 1]! < 4)) continue;
        const forms: Form[] = rng.shuffle(['decimal', 'percent', rng.pick(['decimal', 'percent'] as Form[])] as Form[]);
        const texts = new Map<number, Form>([[fr[2], 'fraction'], ...others.map((v, i) => [v, forms[i]!] as [number, Form])]);
        const largest = rng.chance(0.6);
        const target = largest ? Math.max(...values) : Math.min(...values);
        const mcq = mcqFields(
          rng,
          { text: show(target, texts.get(target)!) },
          values
            .filter((v) => v !== target)
            .map((v) => ({
              text: show(v, texts.get(v)!),
              feedback: `${explainAsPercent(v, texts.get(v)!)}, but ${explainAsPercent(target, texts.get(target)!)} is ${largest ? 'bigger' : 'smaller'}.`,
            })),
        );
        const listed = rng.shuffle(values).map((v) => show(v, texts.get(v)!));
        return {
          type: 'mcq',
          ...mcq,
          prompt: `Which is the **${largest ? 'largest' : 'smallest'}**: ${listAnd(listed, 'or')}?`,
          calculator: NA,
          hints: ['Change them all into the same form. Percentages are often easiest to compare.', 'To change a decimal into a percentage, multiply by 100.'],
          solution: `As percentages: ${listAnd(values.map((v) => explainAsPercent(v, texts.get(v)!)))}.\n\nThe ${largest ? 'largest' : 'smallest'} is ${show(target, texts.get(target)!)}.`,
        };
      }
    }
    // difficulty 3 and 4: order four values
    for (;;) {
      let values: number[];
      let formOf: Map<number, Form>;
      if (difficulty === 3) {
        const fr = rng.pick(NICE.filter(([, d, p]) => d <= 20 && p < 100));
        values = [fr[2], rng.int(1, 19) * 5, rng.int(2, 98), rng.int(1, 99)];
        if (new Set(values).size < 4) continue;
        const sortedV = [...values].sort((a, b) => a - b);
        if (sortedV.some((v, i) => i > 0 && v - sortedV[i - 1]! < 3)) continue;
        formOf = new Map();
        formOf.set(fr[2], 'fraction');
        const restForms = rng.shuffle(['decimal', 'percent', rng.pick(['decimal', 'percent'] as Form[])] as Form[]);
        values.slice(1).forEach((v, i) => formOf.set(v, restForms[i]!));
      } else {
        // Close values, some with three decimal places or more than 100%.
        const big = rng.chance(0.3);
        const fracs = NICE.filter(([, , p]) => (big ? p >= 100 || (p >= 80 && p < 100) : p >= 10 && p < 100));
        const [a, b] = rng.sample(fracs, 2);
        if (Math.abs(a![2] - b![2]) > 25) continue;
        const lo = Math.min(a![2], b![2]) - 6;
        const hi = Math.max(a![2], b![2]) + 6;
        const dec = rng.int(lo * 2, hi * 2) / 2; // halves of a per cent, e.g. 0.415
        const pc = rng.int(Math.ceil(lo), Math.floor(hi));
        values = [a![2], b![2], dec, pc];
        if (new Set(values).size < 4 || values.some((v) => v <= 0)) continue;
        formOf = new Map<number, Form>([[a![2], 'fraction'], [b![2], pickForm(rng, b![2], ['fraction', 'decimal'])], [dec, 'decimal'], [pc, 'percent']]);
      }
      const sorted = [...values].sort((x, y) => x - y);
      let shown = rng.shuffle(values);
      if (shown.join() === sorted.join()) shown = [...sorted].reverse();
      const t = (v: number) => show(v, formOf.get(v)!);
      if (new Set(values.map(t)).size < 4) continue;
      return {
        type: 'order',
        prompt: `Put these in order from **smallest** to **largest**: ${listAnd(shown.map(t))}.`,
        items: orderItems(rng, sorted.map(t)),
        marks: 2,
        calculator: NA,
        hints: ['Change every number into a percentage (or every number into a decimal).', 'Fractions: make the denominator 100, or divide. Decimals: multiply by 100.'],
        solution: `As percentages:\n\n${sorted.map((v) => `- ${explainAsPercent(v, formOf.get(v)!)}`).join('\n')}\n\nFrom smallest to largest: ${sorted.map(t).join(', ')}.`,
      };
    }
  },
};

/** How to build p% from easy percentages, for solutions. */
function buildUp(p: number, N: number): string {
  const ten = N / 10;
  const five = N / 20;
  const one = N / 100;
  const v = (q: number) => (q * N) / 100;
  if (p === 50) return `50% is half: $${tex(N)} \\div 2 = ${tex(v(50))}$.`;
  if (p === 25) return `25% is a quarter: $${tex(N)} \\div 4 = ${tex(v(25))}$.`;
  if (p === 75) return `25% is $${tex(N)} \\div 4 = ${tex(v(25))}$, so 75% is $3 \\times ${tex(v(25))} = ${tex(v(75))}$.`;
  if (p === 10) return `10% is a tenth: $${tex(N)} \\div 10 = ${tex(ten)}$.`;
  if (p === 1) return `1% is a hundredth: $${tex(N)} \\div 100 = ${tex(one)}$.`;
  if (p === 2) return `1% is $${tex(N)} \\div 100 = ${tex(one)}$, so 2% is $2 \\times ${tex(one)} = ${tex(v(2))}$.`;
  if (p === 5) return `10% is $${tex(N)} \\div 10 = ${tex(ten)}$. 5% is half of that: $${tex(five)}$.`;
  if (p === 20) return `10% is $${tex(ten)}$, so 20% is $2 \\times ${tex(ten)} = ${tex(v(20))}$.`;
  if (p % 10 === 0) return `10% is $${tex(N)} \\div 10 = ${tex(ten)}$, so ${p}% is $${p / 10} \\times ${tex(ten)} = ${tex(v(p))}$.`;
  // p ends in 5: tens part + 5%
  const tens = p - 5;
  return `10% is $${tex(ten)}$ and 5% is half of that, $${tex(five)}$.\n\n${tens}% is $${tens / 10} \\times ${tex(ten)} = ${tex(v(tens))}$, so ${p}% is $${tex(v(tens))} + ${tex(five)} = ${tex(v(p))}$.`;
}

/** Smallest N that makes p% of N a whole number, also allowing the 10%/5% build-up to stay whole. */
function stepFor(p: number): number {
  if (p < 5) return 100;
  const base = 100 / gcd(p, 100);
  if (p % 10 === 0) return lcm(base, 10);
  if (p % 5 === 0 && p !== 25 && p !== 75) return lcm(base, 20);
  return base;
}

const OF_CONTEXTS = [
  {
    text: (p: number, N: number) => `There are ${num(N)} students at Kōwhai Intermediate. ${p}% of them walk to school. How many students walk to school?`,
    say: (a: number) => `So ${num(a)} students walk to school.`,
    units: undefined,
    maxN: 1200,
  },
  {
    text: (p: number, N: number) => `A bag of scroggin weighs ${N} g. ${p}% of the scroggin is raisins. How many grams of raisins are in the bag?`,
    say: (a: number) => `So there are ${num(a)} g of raisins.`,
    units: 'g',
    maxN: 1000,
  },
  {
    text: (p: number, N: number) => `The class raised ${cash(N)} for the SPCA. ${p}% of it came from the bake sale. How much did the bake sale raise?`,
    say: (a: number) => `So the bake sale raised ${cash(a)}.`,
    units: '$',
    maxN: 1200,
  },
  {
    text: (p: number, N: number) => `${num(N)} people came to the school's Matariki celebration. ${p}% of them stayed for the shared kai. How many people stayed for the kai?`,
    say: (a: number) => `So ${num(a)} people stayed for the kai.`,
    units: undefined,
    maxN: 1200,
  },
] as const;

function percentHints(p: number): string[] {
  if (p === 50) return ['What fraction is the same as 50%?', 'Finding 50% is the same as halving.'];
  if (p === 25) return ['What fraction is the same as 25%?', 'Finding 25% is the same as dividing by 4 (or halving, then halving again).'];
  if (p === 10) return ['What fraction is the same as 10%?', 'Finding 10% is the same as dividing by 10.'];
  if (p < 5) return ['Find 1% first: divide by 100.', `Then multiply to get ${p}%.`];
  if (p === 75) return ['Find 25% first: divide by 4.', '75% is three lots of 25%.'];
  if (p === 5) return ['Find 10% first: divide by 10.', '5% is half of 10%.'];
  if (p % 10 === 0) return ['Find 10% first: divide by 10.', `${p}% is ${p / 10} lots of 10%.`];
  return ['Find 10% first: divide by 10.', `5% is half of 10%. Build ${p}% from ${p - 5}% and 5%.`];
}

export const percentOfAmount: QuestionTemplate = {
  id: 'm7.num.percentages.percent-of-amount',
  topicId: 'm7.num.percentages',
  title: 'Find a percentage of a whole number',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty <= 3) {
      const p =
        difficulty === 1 ? rng.pick([10, 50, 25]) : difficulty === 2 ? rng.pick([5, 20, 30, 40, 60, 70, 75, 80, 90, 1, 2]) : rng.pick([15, 35, 45, 55, 65, 85]);
      const step = stepFor(p);
      const maxK = Math.max(2, Math.floor((difficulty === 1 ? 500 : 1000) / step));
      const N = step * rng.int(2, Math.min(maxK, difficulty === 1 ? 40 : 60));
      const ans = (p * N) / 100;
      const ctx = difficulty === 3 ? rng.pick(OF_CONTEXTS) : null;
      if (ctx && N > ctx.maxN) return percentOfAmount.generate({ rng, difficulty });
      return {
        type: 'numeric',
        prompt: ctx ? ctx.text(p, N) : `Find $${p}\\%$ of ${num(N)}.`,
        answer: ans,
        form: 'integer',
        ...(ctx?.units ? { units: ctx.units } : {}),
        marks: difficulty === 3 ? 2 : 1,
        calculator: NA,
        hints: percentHints(p),
        solution: `${buildUp(p, N)}${ctx ? `\n\n${ctx.say(ans)}` : ''}`,
      };
    }
    // difficulty 4: two-step problems
    if (rng.chance(0.5)) {
      for (;;) {
        const a = rng.pick([10, 15, 20, 25, 30, 35, 40]);
        const b = rng.pick([10, 15, 20, 25, 30, 35, 40, 45]);
        if (a === b || a + b >= 90) continue;
        const rest = 100 - a - b;
        const step = lcm(stepFor(rest), lcm(stepFor(a), stepFor(b)));
        const N = step * rng.int(Math.ceil(200 / step), Math.max(Math.ceil(200 / step), Math.floor(900 / step)));
        const ans = (rest * N) / 100;
        return {
          type: 'numeric',
          prompt: `There are ${N} students at a school. ${a}% walk to school and ${b}% come by bus. The rest come by car. How many students come by car?`,
          answer: ans,
          form: 'integer',
          marks: 2,
          calculator: NA,
          hints: ['First work out what percentage come by car. All the students together make 100%.', 'Then find that percentage of the number of students.'],
          solution: `Percentage by car: $100\\% - ${a}\\% - ${b}\\% = ${rest}\\%$.\n\n${buildUp(rest, N)}\n\nSo ${num(ans)} students come by car.`,
        };
      }
    }
    for (;;) {
      const a = rng.pick([10, 20, 25, 30, 40, 50]);
      const b = rng.pick([5, 10, 15, 20, 25]);
      if (a + b >= 90) continue;
      const left = 100 - a - b;
      const step = lcm(stepFor(left), lcm(stepFor(a), stepFor(b)));
      const N = step * rng.int(1, Math.max(1, Math.floor(200 / step)));
      if (N < 20) continue;
      const name = rng.pick(NAMES);
      const ans = (left * N) / 100;
      return {
        type: 'numeric',
        prompt: `${name} has ${cash(N)} of birthday money. ${name} spends ${a}% of it on a book and ${b}% on a movie ticket. How much money is left?`,
        answer: ans,
        form: 'integer',
        units: '$',
        marks: 2,
        calculator: NA,
        hints: ['What percentage of the money is left? The whole amount is 100%.', 'Then find that percentage of the birthday money.'],
        solution: `Percentage left: $100\\% - ${a}\\% - ${b}\\% = ${left}\\%$.\n\n${buildUp(left, N)}\n\nSo ${name} has ${cash(ans)} left.\n\n(You could also work out ${a}% and ${b}% separately and subtract both from ${cash(N)}.)`,
      };
    }
  },
};

/** The easy "step" percentage used to work back to 100% from p%. */
function stepPercent(p: number): number {
  if (p % 10 === 0) return 10;
  if (p % 25 === 0) return 25;
  return 5;
}

function wholeSolution(p: number, part: number, whole: number, fmt: (x: number) => string = (x) => tex(x)): string {
  const s = p === 50 || p === 25 || p === 20 || p === 10 || p === 1 ? p : stepPercent(p);
  const onePart = (whole * s) / 100;
  const lines: string[] = [];
  if (s !== p) lines.push(`${p}% is ${p / s} lots of ${s}%. So ${s}% is ${fmt(part)} ÷ ${p / s} = ${fmt(onePart)}.`);
  lines.push(`100% is ${100 / s} lots of ${s}%: ${fmt(onePart)} × ${100 / s} = **${fmt(whole)}**.`);
  lines.push(`Check: ${p}% of ${fmt(whole)} is ${fmt(part)} ✓`);
  return lines.join('\n\n');
}

const WHOLE_STORIES = [
  {
    text: (name: string, p: number, part: number) => `${name} has read ${p}% of a book. That is ${part} pages. How many pages are in the whole book?`,
    money: false,
    units: undefined,
  },
  {
    text: (_name: string, p: number, part: number) => `In a survey of Year 7 students, ${p}% chose netball as their favourite sport. That was ${part} students. How many students were in the survey?`,
    money: false,
    units: undefined,
  },
  {
    text: (_name: string, p: number, part: number) => `A water tank is ${p}% full. It has ${part} L of water in it. How many litres does the tank hold when it is full?`,
    money: false,
    units: 'L',
  },
] as const;

export const findWhole: QuestionTemplate = {
  id: 'm7.num.percentages.find-whole',
  topicId: 'm7.num.percentages',
  title: 'Find the whole (100%) from a percentage',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3 || difficulty === 4) {
      const p = difficulty === 3 ? rng.pick([10, 50, 25, 20, 1]) : rng.pick([40, 30, 60, 75, 15, 5, 35, 80, 90, 45]);
      const s = p === 50 || p === 25 || p === 20 || p === 10 || p === 1 ? p : stepPercent(p);
      const step = lcm(100 / gcd(p, 100), 100 / gcd(s, 100));
      const maxK = Math.max(3, Math.floor((difficulty === 3 ? 400 : 600) / step));
      const whole = step * rng.int(2, Math.min(maxK, 50));
      const part = (p * whole) / 100;
      return {
        type: 'numeric',
        prompt: `$${p}\\%$ of a number is ${num(part)}. What is the number?`,
        answer: whole,
        form: 'integer',
        marks: difficulty === 4 ? 2 : 1,
        calculator: NA,
        hints: [
          s === p ? `How many lots of ${p}% make 100%?` : `First find ${s}%. How many lots of ${s}% make ${p}%?`,
          'The whole number is 100%.',
        ],
        solution: wholeSolution(p, part, whole),
      };
    }
    // difficulty 5: word problems, including "what's left"
    if (rng.chance(0.4)) {
      const spent = rng.pick([15, 25, 35, 40, 45, 60, 65]);
      const left = 100 - spent;
      const s = stepPercent(left);
      const step = lcm(100 / gcd(left, 100), 100 / gcd(s, 100));
      const whole = step * rng.int(Math.max(1, Math.ceil(40 / step)), Math.max(Math.ceil(40 / step), Math.floor(300 / step)));
      const partLeft = (left * whole) / 100;
      const name = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `After spending ${spent}% of their savings on a new bike helmet, ${name} has ${cash(partLeft)} left. How much did ${name} have to start with?`,
        answer: whole,
        form: 'integer',
        units: '$',
        marks: 3,
        calculator: NA,
        hints: ['What percentage of the savings is left?', `Use that percentage and ${cash(partLeft)} to find 100%.`],
        solution: `${name} spent ${spent}%, so $100\\% - ${spent}\\% = ${left}\\%$ is left. That ${left}% is ${cash(partLeft)}.\n\n${wholeSolution(left, partLeft, whole, cash)}`,
      };
    }
    const story = rng.pick(WHOLE_STORIES);
    const p = rng.pick([30, 40, 60, 15, 35, 45, 75, 80]);
    const s = stepPercent(p);
    const scale = story.units === 'L' ? 10 : 1;
    const step = lcm(100 / gcd(p, 100), 100 / gcd(s, 100));
    const whole = step * scale * rng.int(Math.max(1, Math.ceil(60 / (step * scale))), Math.max(Math.ceil(60 / (step * scale)), Math.floor((scale === 10 ? 3000 : 400) / (step * scale))));
    const part = (p * whole) / 100;
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: story.text(name, p, part),
      answer: whole,
      form: 'integer',
      ...(story.units ? { units: story.units } : {}),
      marks: 2,
      calculator: NA,
      hints: [`${p}% is worth ${num(part)}. Find ${s}% first.`, 'Then work out 100%.'],
      solution: wholeSolution(p, part, whole, (x) => num(x)),
    };
  },
};

export const templates: QuestionTemplate[] = [convert, compareOrder, percentOfAmount, findWhole];

