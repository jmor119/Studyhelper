import type { QuestionTemplate, TemplateOutput } from '../../types';
import type { Rng } from '../../../rng';
import { label, line, polygon, svgDoc, type Pt } from '../../svg';
import { arrow, polar } from '../measurement/figures';

// m9.geo.nets — prisms and pyramids (faces, edges, vertices), nets, and plan/front/side views.

// ---------------------------------------------------------------- solids

const BASE_NAMES: Record<number, string> = {
  3: 'triangular',
  4: 'square',
  5: 'pentagonal',
  6: 'hexagonal',
  7: 'heptagonal',
  8: 'octagonal',
  10: 'decagonal',
};

interface Solid {
  kind: 'prism' | 'pyramid';
  n: number;
  name: string;
}

function solidName(kind: 'prism' | 'pyramid', n: number, cube = false): string {
  if (kind === 'prism') return n === 4 ? (cube ? 'cube' : 'rectangular prism (cuboid)') : `${BASE_NAMES[n]} prism`;
  return n === 4 ? 'square-based pyramid' : `${BASE_NAMES[n]} pyramid`;
}

const counts = (s: { kind: 'prism' | 'pyramid'; n: number }) =>
  s.kind === 'prism' ? { faces: s.n + 2, edges: 3 * s.n, vertices: 2 * s.n } : { faces: s.n + 1, edges: 2 * s.n, vertices: s.n + 1 };

const DASH = { stroke: '#6b7280', width: 1.4, dash: true };

/** Oblique sketch of a prism or pyramid with hidden edges dashed. */
function solidFigure(kind: 'prism' | 'pyramid', n: number, cube = false) {
  const c: Pt = { x: 160, y: 185 };
  const R = 95;
  const squash = 0.32;
  const start = n === 4 ? 45 + 10 : 90 / n + 12; // slight turn so no edge is exactly edge-on
  const ang = Array.from({ length: n }, (_, i) => start + (360 * i) / n);
  const base = ang.map((a) => ({ x: c.x + R * Math.cos((a * Math.PI) / 180), y: c.y - R * squash * Math.sin((a * Math.PI) / 180) }));
  // A base edge is at the back if its midpoint is higher on screen than the centre (sin > 0).
  const back = (i: number) => Math.sin(((ang[i]! + 180 / n) * Math.PI) / 180) > 0.05; // midpoint of edge i → i+1
  const hiddenVertex = (i: number) => back(i) && back((i - 1 + n) % n);
  const H = kind === 'prism' ? (cube ? 2 * R * Math.sin(Math.PI / 4) : 110) : 140;
  let body = '';
  if (kind === 'prism') {
    const top = base.map((p) => ({ x: p.x, y: p.y - H }));
    body += polygon(top, { fill: '#dbeafe' });
    // Front faces filled for a solid look.
    for (let i = 0; i < n; i++) {
      if (back(i)) continue;
      const j = (i + 1) % n;
      body += polygon([base[i]!, base[j]!, top[j]!, top[i]!], { fill: '#bfdbfe' });
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (back(i)) body += line(base[i]!, base[j]!, DASH);
      if (hiddenVertex(i)) body += line(base[i]!, top[i]!, DASH);
    }
    return svgDoc(320, 215, body);
  }
  const apex: Pt = { x: c.x, y: c.y - H };
  for (let i = 0; i < n; i++) {
    if (back(i)) continue;
    const j = (i + 1) % n;
    body += polygon([base[i]!, base[j]!, apex], { fill: '#bfdbfe' });
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (back(i)) body += line(base[i]!, base[j]!, DASH);
    if (hiddenVertex(i)) body += line(base[i]!, apex, DASH);
  }
  return svgDoc(320, 215, body);
}

