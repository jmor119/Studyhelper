import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import {
  IMAGE,
  NUMBER_WORDS,
  OBJECT,
  crowded,
  drawGrid,
  drawPanels,
  height,
  inside,
  maxC,
  maxR,
  minC,
  minR,
  overlaps,
  randomShape,
  reflectH,
  reflectV,
  rotACW,
  rotCW,
  rotHalf,
  same,
  translate,
  width,
  type Cell,
  type GridSpec,
} from './transformations-helpers';

// m6.geo.transformations — reflections, translations and rotations (quarter and half turns) of
// shapes on a square grid, two-step transformations, and which shapes tessellate. There are no
// coordinates here (that's Year 7): movements are described in squares left, right, up and down.

const ids = ['a', 'b', 'c', 'd'];
type McqBase = Omit<Extract<TemplateOutput, { type: 'mcq' }>, 'type' | 'options' | 'correct' | 'feedback'>;

function mcq(rng: Rng, correct: string, wrong: Array<[string, string]>, base: McqBase): TemplateOutput {
  const seen = new Set([correct]);
  const distractors = wrong.filter(([t]) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 3);
  const order = rng.shuffle<[string, string | undefined]>([[correct, undefined], ...distractors]);
  const feedback: Record<string, string> = {};
  order.forEach(([, fb], i) => {
    if (fb) feedback[ids[i]!] = fb;
  });
  return { type: 'mcq', options: order.map(([text], i) => ({ id: ids[i]!, text })), correct: ids[order.findIndex(([t]) => t === correct)]!, feedback, ...base };
}

const G = 10; // panels are 10 × 10 squares

interface Candidate {
  cells: Cell[];
  why?: string;
}

/**
 * Four pictures (one correct) drawn in a 2 × 2 layout; options are "Picture A" … "Picture D".
 * Returns null if the candidates don't all fit, are not all different, or overlap the object.
 */
function pictures(rng: Rng, object: Cell[], correct: Cell[], wrong: Candidate[], extras: Omit<GridSpec, 'cols' | 'rows' | 'items'>, base: McqBase): TemplateOutput | null {
  const all: Candidate[] = [{ cells: correct }, ...wrong];
  if (all.length < 4) return null;
  for (const c of all) if (!inside(c.cells, G, G) || overlaps(c.cells, object)) return null;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (same(all[i]!.cells, all[j]!.cells)) return null;
  const order = rng.shuffle(all.slice(0, 4));
  const panels: GridSpec[] = order.map((c) => ({
    cols: G,
    rows: G,
    items: [
      { cells: object, colour: OBJECT },
      { cells: c.cells, colour: IMAGE },
    ],
    ...extras,
  }));
  const feedback: Record<string, string> = {};
  order.forEach((c, i) => {
    if (c.why) feedback[ids[i]!] = c.why;
  });
  return {
    type: 'mcq',
    figure: { svg: drawPanels(panels, 12), alt: `Four pictures, A to D. Each shows the blue starting shape and an orange image in a different place or way round.` },
    options: order.map((_, i) => ({ id: ids[i]!, text: `Picture ${'ABCD'[i]}` })),
    correct: ids[order.findIndex((c) => c.cells === correct)]!,
    feedback,
    shuffle: false,
    ...base,
  };
}

