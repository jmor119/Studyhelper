import type { QuestionTemplate } from '../../../types';
import { clean, frac, gcd, mixed, NAMES, num, tex } from '../../../format';
import {
  countOn,
  fmt12,
  fmt12Short,
  fmt24,
  hour24Accepted,
  hoursMinutes,
  minuteAccepted,
  parts12,
  timetableFigure,
} from './units-time-helpers';

// m7.mea.units-time — choosing metric units, converting with kilo-, centi- and milli-,
// fractions of time, elapsed time and timetables. No calculators: every number is friendly.

// ---------------------------------------------------------------------------------------------
// Choosing a sensible unit
// ---------------------------------------------------------------------------------------------

type Measure = 'length' | 'mass' | 'capacity';

interface UnitInfo {
  sym: string;
  name: string;
  benchmark: string;
}

const UNITS: Record<Measure, UnitInfo[]> = {
  length: [
    { sym: 'mm', name: 'millimetres', benchmark: 'A millimetre is about the thickness of a bank card.' },
    { sym: 'cm', name: 'centimetres', benchmark: 'A centimetre is about the width of your little fingernail.' },
    { sym: 'm', name: 'metres', benchmark: 'A metre is about one big step.' },
    { sym: 'km', name: 'kilometres', benchmark: 'A kilometre is about a 12-minute walk.' },
  ],
  mass: [
    { sym: 'mg', name: 'milligrams', benchmark: 'A milligram is a thousandth of a gram, so it is only used for very light things.' },
    { sym: 'g', name: 'grams', benchmark: 'A gram is about the mass of a paper clip.' },
    { sym: 'kg', name: 'kilograms', benchmark: 'A kilogram is about the mass of a 1 litre bottle of water.' },
    { sym: 't', name: 'tonnes', benchmark: 'A tonne is 1000 kg, about the mass of a small car.' },
  ],
  capacity: [
    { sym: 'mL', name: 'millilitres', benchmark: 'A millilitre is a very small amount: a teaspoon holds about 5 mL.' },
    { sym: 'L', name: 'litres', benchmark: 'A litre is a large bottle of water.' },
    { sym: 'kL', name: 'kilolitres', benchmark: 'A kilolitre is 1000 litres, enough to fill six or seven bathtubs.' },
  ],
};

interface Item {
  what: string;
  measure: Measure;
  unit: string;
  value: number;
}

const ITEMS: Item[] = [
  { what: 'the length of a pencil', measure: 'length', unit: 'cm', value: 15 },
  { what: 'the thickness of a coin', measure: 'length', unit: 'mm', value: 2 },
  { what: 'the length of an ant', measure: 'length', unit: 'mm', value: 5 },
  { what: 'the length of a netball court', measure: 'length', unit: 'm', value: 30 },
  { what: 'the distance by road from Wellington to Palmerston North', measure: 'length', unit: 'km', value: 140 },
  { what: 'the length of a school swimming pool', measure: 'length', unit: 'm', value: 25 },
  { what: 'the length of a school bus', measure: 'length', unit: 'm', value: 12 },
  { what: 'the width of a picture book', measure: 'length', unit: 'cm', value: 20 },
  { what: 'the length of a grain of rice', measure: 'length', unit: 'mm', value: 6 },
  { what: 'the height of a classroom door', measure: 'length', unit: 'm', value: 2 },
  { what: 'the length of a cricket pitch', measure: 'length', unit: 'm', value: 20 },
  { what: 'the length of the Tongariro Alpine Crossing walk', measure: 'length', unit: 'km', value: 19 },
  { what: 'the length of a feijoa', measure: 'length', unit: 'cm', value: 6 },
  { what: 'the width of a phone screen', measure: 'length', unit: 'cm', value: 7 },
  { what: 'the mass of a bag of potatoes', measure: 'mass', unit: 'kg', value: 5 },
  { what: 'the mass of an apple', measure: 'mass', unit: 'g', value: 150 },
  { what: 'the mass of a sheep', measure: 'mass', unit: 'kg', value: 70 },
  { what: 'the mass of a slice of bread', measure: 'mass', unit: 'g', value: 30 },
  { what: 'the mass of a loaded logging truck', measure: 'mass', unit: 't', value: 40 },
  { what: 'the mass of a mosquito', measure: 'mass', unit: 'mg', value: 2 },
  { what: 'the mass of a cat', measure: 'mass', unit: 'kg', value: 4 },
  { what: 'the mass of a pencil', measure: 'mass', unit: 'g', value: 6 },
  { what: 'the mass of an adult elephant', measure: 'mass', unit: 't', value: 5 },
  { what: 'the mass of a kiwifruit', measure: 'mass', unit: 'g', value: 100 },
  { what: 'the water in a full bath', measure: 'capacity', unit: 'L', value: 150 },
  { what: 'a teaspoon of medicine', measure: 'capacity', unit: 'mL', value: 5 },
  { what: "the petrol in a car's fuel tank", measure: 'capacity', unit: 'L', value: 50 },
  { what: 'the water in an Olympic swimming pool', measure: 'capacity', unit: 'kL', value: 2500 },
  { what: 'the water in a bucket', measure: 'capacity', unit: 'L', value: 10 },
  { what: 'the juice in a small juice box', measure: 'capacity', unit: 'mL', value: 250 },
  { what: 'the milk in a big bottle from the supermarket', measure: 'capacity', unit: 'L', value: 2 },
  { what: 'the drink in a can of fizzy drink', measure: 'capacity', unit: 'mL', value: 330 },
];

