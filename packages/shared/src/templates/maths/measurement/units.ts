import type { QuestionTemplate } from '../../types';
import { clean, NAMES, num, tex } from '../../format';

// m9.mea.units — metric conversions, prefixes, derived units (cm², km/h) and time (base 60).
// Every answer is chosen first, then the question is built from it.

interface UnitPair {
  big: string;
  small: string;
  bigName: string;
  smallName: string;
  factor: number;
}

const PAIRS: UnitPair[] = [
  { big: 'cm', small: 'mm', bigName: 'centimetres', smallName: 'millimetres', factor: 10 },
  { big: 'm', small: 'cm', bigName: 'metres', smallName: 'centimetres', factor: 100 },
  { big: 'm', small: 'mm', bigName: 'metres', smallName: 'millimetres', factor: 1000 },
  { big: 'km', small: 'm', bigName: 'kilometres', smallName: 'metres', factor: 1000 },
  { big: 'g', small: 'mg', bigName: 'grams', smallName: 'milligrams', factor: 1000 },
  { big: 'kg', small: 'g', bigName: 'kilograms', smallName: 'grams', factor: 1000 },
  { big: 't', small: 'kg', bigName: 'tonnes', smallName: 'kilograms', factor: 1000 },
  { big: 'L', small: 'mL', bigName: 'litres', smallName: 'millilitres', factor: 1000 },
];

/** Text for a factor such as 1000 in KaTeX. */
const f = (n: number) => tex(n);

export const metricConversions: QuestionTemplate = {
  id: 'm9.mea.units.metric-conversions',
  topicId: 'm9.mea.units',
  title: 'Convert between metric units',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const p = rng.pick(PAIRS);
    const toSmall = rng.chance(0.5);
    let bigVal: number;
    if (difficulty === 1) {
      bigVal = rng.int(2, 25);
    } else {
      // A decimal number of the big unit that converts to a whole (or 1 dp) number of the small unit.
      const maxDp = p.factor === 10 ? 1 : p.factor === 100 ? 2 : 3;
      const dp = rng.int(1, maxDp);
      const scale = 10 ** dp;
      let n = rng.int(1, 9 * scale);
      if (n % 10 === 0) n += 1;
      bigVal = clean(n / scale);
    }
    const smallVal = clean(bigVal * p.factor);
    const [fromVal, fromUnit, fromName, toUnit, toName, answer] = toSmall
      ? [bigVal, p.big, p.bigName, p.small, p.smallName, smallVal]
      : [smallVal, p.small, p.smallName, p.big, p.bigName, bigVal];
    return {
      type: 'numeric',
      prompt: `Convert ${num(fromVal)} ${fromUnit} to ${toName} (${toUnit}).`,
      answer,
      units: toUnit,
      calculator: 'not-allowed',
      hints: [
        `There are ${num(p.factor)} ${p.small} in 1 ${p.big}.`,
        toSmall
          ? 'You are changing to a smaller unit, so you need more of them: multiply.'
          : 'You are changing to a bigger unit, so you need fewer of them: divide.',
      ],
      solution: [
        `1 ${p.big} = ${num(p.factor)} ${p.small}.`,
        toSmall
          ? `Changing ${fromName} to ${toName} (a smaller unit), so multiply by ${num(p.factor)}:\n\n$${tex(fromVal)} \\times ${f(p.factor)} = ${tex(answer)}$`
          : `Changing ${fromName} to ${toName} (a bigger unit), so divide by ${num(p.factor)}:\n\n$${tex(fromVal)} \\div ${f(p.factor)} = ${tex(answer)}$`,
        `So ${num(fromVal)} ${fromUnit} = **${num(answer)} ${toUnit}**.`,
      ].join('\n\n'),
    };
  },
};

interface Prefix {
  name: string;
  symbol: string;
  exp: number;
  meaning: string;
  example: string;
}