export const facesEdgesVertices: QuestionTemplate = {
  id: 'm9.geo.nets.faces-edges-vertices',
  topicId: 'm9.geo.nets',
  title: 'Faces, edges and vertices of prisms and pyramids',
  difficulties: [1, 2, 3, 4],
  // Difficulty 1 only has five common solids × three questions.
  variety: 15,
  generate({ rng, difficulty }): TemplateOutput {
    const what = rng.pick(['faces', 'edges', 'vertices'] as const);
    if (difficulty <= 2) {
      const pool: Array<[Solid['kind'], number, boolean]> =
        difficulty === 1
          ? [
              ['prism', 4, true],
              ['prism', 4, false],
              ['prism', 3, false],
              ['pyramid', 4, false],
              ['pyramid', 3, false],
            ]
          : [
              ['prism', 5, false],
              ['prism', 6, false],
              ['prism', 8, false],
              ['pyramid', 5, false],
              ['pyramid', 6, false],
              ['pyramid', 8, false],
            ];
      const [kind, n, cube] = rng.pick(pool);
      const name = solidName(kind, n, cube);
      const c = counts({ kind, n });
      const ans = c[what];
      const explain =
        kind === 'prism'
          ? {
              faces: `${n} rectangular side faces + 2 ${BASE_NAMES[n] ?? ''} ends $= ${n} + 2 = ${c.faces}$ faces.`,
              edges: `${n} edges around the top, ${n} around the bottom and ${n} joining them $= 3 \\times ${n} = ${c.edges}$ edges.`,
              vertices: `${n} corners on the top and ${n} on the bottom $= 2 \\times ${n} = ${c.vertices}$ vertices.`,
            }
          : {
              faces: `${n} triangular side faces + 1 base $= ${n} + 1 = ${c.faces}$ faces.`,
              edges: `${n} edges around the base and ${n} going up to the apex $= 2 \\times ${n} = ${c.edges}$ edges.`,
              vertices: `${n} corners on the base + 1 apex $= ${n} + 1 = ${c.vertices}$ vertices.`,
            };
      return {
        type: 'numeric',
        prompt: `How many **${what}** does a ${name} have?`,
        figure: { svg: solidFigure(kind, n, cube), alt: `A sketch of a ${name}, with hidden edges dashed.` },
        answer: ans,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          what === 'faces' ? 'A face is a flat surface.' : what === 'edges' ? 'An edge is a line where two faces meet. Count the dashed (hidden) ones too.' : 'A vertex is a corner, where edges meet. Count the hidden ones too.',
          kind === 'prism' ? `A prism has two identical ends joined by rectangles. Here the ends have ${n} sides.` : `A pyramid has a base and triangles meeting at the apex. Here the base has ${n} sides.`,
        ],
        solution: `A ${name}: ${explain[what]}`,
      };
    }
    // d3/d4: work backwards from a count, or compare.
    const kind = rng.pick(['prism', 'pyramid'] as const);
    const n = rng.pick([3, 5, 6, 7, 8, 10]);
    const c = counts({ kind, n });
    const name = solidName(kind, n);
    if (difficulty === 3) {
      const given = rng.pick(['edges', 'vertices'] as const);
      const ask = rng.pick((['faces', 'edges', 'vertices'] as const).filter((w) => w !== given));
      return {
        type: 'numeric',
        prompt: `A ${kind} has ${c[given]} ${given}. How many **${ask}** does it have?`,
        answer: c[ask],
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          kind === 'prism'
            ? `A prism with an $n$-sided end has $3n$ edges and $2n$ vertices.`
            : `A pyramid with an $n$-sided base has $2n$ edges and $n + 1$ vertices.`,
          'First work out how many sides the base (or end) has.',
        ],
        solution: [
          kind === 'prism'
            ? given === 'edges'
              ? `A prism has $3n$ edges, so $3n = ${c.edges}$ and $n = ${n}$.`
              : `A prism has $2n$ vertices, so $2n = ${c.vertices}$ and $n = ${n}$.`
            : given === 'edges'
              ? `A pyramid has $2n$ edges, so $2n = ${c.edges}$ and $n = ${n}$.`
              : `A pyramid has $n + 1$ vertices, so $n + 1 = ${c.vertices}$ and $n = ${n}$.`,
          `It is a ${name}. It has ${c.faces} faces, ${c.edges} edges and ${c.vertices} vertices.`,
          `So it has **${c[ask]} ${ask}**.`,
        ].join('\n\n'),
      };
    }
    // d4: prism vs pyramid on the same base.
    const n2 = rng.pick([5, 6, 7, 8, 9, 10, 12]);
    const pr = counts({ kind: 'prism', n: n2 });
    const py = counts({ kind: 'pyramid', n: n2 });
    const w = rng.pick(['edges', 'vertices', 'faces'] as const);
    const diff = pr[w] - py[w];
    return {
      type: 'numeric',
      prompt: `A prism and a pyramid both have bases with ${n2} sides. How many more **${w}** does the prism have than the pyramid?`,
      answer: diff,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Work out the number for each solid separately.', `Prism with ${n2}-sided ends: faces $n + 2$, edges $3n$, vertices $2n$. Pyramid with a ${n2}-sided base: faces $n + 1$, edges $2n$, vertices $n + 1$.`],
      solution: `Prism: ${pr[w]} ${w}. Pyramid: ${py[w]} ${w}.\n\nDifference: $${pr[w]} - ${py[w]} = ${diff}$.`,
    };
  },
};

