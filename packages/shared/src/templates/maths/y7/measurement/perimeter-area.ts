import type { QuestionTemplate } from '../../../types';
import { clean, NAMES, num, tex } from '../../../format';
import { line, rightAngleMark, type Pt } from '../../../svg';
import {
  dimensionLine,
  edgeLabel,
  HEIGHT_COLOUR,
  rectFigure,
  shapeFigure,
  triangleFigure,
} from './perimeter-area-helpers';

// m7.mea.perimeter-area — P = 4l, P = 2(l + w), A = l², A = lw, A = ½bh, working backwards to a
// missing side, and composite shapes made of rectangles and triangles. Answers are chosen first
// so they come out as whole numbers (or simple decimals) that can be found without a calculator.

const T = { cm: 'cm', m: 'm' } as const;
type Unit = keyof typeof T;
const sq = (u: string) => `${u}²`;

const areaHints = (shape: 'square' | 'rectangle') => [
  'Area is the amount of flat space inside a shape. It is measured in square units.',
  shape === 'square' ? 'For a square, $A = l^2$, which means $l \\times l$.' : 'For a rectangle, $A = l \\times w$.',
];

// ---------------------------------------------------------------------------------------------
// Squares and rectangles
// ---------------------------------------------------------------------------------------------

// The sizes below are shared by every context, so each context has to make sense from about 3 × 2 up to 40 × 39.
// minL: only use this context when the length is at least this big (a car park smaller than a car would be silly).
const PERIMETER_CONTEXTS: Array<{ unit: Unit; minL?: number; text: (l: string, w: string, name: string) => string }> = [
  { unit: 'm', text: (l, w, name) => `A rectangular vegetable garden is ${l} m long and ${w} m wide. ${name} wants to put a fence all the way around it. How many metres of fencing are needed?` },
  { unit: 'cm', text: (l, w) => `A rectangular photo is ${l} cm long and ${w} cm wide. How much ribbon is needed to go once around its edge?` },
  { unit: 'm', text: (l, w, name) => `A rectangular playground is ${l} m long and ${w} m wide. ${name} runs one lap around the edge. How far is that?` },
  { unit: 'cm', text: (l, w) => `A rectangular piece of card is ${l} cm long and ${w} cm wide. How much border strip is needed to go all the way around it?` },
  { unit: 'm', minL: 10, text: (l, w) => `A rectangular marae car park is ${l} m long and ${w} m wide. How long is its edge all the way round?` },
];

const AREA_CONTEXTS: Array<{ unit: Unit; text: (l: string, w: string, name: string) => string }> = [
  { unit: 'm', text: (l, w) => `A rectangular patio is ${l} m long and ${w} m wide. How many square metres of paving are needed to cover it?` },
  { unit: 'm', text: (l, w, name) => `${name} is mowing a rectangular lawn that is ${l} m long and ${w} m wide. What area does ${name} mow?` },
  { unit: 'm', text: (l, w) => `A rectangular wall is ${l} m long and ${w} m high. What area needs painting?` },
  { unit: 'cm', text: (l, w) => `A rectangular sticker is ${l} cm long and ${w} cm wide. What is its area?` },
  { unit: 'm', text: (l, w) => `A rectangular deck is ${l} m long and ${w} m wide. What is the area of the deck?` },
];