/** Transpose a set of cells (swap columns and rows): turns a vertical set-up into a horizontal one. */
const transpose = (cells: readonly Cell[]): Cell[] => cells.map(([c, r]) => [r, c]);
const squares = (n: number) => `${n} square${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------- identify the transformation

type Kind = 'reflection' | 'translation' | 'rotation';
const KIND_TEXT: Record<Kind, string> = { reflection: 'Reflection (a flip)', translation: 'Translation (a slide)', rotation: 'Rotation (a turn)' };
const KIND_WHY: Record<Kind, Record<Kind, string>> = {
  translation: {
    translation: '',
    reflection: 'B faces exactly the same way as A. A reflection would make a mirror image that faces the other way.',
    rotation: 'B is not turned at all: it faces exactly the same way as A. A has only slid.',
  },
  reflection: {
    reflection: '',
    translation: 'B is a mirror image of A. It has been flipped, so it can’t just be a slide.',
    rotation: 'Turning a shape never makes a mirror image. B is a mirror image of A, so it was flipped.',
  },
  rotation: {
    rotation: '',
    translation: 'B has been turned: it doesn’t face the same way as A.',
    reflection: 'B is not a mirror image of A. If you turn A around, it fits exactly on top of B.',
  },
};

export const identify: QuestionTemplate = {
  id: 'm6.geo.transformations.identify',
  topicId: 'm6.geo.transformations',
  title: 'Is it a reflection, translation or rotation?',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const cols = 12;
    const rows = 9;
    for (;;) {
      const shape = randomShape(rng);
      const obj = translate(shape, rng.int(0, cols - width(shape)), rng.int(0, rows - height(shape)));
      const kind = rng.pick(['reflection', 'translation', 'rotation'] as const);
      let img: Cell[];
      let how: string;
      if (kind === 'translation') {
        const dx = rng.int(-6, 6);
        const dy = rng.int(-4, 4);
        img = translate(obj, dx, dy);
        how = `Shape A has slid ${[dx ? `${squares(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${squares(Math.abs(dy))} ${dy > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' and ')} without turning or flipping.`;
      } else if (kind === 'reflection') {
        const vertical = difficulty === 1 || rng.chance(0.6);
        if (vertical) {
          const m = rng.int(1, cols - 1);
          img = reflectV(obj, m);
        } else {
          const m = rng.int(1, rows - 1);
          img = reflectH(obj, m);
        }
        how = `Shape B is a mirror image of shape A. A has been flipped over a ${vertical ? 'mirror line going up and down' : 'mirror line going across'}.`;
      } else {
        const px = rng.int(1, cols - 1);
        const py = rng.int(1, rows - 1);
        const turn = difficulty === 1 ? 'half' : rng.pick(['half', 'cw', 'acw'] as const);
        img = turn === 'half' ? rotHalf(obj, px, py) : turn === 'cw' ? rotCW(obj, px, py) : rotACW(obj, px, py);
        how = `Shape A has been turned ${turn === 'half' ? 'a half turn' : `a quarter turn ${turn === 'cw' ? 'clockwise' : 'anticlockwise'}`} to make B. It is not a mirror image, and it doesn't face the same way.`;
      }
      if (!inside(obj, cols, rows) || !inside(img, cols, rows) || crowded(obj, img)) continue;
      const svg = drawGrid({ cols, rows, items: [{ cells: obj, colour: OBJECT, text: 'A' }, { cells: img, colour: IMAGE, text: 'B' }] }, 22);
      const wrong = (['reflection', 'translation', 'rotation'] as const).filter((k) => k !== kind).map((k) => [KIND_TEXT[k], KIND_WHY[kind][k]] as [string, string]);
      return mcq(rng, KIND_TEXT[kind], wrong, {
        prompt: 'Shape A (blue) has been moved to shape B (orange) by one transformation. Which transformation was it?',
        figure: { svg, alt: 'A square grid with blue shape A and orange shape B.' },
        calculator: 'not-allowed',
        hints: ['Does B face the same way as A? If so, it slid.', 'Is B a mirror image of A (flipped)? Or is it A turned around?'],
        solution: `${how} So it is a **${kind}**.`,
      });
    }
  },
};

// ---------------------------------------------------------------- translations

