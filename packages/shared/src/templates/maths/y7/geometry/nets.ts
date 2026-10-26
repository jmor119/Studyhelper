import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { label, svgDoc } from '../../../svg';
import {
  capital,
  counts,
  cubeNetFigure,
  fitsBox,
  foldCube,
  has2x2,
  hexominoes,
  key3,
  negKey,
  netSvgBody,
  prismNet,
  pyramidNet,
  rowOf4,
  SHAPE_NAMES,
  solidFigure,
  solidName,
  type SolidKind,
} from './nets-helpers';

// m7.geo.nets templates: the 2D shapes that make up prisms and pyramids, counting faces, edges
// and vertices, matching nets to solids, deciding whether a net folds up, and cube nets.

const NUM = { type: 'numeric' as const, form: 'integer' as const, calculator: 'not-allowed' as const };

interface Solid {
  kind: SolidKind;
  n: number;
  cube?: boolean;
}

const article = (s: string) => (/^[aeiou]/.test(s) ? `an ${s}` : `a ${s}`);

// ---------------------------------------------------------------- face shapes

const SHAPES = ['Triangle', 'Square', 'Rectangle', 'Pentagon', 'Hexagon', 'Octagon'] as const;
type ShapeName = (typeof SHAPES)[number];

export const faceShapes: QuestionTemplate = {
  id: 'm7.geo.nets.face-shapes',
  topicId: 'm7.geo.nets',
  title: 'The 2D shapes that make up prisms and pyramids',
  difficulties: [1, 2],
  variety: 14,
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 1) {
      const q = rng.pick([
        { s: { kind: 'prism', n: 4, cube: true }, part: 'all' },
        { s: { kind: 'prism', n: 4 }, part: 'all' },
        ...[3, 5, 6].flatMap((n) => [
          { s: { kind: 'prism', n }, part: 'ends' },
          { s: { kind: 'prism', n }, part: 'sides' },
        ]),
        ...[3, 4, 5, 6].flatMap((n) => [
          { s: { kind: 'pyramid', n }, part: 'base' },
          { s: { kind: 'pyramid', n }, part: 'sides' },
        ]),
      ] as Array<{ s: Solid; part: 'all' | 'ends' | 'sides' | 'base' }>);
      const { s, part } = q;
      const name = solidName(s.kind, s.n, s.cube);
      let prompt: string;
      let answer: ShapeName;
      let why: string;
      if (part === 'all') {
        prompt = s.cube ? 'What shape is every face of a cube?' : 'What shape are the faces of a rectangular prism (a box shape)?';
        answer = s.cube ? 'Square' : 'Rectangle';
        why = s.cube ? 'A cube has 6 faces and every one is a square.' : 'A rectangular prism has 6 faces and they are all rectangles (some may be squares).';
      } else if (part === 'ends') {
        prompt = `What shape are the two end faces of ${article(name)}?`;
        answer = capital(SHAPE_NAMES[s.n]!) as ShapeName;
        why = `A prism is named after its end faces. ${capital(article(name))} has two ${SHAPE_NAMES[s.n]} ends.`;
      } else if (part === 'base') {
        prompt = `What shape is the base of ${article(name)}?`;
        answer = (s.n === 4 ? 'Square' : capital(SHAPE_NAMES[s.n]!)) as ShapeName;
        why = `A pyramid is named after its base. ${capital(article(name))} has ${article(answer.toLowerCase())} base.`;
      } else if (s.kind === 'prism') {
        prompt = `What shape are the side faces of ${article(name)} (the faces that join the two ends)?`;
        answer = 'Rectangle';
        why = 'In every prism, the side faces joining the two ends are rectangles.';
      } else {
        prompt = `What shape are the sloping faces of ${article(name)} (the faces that meet at the top point)?`;
        answer = 'Triangle';
        why = 'In every pyramid, the sloping faces are triangles that meet at one point, the apex.';
      }
      const others = rng.sample(SHAPES.filter((x) => x !== answer), 3);
      const opts = [answer, ...others];
      return {
        type: 'mcq',
        prompt,
        figure: { svg: solidFigure(s.kind, s.n, s.cube), alt: `A sketch of ${article(name)}, with hidden edges dashed.` },
        options: opts.map((o) => ({ id: o.toLowerCase(), text: o })),
        correct: answer.toLowerCase(),
        feedback: Object.fromEntries(
          others.map((o) => [
            o.toLowerCase(),
            o === 'Rectangle'
              ? 'Rectangles are the side faces of a prism. Look again at which faces the question is asking about.'
              : o === 'Triangle'
                ? 'Triangles are the sloping faces of a pyramid. Look again at which faces the question is asking about.'
                : `Count the sides of the face. ${capital(article(o.toLowerCase()))} has ${{ Square: 4, Pentagon: 5, Hexagon: 6, Octagon: 8 }[o as 'Square' | 'Pentagon' | 'Hexagon' | 'Octagon']} sides.`,
          ]),
        ),
        calculator: 'not-allowed',
        hints: [s.kind === 'prism' ? 'A prism has two matching ends joined by flat side faces.' : 'A pyramid has a base, and sloping faces that meet at a point.', 'The name of the solid tells you the shape of its ends or base.'],
        solution: why,
      };
    }
    // difficulty 2: how many faces of a given shape?
    const q = rng.pick([
      ...[3, 5, 6, 8].map((n) => ({ s: { kind: 'prism', n } as Solid, shape: 'rectangular', count: n })),
      ...[4, 5, 6, 8].map((n) => ({ s: { kind: 'pyramid', n } as Solid, shape: 'triangular', count: n })),
      { s: { kind: 'prism', n: 3 } as Solid, shape: 'triangular', count: 2 },
      { s: { kind: 'pyramid', n: 3 } as Solid, shape: 'triangular', count: 4 },
      { s: { kind: 'prism', n: 4, cube: true } as Solid, shape: 'square', count: 6 },
      { s: { kind: 'prism', n: 6 } as Solid, shape: 'hexagonal', count: 2 },
      { s: { kind: 'pyramid', n: 5 } as Solid, shape: 'pentagonal', count: 1 },
    ]);
    const name = solidName(q.s.kind, q.s.n, q.s.cube);
    const net = rng.chance(0.5);
    const c = counts(q.s.kind, q.s.n);
    const why =
      q.s.kind === 'prism'
        ? q.s.cube
          ? 'A cube has 6 faces, and they are all squares.'
          : `${capital(article(name))} has 2 ${SHAPE_NAMES[q.s.n]} ends and ${q.s.n} rectangles joining them (one for each side of the end): ${c.faces} faces in total.`
        : `${capital(article(name))} has ${article(q.s.n === 4 ? 'square' : SHAPE_NAMES[q.s.n]!)} base and ${q.s.n} triangles (one on each side of the base): ${c.faces} faces in total.`;
    return {
      ...NUM,
      prompt: net ? `You are drawing a net for ${article(name)}. How many **${q.shape}** faces will the net have?` : `How many **${q.shape}** faces does ${article(name)} have?`,
      figure: { svg: solidFigure(q.s.kind, q.s.n, q.s.cube), alt: `A sketch of ${article(name)}, with hidden edges dashed.` },
      answer: q.count,
      hints: [
        q.s.kind === 'prism' ? 'A prism has two matching ends, and one rectangle for each side of an end.' : 'A pyramid has one base, and one triangle for each side of the base.',
        'Count the hidden faces at the back too.',
      ],
      solution: `${why}\n\nSo it has **${q.count}** ${q.shape} face${q.count === 1 ? '' : 's'}.${net ? ' A net has exactly one shape for each face.' : ''}`,
    };
  },
};