export const rectangleSquare: QuestionTemplate = {
  id: 'm7.mea.perimeter-area.rectangle-square',
  topicId: 'm7.mea.perimeter-area',
  title: 'Perimeter and area of squares and rectangles',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const ask = rng.pick(['perimeter', 'area'] as const);
    if (difficulty === 1) {
      const unit = rng.pick(['cm', 'm'] as const);
      const square = rng.chance(0.3);
      const l = rng.int(3, 12);
      const w = square ? l : rng.int(2, l - 1);
      const shape = square ? 'square' : 'rectangle';
      const figure = {
        svg: square
          ? rectFigure(l, l, { bottom: `${l} ${unit}` }, { square: true })
          : rectFigure(l, w, { bottom: `${l} ${unit}`, right: `${w} ${unit}` }),
        alt: square ? `A square with sides of ${l} ${unit}.` : `A rectangle ${l} ${unit} long and ${w} ${unit} wide.`,
      };
      if (ask === 'perimeter') {
        const ans = square ? 4 * l : 2 * (l + w);
        return {
          type: 'numeric',
          prompt: `Find the perimeter of this ${shape}.`,
          figure,
          answer: ans,
          units: unit,
          calculator: 'not-allowed',
          hints: [
            'Perimeter is the total distance all the way around the outside of a shape.',
            square ? 'A square has four equal sides, so $P = 4l$.' : 'A rectangle has two lengths and two widths, so $P = 2(l + w)$.',
          ],
          solution: square
            ? `All four sides are ${l} ${unit}.\n\n$P = 4l = 4 \\times ${l} = ${ans}$\n\nThe perimeter is **${ans} ${unit}**.`
            : `$P = 2(l + w) = 2(${l} + ${w}) = 2 \\times ${l + w} = ${ans}$\n\nThe perimeter is **${ans} ${unit}**.`,
        };
      }
      const ans = l * w;
      return {
        type: 'numeric',
        prompt: `Find the area of this ${shape}.`,
        figure,
        answer: ans,
        units: sq(unit),
        calculator: 'not-allowed',
        hints: areaHints(shape),
        solution: `${square ? `$A = l^2 = ${l} \\times ${l} = ${ans}$` : `$A = lw = ${l} \\times ${w} = ${ans}$`}\n\nThe area is **${ans} ${sq(unit)}**. Area is two-dimensional, so the units are squared.`,
      };
    }
    // difficulty 2: word problems, bigger numbers and halves.
    const name = rng.pick(NAMES);
    if (rng.chance(0.2)) {
      if (ask === 'perimeter') {
        const s = rng.int(9, 19) * 5;
        return {
          type: 'numeric',
          prompt: `A square table has sides of ${s} cm. How long is the edge of the table all the way round?`,
          answer: 4 * s,
          units: 'cm',
          calculator: 'not-allowed',
          hints: ['The distance all the way round is the perimeter.', 'A square has four equal sides.'],
          solution: `$P = 4l = 4 \\times ${s} = ${4 * s}$\n\nThe edge is **${4 * s} cm** long.`,
        };
      }
      const s = rng.int(5, 12);
      return {
        type: 'numeric',
        prompt: `A square vegetable patch has sides of ${s} m. What is its area?`,
        answer: s * s,
        units: 'm²',
        calculator: 'not-allowed',
        hints: areaHints('square'),
        solution: `$A = l^2 = ${s} \\times ${s} = ${s * s}$\n\nThe area is **${s * s} m²**.`,
      };
    }
    if (ask === 'perimeter') {
      const half = rng.chance(0.35);
      const l = half ? rng.int(4, 15) + 0.5 : rng.int(8, 40);
      const w = rng.int(3, Math.max(3, Math.floor(l) - 1));
      const ctx = rng.pick(PERIMETER_CONTEXTS.filter((c) => l >= (c.minL ?? 0)));
      const ans = clean(2 * (l + w));
      return {
        type: 'numeric',
        prompt: ctx.text(num(l), num(w), name),
        answer: ans,
        units: ctx.unit,
        calculator: 'not-allowed',
        hints: ['All the way around the edge is the perimeter.', 'Add the length and the width, then double it.'],
        solution: `$P = 2(l + w) = 2(${tex(l)} + ${w}) = 2 \\times ${tex(clean(l + w))} = ${tex(ans)}$\n\nThe answer is **${num(ans)} ${ctx.unit}**.`,
      };
    }
    const ctx = rng.pick(AREA_CONTEXTS);
    const half = rng.chance(0.35);
    const l = half ? rng.int(2, 9) + 0.5 : rng.int(11, 25);
    const w = half ? rng.pick([2, 4, 6, 8]) : rng.int(2, 9);
    const ans = clean(l * w);
    const working = half
      ? `$A = lw = ${tex(l)} \\times ${w}$. Half of ${w} is ${w / 2}, so $${tex(l)} \\times ${w} = ${Math.floor(l)} \\times ${w} + ${w / 2} = ${Math.floor(l) * w} + ${w / 2} = ${ans}$`
      : `$A = lw = ${l} \\times ${w} = ${ans}$`;
    return {
      type: 'numeric',
      prompt: ctx.text(num(l), num(w), name),
      answer: ans,
      units: sq(ctx.unit),
      calculator: 'not-allowed',
      hints: areaHints('rectangle'),
      solution: `${working}\n\nThe area is **${num(ans)} ${sq(ctx.unit)}**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Working backwards to a missing side
// ---------------------------------------------------------------------------------------------

export const missingSide: QuestionTemplate = {
  id: 'm7.mea.perimeter-area.missing-side',
  topicId: 'm7.mea.perimeter-area',
  title: 'Find a missing side from the perimeter or area',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    const kinds =
      difficulty === 2
        ? (['squareFromP', 'rectWFromA'] as const)
        : difficulty === 3
          ? (['rectWFromP', 'squareFromA'] as const)
          : (['triBase', 'triHeight', 'twoStep'] as const);
    const kind = rng.pick<(typeof kinds)[number]>(kinds);
    if (kind === 'squareFromP') {
      const s = rng.int(3, 25);
      const P = 4 * s;
      return {
        type: 'numeric',
        prompt: `A square has a perimeter of ${P} ${u}. How long is each side?`,
        figure: { svg: rectFigure(4, 4, { bottom: `? ${u}` }, { square: true, inside: `P = ${P} ${u}` }), alt: `A square with a perimeter of ${P} ${u}. The side length is unknown.` },
        answer: s,
        units: u,
        calculator: 'not-allowed',
        hints: ['All four sides of a square are the same length.', 'Use $P = 4l$ and work backwards: what number times 4 gives the perimeter?'],
        solution: `$P = 4l$, so $l = P \\div 4$.\n\n$l = ${P} \\div 4 = ${s}$\n\nEach side is **${s} ${u}**. Check: $4 \\times ${s} = ${P}$ ✓`,
      };
    }
    if (kind === 'rectWFromA') {
      const l = rng.int(4, 12);
      const w = rng.int(2, l - 1);
      const A = l * w;
      return {
        type: 'numeric',
        prompt: `This rectangle has an area of ${A} ${sq(u)}. Its length is ${l} ${u}. What is its width?`,
        figure: { svg: rectFigure(l, w, { bottom: `${l} ${u}`, right: `? ${u}` }, { inside: `Area = ${A} ${sq(u)}` }), alt: `A rectangle with length ${l} ${u} and area ${A} ${sq(u)}. The width is unknown.` },
        answer: w,
        units: u,
        calculator: 'not-allowed',
        hints: ['The area of a rectangle is $A = l \\times w$.', `What number multiplied by ${l} gives ${A}?`],
        solution: `$A = lw$, so $w = A \\div l$.\n\n$w = ${A} \\div ${l} = ${w}$\n\nThe width is **${w} ${u}**. Check: $${l} \\times ${w} = ${A}$ ✓`,
      };
    }
    if (kind === 'rectWFromP') {
      const l = rng.int(5, 20);
      const w = rng.int(2, l - 1);
      const P = 2 * (l + w);
      return {
        type: 'numeric',
        prompt: `This rectangle has a perimeter of ${P} ${u}. Its length is ${l} ${u}. What is its width?`,
        figure: { svg: rectFigure(l, w, { bottom: `${l} ${u}`, right: `? ${u}` }, { inside: `Perimeter = ${P} ${u}` }), alt: `A rectangle with length ${l} ${u} and perimeter ${P} ${u}. The width is unknown.` },
        answer: w,
        units: u,
        calculator: 'not-allowed',
        hints: ['The perimeter is two lengths plus two widths: $P = 2(l + w)$.', 'Halve the perimeter to get one length plus one width.'],
        solution: `$P = 2(l + w)$, so $l + w$ is half of ${P}, which is ${P / 2}.\n\n$w = ${P / 2} - ${l} = ${w}$\n\nThe width is **${w} ${u}**. Check: $2(${l} + ${w}) = ${P}$ ✓`,
      };
    }
    if (kind === 'squareFromA') {
      const s = rng.int(2, 12);
      const A = s * s;
      return {
        type: 'numeric',
        prompt: `A square has an area of ${A} ${sq(u)}. How long is each side?`,
        figure: { svg: rectFigure(4, 4, { bottom: `? ${u}` }, { square: true, inside: `Area = ${A} ${sq(u)}` }), alt: `A square with an area of ${A} ${sq(u)}. The side length is unknown.` },
        answer: s,
        units: u,
        calculator: 'not-allowed',
        hints: ['For a square, $A = l \\times l$.', `Which number multiplied by itself gives ${A}?`],
        solution: `$A = l^2$, so $l \\times l = ${A}$.\n\n$${s} \\times ${s} = ${A}$, so $l = \\sqrt{${A}} = ${s}$.\n\nEach side is **${s} ${u}**.`,
      };
    }
    if (kind === 'triBase' || kind === 'triHeight') {
      let b = rng.int(4, 16);
      const h = rng.int(3, 12);
      if ((b * h) % 2) b += 1;
      const A = (b * h) / 2;
      const p = Math.round(b * (0.3 + 0.4 * rng.next()));
      const findBase = kind === 'triBase';
      const known = findBase ? h : b;
      const ans = findBase ? b : h;
      return {
        type: 'numeric',
        prompt: `This triangle has an area of ${A} ${sq(u)}. Its ${findBase ? 'perpendicular height' : 'base'} is ${known} ${u}. What is its ${findBase ? 'base' : 'perpendicular height'}?`,
        figure: {
          svg: triangleFigure(b, h, p, {
            base: findBase ? `? ${u}` : `${b} ${u}`,
            height: findBase ? `${h} ${u}` : `? ${u}`,
          }),
          alt: `A triangle with area ${A} ${sq(u)}, ${findBase ? `perpendicular height ${h} ${u} and an unknown base` : `base ${b} ${u} and an unknown perpendicular height`}.`,
        },
        answer: ans,
        units: u,
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          'The area of a triangle is $A = \\frac{1}{2}bh$. So base × height is double the area.',
          `Double the area first, then divide by the ${findBase ? 'height' : 'base'}.`,
        ],
        solution: `$A = \\frac{1}{2}bh$, so $b \\times h = 2 \\times ${A} = ${2 * A}$.\n\n${findBase ? `$b = ${2 * A} \\div ${h} = ${b}$` : `$h = ${2 * A} \\div ${b} = ${h}$`}\n\nThe ${findBase ? 'base' : 'perpendicular height'} is **${ans} ${u}**. Check: $\\frac{1}{2} \\times ${b} \\times ${h} = ${A}$ ✓`,
      };
    }
    // two steps: perimeter and length → width → area
    const l = rng.int(8, 20);
    const w = rng.int(3, l - 2);
    const P = 2 * (l + w);
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `${name}'s whānau has a rectangular paddock with a perimeter of ${P} m. The paddock is ${l} m long. What is its area?`,
      answer: l * w,
      units: 'm²',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['You need the width before you can find the area.', 'Half the perimeter is one length plus one width.'],
      solution: `Half of ${P} is ${P / 2}, so $l + w = ${P / 2}$ and $w = ${P / 2} - ${l} = ${w}$ m.\n\n$A = lw = ${l} \\times ${w} = ${l * w}$\n\nThe area is **${l * w} m²**.`,
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Area of a triangle
// ---------------------------------------------------------------------------------------------

/** [height, offset of the apex from the left corner, slanted side] — whole-number right triangles. */
const SLANTS: Array<[number, number, number]> = [
  [4, 3, 5],
  [3, 4, 5],
  [8, 6, 10],
  [6, 8, 10],
  [12, 5, 13],
  [5, 12, 13],
  [12, 9, 15],
  [9, 12, 15],
  [8, 15, 17],
  [15, 8, 17],
];

const TRIANGLE_CONTEXTS: Array<{ unit: Unit; text: (b: number, h: number) => string }> = [
  { unit: 'm', text: (b, h) => `A triangular sail has a base of ${b} m and a perpendicular height of ${h} m. What is the area of the sail?` },
  { unit: 'cm', text: (b, h) => `A triangular school flag has a base of ${b} cm and a perpendicular height of ${h} cm. What is its area?` },
  { unit: 'm', text: (b, h) => `A triangular garden bed has a base of ${b} m and a perpendicular height of ${h} m. What area of soil does it cover?` },
  { unit: 'cm', text: (b, h) => `A triangle of fabric for a quilt has a base of ${b} cm and a perpendicular height of ${h} cm. What is its area?` },
];

export const triangleArea: QuestionTemplate = {
  id: 'm7.mea.perimeter-area.triangle-area',
  topicId: 'm7.mea.perimeter-area',
  title: 'Area of a triangle (A = ½bh)',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    const hints = ['A triangle is half of a rectangle with the same base and height.', 'Use $A = \\frac{1}{2}bh$, where $h$ is the perpendicular height.'];
    const sol = (b: number, h: number, unit: string, pre = '') =>
      `${pre}$A = \\frac{1}{2}bh = \\frac{1}{2} \\times ${b} \\times ${h} = \\frac{1}{2} \\times ${b * h} = ${(b * h) / 2}$\n\nThe area is **${(b * h) / 2} ${sq(unit)}**.`;
    if (difficulty === 2) {
      let b = rng.int(4, 16);
      const h = rng.int(3, 12);
      if ((b * h) % 2) b += 1;
      const shape = rng.pick(['left', 'right', 'inside', 'inside'] as const);
      const p = shape === 'left' ? 0 : shape === 'right' ? b : Math.max(1, Math.min(b - 1, Math.round(b * (0.25 + 0.5 * rng.next()))));
      return {
        type: 'numeric',
        prompt: 'Find the area of this triangle.',
        figure: { svg: triangleFigure(b, h, p, { base: `${b} ${u}`, height: `${h} ${u}` }), alt: `A triangle with base ${b} ${u} and perpendicular height ${h} ${u}.` },
        answer: (b * h) / 2,
        units: sq(u),
        calculator: 'not-allowed',
        hints,
        solution: sol(b, h, u),
      };
    }
    const kind = rng.pick(['slant', 'threeSides', 'word'] as const);
    if (kind === 'slant') {
      const [h, p, s] = rng.pick(SLANTS);
      let b = p + rng.int(2, 8);
      if ((b * h) % 2) b += 1;
      return {
        type: 'numeric',
        prompt: 'Find the area of this triangle.',
        figure: { svg: triangleFigure(b, h, p, { base: `${b} ${u}`, height: `${h} ${u}`, left: `${s} ${u}` }), alt: `A triangle with base ${b} ${u}, a slanted side of ${s} ${u}, and a dashed perpendicular height of ${h} ${u}.` },
        answer: (b * h) / 2,
        units: sq(u),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The height must be perpendicular (at right angles) to the base.', 'One of the lengths shown is not needed.'],
        solution: sol(b, h, u, `The ${s} ${u} side is slanted, so it is not the height. The perpendicular height is the dashed line, ${h} ${u}.\n\n`),
      };
    }
    if (kind === 'threeSides') {
      const k = rng.pick([1, 1, 2]);
      const [a0, c0, h0] = rng.pick([
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [6, 8, 10],
      ] as const);
      const [b, h, s] = rng.chance(0.5) ? [a0 * k, c0 * k, h0 * k] : [c0 * k, a0 * k, h0 * k];
      const atLeft = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: 'Find the area of this right-angled triangle.',
        figure: {
          svg: triangleFigure(b, h, atLeft ? 0 : b, {
            base: `${b} ${u}`,
            height: `${h} ${u}`,
            ...(atLeft ? { right: `${s} ${u}` } : { left: `${s} ${u}` }),
          }),
          alt: `A right-angled triangle with sides ${b} ${u}, ${h} ${u} and ${s} ${u}. The right angle is between the ${b} ${u} and ${h} ${u} sides.`,
        },
        answer: (b * h) / 2,
        units: sq(u),
        marks: 2,
        calculator: 'not-allowed',
        hints: ['In a right-angled triangle, the two sides that meet at the right angle are the base and the height.', 'The longest side is slanted, so you do not need it for the area.'],
        solution: sol(b, h, u, `The ${b} ${u} and ${h} ${u} sides meet at the right angle, so they are the base and the perpendicular height. The ${s} ${u} side is not needed.\n\n`),
      };
    }
    const ctx = rng.pick(TRIANGLE_CONTEXTS);
    let b = rng.int(3, 20);
    const h = rng.int(4, 15);
    if ((b * h) % 2) b += 1;
    return {
      type: 'numeric',
      prompt: ctx.text(b, h),
      answer: (b * h) / 2,
      units: sq(ctx.unit),
      calculator: 'not-allowed',
      hints,
      solution: sol(b, h, ctx.unit),
    };
  },
};