// ---------------------------------------------------------------- nets of prisms and pyramids

function regularPolygonOnEdge(a: Pt, b: Pt, n: number, outward: 1 | -1): Pt[] {
  // Builds a regular n-gon on segment a→b, on the side given by `outward`.
  const pts: Pt[] = [a, b];
  const side = Math.hypot(b.x - a.x, b.y - a.y);
  let dir = Math.atan2(b.y - a.y, b.x - a.x);
  const turn = (outward * 2 * Math.PI) / n;
  let cur = b;
  for (let i = 2; i < n; i++) {
    dir += turn;
    cur = { x: cur.x + side * Math.cos(dir), y: cur.y + side * Math.sin(dir) };
    pts.push(cur);
  }
  return pts;
}

function prismNet(n: number) {
  // A strip of n rectangles with the two n-gon ends attached to one rectangle (top and bottom).
  const w = Math.min(46, 330 / n);
  const h = 70;
  const x0 = (380 - n * w) / 2;
  const endSize = w * (n <= 4 ? 1.1 : 1);
  const y0 = 30 + endSize / (2 * Math.tan(Math.PI / n)) + endSize * 0.6;
  let body = '';
  for (let i = 0; i < n; i++) body += polygon([{ x: x0 + i * w, y: y0 }, { x: x0 + (i + 1) * w, y: y0 }, { x: x0 + (i + 1) * w, y: y0 + h }, { x: x0 + i * w, y: y0 + h }], { fill: '#dbeafe' });
  const k = Math.floor(n / 2);
  const a = { x: x0 + k * w, y: y0 };
  const b = { x: x0 + (k + 1) * w, y: y0 };
  body += polygon(regularPolygonOnEdge(a, b, n, -1), { fill: '#fde68a' });
  const c = { x: x0 + (k + 1) * w, y: y0 + h };
  const d = { x: x0 + k * w, y: y0 + h };
  body += polygon(regularPolygonOnEdge(c, d, n, -1), { fill: '#fde68a' });
  const height = y0 + h + (y0 - 20);
  return svgDoc(380, Math.min(330, height), body);
}

function pyramidNet(n: number, rot: number) {
  const c: Pt = { x: 190, y: 165 };
  const side = n <= 4 ? 80 : n <= 6 ? 62 : 48;
  const R = side / (2 * Math.sin(Math.PI / n));
  const base = Array.from({ length: n }, (_, i) => polar(c, R, rot + (360 * i) / n));
  let body = polygon(base, { fill: '#fde68a' });
  // Each triangle must be taller than the base's apothem, or the triangles could not meet at an apex.
  const slant = side * (1 / (2 * Math.tan(Math.PI / n)) + 0.55);
  for (let i = 0; i < n; i++) {
    const a = base[i]!;
    const b = base[(i + 1) % n]!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = mid.x - c.x;
    const dy = mid.y - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const tip = { x: mid.x + (dx / len) * slant, y: mid.y + (dy / len) * slant };
    body += polygon([a, b, tip], { fill: '#dbeafe' });
  }
  return svgDoc(380, 330, body);
}

