import type { QuestionTemplate } from '../types';
import type { Rng } from '../../rng';
import { NAMES, clean, num, round, tex } from '../format';

// Calculation templates for biology topics (Year 9).
//  - s9.bio.cells: microscope magnification (eyepiece × objective; image size ÷ actual size)
//  - s9.bio.transport: surface area, volume and SA:V ratio; percentage change in mass (osmosis)
//  - s9.bio.body-systems: heart and breathing rates from counts; blood pumped per minute
//
// Magnification and µm answers deliberately have no `units`: the marker treats "400x" as a wrong
// unit when units are "×", and "50 um" as a wrong unit when units are "µm". The prompt says which
// unit to use instead.

/** Retries `make` until `ok` passes (bounded, so a bad range can't hang the generator). */
function pickUntil<T>(rng: Rng, make: (rng: Rng) => T, ok: (v: T) => boolean): T {
  for (let i = 0; i < 200; i++) {
    const v = make(rng);
    if (ok(v)) return v;
  }
  throw new Error('pickUntil: no valid value found');
}

const isOneDp = (x: number) => Number.isInteger(round(x * 10, 6));

// ---------------- s9.bio.cells ----------------

const EYEPIECES = [5, 10, 15, 20] as const;
const OBJECTIVES = [4, 10, 40, 100] as const;
const SLIDES = [
  'onion cells',
  'cheek cells',
  'a drop of pond water',
  'a moss leaf',
  'pollen grains',
  'a prepared slide of blood',
  'a thin slice of cork',
  'yeast cells',
] as const;

export const totalMagnification: QuestionTemplate = {
  id: 's9.bio.cells.total-magnification',
  topicId: 's9.bio.cells',
  title: 'Total magnification of a light microscope',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const slide = rng.pick(SLIDES);
    const e = rng.pick(EYEPIECES);
    const o = rng.pick(OBJECTIVES);
    const total = e * o;
    if (difficulty === 1) {
      return {
        type: 'numeric',
        prompt: `${name} is looking at ${slide} using a ×${e} eyepiece lens and a ×${o} objective lens. What is the total magnification?\n\nEnter the number only (for example, 50 for ×50).`,
        answer: total,
        calculator: 'allowed',
        hints: ['Total magnification = eyepiece magnification × objective magnification.'],
        solution: `Total magnification $= ${e} \\times ${o} = ${tex(total)}$, so the image is magnified **×${num(total)}**.`,
      };
    }
    // difficulty 2: find the missing lens
    const findObjective = rng.chance(0.5);
    const known = findObjective ? `a ×${e} eyepiece lens` : `a ×${o} objective lens`;
    const missing = findObjective ? 'objective' : 'eyepiece';
    const answer = findObjective ? o : e;
    const knownValue = findObjective ? e : o;
    return {
      type: 'numeric',
      prompt: `${name} wants to look at ${slide} at a total magnification of ×${num(total)}. The microscope has ${known}. What magnification of ${missing} lens is needed?\n\nEnter the number only (for example, 10 for ×10).`,
      answer,
      calculator: 'allowed',
      hints: [
        'Total magnification = eyepiece magnification × objective magnification.',
        `You know the total and one lens, so divide the total by the lens you know.`,
      ],
      solution: `Total = eyepiece × objective, so the ${missing} lens $= ${tex(total)} \\div ${knownValue} = ${answer}$.\n\nThe ${missing} lens must be **×${answer}**. Check: $${e} \\times ${o} = ${tex(total)}$ ✓`,
    };
  },
};

/** Small animals seen with a hand lens or low power (sizes in mm). */
const SMALL_ANIMALS: ReadonlyArray<{ name: string; sizes: readonly number[] }> = [
  { name: 'sandfly', sizes: [2, 2.5, 3] },
  { name: 'flea', sizes: [1.5, 2, 2.5, 3] },
  { name: 'ant', sizes: [3, 4, 5, 6] },
  { name: 'aphid', sizes: [1.5, 2, 2.5, 3] },
  { name: 'water flea', sizes: [1, 1.5, 2, 3] },
  { name: 'mosquito larva', sizes: [4, 5, 6, 8] },
];
const LOW_MAGS = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50] as const;

