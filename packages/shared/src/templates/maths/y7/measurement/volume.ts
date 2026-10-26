import type { QuestionTemplate } from '../../../types';
import { clean, NAMES, num, tex } from '../../../format';
import { boxFigure, stepPrismFigure } from './volume-helpers';

// m7.mea.volume — counting unit cubes, V = l³ and V = lwh, working backwards to a missing
// length, step-shaped prisms made from two boxes, and capacity (1 cm³ = 1 mL).

const cube = (u: string) => `${u}³`;

const volumeHints = (isCube: boolean) => [
  'Volume is the amount of space a 3D object takes up. It is measured in cubic units.',
  isCube ? 'For a cube, $V = l^3$, which means $l \\times l \\times l$.' : 'For a rectangular prism, $V = l \\times w \\times h$.',
];

/** "$4 \times 3 \times 5 = 12 \times 5 = 60$" */
function lwhWorking(l: number, w: number, h: number): string {
  return `$${tex(l)} \\times ${tex(w)} \\times ${tex(h)} = ${tex(clean(l * w))} \\times ${tex(h)} = ${tex(clean(l * w * h))}$`;
}

// ---------------------------------------------------------------------------------------------
// Counting cubes
// ---------------------------------------------------------------------------------------------

export const countCubes: QuestionTemplate = {
  id: 'm7.mea.volume.count-cubes',
  topicId: 'm7.mea.volume',
  title: 'Volume by counting 1 cm cubes in layers',
  difficulties: [1],
  generate({ rng }) {
    let l = rng.int(2, 5);
    let w = rng.int(1, 4);
    let h = rng.int(1, 4);
    if (l * w * h < 6) [l, w, h] = [l + 1, w + 1, h];
    const layer = l * w;
    const V = layer * h;
    return {
      type: 'numeric',
      prompt: 'This solid rectangular prism is built from 1 cm cubes, with no gaps inside. What is its volume?',
      figure: {
        svg: boxFigure(l, w, h, {}, { grid: true }),
        alt: `A rectangular prism made of 1 cm cubes: ${l} cubes long, ${w} cube${w === 1 ? '' : 's'} deep and ${h} cube${h === 1 ? '' : 's'} high.`,
      },
      answer: V,
      units: 'cm³',
      calculator: 'not-allowed',
      hints: ['Count the cubes in one layer first: how many along the front, and how many rows going back?', 'Then multiply by the number of layers.'],
      solution: `Each layer is ${l} cubes long and ${w} cube${w === 1 ? '' : 's'} deep: $${l} \\times ${w} = ${layer}$ cubes.\n\nThere ${h === 1 ? 'is 1 layer' : `are ${h} layers`}: $${layer} \\times ${h} = ${V}$ cubes.\n\nEach cube is 1 cm³, so the volume is **${V} cm³**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Volume of cubes and rectangular prisms
// ---------------------------------------------------------------------------------------------

// Everything except the shipping container gets sizes of about 8–15 cm × 4–10 cm × 2–10 cm, so the objects must be small.
const OBJECTS = ['box', 'block of wood', 'pencil case', 'storage tub', 'block of cheese', 'shipping container', 'jewellery box', 'lunch box'];

export const prismVolume: QuestionTemplate = {
  id: 'm7.mea.volume.prism-volume',
  topicId: 'm7.mea.volume',
  title: 'Volume of a cube or rectangular prism (V = l³, V = lwh)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const u = rng.pick(['cm', 'm'] as const);
      if (rng.chance(0.4)) {
        const s = rng.int(2, 10);
        return {
          type: 'numeric',
          prompt: 'Find the volume of this cube.',
          figure: { svg: boxFigure(s, s, s, { l: `${s} ${u}` }), alt: `A cube with edges of ${s} ${u}.` },
          answer: s ** 3,
          units: cube(u),
          calculator: 'not-allowed',
          hints: volumeHints(true),
          solution: `All the edges of a cube are the same length.\n\n$V = l^3 = ${s} \\times ${s} \\times ${s} = ${s * s} \\times ${s} = ${s ** 3}$\n\nThe volume is **${s ** 3} ${cube(u)}**.`,
        };
      }
      const l = rng.int(3, 9);
      const w = rng.int(2, 6);
      const h = rng.int(2, 6);
      return {
        type: 'numeric',
        prompt: 'Find the volume of this rectangular prism.',
        figure: { svg: boxFigure(l, w, h, { l: `${l} ${u}`, w: `${w} ${u}`, h: `${h} ${u}` }), alt: `A rectangular prism ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high.` },
        answer: l * w * h,
        units: cube(u),
        calculator: 'not-allowed',
        hints: volumeHints(false),
        solution: `$V = lwh = ${lwhWorking(l, w, h).slice(1)}\n\nThe volume is **${l * w * h} ${cube(u)}**. Volume is three-dimensional, so the units are cubed.`,
      };
    }
    if (difficulty === 2) {
      const obj = rng.pick(OBJECTS);
      const big = obj === 'shipping container';
      const u = big ? 'm' : 'cm';
      const l = big ? rng.int(6, 12) : rng.int(8, 15);
      const w = big ? rng.int(2, 3) : rng.int(4, 10);
      const h = big ? rng.int(2, 3) : rng.pick([2, 3, 4, 5, 10]);
      return {
        type: 'numeric',
        prompt: `A ${obj} is a rectangular prism. It is ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high. What is its volume?`,
        figure: { svg: boxFigure(l, w, h, { l: `${l} ${u}`, w: `${w} ${u}`, h: `${h} ${u}` }), alt: `A rectangular prism ${l} ${u} long, ${w} ${u} wide and ${h} ${u} high.` },
        answer: l * w * h,
        units: cube(u),
        calculator: 'not-allowed',
        hints: [volumeHints(false)[1]!, 'Multiply two of the lengths first, then multiply the answer by the third.'],
        solution: `$V = lwh = ${lwhWorking(l, w, h).slice(1)}\n\nThe volume is **${l * w * h} ${cube(u)}**.`,
      };
    }
    // difficulty 3: halves, or mixed units
    if (rng.chance(0.5)) {
      const room = rng.chance(0.5);
      const u = room ? 'm' : 'cm';
      const l = room ? rng.int(6, 9) + 0.5 : rng.int(2, 9) + 0.5;
      const w = room ? rng.pick([4, 6, 8]) : rng.pick([2, 4, 6]);
      const h = room ? 3 : rng.int(2, 5);
      const V = clean(l * w * h);
      return {
        type: 'numeric',
        prompt: room
          ? `A classroom is shaped like a rectangular prism. It is ${num(l)} m long, ${w} m wide and ${h} m high. What volume of air is inside it?`
          : `A block of wood is a rectangular prism ${num(l)} cm long, ${w} cm wide and ${h} cm high. What is its volume?`,
        figure: { svg: boxFigure(l, w, h, { l: `${num(l)} ${u}`, w: `${w} ${u}`, h: `${h} ${u}` }), alt: `A rectangular prism ${num(l)} ${u} long, ${w} ${u} wide and ${h} ${u} high.` },
        answer: V,
        units: cube(u),
        calculator: 'not-allowed',
        hints: ['$V = l \\times w \\times h$. You can multiply in any order.', `Multiply ${num(l)} by the even number first, so the half disappears.`],
        solution: `Multiply in a helpful order: $${tex(l)} \\times ${w} = ${tex(clean(l * w))}$, then $${tex(clean(l * w))} \\times ${h} = ${tex(V)}$.\n\nThe volume is **${num(V)} ${cube(u)}**.`,
      };
    }
    const wCm = rng.pick([20, 30, 40, 50]);
    const hCm = rng.pick([10, 20, 30]);
    const V = 100 * wCm * hCm;
    return {
      type: 'numeric',
      prompt: `A wooden box is 1 m long, ${wCm} cm wide and ${hCm} cm high. What is its volume in cubic centimetres (cm³)?`,
      figure: { svg: boxFigure(100, wCm, hCm, { l: '1 m', w: `${wCm} cm`, h: `${hCm} cm` }), alt: `A rectangular prism 1 m long, ${wCm} cm wide and ${hCm} cm high.` },
      answer: V,
      units: 'cm³',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['All the lengths must be in the same unit before you multiply.', 'How many centimetres are in 1 metre?'],
      solution: `First change 1 m into centimetres: 1 m = 100 cm.\n\n$V = 100 \\times ${wCm} \\times ${hCm} = ${tex(100 * wCm)} \\times ${hCm} = ${tex(V)}$\n\nThe volume is **${num(V)} cm³**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Working backwards to a missing length
// ---------------------------------------------------------------------------------------------

/** [a, b, c, edge] where a × b × c = edge³. */
const SAME_AS_CUBE: Array<[number, number, number, number]> = [
  [1, 2, 4, 2],
  [1, 3, 9, 3],
  [2, 4, 8, 4],
  [1, 4, 16, 4],
  [2, 2, 16, 4],
  [3, 8, 9, 6],
  [4, 6, 9, 6],
  [2, 9, 12, 6],
  [3, 4, 18, 6],
  [3, 6, 12, 6],
  [4, 8, 16, 8],
  [2, 16, 16, 8],
  [4, 10, 25, 10],
  [5, 10, 20, 10],
  [2, 20, 25, 10],
];

export const missingDimension: QuestionTemplate = {
  id: 'm7.mea.volume.missing-dimension',
  topicId: 'm7.mea.volume',
  title: 'Find a missing length from the volume',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    if (difficulty === 3) {
      const l = rng.int(3, 12);
      const w = rng.int(2, 8);
      const h = rng.int(2, 9);
      const V = l * w * h;
      if (rng.chance(0.6)) {
        return {
          type: 'numeric',
          prompt: `This rectangular prism has a volume of ${V} ${cube(u)}. It is ${l} ${u} long and ${w} ${u} wide. How high is it?`,
          figure: { svg: boxFigure(l, w, h, { l: `${l} ${u}`, w: `${w} ${u}`, h: `? ${u}` }), alt: `A rectangular prism ${l} ${u} long and ${w} ${u} wide with an unknown height. Its volume is ${V} ${cube(u)}.` },
          answer: h,
          units: u,
          calculator: 'not-allowed',
          hints: ['$V = l \\times w \\times h$. Multiply the length and the width first.', 'Then ask: what number times that gives the volume?'],
          solution: `$l \\times w = ${l} \\times ${w} = ${l * w}$\n\nSo $${l * w} \\times h = ${V}$, and $h = ${V} \\div ${l * w} = ${h}$.\n\nThe height is **${h} ${u}**. Check: ${lwhWorking(l, w, h)} ✓`,
        };
      }
      const A = l * w;
      return {
        type: 'numeric',
        prompt: `The base of a rectangular prism has an area of ${A} ${u}². The volume of the prism is ${V} ${cube(u)}. How high is the prism?`,
        answer: h,
        units: u,
        calculator: 'not-allowed',
        hints: ['Volume = area of the base × height.', 'Divide the volume by the area of the base.'],
        solution: `$V = \\text{base area} \\times h$, so $h = ${V} \\div ${A} = ${h}$.\n\nThe height is **${h} ${u}**.`,
      };
    }
    if (rng.chance(0.55)) {
      const s = rng.int(2, 10);
      const V = s ** 3;
      return {
        type: 'numeric',
        prompt: `A cube has a volume of ${num(V)} ${cube(u)}. How long is each edge?`,
        figure: { svg: boxFigure(4, 4, 4, { l: `? ${u}` }), alt: `A cube with an unknown edge length. Its volume is ${num(V)} ${cube(u)}.` },
        answer: s,
        units: u,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['For a cube, $V = l \\times l \\times l$.', `Try whole numbers: which number multiplied by itself, and then by itself again, gives ${num(V)}?`],
        solution: `We need a number $l$ with $l \\times l \\times l = ${tex(V)}$.\n\n$${s} \\times ${s} \\times ${s} = ${s * s} \\times ${s} = ${tex(V)}$ ✓\n\nEach edge is **${s} ${u}**.`,
      };
    }
    const [a, b, c, e] = rng.pick(SAME_AS_CUBE);
    const dims = rng.shuffle([a, b, c]);
    const V = a * b * c;
    return {
      type: 'numeric',
      prompt: `A rectangular prism is ${dims[0]} ${u} by ${dims[1]} ${u} by ${dims[2]} ${u}. A cube has exactly the same volume. How long is each edge of the cube?`,
      answer: e,
      units: u,
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Find the volume of the prism first.', 'Then find a number that, multiplied by itself three times, gives that volume.'],
      solution: `Volume of the prism: $${dims[0]} \\times ${dims[1]} \\times ${dims[2]} = ${V}$ ${cube(u)}.\n\nThe cube's edge $l$ must have $l \\times l \\times l = ${V}$. Since $${e} \\times ${e} \\times ${e} = ${V}$, each edge is **${e} ${u}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Step-shaped prisms made of two boxes
// ---------------------------------------------------------------------------------------------

export const compositeVolume: QuestionTemplate = {
  id: 'm7.mea.volume.composite',
  topicId: 'm7.mea.volume',
  title: 'Volume of a shape made from two rectangular prisms',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    const H = rng.int(4, 8);
    const W = rng.int(Math.max(4, H - 2), Math.min(10, H + 3));
    const a = rng.int(2, W - 2);
    const b = rng.int(Math.ceil(0.45 * H), H - 1);
    const D = rng.int(2, 6);
    const tall = (W - a) * H * D;
    const low = a * (H - b) * D;
    const V = tall + low;
    const L = (n: number) => `${n} ${u}`;
    const steps = [
      `Split the shape into two rectangular prisms with a vertical cut.`,
      `Tall part: $${W - a} \\times ${H} \\times ${D} = ${tall}$ ${cube(u)}`,
      `Low part: $${a} \\times ${H - b} \\times ${D} = ${low}$ ${cube(u)}`,
      `Total: $${tall} + ${low} = ${V}$ ${cube(u)}`,
    ];
    if (difficulty === 4) {
      return {
        type: 'numeric',
        prompt: 'This step shape is made from two rectangular prisms. Find its total volume.',
        figure: {
          svg: stepPrismFigure(W, H, a, b, D, { bottom: L(W), left: L(H), top: L(W - a), stepAcross: L(a), right: L(H - b), depth: L(D) }),
          alt: `A step-shaped solid ${D} ${u} deep. The front face is ${W} ${u} wide at the bottom and ${H} ${u} high on the left. The tall part is ${W - a} ${u} wide; the low part is ${a} ${u} wide and ${H - b} ${u} high.`,
        },
        answer: V,
        units: cube(u),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Split the shape into two boxes.', 'Find the volume of each box with $V = l \\times w \\times h$, then add them.'],
        solution: steps.join('\n\n'),
      };
    }
    return {
      type: 'numeric',
      prompt: 'This step shape is made from two rectangular prisms. Some lengths are not shown. Find its total volume.',
      figure: {
        svg: stepPrismFigure(W, H, a, b, D, { bottom: L(W), left: L(H), top: L(W - a), right: L(H - b), depth: L(D) }),
        alt: `A step-shaped solid ${D} ${u} deep. The front face is ${W} ${u} wide at the bottom and ${H} ${u} high on the left. The top of the tall part is ${W - a} ${u} wide and the right side of the low part is ${H - b} ${u} high.`,
      },
      answer: V,
      units: cube(u),
      marks: 3,
      calculator: 'not-allowed',
      hints: ['Work out the missing lengths first: the low part is the bottom width take away the top width.', 'Then split the shape into two boxes and add their volumes.'],
      solution: [
        `Missing lengths: the low part is $${W} - ${W - a} = ${a}$ ${u} wide. Its height is shown: ${H - b} ${u}.`,
        ...steps,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Capacity: 1 cm³ = 1 mL and 1000 cm³ = 1 L
// ---------------------------------------------------------------------------------------------

export const capacity: QuestionTemplate = {
  id: 'm7.mea.volume.capacity',
  topicId: 'm7.mea.volume',
  title: 'Capacity: connect cm³ with millilitres and litres',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const capHints = ['1 cm³ holds exactly 1 mL of water.', '1000 mL = 1 L, so 1000 cm³ = 1 L.'];
    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        const toL = rng.chance(0.5);
        const litres = clean(rng.int(1, 9) + rng.pick([0, 0.25, 0.5, 0.75, 0.2, 0.4]));
        const cm3 = clean(litres * 1000);
        return {
          type: 'numeric',
          prompt: toL ? `A jug holds ${num(cm3)} cm³ of water. How many litres is that?` : `A bottle holds ${num(litres)} L. What is that in cubic centimetres (cm³)?`,
          answer: toL ? litres : cm3,
          units: toL ? 'L' : 'cm³',
          calculator: 'not-allowed',
          hints: capHints,
          solution: toL
            ? `1000 cm³ = 1 L, so divide by 1000: $${tex(cm3)} \\div 1000 = ${tex(litres)}$.\n\nThe jug holds **${num(litres)} L**.`
            : `1 L = 1000 cm³, so multiply by 1000: $${tex(litres)} \\times 1000 = ${tex(cm3)}$.\n\nThe bottle holds **${num(cm3)} cm³**.`,
        };
      }
      const l = rng.int(4, 12);
      const w = rng.int(3, 8);
      const h = rng.pick([5, 10, 2, 4]);
      const V = l * w * h;
      return {
        type: 'numeric',
        prompt: `A small container is a rectangular prism ${l} cm long, ${w} cm wide and ${h} cm high. How many millilitres of water does it hold when it is full?`,
        figure: { svg: boxFigure(l, w, h, { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }), alt: `A rectangular container ${l} cm long, ${w} cm wide and ${h} cm high.` },
        answer: V,
        units: 'mL',
        calculator: 'not-allowed',
        hints: ['Find the volume in cm³ first.', '1 cm³ holds 1 mL.'],
        solution: `$V = ${lwhWorking(l, w, h).slice(1)} cm³.\n\nEach cm³ holds 1 mL, so it holds **${V} mL**.`,
      };
    }
    const name = rng.pick(NAMES);
    const l = rng.pick([30, 40, 50, 60]);
    const w = rng.pick([20, 25, 30]);
    const h = rng.pick([20, 25, 30, 40]);
    if (difficulty === 4) {
      const V = l * w * h;
      const litres = clean(V / 1000);
      return {
        type: 'numeric',
        prompt: `${name}'s fish tank is a rectangular prism ${l} cm long, ${w} cm wide and ${h} cm high. How many litres of water does it hold when it is full?`,
        figure: { svg: boxFigure(l, w, h, { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }), alt: `A fish tank ${l} cm long, ${w} cm wide and ${h} cm high.` },
        answer: litres,
        units: 'L',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the volume in cm³ first.', '1000 cm³ holds 1 litre, so divide by 1000.'],
        solution: `$V = ${lwhWorking(l, w, h).slice(1)} cm³.\n\n1000 cm³ = 1 L, so $${tex(V)} \\div 1000 = ${tex(litres)}$.\n\nThe tank holds **${num(litres)} L**.`,
      };
    }
    // difficulty 5: how deep is the water, or how much more is needed?
    const base = l * w;
    if (rng.chance(0.5)) {
      // Choose the depth first so the litres come out as a friendly number.
      let d = rng.int(4, h - 4);
      while ((base * d) % 100 !== 0) d++;
      const litres = clean((base * d) / 1000);
      return {
        type: 'numeric',
        prompt: `An empty fish tank is ${l} cm long and ${w} cm wide. ${name} pours in ${num(litres)} litres of water. How deep is the water?`,
        answer: d,
        units: 'cm',
        marks: 3,
        calculator: 'not-allowed',
        hints: ['Change the litres into cm³ first (1 L = 1000 cm³).', 'The water is a rectangular prism too: volume = length × width × depth.'],
        solution: `${num(litres)} L = $${tex(litres)} \\times 1000 = ${tex(base * d)}$ cm³.\n\nThe base of the tank is $${l} \\times ${w} = ${tex(base)}$ cm².\n\nDepth $= ${tex(base * d)} \\div ${tex(base)} = ${d}$ cm.\n\nThe water is **${d} cm** deep.`,
      };
    }
    let d = rng.int(5, h - 5);
    while ((base * (h - d)) % 100 !== 0) d--;
    const more = clean((base * (h - d)) / 1000);
    return {
      type: 'numeric',
      prompt: `A fish tank is ${l} cm long, ${w} cm wide and ${h} cm high. The water in it is ${d} cm deep. How many more litres of water are needed to fill it to the top?`,
      figure: { svg: boxFigure(l, w, h, { l: `${l} cm`, w: `${w} cm`, h: `${h} cm` }), alt: `A fish tank ${l} cm long, ${w} cm wide and ${h} cm high.` },
      answer: more,
      units: 'L',
      marks: 3,
      calculator: 'not-allowed',
      hints: ['How many centimetres of the tank are still empty?', 'Find the volume of the empty part in cm³, then change it to litres.'],
      solution: `The empty part is $${h} - ${d} = ${h - d}$ cm deep.\n\nIts volume: $${l} \\times ${w} \\times ${h - d} = ${tex(base)} \\times ${h - d} = ${tex(base * (h - d))}$ cm³.\n\n$${tex(base * (h - d))} \\div 1000 = ${tex(more)}$, so **${num(more)} L** more is needed.`,
    };
  },
};

export const templates: QuestionTemplate[] = [countCubes, prismVolume, missingDimension, compositeVolume, capacity];