export const identifyNets: QuestionTemplate = {
  id: 'm9.geo.nets.identify',
  topicId: 'm9.geo.nets',
  title: 'Which solid does this net make?',
  difficulties: [2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    const kind = rng.pick(['prism', 'pyramid'] as const);
    const n = rng.pick([3, 4, 5, 6, 8]);
    const svg = kind === 'prism' ? prismNet(n) : pyramidNet(n, rng.int(0, 7) * 45 + 10);
    const name = solidName(kind, n);
    const alt = kind === 'prism' ? `A net made of a strip of ${n} rectangles with a ${n}-sided polygon attached at the top and bottom.` : `A net made of a ${n}-sided polygon with a triangle on each of its ${n} edges.`;
    if (difficulty === 2) {
      const other = kind === 'prism' ? 'pyramid' : 'prism';
      const nAlt = n === 3 ? 4 : n === 8 ? 6 : n + 1;
      const opts = [
        { id: 'right', text: name[0]!.toUpperCase() + name.slice(1) },
        { id: 'kind', text: (s => s[0]!.toUpperCase() + s.slice(1))(solidName(other, n)) },
        { id: 'n', text: (s => s[0]!.toUpperCase() + s.slice(1))(solidName(kind, nAlt)) },
        { id: 'both', text: (s => s[0]!.toUpperCase() + s.slice(1))(solidName(other, nAlt)) },
      ];
      return {
        type: 'mcq',
        prompt: 'Which solid can be folded from this net?',
        figure: { svg, alt },
        options: opts,
        correct: 'right',
        feedback: {
          kind: kind === 'prism' ? 'A pyramid net has triangles around a base. This net has rectangles in a strip.' : 'A prism net has a strip of rectangles. This net has triangles that meet at a point (the apex).',
          n: `Count the sides of the ${kind === 'prism' ? 'end' : 'base'} shape again.`,
          both: 'Check both things: rectangles or triangles, and the number of sides of the base.',
        },
        calculator: 'not-allowed',
        hints: ['Rectangles in a strip → prism. Triangles around a shape → pyramid.', `Count the sides of the ${kind === 'prism' ? 'end shapes' : 'base'}.`],
        solution:
          kind === 'prism'
            ? `The net has ${n} rectangles in a strip (the sides) and two ${n}-sided shapes (the ends), so it folds into a **${name}**.`
            : `The net has a ${n}-sided base with ${n} triangles that fold up to meet at the apex, so it folds into a **${name}**.`,
      };
    }
    const what = rng.pick(['edges', 'vertices', 'faces'] as const);
    const c = counts({ kind, n });
    return {
      type: 'numeric',
      prompt: `This net is folded to make a solid. How many **${what}** will the solid have?`,
      figure: { svg, alt },
      answer: c[what],
      form: 'integer',
      calculator: 'not-allowed',
      hints: [
        'First work out which solid the net makes.',
        what === 'faces' ? 'Each shape in the net becomes one face.' : `Careful: edges and corners join up when the net is folded, so you cannot just count them on the flat net.`,
      ],
      solution: `The net makes a **${name}**. It has ${c.faces} faces, ${c.edges} edges and ${c.vertices} vertices.\n\nSo the answer is **${c[what]}**.`,
    };
  },
};

// ---------------------------------------------------------------- cube nets

type V3 = [number, number, number];
type Cell = [number, number]; // [col, row], rows increase downwards

const neg = (v: V3): V3 => [-v[0], -v[1], -v[2]];
const key3 = (v: V3) => v.join(',');

