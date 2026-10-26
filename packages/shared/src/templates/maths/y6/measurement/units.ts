import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { clean, NAMES, num, tex } from '../../../format';
import { ACCENT, INK, label, line, svgDoc } from '../../../svg';

// m6.mea.units — metric prefixes, converting m↔cm, kg↔g, L↔mL (and mm, km), mixed units,
// reading scales and estimating with benchmarks. Year 6: no calculator, answers to at most 2 dp.

interface Pair {
  big: string;
  small: string;
  bigName: string;
  smallName: string;
  factor: number;
}

const CM_MM: Pair = { big: 'cm', small: 'mm', bigName: 'centimetres', smallName: 'millimetres', factor: 10 };
const M_CM: Pair = { big: 'm', small: 'cm', bigName: 'metres', smallName: 'centimetres', factor: 100 };
const M_MM: Pair = { big: 'm', small: 'mm', bigName: 'metres', smallName: 'millimetres', factor: 1000 };
const KM_M: Pair = { big: 'km', small: 'm', bigName: 'kilometres', smallName: 'metres', factor: 1000 };
const KG_G: Pair = { big: 'kg', small: 'g', bigName: 'kilograms', smallName: 'grams', factor: 1000 };
const L_ML: Pair = { big: 'L', small: 'mL', bigName: 'litres', smallName: 'millilitres', factor: 1000 };

/** The curriculum names m↔cm, kg↔g and L↔mL, so those come up most often. */
const COMMON: Pair[] = [M_CM, M_CM, KG_G, KG_G, L_ML, L_ML, CM_MM, KM_M];

const placesWord = (factor: number) => (factor === 10 ? 'one place' : factor === 100 ? 'two places' : 'three places');

function factorFact(p: Pair): string {
  return `1 ${p.big} = ${num(p.factor)} ${p.small}`;
}

// ---------------------------------------------------------------- 1. simple conversions