// ---------------------------------------------------------------- faces, edges and vertices

export const facesEdgesVertices: QuestionTemplate = {
  id: 'm7.geo.nets.faces-edges-vertices',
  topicId: 'm7.geo.nets',
  title: 'Count the faces, edges and vertices of prisms and pyramids',
  difficulties: [1, 2, 3, 4],
  variety: 15,
  generate({ rng, difficulty }): TemplateOutput {
    const what = rng.pick(['faces', 'edges', 'vertices'] as const);
    const meaning = { faces: 'A face is a flat surface.', edges: 'An edge is a line where two faces meet.', vertices: 'A vertex is a corner, where edges meet.' }[what];
    if (difficulty <= 2) {
      const pool: Solid[] =
        difficulty === 1
          ? [
              { kind: 'prism', n: 4, cube: true },
              { kind: 'prism', n: 4 },
              { kind: 'prism', n: 3 },
              { kind: 'pyramid', n: 4 },
              { kind: 'pyramid', n: 3 },
            ]
          : [
              { kind: 'prism', n: 5 },
              { kind: 'prism', n: 6 },
              { kind: 'prism', n: 8 },
              { kind: 'pyramid', n: 5 },
              { kind: 'pyramid', n: 6 },
              { kind: 'pyramid', n: 8 },
            ];
      const s = rng.pick(pool);
      const n = s.n;
      const name = solidName(s.kind, n, s.cube);
      const c = counts(s.kind, n);
      const explain =
        s.kind === 'prism'
          ? {
              faces: `2 ends + ${n} side faces $= ${n} + 2 = ${c.faces}$ faces.`,
              edges: `${n} edges around the top end, ${n} around the bottom end and ${n} joining them $= 3 \\times ${n} = ${c.edges}$ edges.`,
              vertices: `${n} corners on the top end and ${n} on the bottom end $= 2 \\times ${n} = ${c.vertices}$ vertices.`,
            }
          : {
              faces: `1 base + ${n} triangles $= ${n} + 1 = ${c.faces}$ faces.`,
              edges: `${n} edges around the base and ${n} going up to the top point $= 2 \\times ${n} = ${c.edges}$ edges.`,
              vertices: `${n} corners on the base + 1 at the top $= ${n} + 1 = ${c.vertices}$ vertices.`,
            };
      return {
        ...NUM,
        prompt: `How many **${what}** does ${article(name)} have?`,
        figure: { svg: solidFigure(s.kind, n, s.cube), alt: `A sketch of ${article(name)}, with hidden edges dashed.` },
        answer: c[what],
        hints: [`${meaning} Count the hidden (dashed) ones too.`, s.cube ? 'A cube is a special prism: its two ends are squares.' : s.kind === 'prism' ? `The ends of this prism have ${n} sides each.` : `The base of this pyramid has ${n} sides.`],
        solution: `${capital(article(name))}: ${explain[what]}`,
      };
    }
    const kind = rng.pick(['prism', 'pyramid'] as const);
    const n = rng.pick([3, 4, 5, 6, 7, 8, 9, 10]);
    const c = counts(kind, n);
    const rule =
      kind === 'prism'
        ? `A prism with ${n}-sided ends has $${n} + 2 = ${c.faces}$ faces, $3 \\times ${n} = ${c.edges}$ edges and $2 \\times ${n} = ${c.vertices}$ vertices.`
        : `A pyramid with a ${n}-sided base has $${n} + 1 = ${c.faces}$ faces, $2 \\times ${n} = ${c.edges}$ edges and $${n} + 1 = ${c.vertices}$ vertices.`;
    if (difficulty === 3) {
      const given = rng.pick(['faces', 'edges', 'vertices'] as const);
      const ask = rng.pick((['faces', 'edges', 'vertices'] as const).filter((w) => w !== given));
      const find =
        kind === 'prism'
          ? { faces: `$${c.faces} - 2 = ${n}$`, edges: `$${c.edges} \\div 3 = ${n}$`, vertices: `$${c.vertices} \\div 2 = ${n}$` }[given]
          : { faces: `$${c.faces} - 1 = ${n}$`, edges: `$${c.edges} \\div 2 = ${n}$`, vertices: `$${c.vertices} - 1 = ${n}$` }[given];
      return {
        ...NUM,
        marks: 2,
        prompt: `A ${kind} has ${c[given]} ${given}. How many **${ask}** does it have?`,
        answer: c[ask],
        hints: [`First work out how many sides the ${kind === 'prism' ? 'ends have' : 'base has'}.`, kind === 'prism' ? 'A prism with $n$-sided ends has $n + 2$ faces, $3n$ edges and $2n$ vertices.' : 'A pyramid with an $n$-sided base has $n + 1$ faces, $2n$ edges and $n + 1$ vertices.'],
        solution: `Number of sides of the ${kind === 'prism' ? 'ends' : 'base'}: ${find}.\n\n${rule}\n\nSo it has **${c[ask]} ${ask}**.`,
      };
    }
    // difficulty 4: compare a prism and a pyramid on the same shape.
    const m = rng.pick([5, 6, 7, 8, 9, 10, 12]);
    const pr = counts('prism', m);
    const py = counts('pyramid', m);
    const w = rng.pick(['edges', 'vertices', 'faces'] as const);
    const total = rng.chance(0.5);
    return {
      ...NUM,
      marks: 2,
      prompt: total
        ? `Mere makes a prism and a pyramid. The prism's ends and the pyramid's base all have ${m} sides. How many **${w}** do the two solids have altogether?`
        : `A prism has ends with ${m} sides. A pyramid has a base with ${m} sides. How many more **${w}** does the prism have than the pyramid?`,
      answer: total ? pr[w] + py[w] : pr[w] - py[w],
      hints: ['Work out the number for each solid on its own first.', 'Prism with $n$-sided ends: $n + 2$ faces, $3n$ edges, $2n$ vertices. Pyramid with an $n$-sided base: $n + 1$ faces, $2n$ edges, $n + 1$ vertices.'],
      solution: `Prism: ${pr[w]} ${w}. Pyramid: ${py[w]} ${w}.\n\n${total ? `Altogether: $${pr[w]} + ${py[w]} = ${pr[w] + py[w]}$.` : `Difference: $${pr[w]} - ${py[w]} = ${pr[w] - py[w]}$.`}`,
    };
  },
};

