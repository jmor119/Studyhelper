import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { clean, NAMES, num, tex } from '../../../format';
import { FILL, INK, label, line, polygon, rightAngleMark, sideLabel, svgDoc, type Pt } from '../../../svg';
import { labelAway, notToScale } from '../../measurement/figures';

// m6.mea.area-volume — area of rectangles and right-angled triangles (cm², m²) and volume of
// cubes and rectangular prisms (cm³, m³). Year 6: whole numbers, multiplying by at most a
// two-digit number, dividing by a one-digit number.

const sq = (u: string) => `${u}²`;
const cu = (u: string) => `${u}³`;
const SHADE = '#bfdbfe';

// ---------------------------------------------------------------- figures

/** A rectangle of unit squares on a grid. */
export function gridRectSvg(cols: number, rows: number): string {
  const c = Math.min(30, Math.floor(320 / cols), Math.floor(200 / rows));
  const x0 = 30;
  const y0 = 20;
  let body = `<rect x="${x0}" y="${y0}" width="${cols * c}" height="${rows * c}" fill="${FILL}" stroke="${INK}" stroke-width="2"/>`;
  for (let i = 1; i < cols; i++) body += line({ x: x0 + i * c, y: y0 }, { x: x0 + i * c, y: y0 + rows * c }, { width: 1 });
  for (let j = 1; j < rows; j++) body += line({ x: x0, y: y0 + j * c }, { x: x0 + cols * c, y: y0 + j * c }, { width: 1 });
  return svgDoc(cols * c + 60, rows * c + 40, body);
}

/** Drawn sizes for two lengths: in proportion, but never too thin to read. */
function fit(a: number, b: number, maxA: number, maxB: number, minSide = 60): [number, number] {
  const s = Math.min(maxA / a, maxB / b);
  return [Math.max(minSide, a * s), Math.max(minSide, b * s)];
}

/** Labelled rectangle (not to scale). */
export function rectSvg(w: number, h: number, unit: string): string {
  const [dw, dh] = fit(w, h, 260, 160);
  const x0 = 50;
  const y0 = 25;
  const A = { x: x0, y: y0 };
  const B = { x: x0 + dw, y: y0 };
  const C = { x: x0 + dw, y: y0 + dh };
  const D = { x: x0, y: y0 + dh };
  let body = polygon([A, B, C, D]);
  const centre = { x: x0 + dw / 2, y: y0 + dh / 2 };
  body += labelAway(D, C, centre, `${num(w)} ${unit}`);
  body += labelAway(B, C, centre, `${num(h)} ${unit}`);
  body += notToScale({ x: x0 + dw + 90, y: y0 + dh + 38 });
  return svgDoc(x0 + dw + 100, y0 + dh + 50, body);
}