/** Cells and single-celled organisms (sizes in µm). */
const CELLS: ReadonlyArray<{ name: string; a: 'a' | 'an'; sizes: readonly number[]; dim: string }> = [
  { name: 'cheek cell', a: 'a', sizes: [40, 50, 60], dim: 'wide' },
  { name: 'onion skin cell', a: 'an', sizes: [150, 200, 250, 300], dim: 'long' },
  { name: 'red blood cell', a: 'a', sizes: [7, 8], dim: 'across' },
  { name: 'pollen grain', a: 'a', sizes: [20, 25, 30, 40, 50], dim: 'across' },
  { name: 'paramecium', a: 'a', sizes: [150, 200, 250], dim: 'long' },
  { name: 'yeast cell', a: 'a', sizes: [4, 5, 6], dim: 'across' },
  { name: 'amoeba', a: 'an', sizes: [250, 300, 400, 500], dim: 'long' },
];
const HIGH_MAGS = [40, 100, 200, 250, 400, 500, 600, 1000, 1500] as const;

export const imageSize: QuestionTemplate = {
  id: 's9.bio.cells.image-size',
  topicId: 's9.bio.cells',
  title: 'Magnification = image size ÷ actual size',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 3) {
      // Same units (mm): find the magnification of a drawing or photo.
      const { animal, actual, mag, image } = pickUntil(
        rng,
        (r) => {
          const animal = r.pick(SMALL_ANIMALS);
          const actual = r.pick(animal.sizes);
          const mag: number = r.pick(LOW_MAGS);
          return { animal, actual, mag, image: clean(actual * mag) };
        },
        (v) => v.image >= 10 && v.image <= 200 && isOneDp(v.image),
      );
      const kind = rng.pick(['drawing', 'photo'] as const);
      return {
        type: 'numeric',
        prompt: `${name} ${kind === 'drawing' ? 'makes a drawing' : 'takes a photo'} of a ${animal.name}. In the ${kind}, the ${animal.name} is ${num(image)} mm long. The real ${animal.name} is ${num(actual)} mm long. What is the magnification of the ${kind}?\n\nEnter the number only (for example, 10 for ×10).`,
        answer: mag,
        calculator: 'allowed',
        hints: [
          'Magnification = image size ÷ actual size.',
          'Both lengths are already in millimetres, so you can divide straight away.',
        ],
        solution: `Magnification = image size ÷ actual size $= ${tex(image)} \\div ${tex(actual)} = ${mag}$.\n\nThe ${kind} is magnified **×${mag}**.`,
      };
    }

    const { cell, actual, mag, image } = pickUntil(
      rng,
      (r) => {
        const cell = r.pick(CELLS);
        const actual = r.pick(cell.sizes);
        const mag: number = r.pick(HIGH_MAGS);
        return { cell, actual, mag, image: clean((actual * mag) / 1000) };
      },
      (v) => v.image >= 5 && v.image <= 120 && isOneDp(v.image),
    );
    const imageUm = clean(image * 1000);

    if (difficulty === 4) {
      // Different units: image in mm, actual in µm. Find the magnification.
      return {
        type: 'numeric',
        prompt: `In a photo taken through a microscope, ${cell.a} ${cell.name} is ${num(image)} mm ${cell.dim}. The real ${cell.name} is ${actual} µm ${cell.dim}. What is the magnification of the photo?\n\nEnter the number only (for example, 100 for ×100).`,
        answer: mag,
        calculator: 'allowed',
        hints: [
          'Before you divide, both sizes must be in the same units. 1 mm = 1000 µm.',
          'Then use magnification = image size ÷ actual size.',
        ],
        solution: [
          `Convert the image size to micrometres: $${tex(image)} \\text{ mm} \\times 1000 = ${tex(imageUm)}\\ \\mu\\text{m}$.`,
          `Magnification = image size ÷ actual size $= ${tex(imageUm)} \\div ${actual} = ${tex(mag)}$.`,
          `The photo is magnified **×${num(mag)}**.`,
        ].join('\n\n'),
      };
    }

    // difficulty 5: rearrange the formula (find the actual size or the image size), with unit conversion.
    const actualMm = clean(actual / 1000);
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `${name} photographs ${cell.a} ${cell.name} through a microscope at a magnification of ×${num(mag)}. In the photo, the ${cell.name} is ${num(image)} mm ${cell.dim}. What is the actual size of the ${cell.name} in micrometres (µm)?`,
        answer: actual,
        calculator: 'allowed',
        hints: [
          'Rearrange the formula: actual size = image size ÷ magnification.',
          'Your first answer will be in millimetres. Multiply by 1000 to change mm into µm.',
        ],
        solution: [
          `Actual size = image size ÷ magnification $= ${tex(image)} \\div ${tex(mag)} = ${tex(actualMm)}$ mm.`,
          `Convert to micrometres: $${tex(actualMm)} \\times 1000 = ${actual}\\ \\mu\\text{m}$.`,
          `The ${cell.name} is actually **${actual} µm** ${cell.dim}.`,
        ].join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: `${cell.a === 'an' ? 'An' : 'A'} ${cell.name} is ${actual} µm ${cell.dim}. ${name} photographs it through a microscope at a magnification of ×${num(mag)}. How big will the ${cell.name} be in the photo, in millimetres (mm)?`,
      answer: image,
      calculator: 'allowed',
      hints: [
        'Rearrange the formula: image size = actual size × magnification.',
        'Your first answer will be in micrometres. Divide by 1000 to change µm into mm.',
      ],
      solution: [
        `Image size = actual size × magnification $= ${actual} \\times ${tex(mag)} = ${tex(imageUm)}\\ \\mu\\text{m}$.`,
        `Convert to millimetres: $${tex(imageUm)} \\div 1000 = ${tex(image)}$ mm.`,
        `The ${cell.name} will be **${num(image)} mm** ${cell.dim} in the photo.`,
      ].join('\n\n'),
    };
  },
};