const PREFIXES: Prefix[] = [
  { name: 'tera', symbol: 'T', exp: 12, meaning: 'a trillion ($10^{12}$)', example: '1 TW = $10^{12}$ W' },
  { name: 'giga', symbol: 'G', exp: 9, meaning: 'a billion ($10^{9}$)', example: '1 GW = $10^{9}$ W' },
  { name: 'mega', symbol: 'M', exp: 6, meaning: 'a million ($10^{6}$)', example: '1 MW = $10^{6}$ W' },
  { name: 'kilo', symbol: 'k', exp: 3, meaning: 'a thousand ($10^{3}$)', example: '1 km = $10^{3}$ m = 1000 m' },
  { name: 'centi', symbol: 'c', exp: -2, meaning: 'a hundredth ($10^{-2}$)', example: '1 cm = $10^{-2}$ m, so 100 cm = 1 m' },
  { name: 'milli', symbol: 'm', exp: -3, meaning: 'a thousandth ($10^{-3}$)', example: '1 mm = $10^{-3}$ m, so 1000 mm = 1 m' },
  { name: 'micro', symbol: 'μ', exp: -6, meaning: 'a millionth ($10^{-6}$)', example: '1 μm = $10^{-6}$ m, so a million μm = 1 m' },
  { name: 'nano', symbol: 'n', exp: -9, meaning: 'a billionth ($10^{-9}$)', example: '1 ns = $10^{-9}$ s, so a billion ns = 1 s' },
];

interface Base {
  symbol: string;
  name: string;
  prefixes: string[];
}

const BASES: Base[] = [
  { symbol: 'm', name: 'metres', prefixes: ['kilo', 'centi', 'milli', 'micro', 'nano'] },
  { symbol: 'g', name: 'grams', prefixes: ['kilo', 'milli', 'micro'] },
  { symbol: 'W', name: 'watts', prefixes: ['tera', 'giga', 'mega', 'kilo'] },
  { symbol: 's', name: 'seconds', prefixes: ['milli', 'micro', 'nano'] },
];

const prefixByName = (name: string) => PREFIXES.find((p) => p.name === name)!;

/** 10^n as plain text, e.g. 1 000 000 for n = 6. */
const pow10 = (n: number) => `10^{${n}}`;