/** Right-angled triangle with legs b (across) and h (up). Optional dashed rectangle and hypotenuse label. */
export function triangleSvg(b: number, h: number, unit: string, opts: { rect?: boolean; hyp?: number; flip?: boolean } = {}): string {
  const [dw, dh] = fit(b, h, 250, 170);
  const x0 = 70;
  const y0 = 20 + dh;
  const fx = (x: number) => (opts.flip ? x0 + dw - x : x0 + x);
  const R: Pt = { x: fx(0), y: y0 }; // right angle
  const Bp: Pt = { x: fx(dw), y: y0 };
  const T: Pt = { x: fx(0), y: y0 - dh };
  let body = '';
  if (opts.rect) {
    const D: Pt = { x: fx(dw), y: y0 - dh };
    body += `<polygon points="${R.x},${R.y} ${Bp.x},${Bp.y} ${D.x},${D.y} ${T.x},${T.y}" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  }
  body += polygon([R, Bp, T]);
  body += rightAngleMark(R, Bp, T, 14);
  const inside = { x: (R.x + Bp.x + T.x) / 3, y: (R.y + Bp.y + T.y) / 3 };
  body += labelAway(R, Bp, inside, `${num(b)} ${unit}`);
  body += labelAway(R, T, inside, `${num(h)} ${unit}`);
  if (opts.hyp !== undefined) body += labelAway(Bp, T, inside, `${num(opts.hyp)} ${unit}`, { offset: opts.rect ? 26 : 12 });
  body += notToScale({ x: x0 + dw + 110, y: y0 + 34 });
  return svgDoc(x0 + dw + 120, y0 + 46, body);
}

const C30 = Math.cos(Math.PI / 6);

/** Isometric drawing of an l × w × h box, optionally showing every unit cube. */
export function cuboidSvg(l: number, w: number, h: number, opts: { cubes?: boolean; labels?: [string, string, string] } = {}): string {
  // Drawn sizes: real for cubes, squashed towards each other for labelled boxes (not to scale).
  const m = Math.max(l, w, h);
  const squash = (v: number) => (opts.cubes ? v : 2 + (5 * v) / m);
  const [L, W, H] = [squash(l), squash(w), squash(h)];
  const s = Math.min(36, 300 / ((L + W) * C30), 220 / (H + (L + W) / 2));
  const pad = opts.labels ? 70 : 20;
  const ox = pad + W * s * C30;
  const oy = 20 + H * s;
  const P = (i: number, j: number, k: number): Pt => ({ x: ox + (i - j) * s * C30, y: oy + (i + j) * s * 0.5 - k * s });
  const top = [P(0, 0, H), P(L, 0, H), P(L, W, H), P(0, W, H)];
  const right = [P(L, 0, 0), P(L, W, 0), P(L, W, H), P(L, 0, H)];
  const front = [P(0, W, 0), P(L, W, 0), P(L, W, H), P(0, W, H)];
  let body = polygon(top, { fill: '#eff6ff' }) + polygon(right, { fill: '#93c5fd' }) + polygon(front, { fill: SHADE });
  if (opts.cubes) {
    const thin = { width: 1.2 };
    for (let i = 1; i < l; i++) body += line(P(i, 0, h), P(i, w, h), thin) + line(P(i, w, 0), P(i, w, h), thin);
    for (let j = 1; j < w; j++) body += line(P(0, j, h), P(l, j, h), thin) + line(P(l, j, 0), P(l, j, h), thin);
    for (let k = 1; k < h; k++) body += line(P(l, 0, k), P(l, w, k), thin) + line(P(0, w, k), P(l, w, k), thin);
  }
  const width = ox + L * s * C30 + pad;
  const height = oy + (L + W) * s * 0.5 + (opts.labels ? 40 : 20);
  if (opts.labels) {
    const centre = P(L / 2, W / 2, H / 2);
    body += labelAway(P(0, W, 0), P(L, W, 0), centre, opts.labels[0]);
    body += labelAway(P(L, W, 0), P(L, 0, 0), centre, opts.labels[1]);
    body += labelAway(P(0, W, 0), P(0, W, H), centre, opts.labels[2]);
    body += notToScale({ x: width - 8, y: height - 10 });
  }
  return svgDoc(Math.round(width), Math.round(height), body);
}

/**
 * L-shape: a W × H rectangle with an a × b notch cut from the top-right corner (screen units are
 * scaled). `show` says which of the six sides get labels, in the order
 * [top, notch-down, notch-across, right, bottom, left].
 */
export function lShapeSvg(W: number, H: number, a: number, b: number, unit: string, show: boolean[], flip: boolean): string {
  const s = Math.min(300 / W, 200 / H);
  const x0 = 60;
  const y0 = 25;
  const fx = (x: number) => (flip ? x0 + (W - x) * s : x0 + x * s);
  const fy = (y: number) => y0 + y * s;
  const pts: Pt[] = [
    { x: fx(0), y: fy(0) },
    { x: fx(W - a), y: fy(0) },
    { x: fx(W - a), y: fy(b) },
    { x: fx(W), y: fy(b) },
    { x: fx(W), y: fy(H) },
    { x: fx(0), y: fy(H) },
  ];
  const lengths = [W - a, b, a, H - b, W, H];
  let body = polygon(pts);
  // Mirrored shapes run anticlockwise, so swap the ends of each edge to keep labels outside.
  const edges = pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as const);
  edges.forEach(([p, q], i) => {
    if (!show[i]) return;
    const text = `${num(lengths[i]!)} ${unit}`;
    const vertical = Math.abs(p.x - q.x) < 1;
    const off = vertical ? 12 + text.length * 3.6 : 14;
    body += flip ? sideLabel(q, p, text, off) : sideLabel(p, q, text, off);
  });
  body += notToScale({ x: x0 + W * s + 55, y: y0 + H * s + 32 });
  return svgDoc(Math.round(x0 + W * s + 70), Math.round(y0 + H * s + 45), body);
}

/** A rectangle (lawn) with a smaller shaded rectangle (garden bed) inside it. */
function holeSvg(W: number, H: number, a: number, b: number, unit: string, inner: string): string {
  const s = Math.min(300 / W, 190 / H);
  const x0 = 50;
  const y0 = 25;
  const A = { x: x0, y: y0 };
  const B = { x: x0 + W * s, y: y0 };
  const C = { x: x0 + W * s, y: y0 + H * s };
  const D = { x: x0, y: y0 + H * s };
  let body = polygon([A, B, C, D], { fill: '#bbf7d0' });
  const ix = x0 + W * s * 0.55;
  const iy = y0 + H * s * 0.2;
  const I = [
    { x: ix, y: iy },
    { x: ix + a * s, y: iy },
    { x: ix + a * s, y: iy + b * s },
    { x: ix, y: iy + b * s },
  ];
  body += polygon(I, { fill: '#fde68a' });
  const centre = { x: x0 + (W * s) / 2, y: y0 + (H * s) / 2 };
  const ic = { x: ix + (a * s) / 2, y: iy + (b * s) / 2 };
  body += labelAway(D, C, centre, `${num(W)} ${unit}`);
  body += labelAway(A, D, centre, `${num(H)} ${unit}`);
  body += labelAway(I[3]!, I[2]!, ic, `${num(a)} ${unit}`, { size: 12, offset: 8 });
  body += labelAway(I[0]!, I[3]!, ic, `${num(b)} ${unit}`, { size: 12, offset: 6 });
  body += label({ x: ix + (a * s) / 2, y: iy + (b * s) / 2 }, inner, { size: 11 });
  body += notToScale({ x: x0 + W * s + 45, y: y0 + H * s + 32 });
  return svgDoc(Math.round(x0 + W * s + 55), Math.round(y0 + H * s + 45), body);
}

// ---------------------------------------------------------------- 1. rectangles

interface RectContext {
  thing: string;
  unit: string;
  w: [number, number];
  h: [number, number];
  /** Side lengths are multiples of this. */
  step: number;
}

const RECT_CONTEXTS: RectContext[] = [
  { thing: 'a vegetable garden', unit: 'm', w: [3, 12], h: [2, 9], step: 1 },
  { thing: 'a classroom floor', unit: 'm', w: [8, 12], h: [6, 9], step: 1 },
  { thing: 'a poster', unit: 'cm', w: [30, 60], h: [20, 50], step: 10 },
  { thing: 'a photo', unit: 'cm', w: [12, 18], h: [6, 10], step: 1 },
  { thing: 'a sandpit', unit: 'm', w: [2, 6], h: [2, 5], step: 1 },
  { thing: 'a picnic blanket', unit: 'm', w: [2, 4], h: [1, 3], step: 1 },
  { thing: 'a kapa haka stage', unit: 'm', w: [10, 15], h: [4, 8], step: 1 },
  { thing: 'a school hall floor', unit: 'm', w: [20, 30], h: [6, 9], step: 1 },
];

export const rectangleArea: QuestionTemplate = {
  id: 'm6.mea.area-volume.rectangle-area',
  topicId: 'm6.mea.area-volume',
  title: 'Area of a rectangle',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const cols = rng.int(3, 9);
      const rows = rng.int(2, 6);
      const area = cols * rows;
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: 'Each small square is 1 cm². What is the area of the rectangle?',
          figure: { svg: gridRectSvg(cols, rows), alt: `A rectangle on a grid, ${cols} squares across and ${rows} squares down` },
          answer: area,
          units: 'cm²',
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['How many squares are in one row?', 'How many rows are there? You can multiply instead of counting every square.'],
          solution: `There are ${rows} rows with ${cols} squares in each row.\n\n$${rows} \\times ${cols} = ${area}$\n\nThe area is **${area} cm²**.`,
        };
      }
      const unit = rng.pick(['cm', 'm']);
      return {
        type: 'numeric',
        prompt: `Find the area of this rectangle.`,
        figure: { svg: rectSvg(cols, rows, unit), alt: `A rectangle ${cols} ${unit} long and ${rows} ${unit} wide` },
        answer: area,
        units: sq(unit),
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Area of a rectangle = length × width.', `The answer is in square ${unit === 'm' ? 'metres' : 'centimetres'} (${sq(unit)}).`],
        solution: `Area = length × width\n\n$${cols} \\times ${rows} = ${area}$\n\nThe area is **${area} ${sq(unit)}**.`,
      };
    }
    if (difficulty === 2) {
      const c = rng.pick(RECT_CONTEXTS);
      const x = rng.int(c.w[0] / c.step, c.w[1] / c.step) * c.step;
      const y = rng.int(c.h[0] / c.step, c.h[1] / c.step) * c.step;
      const [w, h] = x >= y ? [x, y] : [y, x];
      const area = w * h;
      const useFigure = rng.chance(0.4);
      return {
        type: 'numeric',
        prompt: useFigure
          ? `The diagram shows ${c.thing}. What is its area?`
          : `${c.thing[0]!.toUpperCase()}${c.thing.slice(1)} is a rectangle ${num(w)} ${c.unit} long and ${h} ${c.unit} wide. What is its area?`,
        ...(useFigure && { figure: { svg: rectSvg(w, h, c.unit), alt: `A rectangle ${w} ${c.unit} long and ${h} ${c.unit} wide` } }),
        answer: area,
        units: sq(c.unit),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Area of a rectangle = length × width.',
          c.step === 10
            ? `${w} × ${h} is ${w / 10} tens × ${h / 10} tens. Use a times-table fact, then think about the zeros.`
            : w > 12
              ? `To work out ${w} × ${h}, split ${w} into tens and ones.`
              : 'Use your times tables.',
        ],
        solution: [
          'Area = length × width',
          c.step === 10
            ? `$${w / 10} \\times ${h / 10} = ${(w / 10) * (h / 10)}$, so $${w} \\times ${h} = ${tex(area)}$ (tens × tens make hundreds).`
            : w > 12 && w % 10 !== 0
            ? `$${w} \\times ${h} = ${Math.floor(w / 10) * 10} \\times ${h} + ${w % 10} \\times ${h} = ${Math.floor(w / 10) * 10 * h} + ${(w % 10) * h} = ${tex(area)}$`
            : `$${w} \\times ${h} = ${tex(area)}$`,
          `The area is **${num(area)} ${sq(c.unit)}**.`,
        ].join('\n\n'),
      };
    }
    // difficulty 3
    const kind = rng.pick(['missing', 'missing', 'twoDigit', 'square', 'squareSide'] as const);
    const unit = rng.pick(['cm', 'm']);
    if (kind === 'missing') {
      const known = rng.int(3, 9);
      const other = rng.int(4, 15);
      const area = known * other;
      return {
        type: 'numeric',
        prompt: `A rectangle has an area of ${area} ${sq(unit)}. One side is ${known} ${unit} long. How long is the other side?`,
        answer: other,
        units: unit,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Area = length × width, so think: what number times the side you know gives the area?', `Work out ${area} ÷ ${known}.`],
        solution: `$${known} \\times \\square = ${area}$\n\n$${area} \\div ${known} = ${other}$\n\nThe other side is **${other} ${unit}**. Check: $${known} \\times ${other} = ${area}$ ✓`,
      };
    }
    if (kind === 'twoDigit') {
      const w = rng.int(11, 25);
      let h = rng.int(11, 20);
      if (h === w) h += 1;
      const area = w * h;
      const tens = Math.floor(h / 10) * 10;
      const ones = h % 10;
      return {
        type: 'numeric',
        prompt: `A rectangular deck is ${w} m long and ${h} m wide. What is its area?`,
        answer: area,
        units: 'm²',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Area of a rectangle = length × width.', `Split ${h} into ${tens}${ones ? ` + ${ones}` : ''} and multiply each part by ${w}.`],
        solution: [
          `Area = $${w} \\times ${h}$`,
          ones
            ? `$${w} \\times ${tens} = ${w * tens}$ and $${w} \\times ${ones} = ${w * ones}$\n\n$${w * tens} + ${w * ones} = ${area}$`
            : `$${w} \\times ${tens} = ${area}$`,
          `The area is **${area} m²**.`,
        ].join('\n\n'),
      };
    }
    const side = rng.int(2, 12);
    if (kind === 'square') {
      return {
        type: 'numeric',
        prompt: `A square tile has sides of ${side} cm. What is the area of the tile?`,
        answer: side * side,
        units: 'cm²',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['All four sides of a square are the same length.', 'Area = length × width.'],
        solution: `A square's length and width are both ${side} cm.\n\n$${side} \\times ${side} = ${side * side}$ (this is ${side} squared, $${side}^2$).\n\nThe area is **${side * side} cm²**.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `A square garden has an area of ${side * side} m². How long is each side?`,
      answer: side,
      units: 'm',
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['A square has the same length and width.', `Which number multiplied by itself gives ${side * side}?`],
      solution: `$${side} \\times ${side} = ${side * side}$, so each side is **${side} m**.\n\n${side * side} is a square number.`,
    };
  },
};