// ---------------- s9.bio.transport ----------------

/** Side lengths whose SA:V ratio (6 ÷ side) is a terminating decimal. */
const NICE_SIDES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30] as const;
const CUBE_THINGS = ['cube of agar jelly', 'cube of potato', 'cube-shaped block of jelly', 'model cell made from a cube of agar'] as const;

export const surfaceAreaToVolume: QuestionTemplate = {
  id: 's9.bio.transport.sa-to-volume',
  topicId: 's9.bio.transport',
  title: 'Surface area, volume and SA:V ratio',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const unit = rng.pick(['cm', 'mm'] as const);
    const thing = rng.pick(CUBE_THINGS);

    if (difficulty === 2) {
      const L = rng.int(1, 10);
      if (rng.chance(0.5)) {
        const face = L * L;
        const sa = 6 * face;
        return {
          type: 'numeric',
          prompt: `A ${thing} has sides of ${L} ${unit}. What is its total surface area?`,
          answer: sa,
          units: `${unit}²`,
          calculator: 'allowed',
          hints: ['A cube has 6 faces, and every face is the same square.', 'Area of one face = side × side.'],
          solution: `Area of one face $= ${L} \\times ${L} = ${face}$ ${unit}².\n\nThere are 6 faces, so surface area $= 6 \\times ${face} = ${tex(sa)}$ ${unit}².`,
        };
      }
      const v = L * L * L;
      return {
        type: 'numeric',
        prompt: `A ${thing} has sides of ${L} ${unit}. What is its volume?`,
        answer: v,
        units: `${unit}³`,
        calculator: 'allowed',
        hints: ['Volume of a cube = side × side × side.'],
        solution: `Volume $= ${L} \\times ${L} \\times ${L} = ${tex(v)}$ ${unit}³.`,
      };
    }

    if (difficulty === 3) {
      const L = rng.pick(NICE_SIDES);
      const sa = 6 * L * L;
      const v = L * L * L;
      const n = clean(sa / v);
      return {
        type: 'numeric',
        prompt: `A ${thing} has sides of ${L} ${unit}. Calculate its surface area to volume ratio.\n\nWrite the ratio in the form $n : 1$ and enter the value of $n$.`,
        answer: n,
        calculator: 'allowed',
        hints: [
          'Work out the surface area (6 faces, each side × side) and the volume (side × side × side).',
          'To write SA : V in the form n : 1, divide the surface area by the volume.',
        ],
        solution: [
          `Surface area $= 6 \\times ${L} \\times ${L} = ${tex(sa)}$ ${unit}²`,
          `Volume $= ${L} \\times ${L} \\times ${L} = ${tex(v)}$ ${unit}³`,
          `SA : V $= ${tex(sa)} : ${tex(v)}$. Dividing both by ${num(v)} gives $${tex(n)} : 1$, so $n = ${tex(n)}$.`,
        ].join('\n\n'),
      };
    }

    // difficulty 4
    if (rng.chance(0.5)) {
      // Cuboid SA:V
      const [l, w, h] = pickUntil(
        rng,
        (r) => [r.int(1, 8), r.int(1, 6), r.int(1, 5)] as const,
        ([a, b, c]) => !(a === b && b === c),
      );
      const sa = 2 * (l * w + l * h + w * h);
      const v = l * w * h;
      const exact = clean(sa / v);
      const isExact = Number.isInteger(round(exact * 100, 6));
      const n = isExact ? exact : round(exact, 2);
      return {
        type: 'numeric',
        prompt: `A block of agar jelly is a cuboid measuring ${l} cm × ${w} cm × ${h} cm. Calculate its surface area to volume ratio in the form $n : 1$, and enter the value of $n$.${isExact ? '' : ' Give your answer to 2 decimal places.'}`,
        answer: n,
        ...(isExact ? {} : { decimals: 2 }),
        calculator: 'allowed',
        hints: [
          'A cuboid has 3 pairs of matching faces: length × width, length × height and width × height.',
          'Surface area = 2 × (lw + lh + wh). Volume = l × w × h. Then divide SA by V.',
        ],
        solution: [
          `Surface area $= 2 \\times (${l} \\times ${w} + ${l} \\times ${h} + ${w} \\times ${h}) = 2 \\times (${l * w} + ${l * h} + ${w * h}) = ${sa}$ cm²`,
          `Volume $= ${l} \\times ${w} \\times ${h} = ${v}$ cm³`,
          `$n = ${sa} \\div ${v} ${isExact ? '=' : '\\approx'} ${tex(n, isExact ? undefined : 2)}$, so the ratio is $${tex(n, isExact ? undefined : 2)} : 1$.`,
        ].join('\n\n'),
      };
    }
    // Compare two cubes: ratio(A) ÷ ratio(B) = side(B) ÷ side(A)
    const { a, b } = pickUntil(
      rng,
      (r) => {
        const a = r.pick([1, 2, 3] as const);
        const k = r.int(2, 5);
        return { a, b: a * k };
      },
      (v) => (NICE_SIDES as readonly number[]).includes(v.b),
    );
    const rA = clean(6 / a);
    const rB = clean(6 / b);
    const k = clean(rA / rB);
    return {
      type: 'numeric',
      prompt: `Cube A has sides of ${a} ${unit}. Cube B has sides of ${b} ${unit}. How many times bigger is the surface area to volume ratio of cube A than that of cube B?`,
      answer: k,
      calculator: 'allowed',
      hints: [
        'Work out SA : V for each cube and write each one in the form n : 1.',
        'Then divide cube A’s value of n by cube B’s value of n.',
      ],
      solution: [
        `Cube A: SA $= 6 \\times ${a}^2 = ${6 * a * a}$, V $= ${a}^3 = ${a * a * a}$, so SA : V $= ${tex(rA)} : 1$.`,
        `Cube B: SA $= 6 \\times ${b}^2 = ${tex(6 * b * b)}$, V $= ${b}^3 = ${tex(b * b * b)}$, so SA : V $= ${tex(rB)} : 1$.`,
        `$${tex(rA)} \\div ${tex(rB)} = ${tex(k)}$, so cube A’s ratio is **${tex(k)} times** bigger. The smaller cube has the bigger SA : V ratio.`,
      ].join('\n\n'),
    };
  },
};