export const chooseUnit: QuestionTemplate = {
  id: 'm7.mea.units-time.choose-unit',
  topicId: 'm7.mea.units-time',
  title: 'Choose a sensible metric unit or estimate',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const item = rng.pick(ITEMS);
    const units = UNITS[item.measure];
    const correctIdx = units.findIndex((u) => u.sym === item.unit);
    const correct = units[correctIdx]!;
    const ids = ['a', 'b', 'c', 'd'];
    const feedback: Record<string, string> = {};
    if (difficulty === 1) {
      const options = units.map((u, i) => ({ id: ids[i]!, text: `${u.name} (${u.sym})` }));
      units.forEach((u, i) => {
        if (i === correctIdx) return;
        feedback[ids[i]!] =
          i < correctIdx
            ? `${u.name[0]!.toUpperCase()}${u.name.slice(1)} are too small for this. You would need a huge number of them.`
            : `${u.name[0]!.toUpperCase()}${u.name.slice(1)} are too big for this. The answer would be a tiny part of one ${u.name.slice(0, -1)}.`;
      });
      return {
        type: 'mcq',
        prompt: `Which unit is best for measuring ${item.what}?`,
        options,
        correct: ids[correctIdx]!,
        feedback,
        calculator: 'not-allowed',
        hints: [
          'Picture how big it is. Is it tiny, hand-sized, room-sized, or bigger than a town?',
          'The best unit gives a sensible number: not a huge number, and not a tiny fraction.',
        ],
        solution: `${item.what[0]!.toUpperCase()}${item.what.slice(1)} is best measured in **${correct.name} (${correct.sym})**. It is about ${num(item.value)} ${correct.sym}.\n\n${correct.benchmark}`,
      };
    }
    const options = units.map((u, i) => ({ id: ids[i]!, text: `about ${num(item.value)} ${u.sym}` }));
    units.forEach((u, i) => {
      if (i === correctIdx) return;
      feedback[ids[i]!] = `${num(item.value)} ${u.name} would be far too ${i < correctIdx ? 'small' : 'big'}. ${u.benchmark}`;
    });
    return {
      type: 'mcq',
      prompt: `Which is the most sensible estimate for ${item.what}?`,
      options,
      correct: ids[correctIdx]!,
      feedback,
      calculator: 'not-allowed',
      hints: [
        'Use a benchmark: a centimetre is about the width of a fingernail, a kilogram is a 1 litre bottle of water, and a litre is a large bottle of drink.',
        'All the numbers are the same, so only the unit changes. Which unit makes the size believable?',
      ],
      solution: `${item.what[0]!.toUpperCase()}${item.what.slice(1)} is **about ${num(item.value)} ${correct.sym}**.\n\n${correct.benchmark}`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Converting metric units
// ---------------------------------------------------------------------------------------------

interface Pair {
  big: string;
  small: string;
  bigName: string;
  smallName: string;
  factor: number;
}

const PAIRS: Pair[] = [
  { big: 'cm', small: 'mm', bigName: 'centimetres', smallName: 'millimetres', factor: 10 },
  { big: 'm', small: 'cm', bigName: 'metres', smallName: 'centimetres', factor: 100 },
  { big: 'm', small: 'mm', bigName: 'metres', smallName: 'millimetres', factor: 1000 },
  { big: 'km', small: 'm', bigName: 'kilometres', smallName: 'metres', factor: 1000 },
  { big: 'kg', small: 'g', bigName: 'kilograms', smallName: 'grams', factor: 1000 },
  { big: 'g', small: 'mg', bigName: 'grams', smallName: 'milligrams', factor: 1000 },
  { big: 'L', small: 'mL', bigName: 'litres', smallName: 'millilitres', factor: 1000 },
  { big: 'kL', small: 'L', bigName: 'kilolitres', smallName: 'litres', factor: 1000 },
];

function convertSolution(p: Pair, fromVal: number, toSmall: boolean, answer: number): string {
  const how = toSmall
    ? `You are changing to a **smaller** unit, so you need more of them. Multiply by ${num(p.factor)}:\n\n$${tex(fromVal)} \\times ${tex(p.factor)} = ${tex(answer)}$`
    : `You are changing to a **bigger** unit, so you need fewer of them. Divide by ${num(p.factor)}:\n\n$${tex(fromVal)} \\div ${tex(p.factor)} = ${tex(answer)}$`;
  const shift = p.factor === 10 ? 'one place' : p.factor === 100 ? 'two places' : 'three places';
  return [
    `1 ${p.big} = ${num(p.factor)} ${p.small}.`,
    how,
    `(The digits move ${shift} ${toSmall ? 'to the left' : 'to the right'} on the place value chart.)`,
  ].join('\n\n');
}

export const convertUnits: QuestionTemplate = {
  id: 'm7.mea.units-time.convert',
  topicId: 'm7.mea.units-time',
  title: 'Convert between metric units (kilo-, centi-, milli-)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const p = rng.pick(PAIRS);
    const factorHint = `There are ${num(p.factor)} ${p.small} in 1 ${p.big}.`;
    if (difficulty === 3) {
      // Mixed units, e.g. 3 kg 450 g → kg or g.
      const a = rng.int(1, 9);
      let b: number;
      if (p.factor === 10) b = rng.int(1, 9);
      else if (rng.chance(0.35)) b = rng.int(1, 9) * (p.factor / 100) || rng.int(1, 9); // e.g. 4 L 50 mL
      else b = rng.int(1, p.factor - 1);
      if (b % 10 === 0 && p.factor === 1000 && b % 100 === 0) b += 5; // avoid 3 kg 400 g being too easy
      const toBig = rng.chance(0.5);
      const answer = toBig ? clean(a + b / p.factor) : a * p.factor + b;
      return {
        type: 'numeric',
        prompt: `Write ${a} ${p.big} ${num(b)} ${p.small} in ${toBig ? p.bigName : p.smallName} (${toBig ? p.big : p.small}).`,
        answer,
        units: toBig ? p.big : p.small,
        calculator: 'not-allowed',
        hints: [
          factorHint,
          toBig
            ? `Change the ${num(b)} ${p.small} into ${p.bigName} first, then add the ${a} whole ${p.bigName}.`
            : `Change the ${a} ${p.bigName} into ${p.smallName} first, then add the ${num(b)} ${p.small}.`,
        ],
        solution: toBig
          ? `${factorHint}\n\n$${tex(b)} \\div ${tex(p.factor)} = ${tex(clean(b / p.factor))}$ ${p.big}\n\n$${a} + ${tex(clean(b / p.factor))} = ${tex(answer)}$, so ${a} ${p.big} ${num(b)} ${p.small} = **${num(answer)} ${p.big}**.`
          : `${factorHint}\n\n$${a} \\times ${tex(p.factor)} = ${tex(a * p.factor)}$ ${p.small}\n\n$${tex(a * p.factor)} + ${tex(b)} = ${tex(answer)}$, so ${a} ${p.big} ${num(b)} ${p.small} = **${num(answer)} ${p.small}**.`,
      };
    }
    let bigVal: number;
    if (difficulty === 1) {
      bigVal = p.factor === 10 ? rng.int(2, 40) : rng.int(2, 25);
    } else {
      const maxDp = p.factor === 10 ? 1 : 2;
      const dp = rng.int(1, maxDp);
      const scale = 10 ** dp;
      let n = rng.int(1, 9 * scale);
      if (n % 10 === 0) n += 1;
      bigVal = clean(n / scale);
    }
    const smallVal = clean(bigVal * p.factor);
    const toSmall = rng.chance(0.5);
    const [fromVal, fromUnit, toUnit, toName, answer] = toSmall
      ? [bigVal, p.big, p.small, p.smallName, smallVal]
      : [smallVal, p.small, p.big, p.bigName, bigVal];
    return {
      type: 'numeric',
      prompt: `Convert ${num(fromVal)} ${fromUnit} to ${toName} (${toUnit}).`,
      answer,
      units: toUnit,
      calculator: 'not-allowed',
      hints: [
        factorHint,
        'Ask yourself: is the new unit smaller (so you need more of them) or bigger (so you need fewer)?',
      ],
      solution: convertSolution(p, fromVal, toSmall, answer),
    };
  },
};

// ---------------------------------------------------------------------------------------------
// 12-hour and 24-hour time
// ---------------------------------------------------------------------------------------------

export const twentyFourHour: QuestionTemplate = {
  id: 'm7.mea.units-time.twenty-four-hour',
  topicId: 'm7.mea.units-time',
  title: 'Convert between 12-hour and 24-hour time',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    let t: number;
    if (difficulty === 2 && rng.chance(0.25)) {
      // Around midday or midnight.
      t = rng.pick([0, 720]) + rng.int(1, 59);
    } else if (rng.chance(0.7)) {
      t = rng.int(13 * 60, 23 * 60 + 59); // afternoon or evening
    } else {
      t = rng.int(5 * 60, 11 * 60 + 59);
    }
    const h24 = Math.floor(t / 60);
    const { h, m, ap } = parts12(t);
    if (difficulty === 1) {
      return {
        type: 'cloze',
        prompt: `Write **${fmt12(t)}** in 24-hour time.\n\n[[h]] : [[m]]`,
        blanks: [
          { id: 'h', accepted: hour24Accepted(h24) },
          { id: 'm', accepted: minuteAccepted(m) },
        ],
        calculator: 'not-allowed',
        hints: [
          '24-hour time counts the hours from midnight (00) up to 23, and always uses four digits.',
          ap === 'pm' ? 'For pm times after 1:00 pm, add 12 to the hour.' : 'For am times, the hour stays the same. Put a 0 in front if it is one digit.',
        ],
        solution:
          ap === 'pm'
            ? `${fmt12(t)} is after midday, so add 12 to the hour: $${h} + 12 = ${h24}$.\n\nThe minutes stay the same, so ${fmt12(t)} = **${fmt24(t)}**.`
            : `${fmt12(t)} is in the morning, so the hour stays the same. In 24-hour time it is written with four digits: **${fmt24(t)}**.`,
      };
    }
    const special = h24 === 0 || h24 === 12;
    return {
      type: 'cloze',
      prompt: `Write **${fmt24(t)}** as a 12-hour time.\n\n[[h]] : [[m]] [[ap]]`,
      blanks: [
        { id: 'h', accepted: [String(h)] },
        { id: 'm', accepted: minuteAccepted(m) },
        { id: 'ap', accepted: [ap], options: ['am', 'pm'] },
      ],
      calculator: 'not-allowed',
      hints: [
        'Times from 00:00 to 11:59 are am. Times from 12:00 to 23:59 are pm.',
        special
          ? 'The hour 00 is the first hour after midnight, and the hour 12 is the first hour after midday.'
          : h24 > 12
            ? 'If the hour is more than 12, subtract 12.'
            : 'If the hour is less than 12, it is already the same as a 12-hour time.',
      ],
      solution: special
        ? h24 === 0
          ? `The hour 00 is the hour after midnight, so ${fmt24(t)} is **${fmt12(t)}**.`
          : `The hour 12 is the hour after midday, so ${fmt24(t)} is **${fmt12(t)}**.`
        : h24 > 12
          ? `The hour ${h24} is more than 12, so it is pm. $${h24} - 12 = ${h}$, so ${fmt24(t)} is **${fmt12(t)}**.`
          : `The hour ${h24} is less than 12, so it is am: ${fmt24(t)} is **${fmt12(t)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Fractions of time and converting units of time
// ---------------------------------------------------------------------------------------------

function properFraction(rng: { pick<T>(a: readonly T[]): T; int(a: number, b: number): number }, dens: readonly number[]): [number, number] {
  const d = rng.pick(dens);
  for (;;) {
    const n = rng.int(1, d - 1);
    if (gcd(n, d) === 1) return [n, d];
  }
}

const ACTIVITIES = ['practises the piano', 'reads', 'practises kapa haka', 'walks the dog', 'does homework', 'shoots netball goals', 'practises the guitar'];

export const timeFractions: QuestionTemplate = {
  id: 'm7.mea.units-time.time-fractions',
  topicId: 'm7.mea.units-time',
  title: 'Fractions of time and converting units of time',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const kind = rng.pick(['hourToMin', 'hourToMin', 'minToSec', 'dayToHour', 'minToFraction'] as const);
      if (kind === 'minToFraction') {
        const [n, d] = properFraction(rng, [2, 3, 4, 5, 6, 10, 12]);
        const mins = (60 * n) / d;
        return {
          type: 'numeric',
          prompt: `What fraction of an hour is ${mins} minutes? Give your answer in simplest form.`,
          answer: n / d,
          form: 'simplest-fraction',
          calculator: 'not-allowed',
          hints: ['There are 60 minutes in an hour, so write it as a fraction out of 60.', 'Then simplify the fraction.'],
          solution: `${mins} minutes out of 60 minutes is $\\frac{${mins}}{60}$.\n\nThe highest common factor of ${mins} and 60 is ${gcd(mins, 60)}, so $\\frac{${mins}}{60} = ${frac(n, d)}$ of an hour.`,
        };
      }
      const cfg = {
        hourToMin: { whole: 'an hour', per: 60, part: 'minutes', unit: 'min', dens: [2, 3, 4, 5, 6, 10, 12] },
        minToSec: { whole: 'a minute', per: 60, part: 'seconds', unit: 's', dens: [2, 3, 4, 5, 6, 10, 12] },
        dayToHour: { whole: 'a day', per: 24, part: 'hours', unit: 'h', dens: [2, 3, 4, 6, 8, 12] },
      }[kind];
      const [n, d] = properFraction(rng, cfg.dens);
      const unitPart = cfg.per / d;
      const answer = unitPart * n;
      return {
        type: 'numeric',
        prompt: `How many ${cfg.part} are in $${frac(n, d)}$ of ${cfg.whole}?`,
        answer,
        units: cfg.unit,
        calculator: 'not-allowed',
        hints: [
          `There are ${cfg.per} ${cfg.part} in ${cfg.whole}. Find $\\frac{1}{${d}}$ of ${cfg.per} first.`,
          n > 1 ? `Then multiply by ${n}.` : `Split ${cfg.per} into ${d} equal parts.`,
        ],
        solution: `There are ${cfg.per} ${cfg.part} in ${cfg.whole}.\n\n$\\frac{1}{${d}}$ of ${cfg.per} is $${cfg.per} \\div ${d} = ${unitPart}$.${n > 1 ? `\n\n$\\frac{${n}}{${d}}$ of ${cfg.per} is $${n} \\times ${unitPart} = ${answer}$.` : ''}\n\nSo $${frac(n, d)}$ of ${cfg.whole} is **${answer} ${cfg.part}**.`,
      };
    }
    const kind = rng.pick(['mixedHours', 'mixedMinutes', 'minToHours', 'word'] as const);
    if (kind === 'mixedHours' || kind === 'mixedMinutes') {
      const w = rng.int(1, 3);
      const [n, d] = properFraction(rng, [2, 3, 4, 5, 6]);
      const part = (60 * n) / d;
      const answer = 60 * w + part;
      const [big, small, unit] = kind === 'mixedHours' ? ['hours', 'minutes', 'min'] : ['minutes', 'seconds', 's'];
      return {
        type: 'numeric',
        prompt: `How many ${small} are in $${w}${frac(n, d)}$ ${big}?`,
        answer,
        units: unit,
        calculator: 'not-allowed',
        hints: [
          `Work out the whole ${big} and the fraction part separately. There are 60 ${small} in 1 ${big.slice(0, -1)}.`,
          `Find $${frac(n, d)}$ of 60, then add it on.`,
        ],
        solution: `${w} ${w === 1 ? big.slice(0, -1) : big} = $${w} \\times 60 = ${60 * w}$ ${small}.\n\n$${frac(n, d)}$ of 60 = $60 \\div ${d} \\times ${n} = ${part}$ ${small}.\n\nTotal: $${60 * w} + ${part} = ${answer}$ ${small}.`,
      };
    }
    if (kind === 'minToHours') {
      const w = rng.int(1, 4);
      const [n, d] = properFraction(rng, [2, 4, 5, 10]);
      const part = (60 * n) / d;
      const mins = 60 * w + part;
      const answer = clean(w + n / d);
      return {
        type: 'numeric',
        prompt: `Write ${mins} minutes in hours. Give your answer as a mixed number or a decimal.`,
        answer,
        calculator: 'not-allowed',
        hints: ['How many whole lots of 60 minutes fit into it?', 'Write the minutes left over as a fraction of 60, then simplify.'],
        solution: `$${mins} = ${60 * w} + ${part}$. ${60 * w} minutes is ${w} hour${w === 1 ? '' : 's'}.\n\n${part} minutes is $\\frac{${part}}{60} = ${frac(n, d)}$ of an hour.\n\nSo ${mins} minutes = $${mixed(w * d + n, d)}$ hours = **${num(answer)} hours**.`,
      };
    }
    const name = rng.pick(NAMES);
    const act = rng.pick(ACTIVITIES);
    const [n, d] = properFraction(rng, [2, 3, 4, 5, 6]);
    const days = rng.int(3, 7);
    const each = (60 * n) / d;
    const answer = each * days;
    return {
      type: 'numeric',
      prompt: `${name} ${act} for $${frac(n, d)}$ of an hour each day for ${days} days. How many minutes is that altogether?`,
      answer,
      units: 'min',
      calculator: 'not-allowed',
      hints: [`Change $${frac(n, d)}$ of an hour into minutes first.`, `Then multiply by the number of days.`],
      solution: `$${frac(n, d)}$ of an hour is $60 \\div ${d} \\times ${n} = ${each}$ minutes.\n\nFor ${days} days: $${each} \\times ${days} = ${answer}$ minutes${answer >= 60 ? ` (that is ${hoursMinutes(answer)})` : ''}.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Elapsed time
// ---------------------------------------------------------------------------------------------

const EVENTS = [
  'swimming lesson',
  'piano lesson',
  'netball game',
  'bus trip',
  'movie',
  'kapa haka practice',
  'football training',
  'school concert',
  'ferry trip',
  'bike ride',
];

export const elapsedTime: QuestionTemplate = {
  id: 'm7.mea.units-time.elapsed-time',
  topicId: 'm7.mea.units-time',
  title: 'Elapsed time, start times and finish times',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const event = rng.pick(EVENTS);
    const countHints = (fmt: (t: number) => string, s: number) => [
      `Count on from ${fmt(s)} to the next o'clock time first.`,
      'Then count on the whole hours, then the minutes that are left.',
    ];
    if (difficulty === 2) {
      const startMin = rng.int(30, 58);
      const start = rng.int(7, 20) * 60 + startMin;
      const len = rng.int(Math.max(5, 60 - startMin + 3), 59);
      const end = start + len;
      return {
        type: 'numeric',
        prompt: `${name}'s ${event} starts at ${fmt12(start)} and finishes at ${fmt12(end)}. How long is it, in minutes?`,
        answer: len,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: countHints(fmt12, start),
        solution: countOn(start, end, fmt12),
      };
    }
    if (difficulty === 3) {
      const start = rng.int(7, 17) * 60 + rng.int(1, 11) * 5 + rng.pick([0, 0, 2, 3]);
      const len = rng.int(14, 40) * 5 + rng.pick([0, 0, 1, 3]);
      const end = start + len;
      const h = Math.floor(len / 60);
      const m = len % 60;
      if (rng.chance(0.5) || m === 0) {
        return {
          type: 'numeric',
          prompt: `A ${event} starts at ${fmt12(start)} and finishes at ${fmt12(end)}. How many minutes long is it?`,
          answer: len,
          units: 'min',
          form: 'integer',
          calculator: 'not-allowed',
          hints: countHints(fmt12, start),
          solution: countOn(start, end, fmt12),
        };
      }
      return {
        type: 'cloze',
        prompt: `A ${event} starts at ${fmt12(start)} and finishes at ${fmt12(end)}. How long is it?\n\n[[h]] hour(s) and [[m]] minutes`,
        blanks: [
          { id: 'h', accepted: [String(h)] },
          { id: 'm', accepted: [String(m)] },
        ],
        calculator: 'not-allowed',
        hints: countHints(fmt12, start),
        solution: `${countOn(start, end, fmt12)}\n\n${len} minutes = ${h} × 60 + ${m}, which is **${hoursMinutes(len)}**.`,
      };
    }
    // difficulty 4
    const kind = rng.pick(['acrossNoon', 'twentyFour', 'endTime', 'startTime'] as const);
    if (kind === 'acrossNoon' || kind === 'twentyFour') {
      const start = kind === 'acrossNoon' ? rng.int(9 * 60, 11 * 60 + 50) : rng.int(6 * 60, 19 * 60);
      const len = rng.int(65, 230);
      const end = start + len;
      const fmt = kind === 'acrossNoon' ? fmt12 : fmt24;
      return {
        type: 'numeric',
        prompt:
          kind === 'acrossNoon'
            ? `${name}'s ${event} starts at ${fmt12(start)} and finishes at ${fmt12(end)}. How many minutes long is it?`
            : `A ferry leaves at ${fmt24(start)} and arrives at ${fmt24(end)}. How many minutes does the trip take?`,
        answer: len,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: countHints(fmt, start),
        solution: countOn(start, end, fmt),
      };
    }
    const len = rng.int(35, 150);
    const lenText = hoursMinutes(len);
    const hrs = Math.floor(len / 60);
    const mins = len % 60;
    /** "Add 20 minutes: 3:50 pm → 4:10 pm (10 minutes takes you to 4:00 pm)." */
    const minuteStep = (from: number, m: number, back: boolean) => {
      const to = back ? from - m : from + m;
      const fromM = ((from % 60) + 60) % 60;
      const crosses = back ? m > fromM : fromM + m >= 60;
      const toHour = back ? from - fromM : from + (60 - fromM);
      const note = crosses && fromM !== 0 ? ` (${back ? fromM : 60 - fromM} minutes takes you ${back ? 'back ' : ''}to ${fmt12(toHour)}, then ${back ? m - fromM : m - (60 - fromM)} more)` : '';
      return `${back ? 'Take away' : 'Add'} ${m} minutes: ${fmt12(from)} → ${fmt12(to)}${note}.`;
    };
    if (kind === 'endTime') {
      const start = rng.int(7 * 60, 19 * 60);
      const end = start + len;
      const e = parts12(end);
      const steps: string[] = [];
      if (hrs) steps.push(`Add ${hoursMinutes(hrs * 60)}: ${fmt12(start)} → ${fmt12(start + hrs * 60)}.`);
      if (mins) steps.push(minuteStep(start + hrs * 60, mins, false));
      return {
        type: 'cloze',
        prompt: `A ${event} starts at ${fmt12(start)} and lasts ${lenText}. What time does it finish?\n\n[[h]] : [[m]] [[ap]]`,
        blanks: [
          { id: 'h', accepted: [String(e.h)] },
          { id: 'm', accepted: minuteAccepted(e.m) },
          { id: 'ap', accepted: [e.ap], options: ['am', 'pm'] },
        ],
        calculator: 'not-allowed',
        hints: ['Add the whole hours first.', "Then add the minutes. If you go past the o'clock, carry on into the next hour."],
        solution: `${steps.join('\n\n')}\n\nSo it finishes at **${fmt12(end)}**.`,
      };
    }
    const end = rng.int(9 * 60, 20 * 60) + rng.pick([0, 15, 30, 45]) - (rng.int(0, 1) ? 0 : rng.int(1, 14));
    const start = end - len;
    const sp = parts12(start);
    return {
      type: 'cloze',
      prompt: `${name} has to be at a ${event} by ${fmt12(end)}. Getting there takes ${lenText}. What is the latest time ${name} can leave?\n\n[[h]] : [[m]] [[ap]]`,
      blanks: [
        { id: 'h', accepted: [String(sp.h)] },
        { id: 'm', accepted: minuteAccepted(sp.m) },
        { id: 'ap', accepted: [sp.ap], options: ['am', 'pm'] },
      ],
      calculator: 'not-allowed',
      hints: ['Work backwards from the arrival time.', 'Take away the whole hours first, then the minutes.'],
      solution: `${[
        `Count back ${lenText} from ${fmt12(end)}.`,
        ...(hrs ? [`Take away ${hoursMinutes(hrs * 60)}: ${fmt12(end)} → ${fmt12(end - hrs * 60)}.`] : []),
        ...(mins ? [minuteStep(end - hrs * 60, mins, true)] : []),
      ].join('\n\n')}\n\nThe latest time is **${fmt12(start)}**. Check: from ${fmt12(start)} to ${fmt12(end)} is ${len} minutes ✓`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Timetables
// ---------------------------------------------------------------------------------------------

const STOP_NAMES = [
  'Town Centre',
  'Library',
  'Hospital',
  'Beach Road',
  'Marae Road',
  'Sports Park',
  'High School',
  'Train Station',
  'Mall',
  'Harbour',
  'Museum',
  'Swimming Pool',
  'Airport',
  'Kauri Street',
];

export const timetable: QuestionTemplate = {
  id: 'm7.mea.units-time.timetable',
  topicId: 'm7.mea.units-time',
  title: 'Read a bus timetable to find times and durations',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const nStops = rng.int(4, 5);
    const stops = rng.sample(STOP_NAMES, nStops);
    const morning = difficulty === 3;
    const t0 = morning ? 390 + 5 * rng.int(0, 18) : 870 + 5 * rng.int(0, 24);
    const gap = rng.pick([15, 20, 25, 30]);
    const segs = Array.from({ length: nStops - 1 }, () => rng.int(3, 14));
    const slowSeg = rng.chance(0.5) ? rng.int(0, nStops - 2) : -1;
    const slowBy = rng.int(2, 5);
    const times: number[][] = [0, 1, 2].map((k) => {
      const row = [t0 + gap * k];
      segs.forEach((s, i) => row.push(row[i]! + s + (k === 2 && i === slowSeg ? slowBy : 0)));
      return row;
    });
    const fmt = morning ? fmt12Short : fmt24;
    const fmtProse = morning ? fmt12 : fmt24;
    const figure = {
      svg: timetableFigure({
        title: `Route ${rng.int(2, 9)}${rng.pick(['', '0'])} bus timetable`,
        stops,
        services: ['Bus A', 'Bus B', 'Bus C'],
        times,
        fmt,
        ...(morning && { note: 'All times are in the morning (am).' }),
      }),
      alt: `A bus timetable with ${nStops} stops (${stops.join(', ')}) and three buses. ${[0, 1, 2]
        .map((k) => `Bus ${'ABC'[k]}: ${times[k]!.map(fmt).join(', ')}`)
        .join('. ')}.`,
    };
    const name = rng.pick(NAMES);
    const at = (stop: string) => `the ${stop} stop`;
    if (difficulty === 3) {
      const k = rng.int(0, 2);
      const i = rng.int(0, nStops - 2);
      const j = rng.int(i + 1, nStops - 1);
      if (rng.chance(0.55)) {
        const answer = times[k]![j]! - times[k]![i]!;
        return {
          type: 'numeric',
          prompt: `Look at the timetable. How many minutes does the bus that leaves ${at(stops[i]!)} at ${fmtProse(times[k]![i]!)} take to get to ${at(stops[j]!)}?`,
          figure,
          answer,
          units: 'min',
          form: 'integer',
          calculator: 'not-allowed',
          hints: [
            `Find ${fmtProse(times[k]![i]!)} in the ${stops[i]} row. Stay in that bus's column.`,
            `Read down the same column to the ${stops[j]} row, then count on.`,
          ],
          solution: `That is Bus ${'ABC'[k]}. It leaves ${stops[i]} at ${fmtProse(times[k]![i]!)} and reaches ${stops[j]} at ${fmtProse(times[k]![j]!)}.\n\n${countOn(times[k]![i]!, times[k]![j]!, fmtProse)}`,
        };
      }
      const correct = fmt(times[k]![j]!);
      const pool = [
        ...[0, 1, 2].filter((x) => x !== k).map((x) => fmt(times[x]![j]!)),
        ...[j - 1, j + 1].filter((r) => r >= 0 && r < nStops).map((r) => fmt(times[k]![r]!)),
      ].filter((s, idx, arr) => s !== correct && arr.indexOf(s) === idx);
      const distractors = rng.sample(pool, Math.min(3, pool.length));
      const opts = rng.shuffle([correct, ...distractors]);
      const ids = ['a', 'b', 'c', 'd'];
      return {
        type: 'mcq',
        prompt: `Look at the timetable. ${name} catches the bus that leaves ${at(stops[i]!)} at ${fmtProse(times[k]![i]!)}. What time does ${name} arrive at ${at(stops[j]!)}?`,
        figure,
        options: opts.map((o, x) => ({ id: ids[x]!, text: `${o} am` })),
        correct: ids[opts.indexOf(correct)]!,
        calculator: 'not-allowed',
        hints: [`Find the column for the bus that leaves ${stops[i]} at ${fmtProse(times[k]![i]!)}.`, `Read down that column to the ${stops[j]} row.`],
        solution: `The bus that leaves ${stops[i]} at ${fmtProse(times[k]![i]!)} is Bus ${'ABC'[k]}. Reading down its column, it reaches ${stops[j]} at **${correct} am**.`,
      };
    }
    if (difficulty === 4) {
      const j = rng.int(1, nStops - 1);
      const i = rng.int(0, j - 1);
      if (rng.chance(0.5)) {
        const k = rng.int(0, 1);
        const deadline = times[k]![j]! + rng.int(1, gap - 1);
        const ids = ['a', 'b', 'c'];
        const feedback: Record<string, string> = {};
        [0, 1, 2].forEach((x) => {
          if (x < k) feedback[ids[x]!] = `This bus does get there in time, but it is not the latest one that does.`;
          if (x > k) feedback[ids[x]!] = `This bus reaches ${stops[j]} at ${fmt24(times[x]![j]!)}, which is after ${fmt24(deadline)}.`;
        });
        return {
          type: 'mcq',
          prompt: `Look at the timetable. ${name} needs to be at ${at(stops[j]!)} by ${fmt24(deadline)}. What is the latest bus ${name} can catch from ${at(stops[i]!)}?`,
          figure,
          options: [0, 1, 2].map((x) => ({ id: ids[x]!, text: `The ${fmt24(times[x]![i]!)} bus` })),
          correct: ids[k]!,
          feedback,
          shuffle: false,
          calculator: 'not-allowed',
          hints: [`Look along the ${stops[j]} row. Which buses get there by ${fmt24(deadline)}?`, 'Of those buses, choose the one that leaves last.'],
          solution: `In the ${stops[j]} row the arrival times are ${[0, 1, 2].map((x) => fmt24(times[x]![j]!)).join(', ')}.\n\nBus ${'ABC'[k]} arrives at ${fmt24(times[k]![j]!)}, which is before ${fmt24(deadline)}. The next bus arrives at ${fmt24(times[k + 1]![j]!)}, which is too late.\n\nSo ${name} should catch **the ${fmt24(times[k]![i]!)} bus** from ${stops[i]}.`,
        };
      }
      const k = rng.int(0, 2);
      const answer = times[k]![j]! - times[k]![i]!;
      return {
        type: 'numeric',
        prompt: `Look at the timetable. How many minutes does Bus ${'ABC'[k]} take to travel from ${at(stops[i]!)} to ${at(stops[j]!)}?`,
        figure,
        answer,
        units: 'min',
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find Bus ${'ABC'[k]}'s times at ${stops[i]} and at ${stops[j]}.`, 'Count on from the first time to the second.'],
        solution: `Bus ${'ABC'[k]} leaves ${stops[i]} at ${fmt24(times[k]![i]!)} and reaches ${stops[j]} at ${fmt24(times[k]![j]!)}.\n\n${countOn(times[k]![i]!, times[k]![j]!, fmt24)}`,
      };
    }
    // difficulty 5: arrive at the stop, wait for the next bus, then ride.
    const j = rng.int(1, nStops - 1);
    const i = rng.int(0, j - 1);
    const k = rng.int(0, 2);
    const wait = rng.int(1, Math.min(gap - 1, 14));
    const arrive = times[k]![i]! - wait;
    const ride = times[k]![j]! - times[k]![i]!;
    const answer = wait + ride;
    return {
      type: 'numeric',
      prompt: `Look at the timetable. ${name} gets to the ${stops[i]} stop at ${fmt24(arrive)} and catches the next bus to ${at(stops[j]!)}. How many minutes is it from when ${name} gets to the stop until ${name} arrives at ${stops[j]}?`,
      figure,
      answer,
      units: 'min',
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        `Which is the first bus to leave ${stops[i]} after ${fmt24(arrive)}?`,
        `Work out the waiting time and the travel time, then add them. (Or count on from ${fmt24(arrive)} to the arrival time.)`,
      ],
      solution: `The next bus from ${stops[i]} after ${fmt24(arrive)} is Bus ${'ABC'[k]} at ${fmt24(times[k]![i]!)}. ${name} waits ${wait} minutes.\n\nBus ${'ABC'[k]} reaches ${stops[j]} at ${fmt24(times[k]![j]!)}: that ride is ${ride} minutes.\n\nTotal: $${wait} + ${ride} = ${answer}$ minutes.`,
    };
  },
};

export const templates: QuestionTemplate[] = [chooseUnit, convertUnits, twentyFourHour, timeFractions, elapsedTime, timetable];