export const translations: QuestionTemplate = {
  id: 'm6.geo.transformations.translate',
  topicId: 'm6.geo.transformations',
  title: 'Describe and carry out translations',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty <= 2) {
      const cols = 12;
      const rows = 9;
      for (;;) {
        const shape = randomShape(rng);
        const obj = translate(shape, rng.int(0, cols - width(shape)), rng.int(0, rows - height(shape)));
        let dx = 0;
        let dy = 0;
        if (difficulty === 1) {
          if (rng.chance(0.5)) dx = rng.nonZeroInt(-7, 7);
          else dy = rng.nonZeroInt(-5, 5);
        } else {
          dx = rng.nonZeroInt(-6, 6);
          dy = rng.nonZeroInt(-5, 5);
        }
        const img = translate(obj, dx, dy);
        if (!inside(img, cols, rows) || crowded(obj, img)) continue;
        const dotAt = rng.int(0, obj.length - 1);
        const svg = drawGrid({ cols, rows, items: [{ cells: obj, colour: OBJECT, text: 'A', dotAt }, { cells: img, colour: IMAGE, text: 'B', dotAt }] }, 22);
        const nums = (n: number) => [String(n), NUMBER_WORDS[n]!];
        const hints = ['Pick one corner of shape A (the dot helps) and find the same corner on shape B.', 'Count the squares it moves across, then the squares it moves up or down. Count jumps, not the squares in between.'];
        const words = [dx ? `${squares(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'}` : '', dy ? `${squares(Math.abs(dy))} ${dy > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' and ');
        const alt = 'A square grid with blue shape A and orange shape B. A dot marks the same corner on each shape.';
        if (difficulty === 1) {
          const n = Math.abs(dx || dy);
          const dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
          return {
            type: 'cloze',
            prompt: 'Shape A has been translated (slid) to shape B. Complete the sentence.\n\nShape A moved [[n]] squares [[d]].',
            figure: { svg, alt },
            blanks: [
              { id: 'n', accepted: nums(n) },
              { id: 'd', accepted: [dir], options: ['left', 'right', 'up', 'down'] },
            ],
            calculator: 'not-allowed',
            hints,
            solution: `Follow the dot from A to B: it moves **${squares(n)} ${dir}**.`,
          };
        }
        return {
          type: 'cloze',
          prompt: 'Shape A has been translated (slid) to shape B. Complete the sentence.\n\nShape A moved [[a]] squares [[h]] and [[b]] squares [[v]].',
          figure: { svg, alt },
          blanks: [
            { id: 'a', accepted: nums(Math.abs(dx)) },
            { id: 'h', accepted: [dx > 0 ? 'right' : 'left'], options: ['left', 'right'] },
            { id: 'b', accepted: nums(Math.abs(dy)) },
            { id: 'v', accepted: [dy > 0 ? 'down' : 'up'], options: ['up', 'down'] },
          ],
          marks: 2,
          calculator: 'not-allowed',
          hints,
          solution: `Follow the dot from A to B: it moves ${squares(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'} and ${squares(Math.abs(dy))} ${dy > 0 ? 'down' : 'up'}. So the translation is **${words}**.`,
        };
      }
    }
    // difficulty 3: pick the picture that shows a given translation.
    for (;;) {
      const shape = randomShape(rng);
      const obj = translate(shape, rng.int(0, G - width(shape)), rng.int(0, G - height(shape)));
      const dx = rng.nonZeroInt(-5, 5);
      const dy = rng.nonZeroInt(-5, 5);
      if (Math.abs(dx) === Math.abs(dy)) continue;
      const correct = translate(obj, dx, dy);
      const sx = Math.sign(dx);
      const sy = Math.sign(dy);
      const wrong: Candidate[] = rng.shuffle([
        { cells: translate(obj, sx * Math.abs(dy), sy * Math.abs(dx)), why: 'The two amounts have been swapped. Check how far it should go across and how far up or down.' },
        { cells: translate(obj, -dx, dy), why: `This goes ${dx > 0 ? 'left' : 'right'} instead of ${dx > 0 ? 'right' : 'left'}.` },
        { cells: translate(obj, dx, -dy), why: `This goes ${dy > 0 ? 'up' : 'down'} instead of ${dy > 0 ? 'down' : 'up'}.` },
        { cells: translate(obj, dx + sx * width(obj), dy), why: 'This leaves a gap of the right number of squares, but the shape has moved too far. Count how far one corner moves.' },
      ]);
      const words = `${squares(Math.abs(dx))} ${dx > 0 ? 'right' : 'left'} and ${squares(Math.abs(dy))} ${dy > 0 ? 'down' : 'up'}`;
      const q = pictures(rng, obj, correct, wrong.filter((w) => inside(w.cells, G, G) && !overlaps(w.cells, obj)).slice(0, 3), {}, {
        prompt: `The blue shape is translated **${words}**. In which picture is the orange image in the correct place?`,
        calculator: 'not-allowed',
        hints: ['Choose one corner of the blue shape.', `Move that corner ${words}. The image's matching corner should land there.`],
        solution: `Every corner of the shape moves ${words}. Only one picture has the orange shape exactly ${words} from the blue shape, facing the same way.`,
      });
      if (q) return q;
    }
  },
};