const GAIN_SOLUTIONS = ['distilled water', 'tap water', 'a very weak sugar solution'] as const;
const LOSS_SOLUTIONS = ['a concentrated sugar solution', 'a strong salt solution', 'a concentrated salt solution'] as const;

function potatoMasses(rng: Rng) {
  return pickUntil(
    rng,
    (r) => {
      const m0 = clean(r.int(40, 120) * 0.05); // 2.00 g to 6.00 g
      const gain = r.chance(0.5);
      const p = r.int(4, 30);
      const m1 = round(m0 * (1 + ((gain ? 1 : -1) * p) / 100), 2);
      const change = clean(m1 - m0);
      const raw = (Math.abs(change) / m0) * 100;
      const pct = round(raw, 1);
      // Avoid values that sit on a rounding boundary (e.g. 12.05), where calculators may disagree.
      const onBoundary = Math.abs(((raw * 10) % 1) - 0.5) < 1e-6;
      return { m0, m1, change, pct, gain, onBoundary };
    },
    (v) => v.change !== 0 && v.pct > 0 && v.m1 > 0 && !v.onBoundary,
  );
}

export const osmosisMassChange: QuestionTemplate = {
  id: 's9.bio.transport.mass-change',
  topicId: 's9.bio.transport',
  title: 'Percentage change in mass of potato cylinders (osmosis)',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const { m0, m1, change, pct, gain } = potatoMasses(rng);
    const absChange = clean(Math.abs(change));

    if (difficulty === 3) {
      const solution = gain ? rng.pick(GAIN_SOLUTIONS) : rng.pick(LOSS_SOLUTIONS);
      const word = gain ? 'increase' : 'decrease';
      return {
        type: 'numeric',
        prompt: `${name} puts a potato cylinder into ${solution} for one hour. Its mass changes from ${num(m0, 2)} g to ${num(m1, 2)} g.\n\nCalculate the percentage ${word} in mass. Give your answer to 1 decimal place.`,
        answer: pct,
        decimals: 1,
        units: '%',
        calculator: 'allowed',
        hints: [
          'First find the change in mass: subtract the smaller mass from the larger one.',
          'Percentage change = change in mass ÷ starting mass × 100.',
        ],
        solution: [
          `Change in mass $= ${tex(Math.max(m0, m1), 2)} - ${tex(Math.min(m0, m1), 2)} = ${tex(absChange, 2)}$ g`,
          `Percentage ${word} $= \\dfrac{${tex(absChange, 2)}}{${tex(m0, 2)}} \\times 100 \\approx ${tex(pct, 1)}\\%$`,
          gain
            ? 'The potato gained mass because water moved into its cells by osmosis.'
            : 'The potato lost mass because water moved out of its cells by osmosis.',
        ].join('\n\n'),
      };
    }

    // difficulty 4: interpret the result
    const options = [
      { id: 'in', text: 'Water moved into the potato cells by osmosis, so the solution was more dilute than the cell sap.' },
      { id: 'out', text: 'Water moved out of the potato cells by osmosis, so the solution was more concentrated than the cell sap.' },
      { id: 'sugar', text: 'Sugar particles moved across the cell membranes by osmosis, which changed the mass.' },
      { id: 'wall', text: 'No osmosis took place, because the cell walls stop water moving in or out.' },
    ];
    const correct = gain ? 'in' : 'out';
    return {
      type: 'mcq',
      prompt: `${name} puts a potato cylinder into solution X for one hour. Its mass changes from ${num(m0, 2)} g to ${num(m1, 2)} g (a ${num(pct, 1)}% ${gain ? 'increase' : 'decrease'}).\n\nWhich statement best explains this result?`,
      options,
      correct,
      feedback: {
        [gain ? 'out' : 'in']: gain
          ? 'If water had moved out, the potato would have lost mass. It gained mass.'
          : 'If water had moved in, the potato would have gained mass. It lost mass.',
        sugar: 'Osmosis is the movement of water, not sugar. The sugar particles are too big to pass through the membrane easily.',
        wall: 'Cell walls let water through. They stop the cell bursting, but they don’t stop osmosis.',
      },
      calculator: 'allowed',
      hints: [
        'Did the potato gain or lose mass?',
        'Osmosis is the movement of water from a dilute solution to a more concentrated one, across a partially permeable membrane.',
      ],
      solution: gain
        ? `The mass went **up** by ${tex(absChange, 2)} g, so water moved **into** the potato cells by osmosis. Water moves from a more dilute solution to a more concentrated one, so solution X must have been **more dilute** than the cell sap.`
        : `The mass went **down** by ${tex(absChange, 2)} g, so water moved **out of** the potato cells by osmosis. Water moves from a more dilute solution to a more concentrated one, so solution X must have been **more concentrated** than the cell sap.`,
    };
  },
};