/** Folds a net of unit squares into a cube. Returns each cell's outward normal, or null if it is not a cube net. */
export function foldCube(cells: Cell[]): V3[] | null {
  const idx = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
  const normal: Array<V3 | undefined> = [];
  const east: Array<V3 | undefined> = [];
  const south: Array<V3 | undefined> = [];
  normal[0] = [0, 0, -1];
  east[0] = [1, 0, 0];
  south[0] = [0, 1, 0];
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    const [cx, cy] = cells[i]!;
    const n = normal[i]!;
    const E = east[i]!;
    const S = south[i]!;
    const moves: Array<[number, number, V3, V3, V3]> = [
      [1, 0, E, neg(n), S], // east: new normal E, new east −n
      [-1, 0, neg(E), n, S], // west: new normal −E, new east n
      [0, 1, S, E, neg(n)], // south: new normal S, new south −n
      [0, -1, neg(S), E, n], // north: new normal −S, new south n
    ];
    for (const [dx, dy, nn, ne, ns] of moves) {
      const j = idx.get(`${cx + dx},${cy + dy}`);
      if (j === undefined || normal[j]) continue;
      normal[j] = nn;
      east[j] = ne;
      south[j] = ns;
      queue.push(j);
    }
  }
  if (normal.length !== cells.length || normal.some((v) => !v)) return null;
  const set = new Set(normal.map((v) => key3(v!)));
  return set.size === 6 ? (normal as V3[]) : null;
}

let HEXOMINOES: Cell[][] | undefined;