// ---------------------------------------------------------------- reflections

export const reflections: QuestionTemplate = {
  id: 'm6.geo.transformations.reflect',
  topicId: 'm6.geo.transformations',
  title: 'Reflect a shape in a mirror line',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    for (;;) {
      const vertical = difficulty === 1 || rng.chance(0.5);
      const m = 5;
      const gap = difficulty === 1 ? 0 : difficulty === 2 ? rng.int(0, 1) : rng.int(1, 2);
      // Build everything as if the mirror line were vertical, then transpose for a horizontal line.
      const shape = randomShape(rng);
      if (width(shape) > 3) continue;
      const w = width(shape);
      const r0 = rng.int(0, G - height(shape));
      let obj = translate(shape, m - gap - w, r0);
      let correct = reflectV(obj, m);
      // Slid across (not flipped) into the same place as the image.
      let slide = translate(obj, minC(correct) - minC(obj), 0);
      // Flipped the wrong way (upside down) in the same place as the image.
      let upside = translate(reflectH(obj, minR(obj) + (maxR(obj) + 1 - minR(obj)) / 2), minC(correct) - minC(obj), 0);
      upside = upside.map(([c, r]) => [c, Math.round(r)] as Cell);
      // Right way round, wrong distance from the mirror line.
      const shift = maxC(correct) + 1 < G ? 1 : -1;
      let far = shift < 0 && gap === 0 ? null : translate(correct, shift, 0);
      if (!far || minC(far) < m) far = gap > 0 ? translate(correct, -1, 0) : translate(correct, 2, 0);
      if (!vertical) {
        obj = transpose(obj);
        correct = transpose(correct);
        slide = transpose(slide);
        upside = transpose(upside);
        far = transpose(far);
      }
      const wrong: Candidate[] = [
        { cells: slide, why: 'This shape has slid across without flipping. A reflection is a mirror image, so it faces the other way.' },
        { cells: upside, why: 'This shape has been flipped the wrong way. Each square must stay the same distance from the mirror line, on the other side.' },
        { cells: far, why: 'This is the right way round but the wrong distance from the mirror line. Each square of the image must be exactly as far from the line as the matching square of the shape.' },
      ];
      const q = pictures(rng, obj, correct, wrong, vertical ? { mirrorV: [m] } : { mirrorH: [m] }, {
        prompt: 'The blue shape is reflected in the red mirror line. In which picture is the orange image correct?',
        calculator: 'not-allowed',
        hints: ['A reflection is a mirror image: the image faces the opposite way.', 'Each square of the image must be the same distance from the mirror line as the matching square of the blue shape.'],
        solution: `In a reflection, every square of the shape lands the same distance from the mirror line, on the other side. The image is a mirror image, so it faces the opposite way.${gap ? ` The blue shape is ${squares(gap)} from the line, so the image must be ${squares(gap)} from the line too.` : ' The blue shape touches the line, so the image must touch it too.'}`,
      });
      if (q) return q;
    }
  },
};

// ---------------------------------------------------------------- rotations

const TURN_TEXT = { cw: 'a quarter turn clockwise', acw: 'a quarter turn anticlockwise', half: 'a half turn' } as const;
type Turn = keyof typeof TURN_TEXT;

function turnAbout(cells: readonly Cell[], t: Turn, p: [number, number]): Cell[] {
  return t === 'cw' ? rotCW(cells, p[0], p[1]) : t === 'acw' ? rotACW(cells, p[0], p[1]) : rotHalf(cells, p[0], p[1]);
}