// ---------------- s9.bio.body-systems ----------------

export const pulseRate: QuestionTemplate = {
  id: 's9.bio.body-systems.pulse-rate',
  topicId: 's9.bio.body-systems',
  title: 'Heart rate, breathing rate and blood pumped per minute',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);

    if (difficulty === 1) {
      // Resting pulse counted for 15 s or 30 s.
      const seconds = rng.pick([15, 30] as const);
      const factor = 60 / seconds;
      const bpm = factor * rng.int(Math.ceil(60 / factor), Math.floor(100 / factor));
      const count = bpm / factor;
      return {
        type: 'numeric',
        prompt: `${name} sits quietly and counts their pulse for ${seconds} seconds. They count ${count} beats. What is their heart rate in beats per minute?`,
        answer: bpm,
        calculator: 'allowed',
        hints: [`There are 60 seconds in a minute. How many lots of ${seconds} seconds is that?`],
        solution: `60 seconds ÷ ${seconds} seconds = ${factor}, so multiply the count by ${factor}.\n\n$${count} \\times ${factor} = ${bpm}$ beats per minute.`,
      };
    }

    if (difficulty === 2) {
      const breathing = rng.chance(0.4);
      // Breaths are slow, so they are counted for 30 s; heartbeats for 10 s or 20 s.
      const seconds = breathing ? 30 : rng.pick([10, 20] as const);
      const factor = 60 / seconds;
      const exercised = rng.chance(0.5);
      const [lo, hi] = breathing ? (exercised ? [24, 40] : [12, 20]) : exercised ? [110, 180] : [60, 100];
      const rate = factor * rng.int(Math.ceil(lo / factor), Math.floor(hi / factor));
      const count = rate / factor;
      const when = exercised ? 'straight after running for five minutes' : 'while sitting at rest';
      const what = breathing ? 'breaths' : 'heartbeats';
      const unitWord = breathing ? 'breaths per minute' : 'beats per minute';
      return {
        type: 'numeric',
        prompt: `${name} counts ${count} ${what} in ${seconds} seconds, ${when}. What is ${name}’s ${breathing ? 'breathing rate' : 'heart rate'} in ${unitWord}?`,
        answer: rate,
        calculator: 'allowed',
        hints: [`How many lots of ${seconds} seconds are there in one minute (60 seconds)?`],
        solution: `$60 \\div ${seconds} = ${factor}$, so multiply the count by ${factor}.\n\n$${count} \\times ${factor} = ${rate}$ ${unitWord}.`,
      };
    }

    // difficulty 3: volume of blood pumped per minute = volume per beat × heart rate
    const exercised = rng.chance(0.4);
    const perBeat = exercised ? rng.pick([90, 100, 110, 120] as const) : rng.pick([60, 65, 70, 75, 80] as const);
    const bpm = exercised ? rng.int(120, 170) : rng.int(60, 90);
    const ml = perBeat * bpm;
    const litres = clean(ml / 1000);
    const twoDp = Number.isInteger(round(litres * 100, 6));
    const answer = twoDp ? litres : round(litres, 2);
    return {
      type: 'numeric',
      prompt: `${exercised ? `While ${name} is exercising` : `While ${name} is resting`}, their heart beats ${bpm} times per minute and pumps ${perBeat} mL of blood with each beat. How many **litres** of blood does the heart pump each minute?${twoDp ? '' : ' Give your answer to 2 decimal places.'}`,
      answer,
      ...(twoDp ? {} : { decimals: 2 }),
      calculator: 'allowed',
      hints: [
        'Volume per minute = volume per beat × number of beats per minute.',
        'Your answer will be in millilitres first. 1 L = 1000 mL.',
      ],
      solution: `Volume per minute $= ${perBeat} \\times ${bpm} = ${tex(ml)}$ mL.\n\n$${tex(ml)} \\div 1000 = ${tex(litres)}${twoDp ? '' : ` \\approx ${tex(answer, 2)}`}$ L per minute.`,
    };
  },
};

export const templates: QuestionTemplate[] = [
  totalMagnification,
  imageSize,
  surfaceAreaToVolume,
  osmosisMassChange,
  pulseRate,
];