/** All fixed hexominoes (up to translation), computed once. */
function hexominoes(): Cell[][] {
  if (HEXOMINOES) return HEXOMINOES;
  const norm = (cells: Cell[]): Cell[] => {
    const mx = Math.min(...cells.map((c) => c[0]));
    const my = Math.min(...cells.map((c) => c[1]));
    return cells.map((c) => [c[0] - mx, c[1] - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  };
  let level = new Map<string, Cell[]>([['0,0', [[0, 0]]]]);
  for (let size = 1; size < 6; size++) {
    const next = new Map<string, Cell[]>();
    for (const cells of level.values()) {
      const have = new Set(cells.map((c) => `${c[0]},${c[1]}`));
      for (const [x, y] of cells) {
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const k = `${x + dx},${y + dy}`;
          if (have.has(k)) continue;
          const n = norm([...cells, [x + dx, y + dy]]);
          next.set(n.map((c) => c.join(',')).join(';'), n);
        }
      }
    }
    level = next;
  }
  HEXOMINOES = [...level.values()];
  return HEXOMINOES;
}

const has2x2 = (cells: Cell[]) => {
  const s = new Set(cells.map((c) => `${c[0]},${c[1]}`));
  return cells.some(([x, y]) => s.has(`${x + 1},${y}`) && s.has(`${x},${y + 1}`) && s.has(`${x + 1},${y + 1}`));
};

function netSvgBody(cells: Cell[], ox: number, oy: number, s: number, letters?: string[]): string {
  let body = '';
  cells.forEach(([x, y], i) => {
    const p = { x: ox + x * s, y: oy + y * s };
    body += polygon([p, { x: p.x + s, y: p.y }, { x: p.x + s, y: p.y + s }, { x: p.x, y: p.y + s }], { fill: '#dbeafe' });
    if (letters) body += label({ x: p.x + s / 2, y: p.y + s / 2 }, letters[i]!, { bold: true, size: 18 });
  });
  return body;
}

export const cubeNets: QuestionTemplate = {
  id: 'm9.geo.nets.cube-nets',
  topicId: 'm9.geo.nets',
  title: 'Cube nets: opposite faces, and spotting a net that will not fold',
  difficulties: [4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const all = hexominoes();
    const valid = all.filter((c) => foldCube(c));
    const fits = (c: Cell[]) => Math.max(...c.map((p) => p[0])) <= 4 && Math.max(...c.map((p) => p[1])) <= 4;
    if (difficulty === 4 || rng.chance(0.5)) {
      // Opposite faces. d4 uses nets with a straight row of four squares; d5 uses the trickier ones.
      const rowOf4 = (c: Cell[]) =>
        c.some(([x, y]) => [1, 2, 3].every((k) => c.some((q) => q[0] === x + k && q[1] === y)) || [1, 2, 3].every((k) => c.some((q) => q[0] === x && q[1] === y + k)));
      const pool = valid.filter((c) => fits(c) && (difficulty === 4 ? rowOf4(c) : !rowOf4(c)));
      const cells = rng.pick(pool);
      const normals = foldCube(cells)!;
      const letters = rng.shuffle(['A', 'B', 'C', 'D', 'E', 'F']);
      const q = rng.int(0, 5);
      const oppIdx = normals.findIndex((v) => key3(v) === key3(neg(normals[q]!)));
      const ans = letters[oppIdx]!;
      const others = letters.filter((l, i) => i !== q && i !== oppIdx);
      const opts = [ans, ...rng.sample(others, 3)].sort();
      const cols = Math.max(...cells.map((c) => c[0])) + 1;
      const rows = Math.max(...cells.map((c) => c[1])) + 1;
      const s = Math.min(60, 340 / cols, 280 / rows);
      const svg = svgDoc(cols * s + 40, rows * s + 40, netSvgBody(cells, 20, 20, s, letters));
      const adjacentInNet = letters.filter((_, i) => i !== q && Math.abs(cells[i]![0] - cells[q]![0]) + Math.abs(cells[i]![1] - cells[q]![1]) === 1);
      // Faces that meet face q along an edge once folded (normals at right angles to q's).
      const dot3 = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
      const neighbours = letters.filter((_, i) => i !== q && i !== oppIdx && dot3(normals[i]!, normals[q]!) === 0);
      // Straight line of three in the net with q at one end and the answer at the other?
      const [qx, qy] = cells[q]!;
      const [ax, ay] = cells[oppIdx]!;
      const midKey = `${(qx + ax) / 2},${(qy + ay) / 2}`;
      const inLine = (qx === ax && Math.abs(qy - ay) === 2) || (qy === ay && Math.abs(qx - ax) === 2);
      const midLetter = inLine ? letters[cells.findIndex((c) => `${c[0]},${c[1]}` === midKey)] : undefined;
      return {
        type: 'mcq',
        prompt: `This net is folded to make a cube. Which face will be **opposite** face ${letters[q]}?`,
        figure: { svg, alt: `A cube net of six squares labelled A to F. The squares are arranged in ${rows} rows and ${cols} columns.` },
        options: opts.map((l) => ({ id: l, text: `Face ${l}` })),
        correct: ans,
        shuffle: false,
        feedback: Object.fromEntries(adjacentInNet.filter((l) => opts.includes(l)).map((l) => [l, `Face ${l} shares an edge with face ${letters[q]} in the net, so they will be next to each other on the cube, not opposite.`])),
        calculator: 'not-allowed',
        hints: [
          `Faces that share an edge in the net end up next to each other on the cube, so they cannot be opposite face ${letters[q]}.`,
          'In a straight line of three squares, the first and third squares end up opposite each other.',
        ],
        solution: [
          midLetter
            ? `Faces ${letters[q]}, ${midLetter} and ${ans} are in a straight line of three in the net. When it is folded, ${midLetter} becomes a side between them, so ${letters[q]} and ${ans} end up on opposite sides of the cube.`
            : `Imagine face ${letters[q]} as the base and fold the other squares up around it.`,
          `Faces ${neighbours.join(', ')} each end up sharing an edge with face ${letters[q]}, so they are its four neighbours on the cube.`,
          `The only face left is **${ans}**, so it is opposite face ${letters[q]}.`,
        ].join('\n\n'),
      };
    }
    // Which of these is NOT a net of a cube?
    const invalid = all.filter((c) => !foldCube(c) && !has2x2(c) && fits(c));
    const bad = rng.pick(invalid);
    const goods = rng.sample(valid.filter(fits), 3);
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
      prompt: 'Three of these are nets of a cube. Which one will **not** fold into a cube?',
      figure: { svg: svgDoc(400, 320, body), alt: 'Four arrangements of six squares, labelled Net A, Net B, Net C and Net D.' },
      options: names.map((n) => ({ id: n, text: `Net ${n}` })),
      correct: names[badIdx]!,
      shuffle: false,
      calculator: 'not-allowed',
      hints: ['Imagine folding each net up around one square as the base.', 'A net fails if two squares would end up on the same face of the cube (overlapping), leaving another face open.'],
      solution: `When **Net ${names[badIdx]}** is folded, two of its squares land on the same face of the cube, so one face is left open. The other three nets each cover all six faces exactly once.`,
    };
  },
};

// ---------------------------------------------------------------- views of cube stacks

type Heights = number[][]; // heights[row][col], row 0 = back, last row = front

