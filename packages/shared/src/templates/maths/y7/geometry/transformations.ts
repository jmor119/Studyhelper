import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { coordinatePlane, dot, label, line, polygon, svgDoc, type Pt } from '../../../svg';

// m7.geo.transformations templates: translations, reflections (in the axes and in lines such as
// x = 2 or y = −1) and rotations by multiples of 90° about a point, on a four-quadrant grid.
// Coordinate answers use cloze blanks (one for x, one for y) or MCQs whose distractors come
// from common mistakes (wrong direction, wrong axis, swapped coordinates).

const LIM = 6;
type XY = [number, number];

const inGrid = (p: XY) => Math.abs(p[0]) <= LIM && Math.abs(p[1]) <= LIM;
const same = (p: XY, q: XY) => p[0] === q[0] && p[1] === q[1];
/** "(3, −2)" in KaTeX. */
const coord = (p: XY) => `$(${p[0]}, ${p[1]})$`;
/** "A(3, −2)" in KaTeX. */
const named = (n: string, p: XY) => `$${n}(${p[0]}, ${p[1]})$`;
/** "(3, −2)" in plain text with a true minus sign, for alt text and figure labels. */
const plain = (p: XY) => `(${p[0]}, ${p[1]})`.replace(/-/g, '−');
const units = (n: number) => `${Math.abs(n)} unit${Math.abs(n) === 1 ? '' : 's'}`;
const PRIME = '′';

/** "3 units right and 2 units down" */
function moveWords(a: number, b: number): string {
  return [a ? `${units(a)} ${a > 0 ? 'right' : 'left'}` : '', b ? `${units(b)} ${b > 0 ? 'up' : 'down'}` : ''].filter(Boolean).join(' and ');
}

/** Accepted strings for a coordinate blank. */
const accept = (v: number) => (v >= 0 ? [String(v), `+${v}`] : [String(v)]);

/** Cloze prompt tail asking for the coordinates of a named point. */
const coordBlanks = (name: string) => `$${name}'$ = ( [[x]] , [[y]] )`;

/** A small triangle with integer vertices inside [x0, x0 + 3] × [y0, y0 + 3], not too thin. */
function smallTriangle(rng: Rng, x0: number, y0: number): [XY, XY, XY] {
  for (;;) {
    const pts = [0, 1, 2].map(() => [x0 + rng.int(0, 3), y0 + rng.int(0, 3)] as XY);
    const [a, b, c] = pts as [XY, XY, XY];
    const area2 = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]));
    if (area2 >= 3) return [a, b, c];
  }
}

interface Shape {
  pts: XY[];
  names?: string[];
  colour?: string;
  fill?: string;
  /** Text placed in the middle of the shape (e.g. "A"), or at `tagAt` if given. */
  tag?: string;
  tagAt?: [number, number];
}

interface Extras {
  lines?: Array<{ v?: number; h?: number; text: string }>;
  points?: Array<{ p: XY; text: string }>;
}

const BLUE = '#1d4ed8';
const ORANGE = '#b45309';
const RED = '#dc2626';

function gridFigure(shapes: Shape[], extras: Extras = {}): string {
  const g = coordinatePlane({ xMin: -LIM, xMax: LIM, yMin: -LIM, yMax: LIM, scale: 23 });
  let body = g.body;
  const toPx = (p: XY) => g.toPx({ x: p[0], y: p[1] });
  const tag = (at: Pt, text: string) => {
    const w = text.length * 7 + 8;
    return `<rect x="${at.x - w / 2}" y="${at.y - 9}" width="${w}" height="18" rx="3" fill="#ffffff" stroke="${RED}" stroke-width="1"/>` + label(at, text, { fill: RED, size: 12, bold: true });
  };
  let tags = '';
  for (const l of extras.lines ?? []) {
    if (l.v !== undefined) {
      body += line(toPx([l.v, -LIM]), toPx([l.v, LIM]), { stroke: RED, width: 2, dash: true });
      // Beside the top of the line, on the side away from the y-axis.
      const w = l.text.length * 7 + 8;
      tags += tag({ x: toPx([l.v, LIM]).x + (l.v < 0 ? -1 : 1) * (w / 2 + 4), y: toPx([l.v, LIM]).y + 12 }, l.text);
    } else if (l.h !== undefined) {
      body += line(toPx([-LIM, l.h]), toPx([LIM, l.h]), { stroke: RED, width: 2, dash: true });
      // Near the right-hand end of the line, on the side away from the x-axis.
      const w = l.text.length * 7 + 8;
      tags += tag({ x: toPx([LIM, l.h]).x - w / 2 - 2, y: toPx([LIM, l.h]).y + (l.h < 0 ? 13 : -13) }, l.text);
    }
  }
  for (const s of shapes) {
    const px = s.pts.map(toPx);
    const colour = s.colour ?? BLUE;
    const c = { x: px.reduce((t, p) => t + p.x, 0) / px.length, y: px.reduce((t, p) => t + p.y, 0) / px.length };
    if (px.length > 1) body += polygon(px, { fill: s.fill ?? 'rgba(37,99,235,0.25)', stroke: colour });
    px.forEach((p, i) => {
      if (s.names || px.length === 1) body += dot(p, 3.5, colour);
      const name = s.names?.[i];
      if (!name) return;
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      const at = px.length > 1 ? { x: p.x + (dx / len) * 13, y: p.y + (dy / len) * 13 } : { x: p.x + 11, y: p.y - 11 };
      body += label(at, name, { bold: true, fill: colour, size: 13 });
    });
    if (s.tag) body += label(s.tagAt ? toPx(s.tagAt) : c, s.tag, { bold: true, fill: colour, size: 14 });
  }
  for (const pt of extras.points ?? []) {
    const p = toPx(pt.p);
    body += dot(p, 4.5, RED) + label({ x: p.x + 12, y: p.y - 11 }, pt.text, { bold: true, fill: RED, size: 13 });
  }
  return svgDoc(g.width, g.height, body + tags);
}