export const metricPrefixes: QuestionTemplate = {
  id: 'm9.mea.units.prefixes',
  topicId: 'm9.mea.units',
  title: 'Metric prefixes (kilo to tera, centi to nano)',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 2 && rng.chance(0.35)) {
      // Which prefix means …?
      const target = rng.pick(PREFIXES);
      const others = rng.sample(PREFIXES.filter((p) => p.name !== target.name), 3);
      const askName = rng.chance(0.5);
      if (askName) {
        const opts = rng.shuffle([target, ...others]);
        return {
          type: 'mcq',
          prompt: `Which metric prefix means **${target.meaning}**?`,
          options: opts.map((p) => ({ id: p.name, text: `${p.name} (${p.symbol})` })),
          correct: target.name,
          calculator: 'not-allowed',
          hints: [
            'Big prefixes: kilo (thousand), mega (million), giga (billion), tera (trillion).',
            'Small prefixes: centi (hundredth), milli (thousandth), micro (millionth), nano (billionth).',
          ],
          solution: `**${target.name}** (${target.symbol}) means ${target.meaning}. For example, ${target.example}.`,
        };
      }
      const opts = rng.shuffle([target, ...others]);
      return {
        type: 'mcq',
        prompt: `What does the prefix **${target.name}** (${target.symbol}) mean?`,
        options: opts.map((p) => ({ id: p.name, text: `× ${p.meaning}` })),
        correct: target.name,
        calculator: 'not-allowed',
        hints: [
          'Big prefixes: kilo (thousand), mega (million), giga (billion), tera (trillion).',
          'Small prefixes: centi (hundredth), milli (thousandth), micro (millionth), nano (billionth).',
        ],
        solution: `**${target.name}** means × ${target.meaning}. For example, ${target.example}.`,
      };
    }

    const base = rng.pick(BASES);
    if (difficulty === 2) {
      // Convert between a prefixed unit and the base unit.
      const p = prefixByName(rng.pick(base.prefixes));
      const k = rng.int(2, 9);
      const unit = `${p.symbol}${base.symbol}`;
      const hasMicro = p.symbol === 'μ';
      if (p.exp > 0) {
        // k (prefix)unit → base units: multiply by 10^exp
        const answer = k * 10 ** p.exp;
        return {
          type: 'numeric',
          prompt: `Convert ${k} ${unit} to ${base.name} (${base.symbol}).${p.exp >= 6 ? ' You can write a large answer as $a \\times 10^n$.' : ''}`,
          answer,
          units: base.symbol,
          calculator: 'not-allowed',
          hints: [`**${p.name}** means ${p.meaning}.`, `So 1 ${unit} = $${pow10(p.exp)}$ ${base.symbol}.`],
          solution: [
            `1 ${unit} = $${pow10(p.exp)}$ ${base.symbol} = ${num(10 ** p.exp)} ${base.symbol}.`,
            `$${k} \\times ${tex(10 ** p.exp)} = ${tex(answer)}$ ${base.symbol}${p.exp >= 6 ? ` (or $${k} \\times ${pow10(p.exp)}$ ${base.symbol})` : ''}.`,
          ].join('\n\n'),
        };
      }
      // k base units → (prefix)units: multiply by 10^-exp
      const answer = k * 10 ** -p.exp;
      return {
        type: 'numeric',
        prompt: `How many ${p.name}${base.name} (${unit}) are there in ${k} ${base.symbol}?${-p.exp >= 6 ? ' You can write a large answer as $a \\times 10^n$.' : ''}`,
        answer,
        ...(hasMicro ? {} : { units: unit }),
        calculator: 'not-allowed',
        hints: [`**${p.name}** means ${p.meaning}.`, `So there are $${pow10(-p.exp)}$ ${unit} in 1 ${base.symbol}.`],
        solution: [
          `1 ${unit} is ${p.meaning.replace(/^a /, 'one ')} of a ${base.name.replace(/s$/, '')}, so 1 ${base.symbol} = $${pow10(-p.exp)}$ ${unit} = ${num(10 ** -p.exp)} ${unit}.`,
          `$${k} \\times ${tex(10 ** -p.exp)} = ${tex(answer)}$ ${unit}.`,
        ].join('\n\n'),
      };
    }

    // difficulty 3: convert between two prefixed units 1000 apart (e.g. GW → MW, mm → μm).
    const LADDERS: Array<{ big: string; small: string; base: Base }> = [];
    for (const b of BASES) {
      const exps = [...b.prefixes.map((n) => prefixByName(n).exp), 0];
      for (const n1 of [...b.prefixes, '']) {
        for (const n2 of [...b.prefixes, '']) {
          const e1 = n1 ? prefixByName(n1).exp : 0;
          const e2 = n2 ? prefixByName(n2).exp : 0;
          if (e1 - e2 === 3 && exps.includes(e1) && exps.includes(e2)) LADDERS.push({ big: n1, small: n2, base: b });
        }
      }
    }
    const pick = rng.pick(LADDERS);
    const bigP = pick.big ? prefixByName(pick.big) : undefined;
    const smallP = pick.small ? prefixByName(pick.small) : undefined;
    const bigUnit = `${bigP?.symbol ?? ''}${pick.base.symbol}`;
    const smallUnit = `${smallP?.symbol ?? ''}${pick.base.symbol}`;
    const bigName = `${bigP?.name ?? ''}${pick.base.name}`;
    const smallName = `${smallP?.name ?? ''}${pick.base.name}`;
    const dp = rng.int(1, 2);
    let n = rng.int(1, 30 * 10 ** dp);
    if (n % 10 === 0) n += 3;
    const bigVal = clean(n / 10 ** dp);
    const smallVal = clean(bigVal * 1000);
    const toSmall = rng.chance(0.5);
    const [fromVal, fromUnit, toUnit, toName, answer] = toSmall
      ? [bigVal, bigUnit, smallUnit, smallName, smallVal]
      : [smallVal, smallUnit, bigUnit, bigName, bigVal];
    const micro = toUnit.includes('μ');
    return {
      type: 'numeric',
      prompt: `Convert ${num(fromVal)} ${fromUnit} to ${toName} (${toUnit}).`,
      answer,
      ...(micro ? {} : { units: toUnit }),
      calculator: 'not-allowed',
      hints: [
        `Work out how many ${smallUnit} make 1 ${bigUnit}.`,
        `1 ${bigUnit} = ${num(1000)} ${smallUnit}. Decide whether to multiply or divide.`,
      ],
      solution: [
        `1 ${bigUnit} = ${num(1000)} ${smallUnit} (the prefixes are a factor of $10^3$ apart).`,
        toSmall
          ? `Changing to the smaller unit, so multiply: $${tex(fromVal)} \\times 1000 = ${tex(answer)}$ ${toUnit}.`
          : `Changing to the bigger unit, so divide: $${tex(fromVal)} \\div 1000 = ${tex(answer)}$ ${toUnit}.`,
      ].join('\n\n'),
    };
  },
};

