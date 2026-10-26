import type { Rng } from '../../../../rng';
import { gcd, NAMES, num, tex } from '../../../format';
import { circle, label, svgDoc } from '../../../svg';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { cash, type Choice, dollars, mcqFields, texMoney } from './money-helpers';

// m7.num.proportion — "for every" relationships, fractions of the whole, scaling recipes and rates.
// Year 7 uses "for every" language; ratio notation (a : b) is Year 8, so it isn't used here.
// Every question is built from a whole number of groups, so answers are whole numbers. No calculators.

interface Pair {
  a: string;
  b: string;
  /** Where the things are, e.g. "on the farm". */
  where: string;
  /** What the whole collection is called, for fraction questions. */
  all: string;
  /** Colours for a counters figure, if the pair suits one. */
  colours?: [string, string];
}

const PAIRS: Pair[] = [
  { a: 'red beads', b: 'blue beads', where: 'on a necklace', all: 'beads', colours: ['#dc2626', '#2563eb'] },
  { a: 'cows', b: 'sheep', where: 'on a farm', all: 'animals' },
  { a: 'tūī', b: 'kererū', where: 'in a garden bird count', all: 'birds' },
  { a: 'white tiles', b: 'black tiles', where: 'in a floor pattern', all: 'tiles', colours: ['#ffffff', '#1f2937'] },
  { a: 'kauri seedlings', b: 'pōhutukawa seedlings', where: 'planted by the class', all: 'seedlings' },
  { a: 'green marbles', b: 'yellow marbles', where: 'in a jar', all: 'marbles', colours: ['#16a34a', '#eab308'] },
  { a: 'girls', b: 'boys', where: 'in the kapa haka group', all: 'students' },
];

/** Two different whole numbers from 2 to 9 with no common factor. */
function coprimePair(rng: Rng, lo = 2, hi = 9): [number, number] {
  for (;;) {
    const a = rng.int(lo, hi);
    const b = rng.int(lo, hi);
    if (a !== b && gcd(a, b) === 1) return [a, b];
  }
}