/** MCQ over coordinate answers: the correct one plus distinct distractors (falls back to nearby points). */
function coordOptions(rng: Rng, correct: XY, candidates: XY[]): { options: Array<{ id: string; text: string }>; correctId: string } {
  const picked: XY[] = [];
  for (const c of candidates) {
    if (!same(c, correct) && !picked.some((p) => same(p, c))) picked.push(c);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) {
    const c: XY = [correct[0] + rng.pick([-2, -1, 1, 2]), correct[1] + rng.pick([-2, -1, 1, 2])];
    if (!same(c, correct) && !picked.some((p) => same(p, c))) picked.push(c);
  }
  const all = rng.shuffle([correct, ...picked]);
  const ids = ['a', 'b', 'c', 'd'];
  return { options: all.map((p, i) => ({ id: ids[i]!, text: coord(p) })), correctId: ids[all.findIndex((p) => same(p, correct))]! };
}

// ---------------------------------------------------------------- the transformations

type Mirror = { kind: 'v'; k: number } | { kind: 'h'; k: number };
type Turn = 'cw90' | 'acw90' | '180';

function reflect(p: XY, m: Mirror): XY {
  return m.kind === 'v' ? [2 * m.k - p[0], p[1]] : [p[0], 2 * m.k - p[1]];
}

function mirrorName(m: Mirror): string {
  if (m.kind === 'v') return m.k === 0 ? 'the $y$-axis' : `the line $x = ${m.k}$`;
  return m.k === 0 ? 'the $x$-axis' : `the line $y = ${m.k}$`;
}

function mirrorPlain(m: Mirror): string {
  if (m.kind === 'v') return m.k === 0 ? 'the y-axis' : `the line x = ${m.k}`.replace('-', '−');
  return m.k === 0 ? 'the x-axis' : `the line y = ${m.k}`.replace('-', '−');
}

function rotate(p: XY, t: Turn, c: XY = [0, 0]): XY {
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  const r: XY = t === 'cw90' ? [y, -x] : t === 'acw90' ? [-y, x] : [-x, -y];
  return [r[0] + c[0], r[1] + c[1]];
}

const turnWords = (t: Turn) => (t === 'cw90' ? '90° clockwise' : t === 'acw90' ? '90° anticlockwise' : '180° (a half turn)');

/** Words for how far a point is from a centre: "2 right and 3 down". */
function offsetWords(d: XY): string {
  return [d[0] ? `${Math.abs(d[0])} ${d[0] > 0 ? 'right' : 'left'}` : '', d[1] ? `${Math.abs(d[1])} ${d[1] > 0 ? 'up' : 'down'}` : ''].filter(Boolean).join(' and ') || 'on the centre';
}

// ---------------------------------------------------------------- translations