// ---------------------------------------------------------------- 2. right-angled triangles

const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [9, 12, 15],
  [12, 16, 20],
  [5, 12, 13],
  [8, 15, 17],
  [10, 24, 26],
  [15, 20, 25],
  [7, 24, 25],
  [12, 9, 15],
  [8, 6, 10],
  [4, 3, 5],
];

export const triangleArea: QuestionTemplate = {
  id: 'm6.mea.area-volume.triangle-area',
  topicId: 'm6.mea.area-volume',
  title: 'Area of a right-angled triangle',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const unit = rng.pick(['cm', 'm']);
    const flip = rng.chance(0.5);
    if (difficulty === 2 || difficulty === 3) {
      let b = 0;
      let h = 0;
      do {
        b = difficulty === 2 ? rng.int(2, 12) : rng.int(5, 20);
        h = difficulty === 2 ? rng.int(2, 10) : rng.int(5, 16);
      } while ((b * h) % 2 !== 0 || (difficulty === 3 && b <= 10 && h <= 10));
      const rect = b * h;
      const area = rect / 2;
      return {
        type: 'numeric',
        prompt:
          difficulty === 2
            ? 'The right-angled triangle is half of the dashed rectangle. What is the area of the triangle?'
            : 'Find the area of this right-angled triangle.',
        figure: {
          svg: triangleSvg(b, h, unit, { rect: difficulty === 2, flip }),
          alt: `A right-angled triangle with base ${b} ${unit} and height ${h} ${unit}${difficulty === 2 ? ' inside a dashed rectangle' : ''}`,
        },
        answer: area,
        units: sq(unit),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          difficulty === 2 ? 'Find the area of the whole rectangle first.' : 'Imagine the rectangle with the same base and height.',
          'The triangle is exactly half of that rectangle.',
        ],
        solution: [
          `The rectangle with the same base and height has area $${b} \\times ${h} = ${rect}$ ${sq(unit)}.`,
          `The right-angled triangle is half of it: $${rect} \\div 2 = ${area}$.`,
          `The area of the triangle is **${area} ${sq(unit)}**.`,
        ].join('\n\n'),
      };
    }
    // difficulty 4
    if (rng.chance(0.55)) {
      const [p, q, r] = rng.pick(TRIPLES);
      const area = (p * q) / 2;
      return {
        type: 'numeric',
        prompt: 'Find the area of this right-angled triangle. Be careful to choose the right measurements.',
        figure: {
          svg: triangleSvg(p, q, unit, { hyp: r, flip }),
          alt: `A right-angled triangle with sides ${p} ${unit} and ${q} ${unit} meeting at the right angle, and a longest side of ${r} ${unit}`,
        },
        answer: area,
        units: sq(unit),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'The base and height are the two sides that meet at the right angle.',
          'You do not need the longest side (the sloping one).',
        ],
        solution: [
          `The two sides that meet at the right angle are ${p} ${unit} and ${q} ${unit}. The ${r} ${unit} side is not needed.`,
          `Rectangle: $${p} \\times ${q} = ${p * q}$. Half of it: $${p * q} \\div 2 = ${area}$.`,
          `The area is **${area} ${sq(unit)}**.`,
        ].join('\n\n'),
      };
    }
    const base = rng.int(3, 9);
    let height = rng.int(3, 12);
    if ((base * height) % 2 !== 0) height += 1;
    const area = (base * height) / 2;
    return {
      type: 'numeric',
      prompt: `A right-angled triangle has an area of ${area} ${sq(unit)}. Its base is ${base} ${unit}. What is its height?`,
      answer: height,
      units: unit,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [
        'The triangle is half of a rectangle. What is the area of that rectangle?',
        `The rectangle's area is base × height. What times ${base} gives that area?`,
      ],
      solution: [
        `The triangle is half of a rectangle, so the rectangle's area is $${area} \\times 2 = ${area * 2}$ ${sq(unit)}.`,
        `The rectangle is ${base} ${unit} wide: $${area * 2} \\div ${base} = ${height}$.`,
        `The height is **${height} ${unit}**. Check: $${base} \\times ${height} \\div 2 = ${area}$ ✓`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 3. volume of a rectangular prism

interface BoxContext {
  thing: string;
  unit: string;
  /** [min, max] for length, width and height. Only the length has two digits. */
  l: [number, number];
  w: [number, number];
  h: [number, number];
}

const BOX_CONTEXTS: BoxContext[] = [
  { thing: 'A cereal box', unit: 'cm', l: [20, 30], w: [6, 9], h: [5, 8] },
  { thing: 'A shoebox', unit: 'cm', l: [25, 32], w: [7, 9], h: [6, 9] },
  { thing: 'A storage container', unit: 'cm', l: [20, 40], w: [5, 9], h: [4, 9] },
  { thing: 'A shipping container', unit: 'm', l: [11, 13], w: [2, 3], h: [2, 3] },
  { thing: 'A school swimming pool', unit: 'm', l: [15, 25], w: [6, 9], h: [1, 2] },
  { thing: 'A lunchbox', unit: 'cm', l: [15, 22], w: [6, 9], h: [4, 7] },
  { thing: 'A worm farm', unit: 'cm', l: [30, 50], w: [4, 9], h: [3, 5] },
];

function volumeSolution(l: number, w: number, h: number, unit: string): string {
  const v = l * w * h;
  return [
    'Volume of a rectangular prism = length × width × height.',
    `$${l} \\times ${w} = ${l * w}$ (this is how many cubes fit in one layer)`,
    `$${l * w} \\times ${h} = ${tex(v)}$ (${h} layer${h === 1 ? '' : 's'})`,
    `The volume is **${num(v)} ${cu(unit)}**.`,
  ].join('\n\n');
}

export const prismVolume: QuestionTemplate = {
  id: 'm6.mea.area-volume.prism-volume',
  topicId: 'm6.mea.area-volume',
  title: 'Volume of a cube or rectangular prism',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const l = rng.int(2, 5);
      const w = rng.int(2, 3);
      const h = rng.int(1, 4);
      const v = l * w * h;
      return {
        type: 'numeric',
        prompt: 'This solid block is made from 1 cm cubes, with no gaps inside. What is its volume?',
        figure: { svg: cuboidSvg(l, w, h, { cubes: true }), alt: `A block of cubes ${l} long, ${w} wide and ${h} high` },
        answer: v,
        units: 'cm³',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['How many cubes are in the top layer?', 'How many layers are there? Some cubes are hidden at the back.'],
        solution: [
          `The top layer has $${l} \\times ${w} = ${l * w}$ cubes.`,
          `There ${h === 1 ? 'is 1 layer' : `are ${h} layers`}, so there are $${l * w} \\times ${h} = ${v}$ cubes.`,
          `Each cube is 1 cm³, so the volume is **${v} cm³**.`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 2) {
      const unit = rng.pick(['cm', 'm']);
      if (rng.chance(0.3)) {
        const side = rng.int(2, 5);
        return {
          type: 'numeric',
          prompt: `A cube has edges that are ${side} ${unit} long. What is its volume?`,
          figure: { svg: cuboidSvg(1, 1, 1, { labels: [`${side} ${unit}`, `${side} ${unit}`, `${side} ${unit}`] }), alt: `A cube with edges of ${side} ${unit}` },
          answer: side ** 3,
          units: cu(unit),
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['A cube has the same length, width and height.', 'Volume = length × width × height.'],
          solution: `$${side} \\times ${side} \\times ${side} = ${side ** 3}$ (this is ${side} cubed, $${side}^3$).\n\nThe volume is **${side ** 3} ${cu(unit)}**.`,
        };
      }
      const l = rng.int(3, 10);
      const w = rng.int(2, 6);
      const h = rng.int(2, 6);
      return {
        type: 'numeric',
        prompt: 'Find the volume of this box (rectangular prism).',
        figure: {
          svg: cuboidSvg(l, w, h, { labels: [`${l} ${unit}`, `${w} ${unit}`, `${h} ${unit}`] }),
          alt: `A box ${l} ${unit} long, ${w} ${unit} wide and ${h} ${unit} high`,
        },
        answer: l * w * h,
        units: cu(unit),
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Volume = length × width × height.', 'Multiply two of the numbers first, then multiply by the third.'],
        solution: volumeSolution(l, w, h, unit),
      };
    }
    // difficulty 3: a context with a two-digit side
    const c = rng.pick(BOX_CONTEXTS);
    const a = rng.int(c.l[0], c.l[1]);
    const b = rng.int(c.w[0], c.w[1]);
    const h = rng.int(c.h[0], c.h[1]);
    return {
      type: 'numeric',
      prompt: `${c.thing} is ${a} ${c.unit} long, ${b} ${c.unit} wide and ${h} ${c.unit} high. What is its volume?`,
      answer: a * b * h,
      units: cu(c.unit),
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Volume = length × width × height.', 'Multiply the length and width first to find how much fits in one layer.'],
      solution: volumeSolution(a, b, h, c.unit),
    };
  },
};

// ---------------------------------------------------------------- 4. volume problems

export const volumeProblems: QuestionTemplate = {
  id: 'm6.mea.area-volume.volume-problems',
  topicId: 'm6.mea.area-volume',
  title: 'Volume problems: compare, missing sides, packing cubes',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      let dimsA: number[] = [];
      let dimsB: number[] = [];
      do {
        dimsA = [rng.int(3, 9), rng.int(2, 6), rng.int(2, 6)];
        dimsB = [rng.int(3, 9), rng.int(2, 6), rng.int(2, 6)];
      } while (dimsA[0]! * dimsA[1]! * dimsA[2]! === dimsB[0]! * dimsB[1]! * dimsB[2]!);
      const vA = dimsA[0]! * dimsA[1]! * dimsA[2]!;
      const vB = dimsB[0]! * dimsB[1]! * dimsB[2]!;
      const bigger = vA > vB ? 'A' : 'B';
      const diff = Math.abs(vA - vB);
      const name = rng.pick(NAMES);
      return {
        type: 'numeric',
        prompt: `${name} has two boxes for packing books.\n\n- Box A is ${dimsA[0]} cm long, ${dimsA[1]} cm wide and ${dimsA[2]} cm high.\n- Box B is ${dimsB[0]} cm long, ${dimsB[1]} cm wide and ${dimsB[2]} cm high.\n\nHow much bigger is the volume of the bigger box?`,
        answer: diff,
        units: 'cm³',
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Find the volume of each box: length × width × height.', 'Then subtract the smaller volume from the bigger one.'],
        solution: [
          `Box A: $${dimsA.join(' \\times ')} = ${vA}$ cm³.`,
          `Box B: $${dimsB.join(' \\times ')} = ${vB}$ cm³.`,
          `Box ${bigger} is bigger by $${Math.max(vA, vB)} - ${Math.min(vA, vB)} = ${diff}$ cm³.`,
        ].join('\n\n'),
      };
    }
    if (difficulty === 4) {
      if (rng.chance(0.35)) {
        const side = rng.int(2, 5);
        const unit = rng.pick(['cm', 'm']);
        return {
          type: 'numeric',
          prompt: `A cube has a volume of ${side ** 3} ${cu(unit)}. How long is each edge?`,
          answer: side,
          units: unit,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The length, width and height of a cube are all the same.', `Which number multiplied by itself three times gives ${side ** 3}? Think of the cube numbers.`],
          solution: `$${side} \\times ${side} \\times ${side} = ${side ** 3}$, so each edge is **${side} ${unit}**.\n\n${side ** 3} is a cube number: $${side}^3 = ${side ** 3}$.`,
        };
      }
      const [l, w] = rng.pick([
        [3, 2], [4, 2], [5, 2], [4, 3], [5, 3], [5, 4], [6, 5], [10, 2], [10, 3], [10, 4], [10, 5], [6, 2], [8, 5],
      ] as const);
      const h = rng.int(2, 9);
      const base = l * w;
      const v = base * h;
      const thing = rng.pick(['box', 'container', 'block of cheese', 'storage crate']);
      return {
        type: 'numeric',
        prompt: `A ${thing} shaped like a rectangular prism has a volume of ${v} cm³. It is ${l} cm long and ${w} cm wide. How high is it?`,
        answer: h,
        units: 'cm',
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How many 1 cm cubes would fit in one layer on the bottom?`, `How many layers of that size make ${v} cm³?`],
        solution: [
          `One layer on the bottom holds $${l} \\times ${w} = ${base}$ cubes (${base} cm³).`,
          `Number of layers: $${v} \\div ${base} = ${h}$.`,
          `So the ${thing} is **${h} cm** high. Check: $${l} \\times ${w} \\times ${h} = ${v}$ ✓`,
        ].join('\n\n'),
      };
    }
    // difficulty 5
    if (rng.chance(0.5)) {
      const s = rng.pick([2, 5]);
      const choices = s === 2 ? [4, 6, 8, 10, 12] : [10, 15, 20, 25];
      const [L, W, H] = [rng.pick(choices), rng.pick(choices), rng.pick(choices)];
      const n = (L / s) * (W / s) * (H / s);
      return {
        type: 'numeric',
        prompt: `A box is ${L} cm long, ${W} cm wide and ${H} cm high. How many wooden cubes with ${s} cm edges will fit inside it exactly?`,
        answer: n,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`How many ${s} cm cubes fit along the length of the box?`, 'Do the same for the width and the height, then multiply.'],
        solution: [
          `Along the length: $${L} \\div ${s} = ${L / s}$ cubes. Along the width: $${W} \\div ${s} = ${W / s}$. Up the height: $${H} \\div ${s} = ${H / s}$.`,
          `$${L / s} \\times ${W / s} \\times ${H / s} = ${n}$`,
          `So **${n} cubes** fit. (Watch out: dividing the box's volume by 1 cm³ would count 1 cm cubes, not ${s} cm cubes.)`,
        ].join('\n\n'),
      };
    }
    const l = rng.int(2, 8);
    const w = rng.int(1, 4);
    const v = clean((l * w) / 2);
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `${name}'s whānau is building a raised garden bed. It is ${l} m long and ${w} m wide, and they will fill it with soil to a depth of 0.5 m. How many cubic metres (m³) of soil do they need?`,
      answer: v,
      units: 'm³',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Volume = length × width × height (here the height is the depth of the soil).', 'Multiplying by 0.5 is the same as halving.'],
      solution: [
        `Length × width: $${l} \\times ${w} = ${l * w}$.`,
        `× 0.5 means halve it: $${l * w} \\times 0.5 = ${tex(v)}$.`,
        `They need **${num(v)} m³** of soil.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- 5. shapes made of rectangles

function lShapeParams(rng: Rng): { W: number; H: number; a: number; b: number } {
  const W = rng.int(7, 14);
  const H = rng.int(6, 12);
  const a = rng.int(2, W - 3);
  const b = rng.int(2, H - 3);
  return { W, H, a, b };
}

export const compositeArea: QuestionTemplate = {
  id: 'm6.mea.area-volume.composite-area',
  topicId: 'm6.mea.area-volume',
  title: 'Area of shapes made from rectangles',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const unit = rng.pick(['m', 'cm']);
    const flip = rng.chance(0.5);
    const kind = difficulty === 4 ? rng.pick(['lAll', 'lAll', 'hole'] as const) : rng.pick(['lMissing', 'lMissing', 'turf'] as const);

    if (kind === 'lAll' || kind === 'lMissing') {
      const { W, H, a, b } = lShapeParams(rng);
      const area = W * H - a * b;
      const show = kind === 'lAll' ? [true, true, true, true, true, true] : [true, false, false, true, true, true];
      // Split into a top-left part and a bottom strip: (W − a) × b on top, W × (H − b) below.
      const top = (W - a) * b;
      const bottom = W * (H - b);
      return {
        type: 'numeric',
        prompt:
          kind === 'lAll'
            ? 'This shape is made from two rectangles. Find its area.'
            : 'This shape is made from two rectangles. Two side lengths are not shown. Find the area of the shape.',
        figure: {
          svg: lShapeSvg(W, H, a, b, unit, show, flip),
          alt: `An L-shape ${W} ${unit} along the bottom and ${H} ${unit} high, with a ${a} by ${b} ${unit} corner cut out`,
        },
        answer: area,
        units: sq(unit),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: [
          kind === 'lAll' ? 'Draw a line to split the shape into two rectangles.' : 'Use the side lengths you know to work out the missing ones first.',
          'Find the area of each rectangle and add them together.',
        ],
        solution: [
          ...(kind === 'lMissing'
            ? [`Missing sides: the short edge across the cut-out corner is $${W} - ${W - a} = ${a}$ ${unit}, and the short edge down is $${H} - ${H - b} = ${b}$ ${unit}.`]
            : []),
          `Split the shape with a line across. The top rectangle is ${W - a} ${unit} by ${b} ${unit}: $${W - a} \\times ${b} = ${top}$ ${sq(unit)}.`,
          `The bottom rectangle is ${W} ${unit} by ${H - b} ${unit}: $${W} \\times ${H - b} = ${bottom}$ ${sq(unit)}.`,
          `Total: $${top} + ${bottom} = ${area}$. The area is **${area} ${sq(unit)}**.`,
          `(Another way: the big rectangle minus the missing corner: $${W} \\times ${H} - ${a} \\times ${b} = ${W * H} - ${a * b} = ${area}$.)`,
        ].join('\n\n'),
      };
    }

    const W = rng.int(8, 15);
    const H = rng.int(5, 10);
    const a = rng.int(2, Math.min(5, W - 5));
    const b = rng.int(1, Math.min(4, H - 3));
    const lawn = W * H - a * b;
    if (kind === 'hole') {
      return {
        type: 'numeric',
        prompt: `A rectangular lawn has a rectangular vegetable garden in it (shaded yellow). What is the area of the grass?`,
        figure: {
          svg: holeSvg(W, H, a, b, 'm', 'garden'),
          alt: `A rectangle ${W} m by ${H} m with a smaller ${a} m by ${b} m rectangle inside it`,
        },
        answer: lawn,
        units: 'm²',
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the area of the whole lawn as if there was no garden.', 'Then take away the area of the garden.'],
        solution: [
          `Whole rectangle: $${W} \\times ${H} = ${W * H}$ m².`,
          `Garden: $${a} \\times ${b} = ${a * b}$ m².`,
          `Grass: $${W * H} - ${a * b} = ${lawn}$. The grass covers **${lawn} m²**.`,
        ].join('\n\n'),
      };
    }
    // turf cost
    const price = rng.pick([5, 6, 8, 9, 10, 12]);
    const cost = lawn * price;
    const name = rng.pick(NAMES);
    return {
      type: 'numeric',
      prompt: `${name}'s family is putting new turf on a lawn. The lawn is a rectangle, ${W} m by ${H} m, but a ${a} m by ${b} m paved area in it does not need turf. Turf costs \\$${price} per square metre. How much will the turf cost?`,
      answer: cost,
      units: '$',
      form: 'integer',
      marks: 3,
      calculator: 'not-allowed',
      hints: [
        'Find the area of the whole rectangle, then take away the paved area.',
        `Each square metre costs \\$${price}, so multiply the area by ${price}.`,
      ],
      solution: [
        `Whole rectangle: $${W} \\times ${H} = ${W * H}$ m². Paved area: $${a} \\times ${b} = ${a * b}$ m².`,
        `Turf needed: $${W * H} - ${a * b} = ${lawn}$ m².`,
        `Cost: $${lawn} \\times ${price} = ${tex(cost)}$, so the turf costs **\\$${num(cost)}**.`,
      ].join('\n\n'),
    };
  },
};

export const templates: QuestionTemplate[] = [rectangleArea, triangleArea, prismVolume, volumeProblems, compositeArea];