function isoStack(h: Heights) {
  const rows = h.length;
  const cols = h[0]!.length;
  const s = 30;
  const k = 1 / Math.SQRT2;
  const m = 1 / Math.sqrt(6);
  // World: x = column (right), y = depth (0 = front, increasing to the back), z = up.
  const proj = (x: number, y: number, z: number): Pt => ({ x: 70 + (x + y) * k * s * 1.4, y: 190 - (-x + y + 2 * z) * m * s * 1.4 });
  const cubes: Array<[number, number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const depth = rows - 1 - r;
      for (let z = 0; z < h[r]![c]!; z++) cubes.push([c, depth, z]);
    }
  }
  cubes.sort((a, b) => a[0] - a[1] + a[2] - (b[0] - b[1] + b[2]));
  let body = '';
  for (const [x, y, z] of cubes) {
    const top = [proj(x, y, z + 1), proj(x + 1, y, z + 1), proj(x + 1, y + 1, z + 1), proj(x, y + 1, z + 1)];
    const front = [proj(x, y, z), proj(x + 1, y, z), proj(x + 1, y, z + 1), proj(x, y, z + 1)];
    const right = [proj(x + 1, y, z), proj(x + 1, y + 1, z), proj(x + 1, y + 1, z + 1), proj(x + 1, y, z + 1)];
    body += polygon(front, { fill: '#93c5fd' }) + polygon(right, { fill: '#60a5fa' }) + polygon(top, { fill: '#dbeafe' });
  }
  const f1 = proj(cols / 2, -0.9, 0);
  body += arrow({ x: f1.x - 22, y: f1.y + 22 }, { x: f1.x - 2, y: f1.y + 4 });
  body += label({ x: f1.x - 30, y: f1.y + 32 }, 'Front', { size: 13, bold: true });
  return body;
}

function planGrid(h: Heights, ox: number, oy: number) {
  const s = 30;
  let body = label({ x: ox + (h[0]!.length * s) / 2, y: oy - 14 }, 'Plan (from above)', { size: 12, bold: true });
  h.forEach((row, r) =>
    row.forEach((v, c) => {
      const p = { x: ox + c * s, y: oy + r * s };
      body += polygon([p, { x: p.x + s, y: p.y }, { x: p.x + s, y: p.y + s }, { x: p.x, y: p.y + s }], { fill: v ? '#dbeafe' : '#ffffff', stroke: v ? '#1f2937' : '#d1d5db' });
      if (v) body += label({ x: p.x + s / 2, y: p.y + s / 2 }, String(v), { bold: true });
    }),
  );
  const bottom = oy + h.length * s;
  body += arrow({ x: ox + (h[0]!.length * s) / 2, y: bottom + 30 }, { x: ox + (h[0]!.length * s) / 2, y: bottom + 6 });
  body += label({ x: ox + (h[0]!.length * s) / 2, y: bottom + 40 }, 'Front', { size: 12, bold: true });
  return body;
}