export const translations: QuestionTemplate = {
  id: 'm7.geo.transformations.translate',
  topicId: 'm7.geo.transformations',
  title: 'Translate points and shapes on a grid',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    let a: number;
    let b: number;
    do {
      a = rng.int(-5, 5);
      b = rng.int(-5, 5);
    } while (a === 0 || b === 0 || Math.abs(a) === Math.abs(b));

    if (difficulty === 1) {
      let P: XY;
      do P = [rng.int(-5, 5), rng.int(-5, 5)];
      while (!inGrid([P[0] + a, P[1] + b]));
      const img: XY = [P[0] + a, P[1] + b];
      return {
        type: 'cloze',
        prompt: `Point $P$ is at ${coord(P)}. It is translated ${moveWords(a, b)}. What are the coordinates of its image, $P'$?\n\n${coordBlanks('P')}`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }]), alt: `A coordinate grid with point P at ${plain(P)}.` },
        blanks: [
          { id: 'x', accepted: accept(img[0]) },
          { id: 'y', accepted: accept(img[1]) },
        ],
        calculator: 'not-allowed',
        hints: ['Moving right or left changes the $x$-coordinate (the first number). Moving up or down changes the $y$-coordinate.', 'Right and up add. Left and down subtract.'],
        solution: `$x$: $${P[0]} ${a > 0 ? '+' : '-'} ${Math.abs(a)} = ${img[0]}$\n\n$y$: $${P[1]} ${b > 0 ? '+' : '-'} ${Math.abs(b)} = ${img[1]}$\n\nSo $P'$ is at ${coord(img)}.`,
      };
    }

    let tri: [XY, XY, XY];
    let image: XY[];
    do {
      tri = smallTriangle(rng, rng.int(-6, 3), rng.int(-6, 3));
      image = tri.map((p) => [p[0] + a, p[1] + b] as XY);
    } while (!image.every(inGrid) || !tri.every(inGrid));
    const names = ['A', 'B', 'C'];
    const triAlt = `Triangle ABC with A${plain(tri[0])}, B${plain(tri[1])} and C${plain(tri[2])}.`;

    if (difficulty === 2) {
      const k = rng.int(0, 2);
      const v = tri[k]!;
      const ans = image[k]!;
      const { options, correctId } = coordOptions(rng, ans, [
        [v[0] - a, v[1] - b],
        [v[0] + b, v[1] + a],
        [v[0] + a, v[1] - b],
        [v[0] - a, v[1] + b],
      ]);
      return {
        type: 'mcq',
        prompt: `Triangle $ABC$ is translated ${moveWords(a, b)}. What are the coordinates of $${names[k]}'$, the image of $${names[k]}$?`,
        figure: { svg: gridFigure([{ pts: tri, names }]), alt: triAlt },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints: [`Read the coordinates of $${names[k]}$ from the grid first.`, 'Right and up add to the coordinates. Left and down subtract.'],
        solution: `$${names[k]}$ is at ${coord(v)}. Move it ${moveWords(a, b)}:\n\n$(${v[0]} ${a > 0 ? '+' : '-'} ${Math.abs(a)}, ${v[1]} ${b > 0 ? '+' : '-'} ${Math.abs(b)}) = (${ans[0]}, ${ans[1]})$\n\nEvery point of the triangle moves the same way, so the image is the same shape and size, facing the same way.`,
      };
    }

    // difficulty 3: describe the translation.
    return {
      type: 'cloze',
      marks: 2,
      prompt: `Triangle $A'B'C'$ is the image of triangle $ABC$ after a translation. Describe the translation.\n\nMove [[n1]] units [[d1]] and [[n2]] units [[d2]].`,
      figure: {
        svg: gridFigure([
          { pts: tri, names },
          { pts: image, names: names.map((n) => n + PRIME), colour: ORANGE, fill: 'rgba(245,158,11,0.3)' },
        ]),
        alt: `${triAlt} Its image A′B′C′ has A′${plain(image[0]!)}, B′${plain(image[1]!)} and C′${plain(image[2]!)}.`,
      },
      blanks: [
        { id: 'n1', accepted: [String(Math.abs(a))] },
        { id: 'd1', accepted: [a > 0 ? 'right' : 'left'], options: ['right', 'left'] },
        { id: 'n2', accepted: [String(Math.abs(b))] },
        { id: 'd2', accepted: [b > 0 ? 'up' : 'down'], options: ['up', 'down'] },
      ],
      calculator: 'not-allowed',
      hints: [`Pick one corner, such as $A$, and count how far it moves to reach $A'$.`, 'Count across first (right or left), then up or down.'],
      solution: `$A$ is at ${coord(tri[0])} and $A'$ is at ${coord(image[0]!)}.\n\nAcross: from $x = ${tri[0][0]}$ to $x = ${image[0]![0]}$ is ${units(a)} ${a > 0 ? 'right' : 'left'}.\n\nUp or down: from $y = ${tri[0][1]}$ to $y = ${image[0]![1]}$ is ${units(b)} ${b > 0 ? 'up' : 'down'}.\n\nThe translation is **${moveWords(a, b)}**.`,
    };
  },
};

// ---------------------------------------------------------------- reflections