// ---------------------------------------------------------------------------------------------
// Composite shapes
// ---------------------------------------------------------------------------------------------

interface LShape {
  W: number;
  H: number;
  a: number;
  b: number;
}

/** L-shape: a W × H rectangle with an a × b piece cut from its top-right corner. */
function lVerts({ W, H, a, b }: LShape): Pt[] {
  return [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H - b },
    { x: W - a, y: H - b },
    { x: W - a, y: H },
    { x: 0, y: H },
  ];
}

function lAreaSteps({ W, H, a, b }: LShape, u: string): string {
  const A1 = (W - a) * H;
  const A2 = a * (H - b);
  return [
    `Split the shape into two rectangles with a vertical line.`,
    `Left rectangle: $${W - a} \\times ${H} = ${A1}$ ${sq(u)}`,
    `Right rectangle: $${a} \\times ${H - b} = ${A2}$ ${sq(u)}`,
    `Total area: $${A1} + ${A2} = ${A1 + A2}$ ${sq(u)}`,
    `(Or: the big rectangle minus the missing corner, $${W} \\times ${H} - ${a} \\times ${b} = ${W * H} - ${a * b} = ${W * H - a * b}$.)`,
  ].join('\n\n');
}

function houseFigure(w: number, h1: number, h2: number, u: string, total?: number): string {
  const verts = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h1 },
    { x: w / 2, y: h1 + h2 },
    { x: 0, y: h1 },
  ];
  return shapeFigure(
    { verts, labels: [`${w} ${u}`, `${h1} ${u}`, null, null, null], rightAngleAt: [0, 1] },
    {
      maxW: 200,
      maxH: 170,
      padLeft: total ? 84 : 70,
      padRight: total ? 70 : 96,
      extra: ({ toPx }) => {
        const L = toPx({ x: 0, y: h1 });
        const R = toPx({ x: w, y: h1 });
        let out = line(L, R, { stroke: '#6b7280', width: 1.2, dash: true });
        if (total) {
          const bottom = toPx({ x: 0, y: 0 });
          const top = toPx({ x: 0, y: h1 + h2 });
          out += dimensionLine({ x: bottom.x - 28, y: bottom.y }, { x: top.x - 28, y: top.y }, `${total} ${u}`, { x: -1, y: 0 });
          out += line({ x: top.x - 34, y: top.y }, toPx({ x: w / 2, y: h1 + h2 }), { stroke: '#d1d5db', width: 1, dash: true });
        } else {
          const foot = toPx({ x: w / 2, y: h1 });
          const apex = toPx({ x: w / 2, y: h1 + h2 });
          out += line(foot, apex, { stroke: HEIGHT_COLOUR, width: 1.6, dash: true });
          out += rightAngleMark(foot, R, apex, 9);
          // The triangle's height as a dimension line to the right, so the label never hits the roof.
          const x = R.x + 30;
          out += line(apex, { x: x + 6, y: apex.y }, { stroke: '#d1d5db', width: 1, dash: true });
          out += dimensionLine({ x, y: R.y }, { x, y: apex.y }, `${h2} ${u}`, { x: 1, y: 0 });
        }
        return out;
      },
    },
  );
}

