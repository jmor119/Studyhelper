import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import {
  BASE_SIDES,
  QUAD_KINDS,
  SYM_EASY,
  SYM_HARDER,
  counts,
  drawMarked,
  drawSolid,
  drawSym,
  makeAngleQuad,
  makeQuad,
  makeTriangle,
  solidName,
  type AngleKind,
  type QuadKind,
  type SolidType,
} from './shapes-helpers';

// m6.geo.shapes — classify quadrilaterals and triangles, describe interior angles, find the order
// of rotational symmetry, and count the faces, edges and vertices of prisms and pyramids.
//
// Definitions used: a trapezium has exactly one pair of parallel sides, and a kite has two pairs
// of equal sides next to each other. Because some books also count a parallelogram as a trapezium
// (or a rhombus as a kite), those names are never offered for shapes where the answer could be argued.

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
type McqBase = Omit<Extract<TemplateOutput, { type: 'mcq' }>, 'type' | 'options' | 'correct' | 'feedback'>;

function mcq(rng: Rng, correct: string, wrong: Array<[string, string]>, base: McqBase): TemplateOutput {
  const seen = new Set([correct]);
  const distractors = wrong.filter(([t]) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 3);
  const order = rng.shuffle<[string, string | undefined]>([[correct, undefined], ...distractors]);
  const feedback: Record<string, string> = {};
  order.forEach(([, fb], i) => {
    if (fb) feedback[ids[i]!] = fb;
  });
  return {
    type: 'mcq',
    options: order.map(([text], i) => ({ id: ids[i]!, text })),
    correct: ids[order.findIndex(([t]) => t === correct)]!,
    feedback,
    ...base,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const article = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);

// ---------------------------------------------------------------- quadrilaterals

const FAMILY: Record<QuadKind, QuadKind[]> = {
  square: ['square', 'rectangle', 'rhombus', 'parallelogram'],
  rectangle: ['rectangle', 'parallelogram'],
  rhombus: ['rhombus', 'parallelogram'],
  parallelogram: ['parallelogram'],
  kite: ['kite'],
  trapezium: ['trapezium'],
};

/** Names that could be argued either way for this shape, so they're never offered. */
const AVOID: Record<QuadKind, QuadKind[]> = {
  square: ['kite', 'trapezium'],
  rectangle: ['trapezium'],
  rhombus: ['kite', 'trapezium'],
  parallelogram: ['trapezium'],
  kite: [],
  trapezium: [],
};

const NEEDS: Record<QuadKind, string> = {
  square: 'A square needs four equal sides and four right angles.',
  rectangle: 'A rectangle needs four right angles.',
  rhombus: 'A rhombus needs four equal sides.',
  parallelogram: 'A parallelogram needs two pairs of parallel sides.',
  kite: 'A kite needs two pairs of equal sides that are next to each other.',
  trapezium: 'A trapezium has exactly one pair of parallel sides.',
};

const HAS: Record<QuadKind, string> = {
  square: 'This shape has four equal sides and four right angles.',
  rectangle: 'This shape has four right angles, but only its opposite sides are equal.',
  rhombus: 'This shape has four equal sides, but no right angles.',
  parallelogram: 'This shape has two pairs of parallel sides, but no right angles, and its sides are not all equal.',
  kite: 'This shape has two pairs of equal sides next to each other, and no parallel sides.',
  trapezium: 'This shape has only one pair of parallel sides.',
};

function whyNot(actual: QuadKind, chosen: QuadKind): string {
  if (FAMILY[actual].includes(chosen)) return `It is ${article(chosen)}, but there is a more exact name. ${HAS[actual]}`;
  return `${NEEDS[chosen]} ${HAS[actual]}`;
}

const DESCRIPTIONS: Record<QuadKind, readonly string[]> = {
  square: ['I have four equal sides and four right angles.', 'All my sides are the same length, and all my angles are right angles.', 'I am a rhombus with four right angles.', 'I am a rectangle with four equal sides.'],
  rectangle: ['I have four right angles, but my sides are not all the same length.', 'I am a parallelogram with four right angles. Two of my sides are longer than the other two.'],
  rhombus: ['I have four equal sides, but none of my angles is a right angle.', 'I am a parallelogram with four equal sides and no right angles.'],
  parallelogram: ['I have two pairs of parallel sides. My sides are not all the same length, and I have no right angles.', 'My opposite sides are parallel and equal, but I have no right angles and two of my sides are longer than the other two.'],
  kite: ['I have two pairs of equal sides. Each pair is next to each other, not opposite. I have no parallel sides.', 'Two short sides next to each other are equal, and two long sides next to each other are equal. None of my sides are parallel.'],
  trapezium: ['I have exactly one pair of parallel sides.', 'Only two of my sides are parallel. The other two sides are not parallel.'],
};

const MARKS_HINT = 'Tick marks show sides that are equal. Arrows show sides that are parallel. A small square shows a right angle.';

export const quadrilaterals: QuestionTemplate = {
  id: 'm6.geo.shapes.quadrilaterals',
  topicId: 'm6.geo.shapes',
  title: 'Name and classify quadrilaterals',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const kind = rng.pick(QUAD_KINDS);
    const pool = QUAD_KINDS.filter((k) => k !== kind && !AVOID[kind].includes(k));
    const wrong = rng.shuffle(pool).map((k) => [cap(k), whyNot(kind, k)] as [string, string]);
    const solution = `${HAS[kind]} So the most exact name is **${kind}**.${FAMILY[kind].length > 1 ? ` (It is also ${FAMILY[kind].slice(1).map(article).join(' and ')}, but "${kind}" tells you the most about it.)` : ''}`;

    if (difficulty === 2) {
      const who = rng.pick(NAMES);
      return mcq(rng, cap(kind), wrong, {
        prompt: `${who} is thinking of a quadrilateral and says:\n\n> ${rng.pick(DESCRIPTIONS[kind])}\n\nWhat is the most exact name for ${who}'s shape?`,
        calculator: 'not-allowed',
        hints: ['Check each property: equal sides, parallel sides and right angles.', 'A shape can belong to more than one group. Choose the name that fits all the clues best.'],
        solution,
      });
    }

    const rot = difficulty === 1 ? rng.int(-12, 12) : rng.pick([1, -1]) * rng.int(25, 65);
    const figure = { svg: drawMarked(makeQuad(rng, kind), rot), alt: 'A quadrilateral with tick marks for equal sides, arrows for parallel sides and small squares for any right angles.' };
    if (difficulty === 3 && FAMILY[kind].length <= 2 && kind !== 'kite' && kind !== 'trapezium') {
      // rectangle, rhombus or parallelogram: select all the names that fit.
      const names: QuadKind[] = ['square', 'rectangle', 'rhombus', 'parallelogram', 'kite'].filter((k) => !AVOID[kind].includes(k as QuadKind)) as QuadKind[];
      const opts = rng.shuffle(names);
      return {
        type: 'multi',
        prompt: 'Look at the markings on this quadrilateral. Select **all** the names that are correct for it.',
        figure,
        options: opts.map((k, i) => ({ id: ids[i]!, text: cap(k) })),
        correct: opts.map((k, i) => (FAMILY[kind].includes(k) ? ids[i]! : '')).filter(Boolean),
        calculator: 'not-allowed',
        hints: [MARKS_HINT, 'A shape can have more than one name. A square, for example, is also a rectangle.'],
        solution: `${HAS[kind]} So it is ${FAMILY[kind].map(article).join(' and ')}${FAMILY[kind].length > 1 ? ` ("${kind}" is the most exact name)` : ''}. It is not ${names.filter((k) => !FAMILY[kind].includes(k)).map(article).join(' or ')}.`,
      };
    }
    return mcq(rng, cap(kind), wrong, {
      prompt: `Look at the markings on this quadrilateral. What is its most exact name?`,
      figure,
      calculator: 'not-allowed',
      hints: [MARKS_HINT, 'Count the equal sides, the pairs of parallel sides and the right angles.'],
      solution,
    });
  },
};