export const reflections: QuestionTemplate = {
  id: 'm7.geo.transformations.reflect',
  topicId: 'm7.geo.transformations',
  title: 'Reflect points and shapes in a mirror line',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    if (difficulty === 2) {
      const m: Mirror = rng.chance(0.5) ? { kind: 'h', k: 0 } : { kind: 'v', k: 0 };
      let P: XY;
      do P = [rng.nonZeroInt(-5, 5), rng.nonZeroInt(-5, 5)];
      while (Math.abs(P[0]) === Math.abs(P[1]));
      const ans = reflect(P, m);
      const xAxis = m.kind === 'h';
      return {
        type: 'cloze',
        prompt: `Point ${named('P', P)} is reflected in ${mirrorName(m)}. What are the coordinates of its image, $P'$?\n\n${coordBlanks('P')}`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }]), alt: `Point P at ${plain(P)} on a coordinate grid.` },
        blanks: [
          { id: 'x', accepted: accept(ans[0]) },
          { id: 'y', accepted: accept(ans[1]) },
        ],
        calculator: 'not-allowed',
        hints: [
          xAxis ? 'The $x$-axis is the flat (horizontal) axis. The point flips from above it to below it, or from below to above.' : 'The $y$-axis is the upright (vertical) axis. The point flips from one side of it to the other.',
          'The image is the same distance from the mirror line as $P$, but on the other side.',
        ],
        solution: xAxis
          ? `$P$ is ${units(P[1])} ${P[1] > 0 ? 'above' : 'below'} the $x$-axis, so $P'$ is ${units(P[1])} ${P[1] > 0 ? 'below' : 'above'} it. The $x$-coordinate stays the same.\n\nSo $P'$ is at ${coord(ans)}.`
          : `$P$ is ${units(P[0])} to the ${P[0] > 0 ? 'right' : 'left'} of the $y$-axis, so $P'$ is ${units(P[0])} to the ${P[0] > 0 ? 'left' : 'right'}. The $y$-coordinate stays the same.\n\nSo $P'$ is at ${coord(ans)}.`,
      };
    }

    // A triangle wholly on one side of a mirror line, with its image on the grid.
    let m: Mirror;
    let tri: [XY, XY, XY];
    let image: XY[];
    for (;;) {
      const k = difficulty === 3 ? rng.int(-3, 3) : rng.nonZeroInt(-3, 3);
      m = rng.chance(0.5) ? { kind: 'v', k } : { kind: 'h', k };
      tri = smallTriangle(rng, rng.int(-6, 3), rng.int(-6, 3));
      const mm = m;
      image = tri.map((p) => reflect(p, mm));
      const side = (p: XY) => (mm.kind === 'v' ? Math.sign(p[0] - mm.k) : Math.sign(p[1] - mm.k));
      const sides = new Set(tri.map(side));
      if (image.every(inGrid) && sides.size === 1 && !sides.has(0)) break;
    }
    const names = ['A', 'B', 'C'];
    const mLine = m.kind === 'v' ? { v: m.k, text: `x = ${m.k}`.replace('-', '−') } : { h: m.k, text: `y = ${m.k}`.replace('-', '−') };
    const triAlt = `Triangle ABC with A${plain(tri[0])}, B${plain(tri[1])} and C${plain(tri[2])}.`;

    if (difficulty === 3) {
      const k = rng.int(0, 2);
      const v = tri[k]!;
      const ans = image[k]!;
      const cands: XY[] =
        m.kind === 'v'
          ? [
              [-v[0], v[1]],
              [v[0], 2 * m.k - v[1]],
              [2 * m.k + v[0], v[1]],
              [v[0] + 2 * (m.k - v[0]) + 1, v[1]],
            ]
          : [
              [v[0], -v[1]],
              [2 * m.k - v[0], v[1]],
              [v[0], 2 * m.k + v[1]],
              [v[0], v[1] + 2 * (m.k - v[1]) + 1],
            ];
      const { options, correctId } = coordOptions(rng, ans, cands);
      const dist = m.kind === 'v' ? Math.abs(v[0] - m.k) : Math.abs(v[1] - m.k);
      return {
        type: 'mcq',
        prompt: `Triangle $ABC$ is reflected in ${mirrorName(m)}${m.k === 0 ? '' : ' (the red dashed line)'}. What are the coordinates of $${names[k]}'$, the image of $${names[k]}$?`,
        figure: { svg: gridFigure([{ pts: tri, names }], m.k === 0 ? {} : { lines: [mLine] }), alt: `${triAlt} The mirror line is ${mirrorPlain(m)}${m.k === 0 ? '' : ', drawn as a red dashed line'}.` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints: [`Count how far $${names[k]}$ is from the mirror line, straight across to the line.`, 'The image is the same distance away on the other side of the line.'],
        solution:
          m.kind === 'v'
            ? `${named(names[k]!, v)} is ${units(dist)} to the ${v[0] > m.k ? 'right' : 'left'} of ${mirrorName(m)}. Its image is ${units(dist)} to the ${v[0] > m.k ? 'left' : 'right'}, at $x = ${ans[0]}$. The $y$-coordinate does not change.\n\nSo $${names[k]}'$ is at ${coord(ans)}.`
            : `${named(names[k]!, v)} is ${units(dist)} ${v[1] > m.k ? 'above' : 'below'} ${mirrorName(m)}. Its image is ${units(dist)} ${v[1] > m.k ? 'below' : 'above'}, at $y = ${ans[1]}$. The $x$-coordinate does not change.\n\nSo $${names[k]}'$ is at ${coord(ans)}.`,
      };
    }

    // difficulty 4: find the mirror line.
    const k = m.k;
    const lineText = (mm: Mirror) => {
      const s = mirrorName(mm);
      return s[0]!.toUpperCase() + s.slice(1);
    };
    const flipped: Mirror = m.kind === 'v' ? { kind: 'h', k } : { kind: 'v', k };
    const list = rng.shuffle<Mirror>([m, flipped, { kind: m.kind, k: k + 1 } as Mirror, { kind: m.kind, k: -k } as Mirror]);
    const ids = ['a', 'b', 'c', 'd'];
    const a0 = tri[0];
    const i0 = image[0]!;
    return {
      type: 'mcq',
      prompt: "Triangle $A'B'C'$ is the reflection of triangle $ABC$. What is the mirror line?",
      figure: {
        svg: gridFigure([
          { pts: tri, names },
          { pts: image, names: names.map((n) => n + PRIME), colour: ORANGE, fill: 'rgba(245,158,11,0.3)' },
        ]),
        alt: `${triAlt} Its mirror image A′B′C′ has A′${plain(i0)}, B′${plain(image[1]!)} and C′${plain(image[2]!)}.`,
      },
      options: list.map((mm, i) => ({ id: ids[i]!, text: lineText(mm) })),
      correct: ids[list.indexOf(m)]!,
      feedback: Object.fromEntries(
        list
          .map((mm, i) => [ids[i]!, mm] as const)
          .filter(([, mm]) => mm !== m)
          .map(([id, mm]) => [
            id,
            mm.kind !== m.kind
              ? `${mm.kind === 'v' ? 'A line $x = …$ goes straight up and down' : 'A line $y = …$ goes straight across'}. Check which way the triangle has flipped.`
              : 'The mirror line is exactly halfway between each point and its image. Check the halfway point again.',
          ]),
      ),
      calculator: 'not-allowed',
      hints: ['The mirror line is exactly halfway between each point and its image.', `Find the point halfway between $A$ and $A'$.`],
      solution:
        m.kind === 'v'
          ? `${named('A', a0)} and ${named("A'", i0)} have the same $y$-coordinate, so the mirror line goes straight up and down. Halfway between $x = ${a0[0]}$ and $x = ${i0[0]}$ is $x = ${k}$.\n\nThe mirror line is **${mirrorName(m)}**.`
          : `${named('A', a0)} and ${named("A'", i0)} have the same $x$-coordinate, so the mirror line goes straight across. Halfway between $y = ${a0[1]}$ and $y = ${i0[1]}$ is $y = ${k}$.\n\nThe mirror line is **${mirrorName(m)}**.`,
    };
  },
};