export const derivedUnits: QuestionTemplate = {
  id: 'm9.mea.units.derived',
  topicId: 'm9.mea.units',
  title: 'Derived units: area units and km/h ↔ m/s',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const doArea = difficulty === 3 || (difficulty === 5 && rng.chance(0.5));
    if (doArea) {
      const AREA = [
        { big: 'm²', small: 'cm²', bigL: 'm', smallL: 'cm', lf: 100, bigName: 'square metres', smallName: 'square centimetres' },
        { big: 'cm²', small: 'mm²', bigL: 'cm', smallL: 'mm', lf: 10, bigName: 'square centimetres', smallName: 'square millimetres' },
        ...(difficulty === 5
          ? [{ big: 'km²', small: 'm²', bigL: 'km', smallL: 'm', lf: 1000, bigName: 'square kilometres', smallName: 'square metres' }]
          : []),
      ];
      const a = rng.pick(AREA);
      const af = a.lf * a.lf;
      let bigVal: number;
      if (difficulty === 3) bigVal = rng.int(2, 12);
      else {
        const dp = af >= 10000 ? rng.int(1, 2) : 1;
        let n = rng.int(1, 9 * 10 ** dp);
        if (n % 10 === 0) n += 1;
        bigVal = clean(n / 10 ** dp);
      }
      const smallVal = clean(bigVal * af);
      const toSmall = rng.chance(0.5);
      const [fromVal, fromUnit, toUnit, toName, answer] = toSmall
        ? [bigVal, a.big, a.small, a.smallName, smallVal]
        : [smallVal, a.small, a.big, a.bigName, bigVal];
      return {
        type: 'numeric',
        prompt: `Convert ${num(fromVal)} ${fromUnit} to ${toName} (${toUnit}).`,
        answer,
        units: toUnit,
        calculator: 'allowed',
        hints: [
          `1 ${a.bigL} = ${num(a.lf)} ${a.smallL}. A square 1 ${a.bigL} by 1 ${a.bigL} is ${num(a.lf)} ${a.smallL} by ${num(a.lf)} ${a.smallL}.`,
          `So 1 ${a.big} = ${num(a.lf)} × ${num(a.lf)} = ${num(af)} ${a.small}, not ${num(a.lf)}.`,
        ],
        solution: [
          `1 ${a.big} = $${tex(a.lf)} \\times ${tex(a.lf)} = ${tex(af)}$ ${a.small}.`,
          toSmall
            ? `Changing to the smaller unit, so multiply: $${tex(fromVal)} \\times ${tex(af)} = ${tex(answer)}$ ${toUnit}.`
            : `Changing to the bigger unit, so divide: $${tex(fromVal)} \\div ${tex(af)} = ${tex(answer)}$ ${toUnit}.`,
        ].join('\n\n'),
      };
    }

    // Speed units: 1 m/s = 3.6 km/h. Each context has a realistic range of speeds (in m/s).
    const [context, lo, hi] = rng.pick([
      ['A cyclist is riding at', 4, 12],
      ['A car is travelling at', 10, 30],
      ['A train is moving at', 10, 35],
      ['A ferry is cruising at', 5, 15],
      ['A runner is sprinting at', 4, 9],
    ] as const);
    let ms: number;
    if (difficulty === 4) {
      ms = rng.int(lo, hi);
      if (ms % 5 !== 0 && rng.chance(0.6)) ms = Math.max(5, Math.round(ms / 5) * 5);
    } else ms = rng.chance(0.5) ? clean(rng.int(lo, hi - 1) + 0.5) : rng.int(lo, hi);
    const kmh = clean(ms * 3.6);
    const toKmh = rng.chance(0.5);
    const [fromVal, fromUnit, toUnit, answer] = toKmh ? [ms, 'm/s', 'km/h', kmh] : [kmh, 'km/h', 'm/s', ms];
    return {
      type: 'numeric',
      prompt: `${context} ${num(fromVal)} ${fromUnit}. What is this speed in ${toUnit}?`,
      answer,
      units: toUnit,
      calculator: 'allowed',
      hints: [
        '1 km/h means 1000 m in 3600 seconds.',
        toKmh
          ? 'To change m/s to km/h, multiply by 3600 (seconds in an hour), then divide by 1000 (metres in a km). That is the same as × 3.6.'
          : 'To change km/h to m/s, multiply by 1000 (metres in a km), then divide by 3600 (seconds in an hour). That is the same as ÷ 3.6.',
      ],
      solution: toKmh
        ? [
            `In one hour (3600 s) it goes $${tex(ms)} \\times 3600 = ${tex(clean(ms * 3600))}$ m, which is $${tex(clean(ms * 3.6))}$ km.`,
            `So ${num(ms)} m/s = $${tex(ms)} \\times 3.6 = ${tex(kmh)}$ km/h.`,
          ].join('\n\n')
        : [
            `${num(kmh)} km/h means ${num(clean(kmh * 1000))} m in 3600 s.`,
            `$${tex(clean(kmh * 1000))} \\div 3600 = ${tex(ms)}$ m/s (the same as $${tex(kmh)} \\div 3.6$).`,
          ].join('\n\n'),
    };
  },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 12-hour clock time from minutes after midnight, e.g. 1005 → "4:45 pm". */