/** A shape near the centre point P, in a random quadrant. At gap 0 one square has a corner exactly on P. */
function shapeNear(rng: Rng, P: [number, number], gap: number): Cell[] {
  for (;;) {
    const shape = randomShape(rng);
    const right = rng.chance(0.5);
    const down = rng.chance(0.5);
    const c0 = right ? P[0] + gap : P[0] - gap - width(shape);
    const r0 = down ? P[1] + gap : P[1] - gap - height(shape);
    const obj = translate(shape, c0, r0);
    if (gap === 0) {
      const corner: Cell = [right ? P[0] : P[0] - 1, down ? P[1] : P[1] - 1];
      if (!obj.some(([c, r]) => c === corner[0] && r === corner[1])) continue;
    }
    return obj;
  }
}

export const rotations: QuestionTemplate = {
  id: 'm6.geo.transformations.rotate',
  topicId: 'm6.geo.transformations',
  title: 'Rotate a shape a quarter or half turn',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const P: [number, number] = [5, 5];
    for (;;) {
      const obj = shapeNear(rng, P, difficulty === 2 ? 0 : 1);
      const t = rng.pick(['cw', 'acw', 'half'] as const);
      const correct = turnAbout(obj, t, P);
      const others = (['cw', 'acw', 'half'] as const).filter((x) => x !== t);
      const wrong: Candidate[] = [
        ...others.map((x) => ({
          cells: turnAbout(obj, x, P),
          why: x === 'half' ? 'This is a half turn (two quarter turns).' : `This is ${TURN_TEXT[x]}. Check the direction: clockwise is the way the hands of a clock move.`,
        })),
        { cells: rng.chance(0.5) ? reflectV(obj, P[0]) : reflectH(obj, P[1]), why: 'This is a reflection (a mirror image), not a turn.' },
      ];
      const q = pictures(rng, obj, correct, wrong, { centre: P }, {
        prompt: `The blue shape is rotated **${TURN_TEXT[t]}** about the black dot. In which picture is the orange image correct?`,
        calculator: 'not-allowed',
        hints: [
          'Clockwise is the way the hands of a clock turn. A quarter turn is 90°, and a half turn is 180°.',
          'Imagine pinning the shape to the page at the black dot, then turning it. A tracing helps.',
        ],
        solution: `Turning about the dot, ${TURN_TEXT[t]} moves the shape ${t === 'half' ? 'to the opposite side of the dot, upside down' : `a quarter of the way round the dot, ${t === 'cw' ? 'the same way as clock hands' : 'the opposite way to clock hands'}`}. The image stays the same distance from the dot, and it is not a mirror image.`,
      });
      if (q) return q;
    }
  },
};

// ---------------------------------------------------------------- two-step transformations