/** A row of counters showing one group: `a` of the first colour then `b` of the second. */
function groupFigure(p: Pair, a: number, b: number): { svg: string; alt: string } | undefined {
  if (!p.colours) return undefined;
  const n = a + b;
  const r = n > 12 ? 9 : 12;
  const gap = n > 12 ? 22 : 30;
  const width = Math.max(220, n * gap + 40);
  let body = `<rect x="10" y="16" width="${n * gap + 10}" height="44" rx="10" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  for (let i = 0; i < n; i++) {
    body += circle({ x: 10 + gap / 2 + 5 + i * gap, y: 38 }, r, { fill: i < a ? p.colours[0] : p.colours[1] });
  }
  body += label({ x: 15 + (n * gap + 10) / 2, y: 78 }, 'one group', { size: 13, fill: '#4b5563' });
  return {
    svg: svgDoc(width, 92, body),
    alt: `One group of counters: ${a} ${p.a} and ${b} ${p.b}.`,
  };
}

export const forEvery: QuestionTemplate = {
  id: 'm7.num.proportion.for-every',
  topicId: 'm7.num.proportion',
  title: '"For every" relationships: scale up, find totals, and use differences',
  difficulties: [1, 2, 3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 5) return threeParts(rng);
    const p = rng.pick(PAIRS);
    if (difficulty === 1) {
      // For every 1 adult there are k students.
      const k = rng.int(2, 9);
      const m = rng.int(2, 12);
      const ctx = rng.pick([
        { one: 'adult', many: 'adults', other: 'students', where: 'on the school trip' },
        { one: 'coach', many: 'coaches', other: 'players', where: 'in the netball club' },
        { one: 'kayak', many: 'kayaks', other: 'paddles', where: 'at the camp' },
        { one: 'table', many: 'tables', other: 'chairs', where: 'in the hall' },
      ]);
      const forward = rng.chance(0.6);
      return forward
        ? {
            type: 'numeric',
            prompt: `For every 1 ${ctx.one} ${ctx.where}, there are ${k} ${ctx.other}. There are ${m} ${ctx.many}. How many ${ctx.other} are there?`,
            answer: m * k,
            calculator: 'not-allowed',
            hints: [`Each ${ctx.one} goes with ${k} ${ctx.other}.`, `So multiply the number of ${ctx.many} by ${k}.`],
            solution: `Each ${ctx.one} has ${k} ${ctx.other}, so ${m} ${ctx.many} have $${m} \\times ${k} = ${m * k}$ ${ctx.other}.`,
          }
        : {
            type: 'numeric',
            prompt: `For every 1 ${ctx.one} ${ctx.where}, there are ${k} ${ctx.other}. There are ${m * k} ${ctx.other}. How many ${ctx.many} are there?`,
            answer: m,
            calculator: 'not-allowed',
            hints: [`Each ${ctx.one} goes with ${k} ${ctx.other}.`, `How many groups of ${k} are in ${m * k}?`],
            solution: `Each group is 1 ${ctx.one} and ${k} ${ctx.other}. $${m * k} \\div ${k} = ${m}$ groups, so there are ${m} ${ctx.many}.`,
          };
    }
    const [a, b] = coprimePair(rng);
    const m = rng.int(2, difficulty === 4 ? 9 : 12);
    const figure = difficulty <= 3 ? groupFigure(p, a, b) : undefined;
    const intro = `For every ${a} ${p.a} ${p.where}, there are ${b} ${p.b}.`;
    if (difficulty === 2) {
      const giveA = rng.chance(0.5);
      const [gn, gw, fn, fw] = giveA ? [a, p.a, b, p.b] : [b, p.b, a, p.a];
      return {
        type: 'numeric',
        prompt: `${intro} There are ${gn * m} ${gw}. How many ${fw} are there?`,
        answer: fn * m,
        ...(figure && { figure }),
        calculator: 'not-allowed',
        hints: [`Each group has ${a} ${p.a} and ${b} ${p.b}.`, `How many groups of ${gn} ${gw} are there?`],
        solution: `Each group has ${gn} ${gw}. $${gn * m} \\div ${gn} = ${m}$, so there are ${m} groups.\n\nEach group has ${fn} ${fw}, so there are $${m} \\times ${fn} = ${fn * m}$ ${fw}.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        // The official example: given one part, find the total.
        return {
          type: 'numeric',
          prompt: `${intro} There are ${a * m} ${p.a}. How many ${p.all} are there altogether?`,
          answer: (a + b) * m,
          ...(figure && { figure }),
          calculator: 'not-allowed',
          hints: [`How many groups are there? Each group has ${a} ${p.a}.`, `Each group has ${a + b} ${p.all} altogether.`],
          solution: `$${a * m} \\div ${a} = ${m}$ groups.\n\nEach group has $${a} + ${b} = ${a + b}$ ${p.all}, so altogether there are $${m} \\times ${a + b} = ${(a + b) * m}$ ${p.all}.`,
        };
      }
      const askA = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: `${intro} There are ${(a + b) * m} ${p.all} altogether. How many ${askA ? p.a : p.b} are there?`,
        answer: (askA ? a : b) * m,
        ...(figure && { figure }),
        calculator: 'not-allowed',
        hints: [`One group has ${a + b} ${p.all}. How many groups make ${(a + b) * m}?`, `Then multiply by the number of ${askA ? p.a : p.b} in one group.`],
        solution: `One group has $${a} + ${b} = ${a + b}$ ${p.all}. $${(a + b) * m} \\div ${a + b} = ${m}$ groups.\n\nThere are $${m} \\times ${askA ? a : b} = ${(askA ? a : b) * m}$ ${askA ? p.a : p.b}.`,
      };
    }
    // difficulty 4: use the difference between the parts.
    const [lo, hi, loName, hiName] = a < b ? [a, b, p.a, p.b] : [b, a, p.b, p.a];
    const diff = (hi - lo) * m;
    const askLow = rng.chance(0.5);
    const askTotal = rng.chance(0.3);
    const answer = askTotal ? (a + b) * m : (askLow ? lo : hi) * m;
    const asked = askTotal ? `${p.all} altogether` : askLow ? loName : hiName;
    return {
      type: 'numeric',
      prompt: `${intro} There are ${diff} more ${hiName} than ${loName}. How many ${asked} are there?`,
      answer,
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Each group has ${hi} ${hiName} and ${lo} ${loName}. What is the difference in one group?`, `How many groups make a difference of ${diff}?`],
      solution: `Each group has ${hi} ${hiName} and ${lo} ${loName}, so the difference in one group is $${hi} - ${lo} = ${hi - lo}$.\n\n$${diff} \\div ${hi - lo} = ${m}$ groups.\n\n${
        askTotal
          ? `Each group has ${a + b} ${p.all}, so there are $${m} \\times ${a + b} = ${answer}$ ${p.all} altogether.`
          : `Each group has ${askLow ? lo : hi} ${asked}, so there are $${m} \\times ${askLow ? lo : hi} = ${answer}$ ${asked}.`
      }\n\nCheck: ${lo * m} ${loName} and ${hi * m} ${hiName} differ by ${diff} ✓`,
    };
  },
};

interface ThreePartCtx {
  intro: (x: number[]) => string;
  /** "students who come by bus", "litres of white", "buckets of sand". */
  part: (i: number) => string;
  givenTotal: (n: number) => string;
  givenPart: (i: number, n: number) => string;
  askPart: (i: number) => string;
  askTotal: string;
  units?: string;
}

const THREE_PARTS: ThreePartCtx[] = [
  {
    intro: (x) => `At a school, for every ${x[0]} students who walk to school, ${x[1]} come by bus and ${x[2]} bike.`,
    part: (i) => ['students who walk', 'students who come by bus', 'students who bike'][i]!,
    givenTotal: (n) => `There are ${n} students altogether.`,
    givenPart: (i, n) => `${n} students ${['walk', 'come by bus', 'bike'][i]}.`,
    askPart: (i) => `How many students ${['walk', 'come by bus', 'bike'][i]}?`,
    askTotal: 'How many students are there altogether?',
  },
  {
    intro: (x) => `Hemi mixes paint. For every ${x[0]} L of blue, he uses ${x[1]} L of white and ${x[2]} L of yellow.`,
    part: (i) => ['litres of blue', 'litres of white', 'litres of yellow'][i]!,
    givenTotal: (n) => `He makes ${n} L of paint altogether.`,
    givenPart: (i, n) => `He uses ${n} L of ${['blue', 'white', 'yellow'][i]}.`,
    askPart: (i) => `How many litres of ${['blue', 'white', 'yellow'][i]} does he use?`,
    askTotal: 'How many litres of paint does he make altogether?',
    units: 'L',
  },
  {
    intro: (x) => `To make concrete, for every ${x[0]} bucket${x[0] === 1 ? '' : 's'} of cement, a builder uses ${x[1]} buckets of sand and ${x[2]} buckets of gravel.`,
    part: (i) => ['buckets of cement', 'buckets of sand', 'buckets of gravel'][i]!,
    givenTotal: (n) => `She uses ${n} buckets altogether.`,
    givenPart: (i, n) => `She uses ${n} buckets of ${['cement', 'sand', 'gravel'][i]}.`,
    askPart: (i) => `How many buckets of ${['cement', 'sand', 'gravel'][i]} does she use?`,
    askTotal: 'How many buckets does she use altogether?',
  },
];

function threeParts(rng: Rng): TemplateOutput {
  const ctx = rng.pick(THREE_PARTS);
  let x = [1, 2, 3];
  for (;;) {
    x = [rng.int(2, 4), rng.int(2, 5), rng.int(2, 6)];
    if (new Set(x).size === 3) break;
  }
  const g = rng.int(2, 8);
  const sum = x[0]! + x[1]! + x[2]!;
  const known = rng.int(0, 2);
  const target = (known + 1 + rng.int(0, 1)) % 3;
  const useTotal = rng.chance(0.5);
  const answer = useTotal ? x[target]! * g : sum * g;
  return {
    type: 'numeric',
    prompt: `${ctx.intro(x)} ${useTotal ? ctx.givenTotal(sum * g) : ctx.givenPart(known, x[known]! * g)} ${useTotal ? ctx.askPart(target) : ctx.askTotal}`,
    answer,
    ...(ctx.units && { units: ctx.units }),
    marks: 2,
    calculator: 'not-allowed',
    hints: [
      `One group has $${x[0]} + ${x[1]} + ${x[2]} = ${sum}$ altogether.`,
      useTotal ? `How many groups of ${sum} make ${sum * g}?` : `How many groups are there? Each group has ${x[known]} ${ctx.part(known)}.`,
    ],
    solution: useTotal
      ? `One group has $${x[0]} + ${x[1]} + ${x[2]} = ${sum}$. $${sum * g} \\div ${sum} = ${g}$ groups.\n\nEach group has ${x[target]} ${ctx.part(target)}, so the answer is $${g} \\times ${x[target]} = ${answer}$.`
      : `Each group has ${x[known]} ${ctx.part(known)}. $${x[known]! * g} \\div ${x[known]} = ${g}$ groups.\n\nEach group has $${x[0]} + ${x[1]} + ${x[2]} = ${sum}$ altogether, so the total is $${g} \\times ${sum} = ${answer}$.`,
  };
}

// ---------------------------------------------------------------------------
// Fractions describe the relationship between each part and the whole.

export const partWhole: QuestionTemplate = {
  id: 'm7.num.proportion.part-whole',
  topicId: 'm7.num.proportion',
  title: 'Use fractions to describe a part of the whole',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const p = rng.pick(PAIRS);
    const [a, b] = coprimePair(rng);
    const intro = `For every ${a} ${p.a} ${p.where}, there are ${b} ${p.b}.`;
    if (difficulty === 2) {
      const askA = rng.chance(0.5);
      const top = askA ? a : b;
      return {
        type: 'numeric',
        prompt: `${intro} What fraction of the ${p.all} are ${askA ? p.a : p.b}? Give your answer in simplest form.`,
        answer: top / (a + b),
        form: 'simplest-fraction',
        calculator: 'not-allowed',
        hints: ['Think about one group. How many are in the whole group?', `The fraction is (how many ${askA ? p.a : p.b}) out of (the whole group).`],
        solution: `One group has $${a} + ${b} = ${a + b}$ ${p.all}, and ${top} of them are ${askA ? p.a : p.b}.\n\nSo $\\frac{${top}}{${a + b}}$ of the ${p.all} are ${askA ? p.a : p.b}.`,
      };
    }
    if (difficulty === 3) {
      const correct: Choice = { text: `$\\frac{${a}}{${a + b}}$ of the ${p.all} are ${p.a}` };
      const fields = mcqFields(rng, correct, [
        { text: `$\\frac{${a}}{${b}}$ of the ${p.all} are ${p.a}`, feedback: `$\\frac{${a}}{${b}}$ compares ${p.a} with ${p.b}. A fraction of the whole needs the whole group, ${a + b}, on the bottom.` },
        { text: `$\\frac{${b}}{${a + b}}$ of the ${p.all} are ${p.a}`, feedback: `$\\frac{${b}}{${a + b}}$ is the fraction that are ${p.b}.` },
        { text: `There are exactly ${a} ${p.a} altogether`, feedback: '"For every" describes how the amounts are related, not how many there are. There could be lots of groups.' },
      ]);
      return {
        type: 'mcq',
        prompt: `${intro} Which statement is true?`,
        ...fields,
        calculator: 'not-allowed',
        hints: ['Picture one group. How many are in it altogether?', 'A fraction of the whole has the whole group on the bottom.'],
        solution: `One group has $${a} + ${b} = ${a + b}$ ${p.all}, and ${a} of them are ${p.a}. So $\\frac{${a}}{${a + b}}$ of the ${p.all} are ${p.a}.\n\n(And $\\frac{${b}}{${a + b}}$ are ${p.b}. The two fractions add to 1 whole.)`,
      };
    }
    // difficulty 4: from the fraction back to "for every", then scale.
    const ctx = rng.pick([
      { all: 'students in a class', x: 'walk to school', y: 'come by bus' },
      { all: 'fish in a tank', x: 'are goldfish', y: 'are guppies' },
      { all: 'trees in a park', x: 'are native', y: 'are not native' },
      { all: 'cars in the car park', x: 'are electric', y: 'use petrol' },
    ]);
    const [x, y] = coprimePair(rng, 2, 7);
    const whole = x + y;
    const m = rng.int(2, 9);
    return {
      type: 'numeric',
      prompt: `$\\frac{${x}}{${whole}}$ of the ${ctx.all} ${ctx.x}. All the others ${ctx.y}. ${x * m} of them ${ctx.x}. How many ${ctx.y}?`,
      answer: y * m,
      marks: 2,
      calculator: 'not-allowed',
      hints: [`If $\\frac{${x}}{${whole}}$ ${ctx.x}, what fraction ${ctx.y}?`, `So for every ${x} that ${ctx.x}, how many ${ctx.y}?`],
      solution: `$1 - \\frac{${x}}{${whole}} = \\frac{${y}}{${whole}}$ ${ctx.y}. So for every ${x} that ${ctx.x}, ${y} ${ctx.y}.\n\n$${x * m} \\div ${x} = ${m}$ groups, so $${m} \\times ${y} = ${y * m}$ ${ctx.y}.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Scaling recipes up and down.

interface Recipe {
  what: string;
  /** How many the recipe makes, and what it makes ("pikelets", "people"). */
  makes: number;
  noun: string;
  serves: boolean;
  ing: { name: string; unit: 'g' | 'mL' | ''; per: number }[];
}

const RECIPES: Recipe[] = [
  { what: 'pikelet', makes: 12, noun: 'pikelets', serves: false, ing: [{ name: 'flour', unit: 'g', per: 10 }, { name: 'milk', unit: 'mL', per: 10 }] },
  { what: 'scone', makes: 8, noun: 'scones', serves: false, ing: [{ name: 'flour', unit: 'g', per: 25 }, { name: 'milk', unit: 'mL', per: 20 }] },
  { what: 'pancake', makes: 4, noun: 'people', serves: true, ing: [{ name: 'flour', unit: 'g', per: 40 }, { name: 'milk', unit: 'mL', per: 60 }, { name: 'eggs', unit: '', per: 1 }] },
  { what: 'fruit punch', makes: 6, noun: 'people', serves: true, ing: [{ name: 'orange juice', unit: 'mL', per: 150 }, { name: 'lemonade', unit: 'mL', per: 100 }] },
  { what: 'banana cake', makes: 8, noun: 'people', serves: true, ing: [{ name: 'flour', unit: 'g', per: 30 }, { name: 'sugar', unit: 'g', per: 20 }] },
  { what: 'Anzac biscuit', makes: 24, noun: 'biscuits', serves: false, ing: [{ name: 'rolled oats', unit: 'g', per: 5 }, { name: 'coconut', unit: 'g', per: 5 }] },
  { what: 'mince pie', makes: 6, noun: 'pies', serves: false, ing: [{ name: 'mince', unit: 'g', per: 100 }, { name: 'pastry', unit: 'g', per: 50 }] },
];

const amt = (n: number, unit: string, name: string) => (unit ? `${num(n)} ${unit} of ${name}` : `${n} ${name}`);
const article = (w: string) => (/^[aeiouAEIOU]/.test(w) ? 'An' : 'A');
const howMuch = (unit: string, name: string) => (unit ? `How much ${name} is` : `How many ${name} are`);

export const recipes: QuestionTemplate = {
  id: 'm7.num.proportion.recipes',
  topicId: 'm7.num.proportion',
  title: 'Scale recipes up and down',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    const r = rng.pick(RECIPES);
    const ing = rng.pick(r.ing);
    // Base batch: the recipe makes r.makes; the ingredient amount is a whole number for every
    // target used below, because it is built from a per-item amount.
    const base = r.makes;
    const baseAmt = ing.per * base;
    const recipeText = (n: number) => (r.serves ? `serves ${n} ${n === 1 ? 'person' : 'people'}` : `makes ${n} ${r.noun}`);
    const ask = (n: number) => (r.serves ? `to serve ${n} ${n === 1 ? 'person' : 'people'}` : `to make ${n} ${r.noun}`);
    const unitStr = ing.unit;
    const out = (target: number, extra: Partial<TemplateOutput> & { hints: string[]; solution: string }): TemplateOutput => ({
      type: 'numeric',
      prompt: `${article(r.what)} ${r.what} recipe ${recipeText(base)} and uses ${amt(baseAmt, unitStr, ing.name)}. ${howMuch(unitStr, ing.name)} needed ${ask(target)}?`,
      answer: ing.per * target,
      ...(unitStr && { units: unitStr }),
      calculator: 'not-allowed',
      ...extra,
    } as TemplateOutput);
    if (difficulty === 1) {
      const k = rng.pick([2, 3]);
      const half = rng.chance(0.3) && base % 2 === 0;
      const target = half ? base / 2 : base * k;
      return out(target, {
        hints: [half ? `${target} is half of ${base}.` : `${target} is ${k} times ${base}.`, half ? 'So halve the amount.' : `So multiply the amount by ${k}.`],
        solution: half
          ? `${target} is half of ${base}, so halve the ${ing.name}: $${tex(baseAmt)} \\div 2 = ${tex(baseAmt / 2)}$${unitStr ? ` ${unitStr}` : ''}.`
          : `${target} is ${k} times ${base}, so multiply the ${ing.name} by ${k}: $${tex(baseAmt)} \\times ${k} = ${tex(baseAmt * k)}$${unitStr ? ` ${unitStr}` : ''}.`,
      });
    }
    if (difficulty === 2) {
      const divisors = [2, 3, 4].filter((d) => base % d === 0);
      const down = divisors.length > 0 && rng.chance(0.4);
      if (down) {
        const d = rng.pick(divisors);
        const target = base / d;
        return out(target, {
          hints: [`How many times smaller is ${target} than ${base}?`, `Divide the amount by that number.`],
          solution: `$${base} \\div ${d} = ${target}$, so divide the ${ing.name} by ${d}: $${tex(baseAmt)} \\div ${d} = ${tex(baseAmt / d)}$${unitStr ? ` ${unitStr}` : ''}.`,
        });
      }
      const k = rng.int(3, 5);
      const target = base * k;
      return out(target, {
        hints: [`How many times bigger is ${target} than ${base}?`, 'Multiply the amount by that number.'],
        solution: `$${base} \\times ${k} = ${target}$, so multiply the ${ing.name} by ${k}: $${tex(baseAmt)} \\times ${k} = ${tex(baseAmt * k)}$${unitStr ? ` ${unitStr}` : ''}.`,
      });
    }
    if (difficulty === 3) {
      // A target that isn't a whole-number multiple: go via a common factor.
      const options: number[] = [];
      for (let t = 2; t <= base * 3; t++) {
        const g = gcd(base, t);
        if (t % base !== 0 && base % t !== 0 && g > 1 && t / g <= 5 && base / g <= 6) options.push(t);
      }
      const target = rng.pick(options);
      const g = gcd(base, target);
      const small = baseAmt / (base / g);
      return out(target, {
        hints: [`${target} isn't a whole number of times ${base}. Find the amount for ${g} first.`, `${g} goes into ${base} and into ${target}. Divide down to ${g}, then multiply up to ${target}.`],
        solution: `For ${g}: $${base} \\div ${base / g} = ${g}$, so $${tex(baseAmt)} \\div ${base / g} = ${tex(small)}$${unitStr ? ` ${unitStr}` : ''}.\n\nFor ${target}: $${g} \\times ${target / g} = ${target}$, so $${tex(small)} \\times ${target / g} = ${tex(ing.per * target)}$${unitStr ? ` ${unitStr}` : ''}.`,
      });
    }
    // difficulty 4: two ingredients, or how many can be made with what you have.
    const name = rng.pick(NAMES);
    if (r.ing.length >= 2 && rng.chance(0.5)) {
      const [i1, i2] = rng.sample(r.ing, 2) as [Recipe['ing'][number], Recipe['ing'][number]];
      const a1 = i1.per * base;
      const a2 = i2.per * base;
      const fracs = (
        [
          [3, 2],
          [5, 2],
          [3, 4],
          [5, 4],
          [4, 3],
          [2, 3],
        ] as const
      ).filter(([, d]) => a1 % d === 0 && a2 % d === 0);
      const [fn, fd] = fracs.length ? rng.pick(fracs) : ([3, 2] as const);
      const used = (a1 * fn) / fd;
      const need = (a2 * fn) / fd;
      return {
        type: 'numeric',
        prompt: `${article(r.what)} ${r.what} recipe uses ${amt(a1, i1.unit, i1.name)} and ${amt(a2, i2.unit, i2.name)}. ${name} changes the recipe so it uses ${amt(used, i1.unit, i1.name)}. ${i2.unit ? `How much ${i2.name}` : `How many ${i2.name}`} should ${name} use?`,
        answer: need,
        ...(i2.unit && { units: i2.unit }),
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How does ${num(used)} compare with ${num(a1)}? Try finding a part of ${num(a1)} first.`, `Do the same thing to the ${i2.name}.`],
        solution: `$${tex(a1)} \\div ${fd} = ${tex(a1 / fd)}$, and $${tex(a1 / fd)} \\times ${fn} = ${tex(used)}$. So the ${i1.name} has been multiplied by $\\frac{${fn}}{${fd}}$.\n\nDo the same to the ${i2.name}: $${tex(a2)} \\div ${fd} = ${tex(a2 / fd)}$, then $${tex(a2 / fd)} \\times ${fn} = ${tex(need)}$${i2.unit ? ` ${i2.unit}` : ''}.`,
      } as TemplateOutput;
    }
    const k = rng.int(2, 5);
    const haveExtra = rng.int(1, ing.per * base - 1);
    const have = baseAmt * k + (rng.chance(0.5) ? haveExtra : 0);
    const batches = Math.floor(have / baseAmt);
    const makesTotal = batches * base;
    return {
      type: 'numeric',
      prompt: `${article(r.what)} ${r.what} recipe ${recipeText(base)} and uses ${amt(baseAmt, unitStr, ing.name)}. ${name} has ${amt(have, unitStr, ing.name)} and makes as many full batches as possible. How many ${r.serves ? 'people can be served' : r.noun + ' can ' + name + ' make'}?`,
      answer: makesTotal,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`How many full batches does ${num(have)}${unitStr ? ` ${unitStr}` : ''} make?`, `Each batch ${recipeText(base)}.`],
      solution: `Each batch needs ${amt(baseAmt, unitStr, ing.name)}. $${tex(have)} \\div ${tex(baseAmt)} = ${batches}$${have % baseAmt ? ` remainder ${tex(have % baseAmt)}` : ''}, so ${name} can make ${batches} full batches.\n\n$${batches} \\times ${base} = ${makesTotal}$ ${r.serves ? 'people' : r.noun}.`,
    };
  },
};

// ---------------------------------------------------------------------------
// Rates: cost per item, distance per hour, litres per minute.

export const rates: QuestionTemplate = {
  id: 'm7.num.proportion.rates',
  topicId: 'm7.num.proportion',
  title: 'Scale rates up and down (the unitary method)',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const things = rng.pick(['apples', 'muesli bars', 'bread rolls', 'kiwifruit', 'mandarins', 'pens', 'stickers']);
    if (difficulty === 2) {
      const n = rng.int(2, 6);
      const u = 10 * rng.int(3, 25);
      const k = rng.int(2, 5);
      return {
        type: 'numeric',
        prompt: `${n} ${things} cost ${cash(dollars(n * u))}. How much do ${n * k} ${things} cost?`,
        answer: dollars(n * k * u),
        units: '$',
        calculator: 'not-allowed',
        hints: [`How many lots of ${n} are in ${n * k}?`, 'Multiply the cost by the same number.'],
        solution: `$${n * k} \\div ${n} = ${k}$, so it costs ${k} times as much: $${texMoney(dollars(n * u))} \\times ${k} = ${texMoney(dollars(n * k * u))}$, which is **${cash(dollars(n * k * u))}**.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const n = rng.int(3, 8);
        const u = 10 * rng.int(4, 30);
        let t = rng.int(2, 12);
        if (t % n === 0 || n % t === 0) t = n + 1;
        return {
          type: 'numeric',
          prompt: `${n} ${things} cost ${cash(dollars(n * u))}. At the same price each, how much do ${t} ${things} cost?`,
          answer: dollars(t * u),
          units: '$',
          calculator: 'not-allowed',
          hints: ['Find the cost of one first.', `Then multiply by ${t}.`],
          solution: `One costs $${texMoney(dollars(n * u))} \\div ${n} = ${texMoney(dollars(u))}$.\n\n${t} cost $${t} \\times ${texMoney(dollars(u))} = ${texMoney(dollars(t * u))}$, which is **${cash(dollars(t * u))}**.`,
        };
      }
      const h = rng.int(2, 4);
      let t = rng.int(2, 7);
      if (t === h) t += 1;
      const mover = rng.pick([
        { who: `${name} cycles`, sub: name, speeds: [12, 14, 15, 16, 18, 20] },
        { who: 'A bus travels', sub: 'the bus', speeds: [40, 45, 50, 60, 70, 80] },
        { who: 'A train travels', sub: 'the train', speeds: [50, 60, 70, 80, 90] },
        { who: `${name}'s family drives`, sub: 'they', speeds: [60, 70, 75, 80, 90] },
      ]);
      const v = rng.pick(mover.speeds);
      return {
        type: 'numeric',
        prompt: `${mover.who} ${v * h} km in ${h} hours. At the same speed, how far would ${mover.sub} go in ${t} hours?`,
        answer: v * t,
        units: 'km',
        calculator: 'not-allowed',
        hints: ['How far in 1 hour?', `Then multiply by ${t}.`],
        solution: `In 1 hour: $${v * h} \\div ${h} = ${v}$ km.\n\nIn ${t} hours: $${t} \\times ${v} = ${v * t}$ km.`,
      };
    }
    if (difficulty === 4) {
      const kind = rng.pick(['tap', 'printer', 'packer'] as const);
      if (kind === 'tap') {
        const rate = rng.int(2, 9);
        const m = rng.int(2, 5);
        let t = rng.int(3, 12);
        if (t === m) t += 1;
        return {
          type: 'numeric',
          prompt: `A tap fills a tank with ${rate * m} L of water in ${m} minutes. At the same rate, how many minutes will it take to put ${rate * t} L in the tank?`,
          answer: t,
          units: 'min',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['How many litres does the tap fill in 1 minute?', `How many minutes to fill ${rate * t} L at that rate?`],
          solution: `In 1 minute: $${rate * m} \\div ${m} = ${rate}$ L.\n\nTime: $${rate * t} \\div ${rate} = ${t}$ minutes.`,
        };
      }
      if (kind === 'printer') {
        const rate = rng.int(6, 25);
        const m = rng.int(2, 4);
        let t = rng.int(3, 10);
        if (t === m) t += 1;
        return {
          type: 'numeric',
          prompt: `The school printer prints ${rate * m} pages in ${m} minutes. How many minutes will it take to print ${rate * t} pages?`,
          answer: t,
          units: 'min',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['How many pages does it print in 1 minute?', `How many minutes for ${rate * t} pages?`],
          solution: `In 1 minute: $${rate * m} \\div ${m} = ${rate}$ pages.\n\nTime: $${rate * t} \\div ${rate} = ${t}$ minutes.`,
        };
      }
      const per = rng.int(2, 6);
      const mins = rng.pick([10, 12, 15, 20, 30]);
      const hours = rng.int(1, 3);
      const total = per * ((60 * hours) / mins);
      return {
        type: 'numeric',
        prompt: `At a kiwifruit packhouse, ${name} packs ${per} trays every ${mins} minutes. How many trays does ${name} pack in ${hours === 1 ? '1 hour' : `${hours} hours`}?`,
        answer: total,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How many lots of ${mins} minutes are in ${hours === 1 ? '1 hour' : `${hours} hours`}?`, `Each lot is ${per} trays.`],
        solution: `${hours === 1 ? '1 hour' : `${hours} hours`} is ${60 * hours} minutes. $${60 * hours} \\div ${mins} = ${(60 * hours) / mins}$ lots of ${mins} minutes.\n\n$${(60 * hours) / mins} \\times ${per} = ${total}$ trays.`,
      };
    }
    // difficulty 5: compare two rates over the same time.
    const other = rng.pick(NAMES.filter((n) => n !== name));
    const timesA = rng.pick([10, 15, 20, 30]);
    const timesB = rng.pick([10, 12, 15, 20, 30].filter((x) => x !== timesA));
    const pa = rng.int(3, 15);
    const pb = rng.int(3, 15);
    const T = 60;
    const totA = pa * (T / timesA);
    const totB = pb * (T / timesB);
    if (totA === totB) return rates.generate({ rng, difficulty });
    const [more, less, mt, lt] = totA > totB ? [name, other, totA, totB] : [other, name, totB, totA];
    return {
      type: 'numeric',
      prompt: `${name} reads ${pa} pages every ${timesA} minutes. ${other} reads ${pb} pages every ${timesB} minutes. They both read for 1 hour. How many more pages does ${more} read than ${less}?`,
      answer: mt - lt,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Work out how many pages each person reads in 60 minutes.', 'Then find the difference.'],
      solution: `${name}: $60 \\div ${timesA} = ${T / timesA}$, so $${T / timesA} \\times ${pa} = ${totA}$ pages.\n\n${other}: $60 \\div ${timesB} = ${T / timesB}$, so $${T / timesB} \\times ${pb} = ${totB}$ pages.\n\n${more} reads $${mt} - ${lt} = ${mt - lt}$ more pages.`,
    };
  },
};

export const templates: QuestionTemplate[] = [forEvery, partWhole, recipes, rates];