// ---------------------------------------------------------------- nets of prisms and pyramids

export const prismPyramidNets: QuestionTemplate = {
  id: 'm7.geo.nets.prism-pyramid-nets',
  topicId: 'm7.geo.nets',
  title: 'Match nets to prisms and pyramids, and check whether a net folds',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    const kind = rng.pick(['prism', 'pyramid'] as const);
    if (difficulty <= 3) {
      const n = rng.pick([3, 4, 5, 6, 8]);
      const svg = kind === 'prism' ? prismNet(n, { endsApart: rng.chance(0.4) }) : pyramidNet(n, rng.int(0, 7) * 45 + 10);
      const name = solidName(kind, n);
      const alt =
        kind === 'prism'
          ? `A net made of a strip of ${n} rectangles, with a ${n}-sided shape attached at the top and another at the bottom.`
          : `A net made of a ${n}-sided shape with a triangle on each of its ${n} sides.`;
      if (difficulty === 2) {
        const other: SolidKind = kind === 'prism' ? 'pyramid' : 'prism';
        const nAlt = n === 3 ? 4 : n === 8 ? 6 : n + 1;
        const opts = [
          { id: 'right', text: capital(name) },
          { id: 'kind', text: capital(solidName(other, n)) },
          { id: 'n', text: capital(solidName(kind, nAlt)) },
          { id: 'both', text: capital(solidName(other, nAlt)) },
        ];
        return {
          type: 'mcq',
          prompt: 'Which solid can be folded from this net?',
          figure: { svg, alt },
          options: opts,
          correct: 'right',
          feedback: {
            kind: kind === 'prism' ? 'A pyramid net has triangles around a base. This net has a strip of rectangles.' : 'A prism net has a strip of rectangles. This net has triangles that fold up to meet at a point.',
            n: `Count the sides of the ${kind === 'prism' ? 'end shapes' : 'base shape'} again.`,
            both: 'Check two things: rectangles or triangles, and the number of sides of the end or base.',
          },
          calculator: 'not-allowed',
          hints: ['A strip of rectangles means a prism. Triangles around one shape means a pyramid.', `Count the sides of the ${kind === 'prism' ? 'two end shapes' : 'middle shape'}.`],
          solution:
            kind === 'prism'
              ? `The net has a strip of ${n} rectangles (the side faces) and two ${n}-sided shapes (the ends), so it folds into ${article(name)}.`
              : `The net has a ${n}-sided base with ${n} triangles that fold up to meet at a point, so it folds into ${article(name)}.`,
        };
      }
      const what = rng.pick(['faces', 'edges', 'vertices'] as const);
      const c = counts(kind, n);
      return {
        ...NUM,
        marks: what === 'faces' ? 1 : 2,
        prompt: `This net is folded to make a solid. How many **${what}** will the solid have?`,
        figure: { svg, alt },
        answer: c[what],
        hints: ['First work out which solid the net makes.', what === 'faces' ? 'Each shape in the net becomes one face.' : 'Careful: edges and corners join up when the net is folded, so you can’t just count them on the flat net.'],
        solution: `The net makes ${article(name)}. It has ${c.faces} faces, ${c.edges} edges and ${c.vertices} vertices.\n\nSo the answer is **${c[what]}**.`,
      };
    }
    // difficulty 4: will it fold?
    const status = rng.pick(['yes', 'yes', 'overlap', 'missing'] as const);
    let n: number;
    let svg: string;
    if (kind === 'prism') {
      n = status === 'overlap' || status === 'missing' ? rng.pick([3, 4, 5]) : rng.pick([3, 4, 5, 6]);
      svg = prismNet(n, { endsApart: status === 'yes' && rng.chance(0.5), broken: status === 'overlap', oneEnd: status === 'missing' });
    } else {
      n = rng.pick([3, 4, 5, 6]);
      // A pyramid net can't have two faces in the same place in this layout, so 'overlap' becomes 'missing'.
      svg = pyramidNet(n, rng.int(0, 7) * 45 + 10, status === 'yes' ? 0 : 1);
    }
    const actual = kind === 'pyramid' && status === 'overlap' ? 'missing' : status;
    const name = solidName(kind, n);
    const options = [
      { id: 'yes', text: `Yes, it folds into ${article(name)}` },
      { id: 'overlap', text: 'No, two faces would overlap and leave a gap' },
      { id: 'missing', text: 'No, one face is missing' },
      { id: 'extra', text: 'No, it has too many faces' },
    ];
    const c = counts(kind, n);
    return {
      type: 'mcq',
      marks: 2,
      prompt: `Hemi has drawn this net for ${article(name)}. Will it fold into ${article(name)}?`,
      figure: {
        svg,
        alt:
          kind === 'prism'
            ? `A strip of ${n} rectangles with ${actual === 'missing' ? 'only one' : 'two'} ${n}-sided end shape${actual === 'missing' ? '' : 's'} attached${actual === 'overlap' ? ', both along the top edge of the strip' : actual === 'yes' ? ', one on the top edge and one on the bottom edge' : ''}.`
            : `A ${n}-sided base with ${actual === 'yes' ? n : n - 1} triangles attached to its sides.`,
      },
      options,
      correct: actual,
      feedback: {
        yes: actual === 'overlap' ? 'Imagine folding it: both ends fold onto the same end of the prism.' : 'Count the faces. Does every face of the solid have a shape in the net?',
        overlap: actual === 'yes' ? 'Picture folding the strip into a tube: one end closes the top and the other closes the bottom.' : 'Count the faces in the net and compare with the solid.',
        missing: actual === 'yes' ? `Count again: ${article(name)} has ${c.faces} faces, and so does this net.` : 'The number of faces is right. The problem is where the ends are attached.',
        extra: `${capital(article(name))} has ${c.faces} faces. Count the shapes in the net.`,
      },
      calculator: 'not-allowed',
      hints: [`${capital(article(name))} has ${c.faces} faces. Count the shapes in the net.`, kind === 'prism' ? 'Imagine rolling the strip of rectangles into a tube. Where does each end shape fold to?' : 'Imagine folding every triangle up. Do they close the solid completely?'],
      solution:
        actual === 'yes'
          ? `Yes. The net has all ${c.faces} faces. ${kind === 'prism' ? 'The strip of rectangles rolls into a tube, and one end shape closes the top while the other closes the bottom.' : 'The triangles fold up and meet at the top point.'}`
          : actual === 'overlap'
            ? `No. The net has the right number of faces, but both end shapes are attached along the top of the strip. When the strip is rolled into a tube, both ends fold onto the top, overlapping, and the bottom is left open.`
            : `No. ${capital(article(name))} has ${c.faces} faces, but this net only has ${c.faces - 1}. One ${kind === 'prism' ? 'end' : 'triangle'} is missing, so the solid would have a hole.`,
    };
  },
};