export const twoStep: QuestionTemplate = {
  id: 'm6.geo.transformations.two-step',
  topicId: 'm6.geo.transformations',
  title: 'Predict the result of two transformations',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    for (;;) {
      if (difficulty === 4) {
        const vertical = rng.chance(0.5);
        const m = 5;
        const shape = randomShape(rng);
        if (width(shape) > 3) continue;
        const gap = rng.int(0, 1);
        const t = rng.pick([2, 3, 4]) * rng.sign();
        const obj0 = translate(shape, m - gap - width(shape), rng.int(0, G - height(shape)));
        const r1 = reflectV(obj0, m);
        let correct = translate(r1, 0, t);
        let reflectOnly = r1;
        let wrongWay = translate(r1, 0, -t);
        let slid = translate(obj0, minC(r1) - minC(obj0), t);
        let obj = obj0;
        if (!vertical) [obj, correct, reflectOnly, wrongWay, slid] = [obj, correct, reflectOnly, wrongWay, slid].map(transpose) as [Cell[], Cell[], Cell[], Cell[], Cell[]];
        const dir = vertical ? (t > 0 ? 'down' : 'up') : t > 0 ? 'right' : 'left';
        const opp = { down: 'up', up: 'down', right: 'left', left: 'right' }[dir];
        const wrong: Candidate[] = [
          { cells: reflectOnly, why: 'This shows the reflection only. You still need to do the translation.' },
          { cells: wrongWay, why: `This was translated ${opp} instead of ${dir}.` },
          { cells: slid, why: 'This shape has slid but was never flipped. Step 1 is a reflection, so the image must be a mirror image.' },
        ];
        const q = pictures(rng, obj, correct, wrong, vertical ? { mirrorV: [m] } : { mirrorH: [m] }, {
          prompt: `Step 1: reflect the blue shape in the red mirror line.\n\nStep 2: translate the image **${squares(Math.abs(t))} ${dir}**.\n\nWhich picture shows the final image after both steps?`,
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Do one step at a time. Picture (or sketch) the reflection first.', `Then slide that reflection ${squares(Math.abs(t))} ${dir}.`],
          solution: `First reflect: the image is a mirror image, the same distance from the line on the other side. Then slide that image ${squares(Math.abs(t))} ${dir}. The correct picture shows a mirror image of the blue shape, on the other side of the line, moved ${squares(Math.abs(t))} ${dir}.`,
        });
        if (q) return q;
        continue;
      }
      // difficulty 5: two reflections, or a quarter turn followed by a translation.
      if (rng.chance(0.5)) {
        const m = 5;
        const shape = randomShape(rng);
        const gx = rng.int(0, 1);
        const gy = rng.int(0, 1);
        const obj = translate(shape, m - gx - width(shape), m - gy - height(shape));
        const first = reflectV(obj, m);
        const correct = reflectH(first, m);
        const wrong: Candidate[] = [
          { cells: first, why: 'This only shows step 1. Now reflect that image in the mirror line that goes across.' },
          { cells: reflectH(obj, m), why: 'This only reflects the blue shape in the line that goes across. Step 1 has been missed.' },
          { cells: rotCW(obj, m, m), why: 'This is a quarter turn of the blue shape, not two reflections.' },
        ];
        const q = pictures(rng, obj, correct, wrong, { mirrorV: [m], mirrorH: [m] }, {
          prompt: 'Step 1: reflect the blue shape in the red mirror line that goes **up and down**.\n\nStep 2: reflect that image in the red mirror line that goes **across**.\n\nWhich picture shows the final image?',
          marks: 2,
          calculator: 'not-allowed',
          hints: ['Do step 1 first and picture where the image goes.', 'Then reflect that image (not the blue shape) in the second line.'],
          solution: 'Step 1 makes a mirror image on the right of the up-and-down line. Step 2 flips that image down below the line that goes across. The final image is in the opposite corner. (Two reflections like this give the same result as a half turn about the point where the lines cross.)',
        });
        if (q) return q;
        continue;
      }
      const P: [number, number] = [5, 5];
      const obj = shapeNear(rng, P, 0);
      const turn = rng.pick(['cw', 'acw'] as const);
      const dirs = [
        ['right', 1, 0],
        ['left', -1, 0],
        ['down', 0, 1],
        ['up', 0, -1],
      ] as const;
      const [dir, ux, uy] = rng.pick(dirs);
      const k = rng.int(1, 2);
      const turned = turnAbout(obj, turn, P);
      const correct = translate(turned, ux * k, uy * k);
      const other = turn === 'cw' ? 'acw' : 'cw';
      const wrong: Candidate[] = [
        { cells: turned, why: 'This only shows the turn. You still need to translate it.' },
        { cells: translate(turnAbout(obj, other, P), ux * k, uy * k), why: `This turned ${TURN_TEXT[other].replace('a quarter turn ', '')}, the wrong way.` },
        { cells: translate(obj, ux * k, uy * k), why: 'This was translated but never turned.' },
      ];
      const q = pictures(rng, obj, correct, wrong, { centre: P }, {
        prompt: `Step 1: rotate the blue shape **${TURN_TEXT[turn]}** about the black dot.\n\nStep 2: translate the image **${squares(k)} ${dir}**.\n\nWhich picture shows the final image?`,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Picture the turn first. Clockwise is the way clock hands move.', `Then slide the turned shape ${squares(k)} ${dir}.`],
        solution: `First turn the shape ${TURN_TEXT[turn]} about the dot. Then slide that image ${squares(k)} ${dir}. The final image is turned (not flipped) and sits ${squares(k)} ${dir} of where the turn put it.`,
      });
      if (q) return q;
    }
  },
};