export const composite: QuestionTemplate = {
  id: 'm7.mea.perimeter-area.composite',
  topicId: 'm7.mea.perimeter-area',
  title: 'Perimeter and area of composite shapes',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const u = rng.pick(['cm', 'm'] as const);
    // Keep the shape's proportions moderate and the step tall enough that its labels never collide.
    const H = rng.int(6, 12);
    const W = rng.int(Math.max(6, Math.ceil(0.7 * H)), Math.min(16, Math.floor(1.6 * H)));
    const a = rng.int(2, W - 3);
    const b = rng.int(Math.ceil(0.45 * H), H - 2);
    const L: LShape = { W, H, a, b };
    const verts = lVerts(L);
    const all = [`${W} ${u}`, `${H - b} ${u}`, `${a} ${u}`, `${b} ${u}`, `${W - a} ${u}`, `${H} ${u}`];
    const four = [`${W} ${u}`, `${H - b} ${u}`, null, null, `${W - a} ${u}`, `${H} ${u}`];
    const altAll = `An L-shaped figure. Going round from the bottom: ${W} ${u}, ${H - b} ${u}, ${a} ${u}, ${b} ${u}, ${W - a} ${u} and ${H} ${u}.`;
    const altFour = `An L-shaped figure. The bottom is ${W} ${u}, the left side is ${H} ${u}, the top is ${W - a} ${u} and the lower right side is ${H - b} ${u}. The two sides of the step are not labelled.`;
    const P = 2 * (W + H);
    if (difficulty === 3) {
      if (rng.chance(0.6)) {
        return {
          type: 'numeric',
          prompt: 'Find the area of this shape.',
          figure: { svg: shapeFigure({ verts, labels: all }), alt: altAll },
          answer: W * H - a * b,
          units: sq(u),
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Split the shape into two rectangles.', 'Find the area of each rectangle, then add them.'],
          solution: lAreaSteps(L, u),
        };
      }
      return {
        type: 'numeric',
        prompt: 'Find the perimeter of this shape.',
        figure: { svg: shapeFigure({ verts, labels: all }), alt: altAll },
        answer: P,
        units: u,
        calculator: 'not-allowed',
        hints: ['The perimeter is the distance all the way around the outside.', 'Add all six sides. Tick each one off as you go so you do not miss any.'],
        solution: `Add all six sides:\n\n$${W} + ${H - b} + ${a} + ${b} + ${W - a} + ${H} = ${P}$\n\nThe perimeter is **${P} ${u}**.`,
      };
    }
    if (difficulty === 4) {
      const kind = rng.pick(['areaFour', 'perimeterFour', 'house', 'lawn'] as const);
      const missing = `First find the missing sides. The step's width is $${W} - ${W - a} = ${a}$ ${u}, and its height is $${H} - ${H - b} = ${b}$ ${u}.`;
      if (kind === 'areaFour') {
        return {
          type: 'numeric',
          prompt: 'Find the area of this shape.',
          figure: { svg: shapeFigure({ verts, labels: four }), alt: altFour },
          answer: W * H - a * b,
          units: sq(u),
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Some sides are not labelled. Use the opposite sides to work them out.', 'Then split the shape into two rectangles.'],
          solution: `${missing}\n\n${lAreaSteps(L, u)}`,
        };
      }
      if (kind === 'perimeterFour') {
        return {
          type: 'numeric',
          prompt: 'Find the perimeter of this shape.',
          figure: { svg: shapeFigure({ verts, labels: four }), alt: altFour },
          answer: P,
          units: u,
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Two sides are not labelled. Compare them with the sides opposite.', 'The bottom side is as long as the two top sides put together.'],
          solution: `${missing}\n\nPerimeter: $${W} + ${H - b} + ${a} + ${b} + ${W - a} + ${H} = ${P}$\n\nThe perimeter is **${P} ${u}**.`,
        };
      }
      if (kind === 'house') {
        let w = rng.int(4, 12);
        const h1 = rng.int(3, 8);
        const h2 = rng.int(2, 6);
        if ((w * h2) % 2) w += 1;
        const rect = w * h1;
        const tri = (w * h2) / 2;
        return {
          type: 'numeric',
          prompt: 'This shape is a rectangle with a triangle on top. Find its total area.',
          figure: { svg: houseFigure(w, h1, h2, u), alt: `A house shape: a rectangle ${w} ${u} wide and ${h1} ${u} high, with a triangle on top whose perpendicular height is ${h2} ${u}.` },
          answer: rect + tri,
          units: sq(u),
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Find the area of the rectangle and the area of the triangle separately.', 'The triangle has the same base as the rectangle.'],
          solution: `Rectangle: $A = lw = ${w} \\times ${h1} = ${rect}$ ${sq(u)}\n\nTriangle: $A = \\frac{1}{2}bh = \\frac{1}{2} \\times ${w} \\times ${h2} = ${tri}$ ${sq(u)}\n\nTotal: $${rect} + ${tri} = ${rect + tri}$ ${sq(u)}`,
        };
      }
      const LW = rng.int(8, 20);
      let LH = rng.int(6, 14);
      if (LH === LW) LH -= 1; // the prompt says "rectangular lawn", so don't make it a square
      const s = rng.int(2, Math.min(LW, LH) - 3);
      const x0 = (LW - s) / 2;
      const y0 = (LH - s) / 2;
      const hole = [
        { x: x0, y: y0 },
        { x: x0 + s, y: y0 },
        { x: x0 + s, y: y0 + s },
        { x: x0, y: y0 + s },
      ];
      return {
        type: 'numeric',
        prompt: `A rectangular lawn is ${LW} m long and ${LH} m wide. A square garden bed with sides of ${s} m is dug in the middle of it. What area of lawn is left?`,
        figure: {
          svg: shapeFigure(
            {
              verts: [
                { x: 0, y: 0 },
                { x: LW, y: 0 },
                { x: LW, y: LH },
                { x: 0, y: LH },
              ],
              labels: [`${LW} m`, `${LH} m`, null, null],
              inside: `${s} m`,
              insideAt: { x: LW / 2, y: LH / 2 },
            },
            { holes: [hole] },
          ),
          alt: `A rectangle ${LW} m by ${LH} m with a white square of side ${s} m in the middle.`,
        },
        answer: LW * LH - s * s,
        units: 'm²',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the area of the whole rectangle first.', 'Then take away the area of the garden bed.'],
        solution: `Whole rectangle: $${LW} \\times ${LH} = ${LW * LH}$ m²\n\nGarden bed: $${s} \\times ${s} = ${s * s}$ m²\n\nLawn left: $${LW * LH} - ${s * s} = ${LW * LH - s * s}$ m²`,
      };
    }
    // difficulty 5
    if (rng.chance(0.5)) {
      const labels = [`x ${u}`, `${H - b} ${u}`, null, null, `${W - a} ${u}`, `${H} ${u}`];
      return {
        type: 'numeric',
        prompt: `The perimeter of this shape is ${P} ${u}. Find the length $x$.`,
        figure: {
          svg: shapeFigure({ verts, labels, inside: `P = ${P} ${u}`, insideAt: { x: (W - a) / 2, y: H / 2.4 } }),
          alt: `An L-shaped figure with perimeter ${P} ${u}. The bottom side is x ${u}, the left side is ${H} ${u}, the top is ${W - a} ${u} and the lower right side is ${H - b} ${u}.`,
        },
        answer: W,
        units: u,
        marks: 3,
        calculator: 'not-allowed',
        hints: [
          'The two vertical sides on the right add up to the left side.',
          'The two horizontal sides at the top add up to the bottom side, $x$. So the perimeter is two lots of $x$ plus two lots of the left side.',
        ],
        solution: `The right-hand vertical sides add up to the left side: ${H} ${u}. The top horizontal sides add up to the bottom: $x$.\n\nSo the perimeter is $2x + 2 \\times ${H} = 2x + ${2 * H}$.\n\n$2x + ${2 * H} = ${P}$, so $2x = ${P - 2 * H}$ and $x = ${W}$.\n\n$x$ = **${W} ${u}**.`,
      };
    }
    let w = rng.int(4, 12);
    const h1 = rng.int(3, 8);
    const h2 = rng.int(2, 6);
    if ((w * h2) % 2) w += 1;
    const total = h1 + h2;
    const rect = w * h1;
    const tri = (w * h2) / 2;
    return {
      type: 'numeric',
      prompt: `This shape is a rectangle with a triangle on top. The whole shape is ${total} ${u} tall. Find its total area.`,
      figure: {
        svg: houseFigure(w, h1, h2, u, total),
        alt: `A house shape ${w} ${u} wide and ${total} ${u} tall altogether. The rectangle part is ${h1} ${u} high, with a triangle on top.`,
      },
      answer: rect + tri,
      units: sq(u),
      marks: 3,
      calculator: 'not-allowed',
      hints: ['Work out the height of the triangle first: it is the total height take away the rectangle height.', 'Then add the area of the rectangle and the area of the triangle.'],
      solution: `Height of the triangle: $${total} - ${h1} = ${h2}$ ${u}\n\nRectangle: $${w} \\times ${h1} = ${rect}$ ${sq(u)}\n\nTriangle: $\\frac{1}{2} \\times ${w} \\times ${h2} = ${tri}$ ${sq(u)}\n\nTotal: $${rect} + ${tri} = ${rect + tri}$ ${sq(u)}`,
    };
  },
};

export const templates: QuestionTemplate[] = [rectangleSquare, missingSide, triangleArea, composite];