export const views: QuestionTemplate = {
  id: 'm9.geo.nets.views',
  topicId: 'm9.geo.nets',
  title: 'Plan, front and side views of cube stacks',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const rows = rng.pick([2, 3]);
    const cols = 3;
    let h: Heights;
    let frontCols: number[];
    let sideCols: number[];
    for (;;) {
      h = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rng.pick([0, 1, 1, 2, 2, 3])));
      // Every column of the front view and every row must contain a cube, and the front row is not empty.
      frontCols = Array.from({ length: cols }, (_, c) => Math.max(...h.map((row) => row[c]!)));
      sideCols = h.map((row) => Math.max(...row)).reverse(); // left-to-right from the right side = front to back
      const total = h.flat().reduce((s, v) => s + v, 0);
      const symmetric = frontCols[0] === frontCols[cols - 1];
      if (frontCols.every((v) => v > 0) && sideCols.every((v) => v > 0) && total >= 5 && total <= 16 && !(difficulty === 5 && symmetric)) break;
    }
    const total = h.flat().reduce((s, v) => s + v, 0);
    const planSquares = h.flat().filter((v) => v > 0).length;
    const frontSquares = frontCols.reduce((s, v) => s + v, 0);
    const sideSquares = sideCols.reduce((s, v) => s + v, 0);
    const svg = svgDoc(420, 300, isoStack(h) + planGrid(h, 300, 40));
    const alt = `A solid made of ${total} cubes, drawn in 3D, with a plan view that shows how many cubes are stacked in each position. Plan rows from back to front: ${h.map((row) => row.join(', ')).join(' / ')}.`;
    const intro = 'The solid is made from cubes. The plan shows how many cubes are stacked on each square.';

    if (difficulty === 3) {
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${intro} How many squares will the **plan view** (the view from directly above) have?`,
          figure: { svg, alt },
          answer: planSquares,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['From above you see one square for every position that has at least one cube.', 'The heights do not matter for the plan view.'],
          solution: `Count the positions with at least one cube: there are **${planSquares}**. From above, a stack of cubes looks like a single square.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${intro} How many cubes are used altogether?`,
        figure: { svg, alt },
        answer: total,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Add up all the numbers on the plan.'],
        solution: `Add the numbers on the plan: $${h.flat().filter((v) => v > 0).join(' + ')} = ${total}$ cubes.`,
      };
    }
    if (difficulty === 4) {
      const side = rng.chance(0.5);
      return {
        type: 'numeric',
        prompt: side
          ? `${intro} How many squares will the **side view from the right** have?`
          : `${intro} How many squares will the **front view** have?`,
        figure: { svg, alt },
        answer: side ? sideSquares : frontSquares,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [
          side ? 'From the right you see one column for each row of the plan (front to back).' : 'From the front you see one column for each column of the plan (left to right).',
          side ? 'Each column is as tall as the tallest stack in that row of the plan.' : 'Each column is as tall as the tallest stack in that column of the plan. Shorter stacks behind are hidden.',
        ],
        solution: side
          ? `From the right, the column heights (front to back) are the tallest stack in each row: ${sideCols.join(', ')}.\n\nSquares in the side view: $${sideCols.join(' + ')} = ${sideSquares}$.`
          : `From the front, the column heights (left to right) are the tallest stack in each column: ${frontCols.join(', ')}.\n\nSquares in the front view: $${frontCols.join(' + ')} = ${frontSquares}$.`,
      };
    }
    // difficulty 5: which description matches the front view?
    const right = frontCols.join(', ');
    const backView = [...frontCols].reverse().join(', ');
    const sums = Array.from({ length: cols }, (_, c) => h.reduce((s, row) => s + row[c]!, 0)).join(', ');
    const frontRow = h[rows - 1]!.join(', ');
    const cands = [right, backView, sums, frontRow, sideCols.join(', ')];
    const uniq: string[] = [];
    for (const c of cands) if (!uniq.includes(c)) uniq.push(c);
    // Top up with "one column off by one" variants until there are four different options.
    for (let i = 0; uniq.length < 4 && i < 2 * cols; i++) {
      const delta = i < cols ? 1 : -1;
      const v = frontCols.map((x, c) => (c === i % cols ? x + delta : x));
      if (v.every((x) => x >= 1)) {
        const s = v.join(', ');
        if (!uniq.includes(s)) uniq.push(s);
      }
    }
    const opts = rng.shuffle(uniq.slice(0, 4));
    const ids = ['a', 'b', 'c', 'd'];
    return {
      type: 'mcq',
      prompt: `${intro} The **front view** is drawn as columns of squares. Reading from left to right, how many squares tall is each column?`,
      figure: { svg, alt },
      options: opts.map((o, i) => ({ id: ids[i]!, text: o })),
      correct: ids[opts.indexOf(right)]!,
      calculator: 'not-allowed',
      hints: ['Stand at the arrow marked Front. Each column of the plan becomes one column in your view.', 'You only see the tallest stack in each column; shorter ones behind it are hidden.'],
      solution: `For each column of the plan (left to right), take the tallest stack: ${frontCols.map((v, c) => `column ${c + 1}: ${v}`).join('; ')}.\n\nSo the front view has columns **${right}** squares tall.`,
    };
  },
};