// ---------------------------------------------------------------- tessellations

interface Poly {
  name: string;
  angle: number;
}

const REGULAR: readonly Poly[] = [
  { name: 'equilateral triangle', angle: 60 },
  { name: 'square', angle: 90 },
  { name: 'regular pentagon', angle: 108 },
  { name: 'regular hexagon', angle: 120 },
  { name: 'regular octagon', angle: 135 },
  { name: 'regular decagon (10 sides)', angle: 144 },
  { name: 'regular dodecagon (12 sides)', angle: 150 },
];

const MIXES: ReadonlyArray<readonly Poly[]> = [
  [REGULAR[1]!, REGULAR[4]!, REGULAR[4]!],
  [REGULAR[0]!, REGULAR[0]!, REGULAR[0]!, REGULAR[1]!, REGULAR[1]!],
  [REGULAR[0]!, REGULAR[6]!, REGULAR[6]!],
  [REGULAR[1]!, REGULAR[3]!, REGULAR[6]!],
  [REGULAR[0]!, REGULAR[0]!, REGULAR[3]!, REGULAR[3]!],
  [REGULAR[0]!, REGULAR[0]!, REGULAR[0]!, REGULAR[0]!, REGULAR[3]!],
  [REGULAR[0]!, REGULAR[1]!, REGULAR[3]!],
  [REGULAR[2]!, REGULAR[2]!, REGULAR[0]!],
  [REGULAR[1]!, REGULAR[1]!, REGULAR[3]!],
  [REGULAR[4]!, REGULAR[4]!, REGULAR[0]!],
  [REGULAR[2]!, REGULAR[2]!, REGULAR[1]!],
  [REGULAR[3]!, REGULAR[3]!, REGULAR[0]!],
  [REGULAR[5]!, REGULAR[5]!],
  [REGULAR[6]!, REGULAR[1]!, REGULAR[0]!],
];

const TILE_CONTEXTS = ['bathroom tiles', 'paving stones', 'pattern blocks', 'cardboard tiles for a class display', 'mosaic tiles', 'tiles for a marae kitchen floor'];