// ---------------------------------------------------------------- cube nets

export const cubeNets: QuestionTemplate = {
  id: 'm7.geo.nets.cube-nets',
  topicId: 'm7.geo.nets',
  title: 'Cube nets: will it fold, and which faces are opposite?',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const all = hexominoes();
    const valid = all.filter((c) => foldCube(c) && fitsBox(c));
    if (difficulty === 3) {
      const ok = rng.chance(0.5);
      const pool = ok ? valid : all.filter((c) => !foldCube(c) && fitsBox(c) && (!has2x2(c) || rng.chance(0.15)));
      const cells = rng.pick(pool);
      const four = rowOf4(cells);
      return {
        type: 'mcq',
        prompt: 'This shape is made of six squares. Will it fold to make a cube?',
        figure: { svg: cubeNetFigure(cells), alt: `Six squares joined edge to edge, arranged in ${Math.max(...cells.map((c) => c[1])) + 1} rows: ${rowsText(cells)}.` },
        options: [
          { id: 'yes', text: 'Yes, it folds into a cube' },
          { id: 'no', text: 'No, two squares would end up on the same face' },
          { id: 'row', text: 'No, a cube net can’t have four squares in a row' },
        ],
        correct: ok ? 'yes' : 'no',
        feedback: {
          yes: 'Try folding it in your head around one square as the base. Do two squares land in the same place?',
          no: 'Try folding it in your head around one square as the base. Each square lands on a different face.',
          row: 'Four squares in a row is fine: they wrap around the four sides of the cube. Many cube nets have a row of four.',
        },
        calculator: 'not-allowed',
        hints: ['Pick one square to be the bottom of the cube, then fold the others up around it.', 'A cube has 6 faces, so each square must land on a different face.'],
        solution: ok
          ? `Yes. ${four ? 'The row of four squares wraps around to make the four sides, and the other two squares fold over to close the top and bottom.' : 'Folding it up, every square lands on a different face of the cube, so all six faces are covered.'}`
          : `No. When you fold it up, two of the squares land on the same face of the cube, so one face is left open.${has2x2(cells) ? ' Any net with a 2 by 2 block of squares can’t fold into a cube, because those four squares would need to share three faces at one corner.' : ''}`,
      };
    }
    if (difficulty === 4 || rng.chance(0.5)) {
      // Opposite faces. d4 uses nets with a row of four; d5 uses the trickier ones.
      const pool = valid.filter((c) => (difficulty === 4 ? rowOf4(c) : !rowOf4(c)));
      const cells = rng.pick(pool);
      const normals = foldCube(cells)!;
      const letters = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
      const q = rng.int(0, 5);
      const oppIdx = normals.findIndex((v) => key3(v) === negKey(normals[q]!));
      const ans = letters[oppIdx]!;
      const others = letters.filter((_, i) => i !== q && i !== oppIdx);
      const opts = [ans, ...rng.sample(others, 3)].sort();
      const adjacentInNet = letters.filter((_, i) => i !== q && Math.abs(cells[i]![0] - cells[q]![0]) + Math.abs(cells[i]![1] - cells[q]![1]) === 1);
      const [qx, qy] = cells[q]!;
      const [ax, ay] = cells[oppIdx]!;
      const inLine = (qx === ax && Math.abs(qy - ay) === 2) || (qy === ay && Math.abs(qx - ax) === 2);
      const midLetter = inLine ? letters[cells.findIndex((c) => c[0] === (qx + ax) / 2 && c[1] === (qy + ay) / 2)] : undefined;
      return {
        type: 'mcq',
        marks: difficulty === 5 ? 2 : 1,
        prompt: `This net is folded to make a cube. Which face will be **opposite** face ${letters[q]}?`,
        figure: { svg: cubeNetFigure(cells, letters), alt: `A cube net of six squares labelled A to F, arranged in rows: ${rowsText(cells, letters)}.` },
        options: opts.map((l) => ({ id: l, text: `Face ${l}` })),
        correct: ans,
        shuffle: false,
        feedback: Object.fromEntries(
          adjacentInNet.filter((l) => opts.includes(l)).map((l) => [l, `Face ${l} shares an edge with face ${letters[q]} in the net, so they end up next to each other on the cube, not opposite.`]),
        ),
        calculator: 'not-allowed',
        hints: [`Faces that share an edge in the net end up next to each other, so they can’t be opposite face ${letters[q]}.`, 'In a straight line of three squares, the first and third squares end up opposite each other.'],
        solution: [
          midLetter
            ? `Faces ${letters[q]}, ${midLetter} and ${ans} are in a straight line of three. When it is folded, ${midLetter} becomes a side between them, so ${letters[q]} and ${ans} end up on opposite sides of the cube.`
            : `Imagine face ${letters[q]} as the bottom of the cube and fold the other squares up around it.`,
          `The four faces next to ${letters[q]} are ${letters.filter((_, i) => i !== q && i !== oppIdx).join(', ')}.`,
          `The only face left is **${ans}**, so it is opposite face ${letters[q]}.`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: which is not a net of a cube?
    const invalid = all.filter((c) => !foldCube(c) && !has2x2(c) && fitsBox(c));
    const bad = rng.pick(invalid);
    const goods = rng.sample(valid, 3);
    const nets = rng.shuffle([bad, ...goods]);
    const names = ['A', 'B', 'C', 'D'];
    const s = 22;
    let body = '';
    nets.forEach((cells, i) => {
      const ox = 20 + (i % 2) * 200;
      const oy = 34 + Math.floor(i / 2) * 150;
      body += label({ x: ox, y: oy - 16 }, `Net ${names[i]}`, { bold: true, anchor: 'start' });
      body += netSvgBody(cells, ox, oy, s);
    });
    const badIdx = nets.indexOf(bad);
    return {
      type: 'mcq',
      marks: 2,
      prompt: 'Three of these are nets of a cube. Which one will **not** fold into a cube?',
      figure: { svg: svgDoc(400, 320, body), alt: `Four shapes made of six squares, labelled Net A to Net D. ${nets.map((c, i) => `Net ${names[i]}: ${rowsText(c)}`).join('. ')}.` },
      options: names.map((nm) => ({ id: nm, text: `Net ${nm}` })),
      correct: names[badIdx]!,
      shuffle: false,
      calculator: 'not-allowed',
      hints: ['Imagine folding each net up around one square as the base.', 'A net fails if two squares would land on the same face of the cube, leaving another face open.'],
      solution: `When **Net ${names[badIdx]}** is folded, two of its squares land on the same face of the cube, so one face is left open. The other three nets each cover all six faces exactly once.`,
    };
  },
};

/** Describes a net row by row for alt text, e.g. "row 1: columns 2; row 2: columns 1 to 4". */
function rowsText(cells: Array<[number, number]>, letters?: string[]): string {
  const rows = Math.max(...cells.map((c) => c[1])) + 1;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = cells.map((c, i) => [c, i] as const).filter(([c]) => c[1] === r).sort((a, b) => a[0][0] - b[0][0]);
    out.push(`row ${r + 1} has ${inRow.length === 1 ? 'a square' : 'squares'} in column${inRow.length === 1 ? '' : 's'} ${inRow.map(([c, i]) => `${c[0] + 1}${letters ? ` (${letters[i]})` : ''}`).join(', ')}`);
  }
  return out.join('; ');
}

export const templates: QuestionTemplate[] = [faceShapes, facesEdgesVertices, prismPyramidNets, cubeNets];