// ---------------------------------------------------------------- triangles and interior angles

const ANGLE_NAME: Record<AngleKind, string> = { acute: 'Acute-angled triangle', right: 'Right-angled triangle', obtuse: 'Obtuse-angled triangle' };
const ANGLE_WHY: Record<AngleKind, string> = {
  acute: 'An acute-angled triangle has all three angles less than 90°.',
  right: 'A right-angled triangle has one angle of exactly 90°, shown by a small square.',
  obtuse: 'An obtuse-angled triangle has one angle bigger than 90°.',
};

export const trianglesAngles: QuestionTemplate = {
  id: 'm6.geo.shapes.triangles-angles',
  topicId: 'm6.geo.shapes',
  title: 'Types of triangles and interior angles',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const kind = rng.pick(['equilateral', 'isosceles', 'scalene'] as const);
      let s: number[];
      for (;;) {
        const a = rng.int(3, 12);
        if (kind === 'equilateral') s = [a, a, a];
        else if (kind === 'isosceles') s = [a, a, rng.int(2, 12)];
        else s = [a, rng.int(3, 12), rng.int(3, 12)];
        const [x, y, z] = [...s].sort((p, q) => p - q) as [number, number, number];
        const ok = x + y > z && (kind !== 'isosceles' || new Set(s).size === 2) && (kind !== 'scalene' || new Set(s).size === 3);
        if (ok) break;
      }
      s = rng.shuffle(s);
      const unit = rng.pick(['cm', 'm', 'mm']);
      const why: Record<string, string> = {
        Equilateral: 'An equilateral triangle has all three sides the same length.',
        Isosceles: 'An isosceles triangle has two sides the same length.',
        Scalene: 'A scalene triangle has no sides the same length.',
        'Right-angled': 'Right-angled describes an angle, and you can’t tell that from these side lengths. Look at which sides are equal.',
      };
      const opts = kind === 'equilateral' ? ['Equilateral', 'Scalene', 'Right-angled'] : ['Equilateral', 'Isosceles', 'Scalene'];
      const correct = cap(kind);
      return mcq(
        rng,
        correct,
        opts.filter((o) => o !== correct).map((o) => [o, why[o]!] as [string, string]),
        {
          prompt: `A triangle has sides of ${s[0]} ${unit}, ${s[1]} ${unit} and ${s[2]} ${unit}. What type of triangle is it?`,
          calculator: 'not-allowed',
          hints: ['Look at how many of the sides are the same length.'],
          solution: `${new Set(s).size === 1 ? 'All three sides are equal' : new Set(s).size === 2 ? 'Exactly two sides are equal' : 'No two sides are equal'}, so it is ${article(kind)} triangle. ${why[correct]}`,
        },
      );
    }
    if (difficulty === 2) {
      const kind = rng.pick(['acute', 'right', 'obtuse'] as const);
      const svg = drawMarked(makeTriangle(rng, kind), rng.int(0, 359), { w: 280, h: 210 });
      return mcq(
        rng,
        ANGLE_NAME[kind],
        (['acute', 'right', 'obtuse'] as const).filter((k) => k !== kind).map((k) => [ANGLE_NAME[k], `${ANGLE_WHY[k]} Look again at the biggest angle in this triangle.`] as [string, string]),
        {
          prompt: 'Look at the angles inside this triangle. Which name describes it?',
          figure: { svg, alt: 'A triangle drawn to scale. Any right angle is marked with a small square.' },
          calculator: 'not-allowed',
          hints: ['Find the biggest angle in the triangle.', 'Is it less than a right angle, exactly a right angle, or more than a right angle?'],
          solution: `${ANGLE_WHY[kind]} ${kind === 'acute' ? 'Every angle in this triangle is smaller than a right angle' : kind === 'right' ? 'This triangle has a right angle (marked with a square)' : 'This triangle has one angle that opens wider than a right angle'}, so it is **${ANGLE_NAME[kind].toLowerCase()}**.`,
        },
      );
    }
    // difficulty 3: count the acute / obtuse / right interior angles of a quadrilateral.
    const { shape, kinds } = makeAngleQuad(rng, rng.chance(0.4));
    const svg = drawMarked(shape, rng.int(0, 359), { letters: true, w: 280, h: 230 });
    const ask = rng.pick((['acute', 'obtuse', ...(kinds.includes('right') ? ['right'] : [])] as AngleKind[]));
    const k = kinds.filter((x) => x === ask).length;
    const list = kinds.map((x, i) => `angle ${'ABCD'[i]} is ${x === 'right' ? 'a right angle' : x}`).join(', ');
    return {
      type: 'numeric',
      prompt: `Look at the interior angles (the angles inside the shape) of quadrilateral ABCD. How many of them are ${ask === 'right' ? 'right angles' : `${ask} angles`}?`,
      figure: { svg, alt: 'Quadrilateral ABCD drawn to scale, with its corners labelled A, B, C and D. Any right angle is marked with a small square.' },
      answer: k,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['An acute angle is smaller than a right angle (less than 90°). An obtuse angle is bigger than a right angle but less than 180°.', 'Check the angle at each corner: A, B, C and D. You could compare each one with the corner of a piece of paper.'],
      solution: `Checking each corner: ${list}.\n\nSo **${k}** of the interior angles ${k === 1 ? 'is' : 'are'} ${ask === 'right' ? 'right angles' : ask}.`,
    };
  },
};