export const tessellation: QuestionTemplate = {
  id: 'm6.geo.transformations.tessellation',
  topicId: 'm6.geo.transformations',
  title: 'Tessellations and angles at a point',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const who = rng.pick(NAMES);
    const ctx = rng.pick(TILE_CONTEXTS);
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        const p = rng.pick([REGULAR[0]!, REGULAR[1]!, REGULAR[3]!]);
        return {
          type: 'numeric',
          prompt: `${who} is making a tessellation with ${ctx} shaped like a ${p.name}. Each corner of the ${p.name} is ${p.angle}°. How many tiles fit together around one point, with no gaps or overlaps?`,
          answer: 360 / p.angle,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['The angles around a point add up to 360°.', `How many lots of ${p.angle}° make 360°?`],
          solution: `Angles at a point add to 360°. $360 \\div ${p.angle} = ${360 / p.angle}$, so **${360 / p.angle}** tiles fit around each point.`,
        };
      }
      const pair = rng.sample([60, 90, 120, 135, 150, 108], 2);
      const third = 360 - pair[0]! - pair[1]!;
      return {
        type: 'numeric',
        prompt: `Three ${ctx} meet at a point with no gaps. Two of the corners at the point are ${pair[0]}° and ${pair[1]}°. What size must the third corner be?`,
        answer: third,
        form: 'integer',
        units: '°',
        calculator: 'not-allowed',
        hints: ['The angles around a point add up to 360°.', `Add the two angles you know, then take the total away from 360°.`],
        solution: `$${pair[0]} + ${pair[1]} = ${pair[0]! + pair[1]!}$, and $360 - ${pair[0]! + pair[1]!} = ${third}$. The third corner must be **${third}°**.`,
      };
    }
    if (difficulty === 3) {
      const p = rng.pick(REGULAR);
      const fits = 360 % p.angle === 0;
      const yes = `Yes, because 360° ÷ ${p.angle}° is a whole number, so the corners fit exactly around a point.`;
      const no = `No, because 360° ÷ ${p.angle}° is not a whole number, so there would be gaps or overlaps.`;
      const wrong: Array<[string, string]> = fits
        ? [
            [no, `Check: $360 \\div ${p.angle} = ${360 / p.angle}$, which is a whole number.`],
            ['No, because only squares can tessellate.', 'Other shapes tessellate too. Check whether the corners fit around a point.'],
            ['Yes, because all its sides are the same length.', 'Equal sides are not enough: a regular pentagon has equal sides but does not tessellate. It depends on the angles.'],
          ]
        : [
            [yes, `Check: $360 \\div ${p.angle}$ is not a whole number. ${Math.floor(360 / p.angle)} tiles make ${Math.floor(360 / p.angle) * p.angle}°, which leaves a gap.`],
            ['Yes, because all its sides are the same length.', 'Equal sides are not enough. It depends on whether the corners fit exactly around a point.'],
            ['No, because shapes with more than four sides can never tessellate.', 'Regular hexagons have six sides and they tessellate. It depends on the angles.'],
          ];
      return mcq(rng, fits ? yes : no, wrong, {
        prompt: `${who} wants to cover a floor with ${ctx} that are all the same ${p.name}. Each corner of a ${p.name} is ${p.angle}°. Will the tiles tessellate (fit together with no gaps or overlaps)?`,
        calculator: 'not-allowed',
        hints: ['Where the tiles meet, their corners must fit around a point. Angles at a point add up to 360°.', `Does ${p.angle}° go into 360° exactly?`],
        solution: fits
          ? `$360 \\div ${p.angle} = ${360 / p.angle}$, a whole number. So ${360 / p.angle} corners fit exactly around each point, and the ${p.name} **tessellates**.`
          : `$360 \\div ${p.angle}$ is not a whole number. ${Math.floor(360 / p.angle)} corners make $${Math.floor(360 / p.angle)} \\times ${p.angle} = ${Math.floor(360 / p.angle) * p.angle}°$, leaving a gap of ${360 - Math.floor(360 / p.angle) * p.angle}°, and one more would overlap. So the ${p.name} **does not tessellate** on its own.`,
      });
    }
    // difficulty 4: a mix of tiles around a point — how big is the gap?
    const mix = rng.pick(MIXES);
    const total = mix.reduce((s, p) => s + p.angle, 0);
    const gap = 360 - total;
    const counts = new Map<string, number>();
    for (const p of mix) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
    const plural = (name: string) => name.replace(/^(\S+(?: \S+)?)( \(|$)/, (_m, w: string, rest: string) => `${w}s${rest}`);
    const desc = [...counts].map(([name, k]) => `${k === 1 ? 'one' : NUMBER_WORDS[k]} ${k === 1 ? name : plural(name)} (${mix.find((p) => p.name === name)!.angle}° ${k === 1 ? 'corner' : 'corners'})`).join(', ');
    const sumTex = mix.map((p) => p.angle).join(' + ');
    return {
      type: 'numeric',
      prompt: `${who} puts ${ctx} around a point: ${desc}. How many degrees of gap are left around the point? (Write 0 if they fit exactly.)`,
      answer: gap,
      form: 'integer',
      units: '°',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Add up all the corner angles at the point.', 'A full turn around a point is 360°. Subtract your total from 360°.'],
      solution: `Total of the angles: $${sumTex} = ${total}°$\n\nGap: $360 - ${total} = ${gap}°$${gap === 0 ? ', so these tiles fit exactly around the point with no gap.' : '.'}`,
    };
  },
};

export const templates: QuestionTemplate[] = [identify, translations, reflections, rotations, twoStep, tessellation];