export const convert: QuestionTemplate = {
  id: 'm6.mea.units.convert',
  topicId: 'm6.mea.units',
  title: 'Convert between metric units',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const p = difficulty === 1 ? rng.pick(COMMON) : rng.pick([...COMMON, M_MM]);
    const toSmall = rng.chance(0.55);
    let bigVal: number;
    if (difficulty === 1) {
      bigVal = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25]);
    } else if (p.factor === 10) {
      let n = rng.int(1, 99);
      if (n % 10 === 0) n += 3;
      bigVal = clean(n / 10);
    } else {
      // Two decimal places at most, as in the curriculum (10 kg and 500 g = 10.5 kg).
      let n = rng.int(5, 999);
      if (n % 100 === 0) n += 25;
      bigVal = clean(n / 100);
    }
    const smallVal = clean(bigVal * p.factor);
    const [fromVal, fromUnit, toUnit, toName, answer] = toSmall
      ? [bigVal, p.big, p.small, p.smallName, smallVal]
      : [smallVal, p.small, p.big, p.bigName, bigVal];
    const op = toSmall ? '\\times' : '\\div';
    return {
      type: 'numeric',
      prompt: `Convert ${num(fromVal)} ${fromUnit} to ${toName} (${toUnit}).`,
      answer,
      units: toUnit,
      calculator: 'not-allowed',
      hints: [
        `How many ${p.small} are in 1 ${p.big}?`,
        toSmall
          ? 'You are changing to a smaller unit, so you will need more of them. Multiply.'
          : 'You are changing to a bigger unit, so you will need fewer of them. Divide.',
      ],
      solution: [
        `${factorFact(p)}.`,
        toSmall
          ? `${p.small} are smaller than ${p.big}, so you need more of them. Multiply by ${num(p.factor)}: each digit moves ${placesWord(p.factor)} to the left.`
          : `${p.big} are bigger than ${p.small}, so you need fewer of them. Divide by ${num(p.factor)}: each digit moves ${placesWord(p.factor)} to the right.`,
        `$${tex(fromVal)} ${op} ${tex(p.factor)} = ${tex(answer)}$`,
        `So ${num(fromVal)} ${fromUnit} = **${num(answer)} ${toUnit}**.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 2. mixed units

/** Small-unit part for "W big and P small", chosen to suit the difficulty. */
function smallPart(rng: Rng, p: Pair, difficulty: number, forDecimal: boolean): number {
  if (p.factor === 10) return rng.int(1, 9);
  if (p.factor === 100) {
    if (difficulty === 2) return forDecimal ? rng.int(1, 9) * 10 : rng.int(11, 99);
    return rng.chance(0.5) ? rng.int(1, 9) : rng.int(11, 99);
  }
  // factor 1000: keep the decimal to 2 places at most.
  if (difficulty === 2) return forDecimal ? rng.int(1, 9) * 100 : rng.int(1, 19) * 50;
  return rng.chance(0.5) ? rng.int(1, 9) * 10 : rng.int(11, 99) * 10;
}

export const mixedUnits: QuestionTemplate = {
  id: 'm6.mea.units.mixed-units',
  topicId: 'm6.mea.units',
  title: 'Mixed units (3 m 45 cm, 10 kg and 500 g)',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const kind =
      difficulty === 2 ? rng.pick(['toSmall', 'toBig'] as const) : rng.pick(['toSmall', 'toBig', 'toBig', 'split', 'split'] as const);
    const p = difficulty === 2 ? rng.pick([M_CM, KG_G, L_ML, KM_M, CM_MM]) : rng.pick([M_CM, KG_G, L_ML, KM_M]);
    const whole = rng.int(1, 12);
    const part = smallPart(rng, p, difficulty, kind !== 'toSmall');
    const totalSmall = whole * p.factor + part;
    const asBig = clean(totalSmall / p.factor);
    const zeroNote =
      asBig.toString().split('.')[1]?.startsWith('0') === true
        ? `\n\nWatch the zero: ${num(part)} ${p.small} is less than one tenth of 1 ${p.big}, so the tenths digit is 0.`
        : '';

    if (kind === 'toSmall') {
      return {
        type: 'numeric',
        prompt: `Write ${whole} ${p.big} ${num(part)} ${p.small} in ${p.smallName} (${p.small}).`,
        answer: totalSmall,
        units: p.small,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Change the ${p.bigName} into ${p.smallName} first.`, `Then add on the ${num(part)} ${p.small}.`],
        solution: [
          `${factorFact(p)}, so ${whole} ${p.big} = $${whole} \\times ${tex(p.factor)} = ${tex(whole * p.factor)}$ ${p.small}.`,
          `Add the extra ${p.smallName}: $${tex(whole * p.factor)} + ${tex(part)} = ${tex(totalSmall)}$.`,
          `So ${whole} ${p.big} ${num(part)} ${p.small} = **${num(totalSmall)} ${p.small}**.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'toBig') {
      const joiner = rng.pick([' and ', ' ']);
      return {
        type: 'numeric',
        prompt: `Write ${whole} ${p.big}${joiner}${num(part)} ${p.small} in ${p.bigName} (${p.big}).`,
        answer: asBig,
        units: p.big,
        calculator: 'not-allowed',
        hints: [
          `How many ${p.small} make 1 ${p.big}? What fraction of a ${p.big} is ${num(part)} ${p.small}?`,
          `Change ${num(part)} ${p.small} into ${p.bigName} by dividing by ${num(p.factor)}, then add the whole ${p.bigName}.`,
        ],
        solution: [
          `${factorFact(p)}, so ${num(part)} ${p.small} = $${tex(part)} \\div ${tex(p.factor)} = ${tex(clean(part / p.factor))}$ ${p.big}.`,
          `Add the whole ${p.bigName}: $${whole} + ${tex(clean(part / p.factor))} = ${tex(asBig)}$.`,
          `So the answer is **${num(asBig)} ${p.big}**.${zeroNote}`,
        ].join('\n\n'),
      };
    }
    // split: 4.35 m = [[a]] m [[b]] cm
    const blankA = [String(whole), `${whole} ${p.big}`, `${whole}${p.big}`];
    const blankB = [String(part), `${part} ${p.small}`, `${part}${p.small}`];
    return {
      type: 'cloze',
      prompt: `Fill in the gaps: ${num(asBig)} ${p.big} = [[a]] ${p.big} and [[b]] ${p.small}`,
      blanks: [
        { id: 'a', accepted: blankA },
        { id: 'b', accepted: blankB },
      ],
      calculator: 'not-allowed',
      hints: [
        `The whole number part tells you the whole ${p.bigName}.`,
        `Change the decimal part into ${p.smallName} by multiplying it by ${num(p.factor)}.`,
      ],
      solution: [
        `The whole number part is ${whole}, so there are ${whole} whole ${p.bigName}.`,
        `The decimal part is ${num(clean(part / p.factor))} ${p.big}. ${factorFact(p)}, so $${tex(clean(part / p.factor))} \\times ${tex(p.factor)} = ${tex(part)}$ ${p.small}.`,
        `So ${num(asBig)} ${p.big} = **${whole} ${p.big} and ${num(part)} ${p.small}**.${zeroNote}`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 3. reading scales

type Instrument = 'ruler' | 'jug' | 'thermometer' | 'scales';

export interface Scale {
  instrument: Instrument;
  /** All in whole "base" units (mm, mL, °C, g). */
  min: number;
  max: number;
  major: number;
  minor: number;
  /** The reading in base units. */
  value: number;
  /** For a ruler: where the object starts (base units). */
  start?: number;
  /** Text for a labelled major mark. */
  labelFor: (v: number) => string;
}

const minus = (s: string) => s.replace('-', '−');

function rulerSvg(s: Scale): string {
  const x0 = 30;
  const x1 = 380;
  const px = (v: number) => x0 + ((v - s.min) / (s.max - s.min)) * (x1 - x0);
  const top = 70;
  let body = `<rect x="${x0 - 14}" y="${top}" width="${x1 - x0 + 28}" height="46" rx="3" fill="#fef3c7" stroke="${INK}" stroke-width="1.5"/>`;
  const steps = Math.round((s.max - s.min) / s.minor);
  for (let i = 0; i <= steps; i++) {
    const v = s.min + i * s.minor;
    const len = v % s.major === 0 ? 16 : v % (s.major / 2) === 0 ? 11 : 6;
    body += line({ x: px(v), y: top }, { x: px(v), y: top + len }, { width: 1 });
    if (v % s.major === 0) body += label({ x: px(v), y: top + 28 }, s.labelFor(v), { size: 12 });
  }
  body += label({ x: x1 + 4, y: top + 40 }, 'cm', { size: 11, fill: '#4b5563' });
  const a = px(s.start ?? 0);
  const b = px(s.value);
  // The object being measured: a crayon with a pointed end.
  body += `<rect x="${a}" y="30" width="${Math.max(0, b - a - 12)}" height="22" fill="#fb923c" stroke="${INK}" stroke-width="1.5"/>`;
  body += `<polygon points="${b - 12},30 ${b},41 ${b - 12},52" fill="#fdba74" stroke="${INK}" stroke-width="1.5"/>`;
  body += line({ x: a, y: 52 }, { x: a, y: top }, { stroke: ACCENT, width: 1.2, dash: true });
  body += line({ x: b, y: 41 }, { x: b, y: top }, { stroke: ACCENT, width: 1.2, dash: true });
  return svgDoc(410, 130, body);
}

function jugSvg(s: Scale): string {
  const yTop = 40;
  const yBot = 280;
  const py = (v: number) => yBot - ((v - s.min) / (s.max - s.min)) * (yBot - yTop);
  const xl = 150;
  const xr = 250;
  let body = `<rect x="${xl}" y="${py(s.value)}" width="${xr - xl}" height="${yBot - py(s.value)}" fill="#bfdbfe"/>`;
  body += line({ x: xl, y: py(s.value) }, { x: xr, y: py(s.value) }, { stroke: ACCENT, width: 2 });
  body += `<path d="M ${xl} ${yTop - 18} L ${xl} ${yBot} L ${xr} ${yBot} L ${xr} ${yTop - 18}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
  body += `<path d="M ${xr} ${yTop + 10} C ${xr + 45} ${yTop + 10}, ${xr + 45} ${yTop + 110}, ${xr} ${yTop + 110}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
  const steps = Math.round((s.max - s.min) / s.minor);
  for (let i = 0; i <= steps; i++) {
    const v = s.min + i * s.minor;
    const isMajor = v % s.major === 0;
    body += line({ x: xl, y: py(v) }, { x: xl + (isMajor ? 18 : 10), y: py(v) }, { width: isMajor ? 1.8 : 1.2 });
    if (isMajor) body += label({ x: xl - 8, y: py(v) }, s.labelFor(v), { size: 12, anchor: 'end' });
  }
  return svgDoc(320, 300, body);
}

function thermometerSvg(s: Scale): string {
  const yTop = 30;
  const yBot = 250;
  const py = (v: number) => yBot - ((v - s.min) / (s.max - s.min)) * (yBot - yTop);
  const xc = 130;
  let body = `<rect x="${xc - 9}" y="${yTop - 14}" width="18" height="${yBot - yTop + 30}" rx="9" fill="#ffffff" stroke="${INK}" stroke-width="2"/>`;
  body += `<circle cx="${xc}" cy="${yBot + 30}" r="17" fill="#ef4444" stroke="${INK}" stroke-width="2"/>`;
  body += `<rect x="${xc - 4.5}" y="${py(s.value)}" width="9" height="${yBot + 16 - py(s.value)}" fill="#ef4444"/>`;
  const steps = Math.round((s.max - s.min) / s.minor);
  for (let i = 0; i <= steps; i++) {
    const v = s.min + i * s.minor;
    const isMajor = v % s.major === 0;
    body += line({ x: xc + 10, y: py(v) }, { x: xc + 10 + (isMajor ? 16 : 9), y: py(v) }, { width: isMajor ? 1.8 : 1.1 });
    if (isMajor) body += label({ x: xc + 34, y: py(v) }, s.labelFor(v), { size: 12, anchor: 'start' });
  }
  body += label({ x: xc + 50, y: 12 }, '°C', { size: 13, bold: true });
  return svgDoc(260, 300, body);
}

function scalesSvg(s: Scale): string {
  const x0 = 35;
  const x1 = 385;
  const px = (v: number) => x0 + ((v - s.min) / (s.max - s.min)) * (x1 - x0);
  const top = 50;
  let body = `<rect x="${x0 - 20}" y="${top - 8}" width="${x1 - x0 + 40}" height="64" rx="8" fill="#f3f4f6" stroke="${INK}" stroke-width="2"/>`;
  const steps = Math.round((s.max - s.min) / s.minor);
  for (let i = 0; i <= steps; i++) {
    const v = s.min + i * s.minor;
    const isMajor = v % s.major === 0;
    body += line({ x: px(v), y: top }, { x: px(v), y: top + (isMajor ? 18 : 10) }, { width: isMajor ? 1.8 : 1.1 });
    if (isMajor) body += label({ x: px(v), y: top + 32 }, s.labelFor(v), { size: 12 });
  }
  const p = px(s.value);
  body += `<polygon points="${p - 8},14 ${p + 8},14 ${p},${top - 2}" fill="#ef4444" stroke="${INK}" stroke-width="1.2"/>`;
  body += line({ x: p, y: top - 2 }, { x: p, y: top + 22 }, { stroke: '#ef4444', width: 2 });
  return svgDoc(420, 130, body);
}

export function scaleSvg(s: Scale): string {
  switch (s.instrument) {
    case 'ruler':
      return rulerSvg(s);
    case 'jug':
      return jugSvg(s);
    case 'thermometer':
      return thermometerSvg(s);
    case 'scales':
      return scalesSvg(s);
  }
}

/** A multiple of `step` strictly between lo and hi that is not a multiple of `avoid` (if given). */
function pickMark(rng: Rng, lo: number, hi: number, step: number, avoid?: number): number {
  const options: number[] = [];
  for (let v = Math.ceil((lo + 1) / step) * step; v < hi; v += step) {
    if (avoid === undefined || v % avoid !== 0) options.push(v);
  }
  return rng.pick(options);
}

export const readScale: QuestionTemplate = {
  id: 'm6.mea.units.read-scale',
  topicId: 'm6.mea.units',
  title: 'Read a ruler, jug, thermometer or scales',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const instrument = rng.pick(['ruler', 'jug', 'thermometer', 'scales'] as const);
    let s: Scale;
    /** Converts the base-unit reading to the answer unit. */
    let answerDivisor = 1;
    let unit: string;
    let unitName: string;
    let prompt: string;
    const ml = (v: number) => (v === 0 ? '0' : `${num(v)} mL`);
    const litres = (v: number) => (v === 0 ? '0' : `${num(v / 1000)} L`);
    const grams = (v: number) => (v === 0 ? '0' : `${num(v)} g`);
    const kilos = (v: number) => (v === 0 ? '0' : `${num(v / 1000)} kg`);
    const plain = (v: number) => minus(num(v));
    const cmLabel = (v: number) => num(v / 10);

    if (instrument === 'ruler') {
      // Base unit: mm. Labels every cm.
      if (difficulty === 1) {
        s = { instrument, min: 0, max: 100, major: 10, minor: 1, value: rng.int(2, 9) * 10, start: 0, labelFor: cmLabel };
      } else if (difficulty === 2) {
        s = { instrument, min: 0, max: 100, major: 10, minor: 1, value: pickMark(rng, 15, 97, 1, 10), start: 0, labelFor: cmLabel };
      } else {
        const start = rng.int(1, 3) * 10;
        s = { instrument, min: 0, max: 100, major: 10, minor: 1, value: pickMark(rng, start + 25, 97, 1, 10), start, labelFor: cmLabel };
      }
      answerDivisor = 10;
      unit = 'cm';
      unitName = 'centimetres';
      prompt =
        difficulty === 3
          ? `How long is the crayon? Give your answer in centimetres. (Look carefully at where it starts.)`
          : `How long is the crayon? Give your answer in centimetres.`;
    } else if (instrument === 'jug') {
      if (difficulty === 1) {
        const max = rng.pick([500, 1000]);
        s = { instrument, min: 0, max, major: 100, minor: 50, value: pickMark(rng, 0, max, 50, 100), labelFor: ml };
      } else if (difficulty === 2) {
        const big = rng.chance(0.5);
        s = big
          ? { instrument, min: 0, max: 1000, major: 200, minor: 50, value: pickMark(rng, 0, 1000, 50, 200), labelFor: ml }
          : { instrument, min: 0, max: 500, major: 100, minor: 20, value: pickMark(rng, 0, 500, 20, 100), labelFor: ml };
      } else {
        const max = rng.pick([2000, 3000]);
        s = { instrument, min: 0, max, major: 1000, minor: 250, value: pickMark(rng, 0, max, 250, 1000), labelFor: litres };
      }
      const inLitres = difficulty === 3 && rng.chance(0.5);
      answerDivisor = inLitres ? 1000 : 1;
      unit = inLitres ? 'L' : 'mL';
      unitName = inLitres ? 'litres' : 'millilitres';
      prompt = `How much water is in the jug? Give your answer in ${unitName} (${unit}).`;
    } else if (instrument === 'thermometer') {
      if (difficulty === 1) {
        s = { instrument, min: 0, max: 50, major: 10, minor: 5, value: pickMark(rng, 0, 50, 5, 10), labelFor: plain };
      } else if (difficulty === 2) {
        s = rng.chance(0.5)
          ? { instrument, min: 0, max: 50, major: 10, minor: 2, value: pickMark(rng, 0, 50, 2, 10), labelFor: plain }
          : { instrument, min: 10, max: 40, major: 10, minor: 1, value: pickMark(rng, 10, 40, 1, 10), labelFor: plain };
      } else {
        s = { instrument, min: -10, max: 30, major: 10, minor: 2, value: pickMark(rng, -10, 30, 2, 10), labelFor: plain };
      }
      unit = '°C';
      unitName = 'degrees Celsius';
      prompt = 'What temperature does the thermometer show?';
    } else {
      if (difficulty === 1) {
        s = { instrument, min: 0, max: 1000, major: 100, minor: 50, value: pickMark(rng, 0, 1000, 50, 100), labelFor: grams };
      } else if (difficulty === 2) {
        s = { instrument, min: 0, max: 2000, major: 500, minor: 100, value: pickMark(rng, 0, 2000, 100, 500), labelFor: grams };
      } else {
        const minor = rng.pick([200, 250]);
        s = { instrument, min: 0, max: 4000, major: 1000, minor, value: pickMark(rng, 0, 4000, minor, 1000), labelFor: kilos };
      }
      const inKg = difficulty === 3 && rng.chance(0.5);
      answerDivisor = inKg ? 1000 : 1;
      unit = inKg ? 'kg' : 'g';
      unitName = inKg ? 'kilograms' : 'grams';
      prompt = `What mass do the kitchen scales show? Give your answer in ${unitName} (${unit}).`;
    }

    const length = s.value - (s.start ?? 0);
    const answer = clean(length / answerDivisor);
    const parts = Math.round(s.major / s.minor);
    const baseUnit = instrument === 'ruler' ? 'mm' : instrument === 'jug' ? 'mL' : instrument === 'thermometer' ? '°C' : 'g';
    const stepText =
      instrument === 'ruler'
        ? 'Each small mark on a ruler is 1 mm, and 10 mm make 1 cm.'
        : `From one labelled number to the next is ${num(s.major)} ${baseUnit}, split into ${parts} equal spaces. So each small mark is $${tex(s.major)} \\div ${parts} = ${tex(s.minor)}$ ${baseUnit}.`;

    let readingLine: string;
    if (instrument === 'thermometer' && s.value < 0) {
      const marks = -s.value / s.minor;
      readingLine = `The top of the red line is ${marks} small mark${marks === 1 ? '' : 's'} **below** 0. That is $${marks} \\times ${s.minor} = ${marks * s.minor}$ degrees below zero, so the temperature is **${minus(num(s.value))} °C**.`;
    } else {
      const below = Math.floor((s.value - s.min) / s.major) * s.major + s.min;
      const marks = Math.round((s.value - below) / s.minor);
      readingLine =
        instrument === 'ruler'
          ? `The end of the crayon is ${marks} mm past the ${num(below / 10)} cm mark, so it is at ${num(clean(s.value / 10))} cm.`
          : `The ${instrument === 'scales' ? 'pointer' : instrument === 'jug' ? 'water level' : 'top of the red line'} is ${marks} small mark${marks === 1 ? '' : 's'} above ${s.labelFor(below)}${s.labelFor(below) !== num(below) && s.labelFor(below) !== `${num(below)} ${baseUnit}` && below !== 0 ? ` (${num(below)} ${baseUnit})` : ''}: $${tex(below)} + ${marks} \\times ${tex(s.minor)} = ${tex(s.value)}$ ${baseUnit}.`;
    }
    const lines = [stepText, readingLine];
    if (instrument === 'ruler' && s.start) {
      lines.push(
        `The crayon starts at ${num(s.start / 10)} cm, not at 0. Length $= ${tex(clean(s.value / 10))} - ${tex(s.start / 10)} = ${tex(answer)}$ cm.`,
      );
    }
    if (answerDivisor === 1000) {
      lines.push(`Change to ${unitName}: $${tex(s.value)} \\div ${tex(1000)} = ${tex(answer)}$, so the answer is **${num(answer)} ${unit}**.`);
    } else if (!(instrument === 'thermometer' && s.value < 0)) {
      lines.push(`So the answer is **${minus(num(answer))} ${unit}**.`);
    }

    const hint1 =
      instrument === 'ruler'
        ? 'Count the small marks: each one is 1 millimetre, and 10 mm make 1 cm.'
        : `Work out what each small mark is worth first. How many equal spaces are between two labelled numbers?`;
    const hint2 =
      instrument === 'ruler' && s.start
        ? 'Length is the distance from one end to the other. Take the start reading away from the end reading.'
        : instrument === 'thermometer' && s.value < 0
          ? 'Is the red line above or below 0? Count the marks from 0.'
          : `Find the labelled number just below the ${instrument === 'ruler' ? 'end of the crayon' : 'reading'}, then count up the small marks.`;

    return {
      type: 'numeric',
      prompt,
      figure: {
        svg: scaleSvg(s),
        alt:
          instrument === 'ruler'
            ? 'A crayon lying along a centimetre ruler marked in millimetres'
            : instrument === 'jug'
              ? 'A measuring jug with a scale and some water in it'
              : instrument === 'thermometer'
                ? 'A thermometer with a scale in degrees Celsius'
                : 'A kitchen scale with a pointer',
      },
      answer,
      units: unit,
      calculator: 'not-allowed',
      hints: [hint1, hint2],
      solution: lines.join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 4. benchmarks

interface Benchmark {
  thing: string;
  measure: 'length' | 'height' | 'mass' | 'capacity' | 'temperature' | 'time';
  options: [string, string, string, string];
  hint: string;
}

// The first option is the sensible estimate.
const BENCHMARKS: Benchmark[] = [
  { thing: 'the height of a classroom door', measure: 'height', options: ['2 m', '2 cm', '20 m', '2 km'], hint: 'A door is a bit taller than a tall adult.' },
  { thing: 'the length of a new pencil', measure: 'length', options: ['18 cm', '18 mm', '18 m', '180 m'], hint: 'A pencil fits in your hand, and a ruler is 30 cm long.' },
  { thing: 'the mass of a loaf of bread', measure: 'mass', options: ['700 g', '7 g', '70 kg', '7 kg'], hint: 'A 1 L bottle of milk is about 1 kg. A loaf is a bit lighter than that.' },
  { thing: 'the amount a teaspoon holds', measure: 'capacity', options: ['5 mL', '5 L', '500 mL', '50 L'], hint: 'A teaspoon holds just a small sip.' },
  { thing: 'the amount of water a bath holds', measure: 'capacity', options: ['150 L', '150 mL', '15 mL', '1.5 L'], hint: 'A big bottle of milk is 2 L. How many of those would fill a bath?' },
  { thing: 'the mass of an adult kiwi', measure: 'mass', options: ['2 kg', '2 g', '200 kg', '20 kg'], hint: 'A kiwi is about the size of a chicken.' },
  { thing: 'the temperature on a hot summer day', measure: 'temperature', options: ['30 °C', '3 °C', '70 °C', '100 °C'], hint: 'Water boils at 100 °C and freezes at 0 °C.' },
  { thing: 'the temperature inside a fridge', measure: 'temperature', options: ['4 °C', '40 °C', '25 °C', '100 °C'], hint: 'A fridge is cold, but not cold enough to freeze water (0 °C).' },
  { thing: 'the width of your fingernail', measure: 'length', options: ['1 cm', '1 mm', '1 m', '10 cm'], hint: 'The width of your little finger is a good benchmark for 1 cm.' },
  { thing: 'the length of a rugby field', measure: 'length', options: ['100 m', '100 cm', '10 m', '100 km'], hint: 'Think about how long it takes to run from one end of a rugby field to the other.' },
  { thing: 'the distance a car travels in 1 hour on the motorway', measure: 'length', options: ['100 km', '100 m', '100 cm', '1000 km'], hint: 'Cars on the motorway go much faster than you can run or ride a bike.' },
  { thing: 'the amount a drinking glass holds', measure: 'capacity', options: ['250 mL', '25 mL', '25 L', '2.5 L'], hint: 'A big bottle of milk holds 2 L. A glass holds much less than that.' },
  { thing: 'the amount a bucket holds', measure: 'capacity', options: ['10 L', '10 mL', '100 mL', '1000 L'], hint: 'A big bottle of milk is 2 L. A bucket holds a few of those.' },
  { thing: 'the mass of a paper clip', measure: 'mass', options: ['1 g', '1 kg', '100 g', '10 kg'], hint: 'A gram is very light: a paper clip barely weighs anything in your hand.' },
  { thing: 'the mass of a Year 6 student', measure: 'mass', options: ['35 kg', '35 g', '350 kg', '3.5 kg'], hint: 'A newborn baby is about 3.5 kg. You are much heavier than that.' },
  { thing: 'the height of a two-storey house', measure: 'height', options: ['8 m', '8 cm', '80 m', '8 km'], hint: 'A door is about 2 m tall. How many doors high is a two-storey house?' },
  { thing: 'the length of an ant', measure: 'length', options: ['5 mm', '5 cm', '5 m', '50 cm'], hint: 'An ant is small enough to walk across your fingernail.' },
  { thing: 'the mass of a 1 L bottle of milk', measure: 'mass', options: ['1 kg', '1 g', '10 kg', '100 g'], hint: 'Think about how heavy a full bottle of milk feels when you lift it out of the fridge.' },
  { thing: 'the length of a school bus', measure: 'length', options: ['12 m', '12 cm', '120 m', '1.2 km'], hint: 'A car is about 4 m long, and a bus is a lot longer than a car.' },
  { thing: 'the amount of petrol a car fuel tank holds', measure: 'capacity', options: ['50 L', '50 mL', '5 mL', '500 L'], hint: 'Petrol is sold in litres. A full tank costs around a hundred dollars or more.' },
  { thing: 'the temperature of a hot drink you can sip', measure: 'temperature', options: ['60 °C', '6 °C', '20 °C', '200 °C'], hint: 'Room temperature is about 20 °C. Boiling water is 100 °C.' },
  { thing: 'the thickness of a pencil', measure: 'length', options: ['7 mm', '7 cm', '7 m', '70 cm'], hint: 'A pencil is thinner than your little finger, which is about 1 cm wide.' },
  { thing: 'the mass of an apple', measure: 'mass', options: ['150 g', '15 g', '15 kg', '1.5 kg'], hint: 'About six or seven apples make 1 kg.' },
  { thing: 'the time it takes to brush your teeth', measure: 'time', options: ['2 minutes', '2 seconds', '2 hours', '20 hours'], hint: 'Dentists say to brush for about as long as a short song.' },
  { thing: 'the length of a school lunch break', measure: 'time', options: ['40 minutes', '40 seconds', '4 hours', '40 hours'], hint: 'A school day is about 6 hours long.' },
  { thing: 'the length of a netball court', measure: 'length', options: ['30 m', '30 cm', '3 m', '300 m'], hint: 'A netball court is shorter than a rugby field (about 100 m).' },
];

const MEASURE_WORD: Record<Benchmark['measure'], string> = {
  length: 'length',
  height: 'height',
  mass: 'mass',
  capacity: 'capacity',
  temperature: 'temperature',
  time: 'time',
};

/** Rough size of an option in base units, to say whether a wrong option is too big or too small. */
function baseSize(opt: string): number {
  const m = opt.match(/^([\d.]+)\s*(.*)$/);
  const v = Number(m?.[1] ?? 0);
  const u = (m?.[2] ?? '').trim();
  const mult: Record<string, number> = {
    mm: 1, cm: 10, m: 1000, km: 1_000_000, g: 1, kg: 1000, mL: 1, L: 1000, '°C': 1,
    seconds: 1, minutes: 60, hours: 3600,
  };
  return v * (mult[u] ?? 1);
}

export const benchmarks: QuestionTemplate = {
  id: 'm6.mea.units.benchmarks',
  topicId: 'm6.mea.units',
  title: 'Estimate with benchmarks',
  difficulties: [1],
  variety: BENCHMARKS.length,
  generate({ rng }) {
    const b = rng.pick(BENCHMARKS);
    const right = b.options[0];
    const ids = ['a', 'b', 'c', 'd'];
    const shuffled = rng.shuffle(b.options);
    const options = shuffled.map((text, i) => ({ id: ids[i]!, text: `About ${text}` }));
    const correct = ids[shuffled.indexOf(right)]!;
    const feedback: Record<string, string> = {};
    shuffled.forEach((text, i) => {
      if (text === right) return;
      const tooBig = baseSize(text) > baseSize(right);
      feedback[ids[i]!] = `${text} is far too ${tooBig ? (b.measure === 'temperature' ? 'hot' : b.measure === 'time' ? 'long' : 'big') : b.measure === 'temperature' ? 'cold' : b.measure === 'time' ? 'short' : 'small'} for ${b.thing}.`;
    });
    const out: TemplateOutput = {
      type: 'mcq',
      prompt: `Which is the best estimate for ${b.thing}?`,
      options,
      correct,
      feedback,
      calculator: 'not-allowed',
      hints: [b.hint, `Think about something you already know the ${MEASURE_WORD[b.measure]} of, and compare.`],
      solution: `The best estimate is **about ${right}**. ${b.hint} The other options are much too big or much too small.`,
    };
    return out;
  },
};

// ---------------------------------------------------------------- 5. word problems

export const wordProblems: QuestionTemplate = {
  id: 'm6.mea.units.word-problems',
  topicId: 'm6.mea.units',
  title: 'Measurement word problems with conversions',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      const kind = rng.pick(['ribbon', 'juice', 'flour'] as const);
      if (kind === 'ribbon') {
        const metres = rng.int(2, 5);
        const piece = rng.pick([15, 20, 25, 30, 35, 40, 45]);
        const count = rng.int(2, Math.min(6, Math.floor((metres * 100 - 10) / piece)));
        const left = metres * 100 - count * piece;
        return {
          type: 'numeric',
          prompt: `${name} has ${metres} m of ribbon for a school art project. ${name} cuts ${count} pieces, each ${piece} cm long. How many centimetres of ribbon are left?`,
          answer: left,
          units: 'cm',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Change the metres into centimetres first, so both amounts are in the same unit.', `How much ribbon do ${count} pieces use altogether?`],
          solution: [
            `${metres} m = $${metres} \\times 100 = ${metres * 100}$ cm.`,
            `The pieces use $${count} \\times ${piece} = ${count * piece}$ cm.`,
            `Left over: $${metres * 100} - ${count * piece} = ${left}$ cm. **${left} cm** of ribbon is left.`,
          ].join('\n\n'),
        };
      }
      if (kind === 'juice') {
        const litres = rng.pick([1, 1.5, 2, 2.5, 3]);
        const glass = rng.pick([150, 200, 250, 300]);
        const totalMl = litres * 1000;
        const count = rng.int(2, Math.min(7, Math.floor((totalMl - 50) / glass)));
        const left = totalMl - count * glass;
        return {
          type: 'numeric',
          prompt: `A bottle holds ${num(litres)} L of juice. ${name} pours ${count} glasses for friends after netball. Each glass holds ${glass} mL. How many millilitres of juice are left in the bottle?`,
          answer: left,
          units: 'mL',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Change the litres into millilitres first.', `How much juice do ${count} glasses use?`],
          solution: [
            `${num(litres)} L = $${tex(litres)} \\times ${tex(1000)} = ${tex(totalMl)}$ mL.`,
            `${count} glasses use $${count} \\times ${glass} = ${tex(count * glass)}$ mL.`,
            `Left over: $${tex(totalMl)} - ${tex(count * glass)} = ${tex(left)}$ mL. **${num(left)} mL** is left.`,
          ].join('\n\n'),
        };
      }
      const bag = rng.pick([1, 2, 1.5]);
      const used = rng.int(1, Math.floor((bag * 1000 - 50) / 50)) * 50;
      const left = bag * 1000 - used;
      return {
        type: 'numeric',
        prompt: `A bag holds ${num(bag)} kg of flour. ${name} uses ${num(used)} g to bake scones for the whānau. How many grams of flour are left?`,
        answer: left,
        units: 'g',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Change the kilograms into grams first.', 'Then subtract the amount used.'],
        solution: [
          `${num(bag)} kg = $${tex(bag)} \\times ${tex(1000)} = ${tex(bag * 1000)}$ g.`,
          `$${tex(bag * 1000)} - ${tex(used)} = ${tex(left)}$, so **${num(left)} g** of flour is left.`,
        ].join('\n\n'),
      };
    }

    if (difficulty === 4) {
      const kind = rng.pick(['cups', 'bag', 'compare'] as const);
      if (kind === 'cups') {
        const cup = rng.pick([100, 200, 250, 500]);
        const perLitre = 1000 / cup;
        const litres = rng.int(2, cup === 100 ? 4 : 8);
        const answer = litres * perLitre;
        return {
          type: 'numeric',
          prompt: `The school camp has a water container that holds ${litres} L. How many ${cup} mL cups can be filled from the full container?`,
          answer,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`How many ${cup} mL cups can be filled from 1 L (1,000 mL)?`, `Then think about ${litres} litres.`],
          solution: [
            `1 L = 1,000 mL, and $${tex(1000)} \\div ${cup} = ${perLitre}$, so each litre fills ${perLitre} cups.`,
            `${litres} L fills $${litres} \\times ${perLitre} = ${answer}$ cups.`,
            `So **${answer} cups** can be filled.`,
          ].join('\n\n'),
        };
      }
      if (kind === 'bag') {
        const lunch = rng.int(5, 9) * 50;
        const books = rng.int(11, 19) * 100;
        const bottle = rng.int(4, 8) * 100;
        const total = lunch + books + bottle;
        const answer = clean(total / 1000);
        return {
          type: 'numeric',
          prompt: `${name}'s school bag holds a lunchbox (${lunch} g), some books (${num(books / 1000)} kg) and a water bottle (${bottle} g). What is the total mass in kilograms?`,
          answer,
          units: 'kg',
          calculator: 'not-allowed',
          hints: ['Write all the masses in the same unit first. Grams are easiest.', 'Add them, then change the total into kilograms.'],
          solution: [
            `Books: ${num(books / 1000)} kg = ${num(books)} g.`,
            `Total: $${lunch} + ${tex(books)} + ${bottle} = ${tex(total)}$ g.`,
            `In kilograms: $${tex(total)} \\div ${tex(1000)} = ${tex(answer)}$. The bag's mass is **${num(answer)} kg**.`,
          ].join('\n\n'),
        };
      }
      // compare two lengths in different units
      // Realistic running long jumps for 10–11-year-olds (about 2.3 m to 3.6 m).
      const a = rng.int(230, 360);
      let b = rng.int(230, 360);
      while (b === a) b = rng.int(230, 360);
      const other = rng.pick(NAMES.filter((n) => n !== name));
      const diff = Math.abs(a - b);
      const further = a > b ? name : other;
      return {
        type: 'numeric',
        prompt: `${name} jumps ${num(a / 100)} m in the long jump at athletics day. ${other} jumps ${b} cm. How many centimetres further did ${further} jump?`,
        answer: diff,
        units: 'cm',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Change both lengths into the same unit before you compare them.', 'Then find the difference by subtracting.'],
        solution: [
          `${num(a / 100)} m = $${tex(a / 100)} \\times 100 = ${a}$ cm.`,
          `The difference is $${Math.max(a, b)} - ${Math.min(a, b)} = ${diff}$ cm.`,
          `${further} jumped **${diff} cm** further.`,
        ].join('\n\n'),
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      // batches and leftovers
      const per = rng.pick([200, 300, 350, 400, 450]);
      const bagG = rng.pick([1000, 1500, 2000, 2500, 3000].filter((g) => g % per !== 0));
      const batches = Math.floor(bagG / per);
      const left = bagG - batches * per;
      return {
        type: 'cloze',
        prompt: `One batch of ${name}'s muffins uses ${per} g of flour. ${name} has a ${num(bagG / 1000)} kg bag of flour.\n\n${name} can make [[a]] full batches, with [[b]] g of flour left over.`,
        blanks: [
          { id: 'a', accepted: [String(batches)] },
          { id: 'b', accepted: [String(left), `${left} g`, `${left}g`] },
        ],
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          'Change the kilograms into grams first.',
          `Count up in ${per}s until the next batch would need more flour than there is.`,
        ],
        solution: [
          `${num(bagG / 1000)} kg = ${num(bagG)} g.`,
          `Count up in ${per}s: ${Array.from({ length: batches }, (_, i) => num((i + 1) * per)).join(', ')}. One more batch would need ${num((batches + 1) * per)} g, which is too much.`,
          `So ${name} can make **${batches}** full batches, using ${num(batches * per)} g.`,
          `Left over: $${tex(bagG)} - ${tex(batches * per)} = ${left}$ g.`,
        ].join('\n\n'),
      };
    }
    // laps of a track, total in km
    const lap = rng.pick([200, 400, 500]);
    const laps = rng.int(2, 6);
    const days = rng.int(2, 7);
    const metres = lap * laps * days;
    const km = clean(metres / 1000);
    return {
      type: 'numeric',
      prompt: `${name} is training for a fun run. Each day ${name} runs ${laps} laps of a ${lap} m track. ${name} trains for ${days} days. How many kilometres does ${name} run altogether?`,
      answer: km,
      units: 'km',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['How many metres does one day of training cover?', 'Find the total in metres, then change it to kilometres (1 km = 1,000 m).'],
      solution: [
        `One day: $${laps} \\times ${lap} = ${tex(laps * lap)}$ m.`,
        `${days} days: $${days} \\times ${tex(laps * lap)} = ${tex(metres)}$ m.`,
        `In kilometres: $${tex(metres)} \\div ${tex(1000)} = ${tex(km)}$. ${name} runs **${num(km)} km**.`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [convert, mixedUnits, readScale, benchmarks, wordProblems];