function clock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad2(m)} ${suffix}`;
}

export const timeCalculations: QuestionTemplate = {
  id: 'm9.mea.units.time',
  topicId: 'm9.mea.units',
  title: 'Time: base-60 conversions, durations and decimal seconds',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 2) {
      const kind = rng.pick(['hm', 'ms', 'dec'] as const);
      if (kind === 'hm') {
        const h = rng.int(1, 5);
        const m = rng.int(5, 55);
        const answer = h * 60 + m;
        return {
          type: 'numeric',
          prompt: `How many minutes are there in ${h} h ${m} min?`,
          answer,
          units: 'min',
          calculator: 'not-allowed',
          hints: ['There are 60 minutes in an hour, not 100.'],
          solution: `$${h} \\times 60 = ${h * 60}$ minutes, plus ${m} minutes: $${h * 60} + ${m} = ${answer}$ minutes.`,
        };
      }
      if (kind === 'ms') {
        const m = rng.int(2, 9);
        const s = rng.int(5, 55);
        const answer = m * 60 + s;
        return {
          type: 'numeric',
          prompt: `How many seconds are there in ${m} min ${s} s?`,
          answer,
          units: 's',
          calculator: 'not-allowed',
          hints: ['There are 60 seconds in a minute.'],
          solution: `$${m} \\times 60 = ${m * 60}$ seconds, plus ${s} seconds: $${m * 60} + ${s} = ${answer}$ seconds.`,
        };
      }
      const h = rng.int(1, 6);
      const part = rng.pick([0.25, 0.5, 0.75]);
      const hours = h + part;
      const answer = hours * 60;
      return {
        type: 'numeric',
        prompt: `How many minutes are there in ${num(hours)} hours?`,
        answer,
        units: 'min',
        calculator: 'not-allowed',
        hints: ['Multiply the number of hours by 60.', `${num(part)} of an hour is ${num(part * 60)} minutes.`],
        solution: `$${tex(hours)} \\times 60 = ${answer}$ minutes. (${h} hours is ${h * 60} min, and ${num(part)} h is ${num(part * 60)} min.)`,
      };
    }

    if (difficulty === 3) {
      const kind = rng.pick(['toDecimal', 'fromDecimal'] as const);
      const h = rng.int(1, 4);
      const m = 6 * rng.int(1, 9); // multiples of 6 min = tenths of an hour
      const decimal = clean(h + m / 60);
      if (kind === 'toDecimal') {
        return {
          type: 'numeric',
          prompt: `A road trip takes ${h} h ${m} min. Write this time in hours as a decimal.`,
          answer: decimal,
          units: 'h',
          calculator: 'allowed',
          hints: ['Change the minutes into a fraction of an hour by dividing by 60.'],
          solution: `${m} min = $${m} \\div 60 = ${tex(clean(m / 60))}$ h.\n\nSo ${h} h ${m} min = **${num(decimal)} h**. (Not ${h}.${pad2(m)} h: there are 60 minutes in an hour, not 100.)`,
        };
      }
      const answer = h * 60 + m;
      return {
        type: 'numeric',
        prompt: `A sign at the start of a walking track says the walk takes ${num(decimal)} hours. How many minutes is this?`,
        answer,
        units: 'min',
        calculator: 'allowed',
        hints: ['Multiply the hours by 60.', `The decimal part, ${num(clean(m / 60))} h, is ${num(clean(m / 60))} × 60 minutes.`],
        solution: `$${tex(decimal)} \\times 60 = ${answer}$ minutes. (That is ${h} h ${m} min, because $${tex(clean(m / 60))} \\times 60 = ${m}$.)`,
      };
    }

    // difficulty 4: durations across hours, or decimal seconds in race times.
    if (rng.chance(0.5)) {
      const start = rng.int(6 * 60, 20 * 60);
      const dur = rng.int(45, 200);
      const end = start + dur;
      const event = rng.pick([
        'A school trip bus leaves at',
        'A movie starts at',
        'Netball practice starts at',
        'A ferry leaves at',
        'A kapa haka rehearsal starts at',
        'A cricket match starts at',
      ]);
      const finishWord = event.includes('leaves') ? 'arrives' : 'finishes';
      const toNextHour = 60 - (start % 60);
      const fullHours = Math.floor((end - (start + toNextHour)) / 60);
      const rest = end - (start + toNextHour) - fullHours * 60;
      return {
        type: 'numeric',
        prompt: `${event} ${clock(start)} and ${finishWord} at ${clock(end)}. How long is this, in minutes?`,
        answer: dur,
        units: 'min',
        calculator: 'not-allowed',
        hints: [
          'Count up to the next full hour first.',
          'Then count whole hours, then the minutes left over. Remember an hour is 60 minutes.',
        ],
        solution:
          end - start >= toNextHour
            ? [
                `From ${clock(start)} to ${clock(start + toNextHour)} is ${toNextHour} min.`,
                fullHours > 0 ? `Then ${fullHours} full hour${fullHours > 1 ? 's' : ''} to ${clock(start + toNextHour + fullHours * 60)}: ${fullHours * 60} min.` : '',
                `Then ${rest} min to ${clock(end)}.`,
                `Total: $${[toNextHour, fullHours * 60, rest].filter((x) => x > 0).join(' + ')} = ${dur}$ minutes.`,
              ]
                .filter(Boolean)
                .join('\n\n')
            : `From ${clock(start)} to ${clock(end)} is ${dur} minutes.`,
      };
    }
    const name1 = rng.pick(NAMES);
    const name2 = rng.pick(NAMES.filter((n) => n !== name1));
    const event = rng.pick(['100 m swim', '400 m run', '50 m freestyle race', 'cross-country lap']);
    // Slower time in "m:ss.hh" form (over a minute), faster time in seconds only.
    const slowSecs = clean(rng.int(61, 89) + rng.int(1, 99) / 100);
    const diff = clean(rng.int(1, 6) + rng.int(1, 99) / 100);
    const fastSecs = clean(slowSecs - diff);
    const m = Math.floor(slowSecs / 60);
    const s = clean(slowSecs - m * 60);
    const sText = s.toFixed(2).padStart(5, '0');
    return {
      type: 'numeric',
      prompt: `In a ${event}, ${name1}'s time is 1:${sText} (min:s). ${name2}'s time is ${num(fastSecs, 2)} seconds. How much faster was ${name2}, in seconds?`,
      answer: diff,
      units: 's',
      calculator: 'allowed',
      hints: ['Write both times in seconds first. 1 minute is 60 seconds.', `${name1}'s time is $60 + ${tex(s)}$ seconds.`],
      solution: [
        `${name1}: 1:${sText} = $60 + ${tex(s)} = ${tex(slowSecs)}$ s.`,
        `Difference: $${tex(slowSecs)} - ${tex(fastSecs)} = ${tex(diff)}$ s.`,
        `${name2} was **${num(diff, 2)} seconds** faster.`,
        `Watch out: 1:${sText} means 1 minute and ${num(s, 2)} seconds, which is ${num(slowSecs, 2)} s, not ${'1' + sText} s.`,
      ].join('\n\n'),
    };
  },
};