// ---------------------------------------------------------------- rotations

export const rotations: QuestionTemplate = {
  id: 'm7.geo.transformations.rotate',
  topicId: 'm7.geo.transformations',
  title: 'Rotate points and shapes by 90° or 180° about a point',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const t: Turn = rng.pick(['cw90', 'acw90', '180'] as const);
    if (difficulty === 3) {
      let P: XY;
      do P = [rng.nonZeroInt(-5, 5), rng.nonZeroInt(-5, 5)];
      while (Math.abs(P[0]) === Math.abs(P[1]));
      const ans = rotate(P, t);
      const { options, correctId } = coordOptions(rng, ans, [
        rotate(P, t === 'cw90' ? 'acw90' : t === 'acw90' ? 'cw90' : 'cw90'),
        [-P[0], P[1]],
        [P[0], -P[1]],
        [P[1], P[0]],
      ]);
      return {
        type: 'mcq',
        prompt: `Point ${named('P', P)} is rotated ${turnWords(t)} about the origin, $O$. What are the coordinates of its image, $P'$?`,
        figure: { svg: gridFigure([{ pts: [P], names: ['P'] }], { points: [{ p: [0, 0], text: 'O' }] }), alt: `Point P at ${plain(P)} on a coordinate grid, with the origin O marked.` },
        options,
        correct: correctId,
        calculator: 'not-allowed',
        hints:
          t === '180'
            ? ['A half turn about the origin sends a point to the opposite side of the origin.', 'Imagine a line from $P$ through $O$, carrying on the same distance out the other side.']
            : ['Imagine tracing paper pinned at the origin. Turn it a quarter turn the right way.', `${t === 'cw90' ? 'Clockwise' : 'Anticlockwise'} means ${t === 'cw90' ? 'the way' : 'the opposite way to the way'} clock hands move. Which quadrant will $P'$ end up in?`],
        solution:
          t === '180'
            ? `$P$ is ${offsetWords(P)} from $O$. A half turn reverses both directions, so $P'$ is ${offsetWords([-P[0], -P[1]])} from $O$.\n\nSo $P'$ is at ${coord(ans)}: both coordinates change sign.`
            : `$P$ is ${offsetWords(P)} from $O$. A quarter turn ${t === 'cw90' ? 'clockwise' : 'anticlockwise'} swaps the across and up/down distances, so $P'$ is ${offsetWords(ans)} from $O$.\n\nSo $P'$ is at ${coord(ans)}.`,
      };
    }

    // Triangles: about the origin (d4) or another point (d5).
    const centre: XY = difficulty === 5 ? [rng.nonZeroInt(-2, 2), rng.nonZeroInt(-2, 2)] : [0, 0];
    let tri: [XY, XY, XY];
    let image: XY[];
    do {
      tri = smallTriangle(rng, centre[0] + rng.int(-4, 1), centre[1] + rng.int(-4, 1));
      image = tri.map((p) => rotate(p, t, centre));
    } while (!tri.every(inGrid) || !image.every(inGrid) || tri.some((p) => same(p, centre)));
    const names = ['A', 'B', 'C'];
    const triAlt = `Triangle ABC with A${plain(tri[0])}, B${plain(tri[1])} and C${plain(tri[2])}.`;
    const cText = difficulty === 5 ? `the point ${coord(centre)}` : 'the origin, $O$';

    if (difficulty === 5 && rng.chance(0.4)) {
      // Describe the rotation.
      const all: Turn[] = ['cw90', 'acw90', '180'];
      const descr = (tt: Turn, c: XY) => `Rotation ${tt === 'cw90' ? '90° clockwise' : tt === 'acw90' ? '90° anticlockwise' : '180°'} about $(${c[0]}, ${c[1]})$`;
      const wrongCentre: XY = [0, 0];
      const cands = [descr(t, centre), ...all.filter((x) => x !== t).map((x) => descr(x, centre)), descr(t, wrongCentre)];
      const opts = rng.shuffle(cands.slice(0, 4));
      const ids = ['a', 'b', 'c', 'd'];
      return {
        type: 'mcq',
        marks: 2,
        prompt: `Triangle $A'B'C'$ is the image of triangle $ABC$ after a rotation about the red point. Which description is correct?`,
        figure: {
          svg: gridFigure(
            [
              { pts: tri, names },
              { pts: image, names: names.map((n) => n + PRIME), colour: ORANGE, fill: 'rgba(245,158,11,0.3)' },
            ],
            { points: [{ p: centre, text: plain(centre) }] },
          ),
          alt: `${triAlt} Its image A′B′C′ has A′${plain(image[0]!)}, B′${plain(image[1]!)} and C′${plain(image[2]!)}. The centre of rotation ${plain(centre)} is marked in red.`,
        },
        options: opts.map((o, i) => ({ id: ids[i]!, text: o })),
        correct: ids[opts.indexOf(descr(t, centre))]!,
        calculator: 'not-allowed',
        hints: ['A rotation is described by its centre, its angle and its direction.', `Compare how $A$ and $A'$ sit around the centre: a quarter turn or a half turn? Which way?`],
        solution: `From the centre ${coord(centre)}, $A$ is ${offsetWords([tri[0][0] - centre[0], tri[0][1] - centre[1]])} and $A'$ is ${offsetWords([image[0]![0] - centre[0], image[0]![1] - centre[1]])}.\n\n${t === '180' ? 'The directions are reversed, so this is a half turn: **180°**.' : `The across and up/down distances have swapped, so this is a quarter turn, and it goes **${t === 'cw90' ? 'clockwise' : 'anticlockwise'}**.`}\n\nThe rotation is ${descr(t, centre).replace(/^Rotation/, '**rotation')}**.`,
      };
    }

    const k = rng.int(0, 2);
    const v = tri[k]!;
    const ans = image[k]!;
    const wrongTurn: Turn = t === 'cw90' ? 'acw90' : t === 'acw90' ? 'cw90' : 'cw90';
    const cands: XY[] = [rotate(v, wrongTurn, centre), rotate(v, t), [2 * centre[0] - v[0], v[1]], [v[0], 2 * centre[1] - v[1]], rotate(v, t === '180' ? 'acw90' : '180', centre)];
    const { options, correctId } = coordOptions(rng, ans, difficulty === 5 ? cands : [cands[0]!, cands[4]!, cands[2]!, cands[3]!]);
    const rel: XY = [v[0] - centre[0], v[1] - centre[1]];
    const relImg: XY = [ans[0] - centre[0], ans[1] - centre[1]];
    return {
      type: 'mcq',
      marks: difficulty === 5 ? 2 : 1,
      prompt: `Triangle $ABC$ is rotated ${turnWords(t)} about ${cText}. What are the coordinates of $${names[k]}'$, the image of $${names[k]}$?`,
      figure: {
        svg: gridFigure([{ pts: tri, names }], { points: [{ p: centre, text: difficulty === 5 ? plain(centre) : 'O' }] }),
        alt: `${triAlt} The centre of rotation ${plain(centre)} is marked in red.`,
      },
      options,
      correct: correctId,
      calculator: 'not-allowed',
      hints: [
        `Work out how far $${names[k]}$ is from the centre of rotation: how far across, and how far up or down.`,
        t === '180' ? 'A half turn reverses both directions.' : 'A quarter turn swaps the across and up/down distances. Picture tracing paper pinned at the centre.',
      ],
      solution: [
        `From the centre ${coord(centre)}, ${named(names[k]!, v)} is ${offsetWords(rel)}.`,
        t === '180'
          ? `A half turn reverses both directions: $${names[k]}'$ is ${offsetWords(relImg)} from the centre.`
          : `A quarter turn ${t === 'cw90' ? 'clockwise' : 'anticlockwise'} swaps the distances around: $${names[k]}'$ is ${offsetWords(relImg)} from the centre.`,
        `So $${names[k]}'$ is at ${coord(ans)}.`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- which transformation?

/** An L shape with arms of different lengths, so it has no line or rotational symmetry. */
const L_SHAPE: XY[] = [
  [0, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [1, 3],
  [0, 3],
];

type Move =
  | { kind: 'translate'; a: number; b: number }
  | { kind: 'reflect'; m: Mirror }
  | { kind: 'rotate'; t: Turn };

function apply(p: XY, mv: Move): XY {
  if (mv.kind === 'translate') return [p[0] + mv.a, p[1] + mv.b];
  if (mv.kind === 'reflect') return reflect(p, mv.m);
  return rotate(p, mv.t);
}

function moveText(mv: Move): string {
  if (mv.kind === 'translate') return `Translation ${moveWords(mv.a, mv.b)}`;
  if (mv.kind === 'reflect') return `Reflection in ${mirrorName(mv.m)}`;
  return `Rotation ${mv.t === 'cw90' ? '90° clockwise' : mv.t === 'acw90' ? '90° anticlockwise' : '180°'} about the origin`;
}

const key = (pts: XY[]) => pts.map((p) => p.join(',')).sort().join(';');

export const whichTransformation: QuestionTemplate = {
  id: 'm7.geo.transformations.identify',
  topicId: 'm7.geo.transformations',
  title: 'Identify and describe a transformation',
  difficulties: [1, 2],
  generate({ rng, difficulty }): TemplateOutput {
    let obj: XY[];
    let mv: Move;
    let img: XY[];
    // The centre of the L's corner square, carried along with the shape, is where its letter goes.
    let objTag: XY;
    let imgTag: XY;
    for (;;) {
      const kind = rng.pick(['translate', 'reflect', 'rotate'] as const);
      const flip = rng.chance(0.5);
      const base = L_SHAPE.map(([x, y]) => (flip ? ([-x, y] as XY) : ([x, y] as XY)));
      const turns = rng.int(0, 3);
      let shape = base;
      for (let i = 0; i < turns; i++) shape = shape.map((p) => rotate(p, 'cw90'));
      const dx = rng.int(-5, 5);
      const dy = rng.int(-5, 5);
      obj = shape.map(([x, y]) => [x + dx, y + dy] as XY);
      let t: XY = flip ? [-0.5, 0.5] : [0.5, 0.5];
      for (let i = 0; i < turns; i++) t = rotate(t, 'cw90');
      objTag = [t[0] + dx, t[1] + dy];
      if (kind === 'translate') {
        let a: number;
        let b: number;
        do {
          a = rng.int(-6, 6);
          b = rng.int(-6, 6);
        } while (Math.abs(a) + Math.abs(b) < 4 || a === 0 || b === 0);
        mv = { kind, a, b };
      } else if (kind === 'reflect') {
        mv = { kind, m: rng.chance(0.5) ? { kind: 'v', k: difficulty === 1 ? rng.int(-1, 1) : 0 } : { kind: 'h', k: difficulty === 1 ? rng.int(-1, 1) : 0 } };
      } else {
        mv = { kind, t: rng.pick(['cw90', 'acw90', '180'] as const) };
      }
      const mm = mv;
      img = obj.map((p) => apply(p, mm));
      imgTag = apply(objTag, mm);
      // Both shapes on the grid, and not overlapping (no shared cells).
      const xs = (s: XY[]) => [Math.min(...s.map((p) => p[0])), Math.max(...s.map((p) => p[0]))];
      const ys = (s: XY[]) => [Math.min(...s.map((p) => p[1])), Math.max(...s.map((p) => p[1]))];
      const [ox1, ox2] = xs(obj) as [number, number];
      const [ix1, ix2] = xs(img) as [number, number];
      const [oy1, oy2] = ys(obj) as [number, number];
      const [iy1, iy2] = ys(img) as [number, number];
      const apart = ox2 < ix1 || ix2 < ox1 || oy2 < iy1 || iy2 < oy1;
      if (obj.every(inGrid) && img.every(inGrid) && apart) break;
    }
    const figure = {
      svg: gridFigure(
        [
          { pts: obj, tag: 'A', tagAt: objTag },
          { pts: img, tag: 'B', tagAt: imgTag, colour: ORANGE, fill: 'rgba(245,158,11,0.3)' },
        ],
      ),
      alt: `Two L-shapes on a coordinate grid: shape A with corners ${obj.map(plain).join(', ')} and shape B with corners ${img.map(plain).join(', ')}.`,
    };

    if (difficulty === 1) {
      const words = {
        translate: 'Shape B is the same way round and facing the same way as shape A. It has just slid across the grid, so this is a **translation**.',
        reflect: 'Shape B is a mirror image of shape A: it has been flipped over, so it faces the opposite way. This is a **reflection**.',
        rotate: 'Shape B has been turned around a point. It is not a mirror image, but it points in a different direction. This is a **rotation**.',
      };
      return {
        type: 'mcq',
        prompt: 'Which transformation moves shape A onto shape B?',
        figure,
        options: [
          { id: 'translate', text: 'Translation (a slide)' },
          { id: 'reflect', text: 'Reflection (a flip)' },
          { id: 'rotate', text: 'Rotation (a turn)' },
        ],
        correct: mv.kind,
        feedback: {
          translate: 'In a translation the shape slides without turning or flipping, so it would point the same way as before. Shape B does not.',
          reflect: 'In a reflection the shape is flipped, so it becomes a mirror image. Check whether you could slide or turn A to fit B without flipping it.',
          rotate: 'In a rotation the shape turns about a point. Check whether B is a mirror image of A, or exactly the same way round.',
        },
        calculator: 'not-allowed',
        hints: ['Look at the long arm and the short arm of each L. Do they point the same way?', 'A slide keeps a shape facing the same way. A turn changes the direction it faces. A flip makes a mirror image.'],
        solution: words[mv.kind],
      };
    }

    // difficulty 2: choose the full description.
    const distractors: Move[] = [];
    const pool: Move[] = [
      { kind: 'reflect', m: { kind: 'v', k: 0 } },
      { kind: 'reflect', m: { kind: 'h', k: 0 } },
      { kind: 'rotate', t: 'cw90' },
      { kind: 'rotate', t: 'acw90' },
      { kind: 'rotate', t: '180' },
    ];
    if (mv.kind === 'translate') pool.push({ kind: 'translate', a: mv.b, b: mv.a }, { kind: 'translate', a: -mv.a, b: -mv.b });
    else {
      const c0 = obj[0]!;
      const i0 = img[0]!;
      if (i0[0] !== c0[0] && i0[1] !== c0[1]) pool.push({ kind: 'translate', a: i0[0] - c0[0], b: i0[1] - c0[1] });
    }
    const right = key(img);
    for (const cand of rng.shuffle(pool)) {
      if (distractors.length === 3) break;
      if (key(obj.map((p) => apply(p, cand))) === right) continue;
      if (distractors.some((d) => moveText(d) === moveText(cand)) || moveText(cand) === moveText(mv)) continue;
      distractors.push(cand);
    }
    const opts = rng.shuffle([mv, ...distractors]);
    const ids = ['a', 'b', 'c', 'd'];
    const why =
      mv.kind === 'translate'
        ? `Shape B faces the same way as shape A, so it is a translation. Each corner moves ${moveWords(mv.a, mv.b)}: for example ${coord(obj[0]!)} → ${coord(img[0]!)}.`
        : mv.kind === 'reflect'
          ? `Shape B is a mirror image of shape A, so it is a reflection. Each corner is the same distance from ${mirrorName(mv.m)} on the other side: for example ${coord(obj[0]!)} → ${coord(img[0]!)}.`
          : `Shape B is turned but not flipped, so it is a rotation. ${mv.t === '180' ? 'Each corner ends up on the opposite side of the origin' : `A quarter turn ${mv.t === 'cw90' ? 'clockwise' : 'anticlockwise'} about the origin moves each corner`}: for example ${coord(obj[0]!)} → ${coord(img[0]!)}.`;
    return {
      type: 'mcq',
      prompt: 'Which description is correct for the transformation that moves shape A onto shape B?',
      figure,
      options: opts.map((o, i) => ({ id: ids[i]!, text: moveText(o) })),
      correct: ids[opts.indexOf(mv)]!,
      calculator: 'not-allowed',
      hints: ['First decide: is it a slide, a flip or a turn?', 'Then pick one corner of A, find the matching corner of B, and check the details.'],
      solution: `${why}\n\nThe answer is **${moveText(mv)}**.`,
    };
  },
};

export const templates: QuestionTemplate[] = [translations, reflections, rotations, whichTransformation];