// ---------------------------------------------------------------- rotational symmetry

interface TurnContext {
  thing: (k: number) => string;
  orders: readonly number[];
}

const TURNS: readonly TurnContext[] = [
  { thing: (k) => `a ceiling fan with ${k} identical blades`, orders: [3, 4, 5, 6] },
  { thing: (k) => `a bike wheel with ${k} evenly spaced spokes`, orders: [8, 10, 12, 18, 20, 36] },
  { thing: () => 'a starfish with 5 identical arms', orders: [5] },
  { thing: () => 'a snowflake with 6 identical points', orders: [6] },
  { thing: (k) => `a flower with ${k} identical petals`, orders: [5, 6, 8, 9, 10, 12] },
  { thing: () => 'a wind turbine with 3 identical blades', orders: [3] },
  { thing: (k) => `a design with ${k} identical koru spaced evenly around a circle`, orders: [4, 5, 6, 8] },
  { thing: (k) => `a hubcap with ${k} identical sections`, orders: [5, 6, 9, 10] },
];

export const rotationalSymmetry: QuestionTemplate = {
  id: 'm6.geo.shapes.rotational-symmetry',
  topicId: 'm6.geo.shapes',
  title: 'Order of rotational symmetry',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty <= 2) {
      const s = rng.pick(difficulty === 1 ? SYM_EASY : SYM_HARDER);
      const rot = rng.int(0, 359);
      return {
        type: 'numeric',
        prompt: `What is the order of rotational symmetry of this ${s.name}?`,
        figure: { svg: drawSym(s, rot), alt: `${cap(article(s.name))}.` },
        answer: s.order,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          'Imagine tracing the shape, then turning the tracing around its centre.',
          'Count how many times it fits exactly on top of the shape during one full turn. Count the end of the turn, but not the start.',
        ],
        solution:
          s.order === 1
            ? `The ${s.name} only looks the same again when it has turned all the way round (360°). So its order of rotational symmetry is **1**.`
            : `In one full turn, the ${s.name} looks exactly the same ${s.order} times (every $360° \\div ${s.order} = ${360 / s.order}°$). So its order of rotational symmetry is **${s.order}**.`,
      };
    }
    const c = rng.pick(TURNS);
    const k = rng.pick(c.orders);
    const angle = 360 / k;
    if (rng.chance(0.5)) {
      return {
        type: 'numeric',
        prompt: `Think about ${c.thing(k)}. What is the smallest turn (in degrees) that makes it look exactly the same again?`,
        answer: angle,
        form: 'integer',
        units: '°',
        calculator: 'not-allowed',
        hints: [`Its order of rotational symmetry is ${k}.`, 'A full turn is 360°. Share the full turn into equal parts.'],
        solution: `It looks the same ${k} times in a full turn, so each turn is $360° \\div ${k} = ${angle}°$.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `${rng.pick(NAMES)} spins a shape around its centre. It looks exactly the same after every turn of ${angle}°. What is its order of rotational symmetry?`,
      answer: k,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['A full turn is 360°.', `How many turns of ${angle}° fit into 360°?`],
      solution: `$360° \\div ${angle}° = ${k}$, so it looks the same ${k} times in a full turn. The order of rotational symmetry is **${k}**.`,
    };
  },
};

// ---------------------------------------------------------------- prisms and pyramids

const TYPE_HINT = 'A prism has two matching ends joined by rectangles. A pyramid has one base, and triangles that meet at a point (the apex).';

export const prismsPyramids: QuestionTemplate = {
  id: 'm6.geo.shapes.prisms-pyramids',
  topicId: 'm6.geo.shapes',
  title: 'Prisms and pyramids: names, faces, edges and vertices',
  difficulties: [1, 2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const type: SolidType = rng.pick(['prism', 'pyramid'] as const);
    const n = rng.pick(BASE_SIDES);
    const name = solidName(type, n);
    const cnt = counts(type, n);
    const figure = () => ({
      svg: drawSolid(type, n, rng.next()),
      alt: 'A sketch of a 3D shape. Dashed lines show the edges at the back.',
    });
    const other: SolidType = type === 'prism' ? 'pyramid' : 'prism';

    if (difficulty === 1) {
      const nearby = BASE_SIDES.filter((m) => m !== n);
      const m = rng.pick(nearby);
      const wrong: Array<[string, string]> = [
        [cap(solidName(other, n)), TYPE_HINT],
        [cap(solidName(type, m)), `Count the sides of the base carefully. This one has ${n} sides.`],
        [cap(solidName(other, m)), `${TYPE_HINT} Also count the sides of the base.`],
      ];
      return mcq(rng, cap(name), wrong, {
        prompt: 'What is the name of this solid? (Dashed lines are edges at the back that you can’t see.)',
        figure: figure(),
        calculator: 'not-allowed',
        hints: [TYPE_HINT, 'Count the sides of the base to get the first part of the name.'],
        solution: `It ${type === 'prism' ? 'has two matching ends joined by rectangles, so it is a prism' : 'has one base and triangles meeting at a point, so it is a pyramid'}. The base has ${n} sides (a ${['', '', '', 'triangle', 'square', 'pentagon', 'hexagon', '', 'octagon'][n]}), so it is ${article(name).split(' ')[0]} **${name}**.`,
      });
    }

    if (difficulty === 2 || difficulty === 3) {
      const what = difficulty === 2 ? 'faces' : rng.pick(['edges', 'vertices'] as const);
      const answer = cnt[what];
      const working: Record<string, string> =
        type === 'prism'
          ? {
              faces: `2 ends + ${n} rectangles around the side $= ${n + 2}$ faces.`,
              edges: `${n} edges around the top + ${n} around the bottom + ${n} going up the sides $= ${3 * n}$ edges.`,
              vertices: `${n} corners on the top + ${n} on the bottom $= ${2 * n}$ vertices.`,
            }
          : {
              faces: `1 base + ${n} triangles around the side $= ${n + 1}$ faces.`,
              edges: `${n} edges around the base + ${n} going up to the apex $= ${2 * n}$ edges.`,
              vertices: `${n} corners on the base + 1 apex at the top $= ${n + 1}$ vertices.`,
            };
      const meaning: Record<string, string> = {
        faces: 'A face is a flat surface.',
        edges: 'An edge is a line where two faces meet.',
        vertices: 'A vertex is a corner where edges meet.',
      };
      return {
        type: 'numeric',
        prompt: `This is ${article(name)}. How many **${what}** does it have?`,
        figure: figure(),
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`${meaning[what]} Remember to count the ones you can't see (dashed lines show the back).`, type === 'prism' ? 'Think about the top, the bottom and the sides separately.' : 'Think about the base and the parts that go up to the apex separately.'],
        solution: working[what]!,
      };
    }

    if (difficulty === 4) {
      const m = rng.int(3, 8);
      const c = counts(type, m);
      const given = rng.pick(['faces', 'edges', 'vertices'] as const);
      const ask = rng.chance(0.5) ? 'sides' : rng.pick((['faces', 'edges', 'vertices'] as const).filter((x) => x !== given));
      const answer = ask === 'sides' ? m : c[ask];
      const rule = type === 'prism' ? 'A prism with an n-sided base has n + 2 faces, 3 × n edges and 2 × n vertices.' : 'A pyramid with an n-sided base has n + 1 faces, 2 × n edges and n + 1 vertices.';
      const findN =
        type === 'prism'
          ? { faces: `faces = sides + 2, so the base has $${c.faces} - 2 = ${m}$ sides.`, edges: `edges = 3 × sides, so the base has $${c.edges} \\div 3 = ${m}$ sides.`, vertices: `vertices = 2 × sides, so the base has $${c.vertices} \\div 2 = ${m}$ sides.` }
          : { faces: `faces = sides + 1, so the base has $${c.faces} - 1 = ${m}$ sides.`, edges: `edges = 2 × sides, so the base has $${c.edges} \\div 2 = ${m}$ sides.`, vertices: `vertices = sides + 1, so the base has $${c.vertices} - 1 = ${m}$ sides.` };
      const finish =
        ask === 'sides'
          ? ''
          : type === 'prism'
            ? { faces: `\n\nFaces: $${m} + 2 = ${c.faces}$`, edges: `\n\nEdges: $3 \\times ${m} = ${c.edges}$`, vertices: `\n\nVertices: $2 \\times ${m} = ${c.vertices}$` }[ask]
            : { faces: `\n\nFaces: $${m} + 1 = ${c.faces}$`, edges: `\n\nEdges: $2 \\times ${m} = ${c.edges}$`, vertices: `\n\nVertices: $${m} + 1 = ${c.vertices}$` }[ask];
      return {
        type: 'numeric',
        prompt: `A ${type} has ${c[given]} ${given}. ${ask === 'sides' ? 'How many sides does its base have?' : `How many ${ask} does it have?`}`,
        answer,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [type === 'prism' ? 'Picture a prism: a top, a bottom and rectangles around the sides.' : 'Picture a pyramid: a base, and triangles meeting at the apex.', 'Work out how many sides the base has first.'],
        solution: `${rule}\n\nThe ${findN[given]}${finish}`,
      };
    }

    // difficulty 5: combining a prism and a pyramid with the same base.
    const m = rng.int(3, 8);
    const pr = counts('prism', m);
    const py = counts('pyramid', m);
    const kind = rng.pick(['together', 'glued'] as const);
    if (kind === 'together') {
      const total = pr.edges + py.edges;
      return {
        type: 'numeric',
        prompt: `A prism and a pyramid have bases with the same number of sides. Altogether, the two solids have ${total} edges. How many sides does each base have?`,
        answer: m,
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['A prism with an n-sided base has 3 × n edges. How many edges does a pyramid with an n-sided base have?', 'Together they have 5 lots of n edges.'],
        solution: `A prism has $3 \\times n$ edges and a pyramid has $2 \\times n$ edges, so together they have $5 \\times n$ edges.\n\n$${total} \\div 5 = ${m}$, so each base has **${m}** sides.\n\nCheck: $${pr.edges} + ${py.edges} = ${total}$ ✓`,
      };
    }
    const shape = m === 4 ? 'square' : m === 3 ? 'triangle' : `${m}-sided shape`;
    const ask = rng.pick(['faces', 'edges', 'vertices'] as const);
    const ans = { faces: 2 * m + 1, edges: 4 * m, vertices: 2 * m + 1 }[ask];
    const why = {
      faces: `The prism has ${pr.faces} faces and the pyramid has ${py.faces}. The two faces that are glued together are now inside, so $${pr.faces} + ${py.faces} - 2 = ${ans}$ faces.`,
      edges: `The prism has ${pr.edges} edges and the pyramid has ${py.edges}. The ${m} edges around the glued faces are shared, so they are only counted once: $${pr.edges} + ${py.edges} - ${m} = ${ans}$ edges.`,
      vertices: `The prism has ${pr.vertices} vertices and the pyramid has ${py.vertices}. The ${m} corners of the glued faces are shared: $${pr.vertices} + ${py.vertices} - ${m} = ${ans}$ vertices.`,
    }[ask];
    return {
      type: 'numeric',
      prompt: `${rng.pick(NAMES)} glues a pyramid on top of a prism to make a model. Both have the same ${shape} as their base, so the base of the pyramid fits exactly on the top of the prism. How many **${ask}** does the new solid have?`,
      answer: ans,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Count the ${ask} of the prism and the pyramid separately first.`, 'Some of them disappear inside the model or are shared when the two solids join.'],
      solution: why,
    };
  },
};

export const templates: QuestionTemplate[] = [quadrilaterals, trianglesAngles, rotationalSymmetry, prismsPyramids];
