import type { Rng } from '../../../../rng';
import type { QuestionTemplate, TemplateOutput } from '../../../types';
import { NAMES } from '../../../format';
import { ACCENT, coordinatePlane, dot, label, svgDoc, type Pt } from '../../../svg';

// m6.alg.coordinates — first-quadrant coordinates: reading and locating points (including points
// on the axes), ordered pairs (x, y) = (across, up), moving on a grid, rectangles on a grid, and
// plotting a growing pattern (position, term). Year 6 is first quadrant only.
// Coordinate answers use cloze blanks for x and y, because the numeric marker takes one number.

type P = [number, number];
const pt = ([x, y]: P) => `(${x}, ${y})`;
const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/** A first-quadrant grid with labelled points. */
export function gridFigure(max: number, points: Array<{ name: string; at: P }>, maxY = max): string {
  const scale = max > 8 || maxY > 8 ? 26 : 32;
  const g = coordinatePlane({ xMin: 0, xMax: max, yMin: 0, yMax: maxY, scale, padding: 26 });
  let body = g.body;
  const o = g.toPx({ x: 0, y: 0 });
  body += label({ x: o.x - 10, y: o.y + 12 }, '0', { size: 11, fill: '#4b5563' });
  for (const p of points) {
    const c = g.toPx({ x: p.at[0], y: p.at[1] });
    body += dot(c, 4.5, ACCENT);
    if (p.name) body += label({ x: c.x + 8, y: c.y - 10 }, p.name, { anchor: 'start', size: 14, bold: true });
  }
  return svgDoc(Math.round(g.width + 8), Math.round(g.height), body);
}

/** n distinct points in [lo..hi]², optionally all with x ≠ y. */
function distinctPoints(rng: Rng, n: number, lo: number, hi: number, avoid: P[] = []): P[] {
  const out: P[] = [];
  const key = (p: P) => `${p[0]},${p[1]}`;
  const used = new Set(avoid.map(key));
  while (out.length < n) {
    const p: P = [rng.int(lo, hi), rng.int(lo, hi)];
    if (used.has(key(p))) continue;
    used.add(key(p));
    out.push(p);
  }
  return out;
}

function describe([x, y]: P): string {
  if (x === 0 && y === 0) return 'It is at the origin: 0 across and 0 up';
  if (x === 0) return `It is on the y-axis: 0 across and ${y} up`;
  if (y === 0) return `It is on the x-axis: ${x} across and 0 up`;
  return `Start at the origin (0, 0). It is ${x} across and ${y} up`;
}

// ---------------------------------------------------------------- read a point
export const readPoint: QuestionTemplate = {
  id: 'm6.alg.coordinates.read-point',
  topicId: 'm6.alg.coordinates',
  title: 'Read the coordinates of a point',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const max = difficulty === 1 ? rng.pick([6, 8]) : 10;
    let target: P;
    if (difficulty === 2 && rng.chance(0.6)) {
      const k = rng.int(1, max);
      target = rng.chance(0.5) ? [0, k] : [k, 0];
    } else {
      do target = [rng.int(1, max), rng.int(1, max)];
      while (target[0] === target[1]);
    }
    const others = distinctPoints(rng, 3, 1, max, [target, [target[1], target[0]]]);
    const all = rng.shuffle([target, ...others]);
    const names = all.map((p, i) => ({ name: LETTERS[i]!, at: p }));
    const name = names.find((p) => p.at === target)!.name;
    return {
      type: 'cloze',
      prompt: `What are the coordinates of point ${name}?\n\n${name} = ([[x]], [[y]])`,
      figure: {
        svg: gridFigure(max, names),
        alt: `A coordinate grid with the x-axis and y-axis numbered from 0 to ${max}. Points ${LETTERS.slice(0, 4).join(', ')} are marked.`,
      },
      blanks: [
        { id: 'x', accepted: [String(target[0])] },
        { id: 'y', accepted: [String(target[1])] },
      ],
      calculator: 'not-allowed',
      hints: ['Start at the origin, (0, 0). Count across first, then up.', 'The first number (x) is how far across. The second number (y) is how far up.'],
      solution: `${describe(target)}, so ${name} = ${pt(target)}.${target[0] === 0 || target[1] === 0 ? ' A point on an axis still needs both numbers, with 0 for the direction it does not move.' : ''}`,
    };
  },
};

// ---------------------------------------------------------------- which point?
function axisMcq(rng: Rng): TemplateOutput {
  const k = rng.int(1, 12);
  // No (0, 0) case: the origin is on both axes, so "On the x-axis" would also be defensible.
  const kind = rng.pick(['y-axis', 'x-axis', 'neither', 'y-axis', 'x-axis'] as const);
  const p: P = kind === 'y-axis' ? [0, k] : kind === 'x-axis' ? [k, 0] : [k, rng.int(1, 12)];
  const ids = { 'x-axis': 'x', 'y-axis': 'y', origin: 'o', neither: 'n' } as const;
  const feedback: Record<string, string> = {
    x: 'Points on the x-axis have a y-coordinate of 0 (they have not moved up at all).',
    y: 'Points on the y-axis have an x-coordinate of 0 (they have not moved across at all).',
    o: 'The origin is (0, 0), where the two axes meet.',
    n: 'A point with a 0 in it lies on one of the axes.',
  };
  delete feedback[ids[kind]];
  return {
    type: 'mcq',
    prompt: `Where is the point $${pt(p)}$ on a coordinate plane?`,
    options: [
      { id: 'x', text: 'On the x-axis' },
      { id: 'y', text: 'On the y-axis' },
      { id: 'o', text: 'At the origin' },
      { id: 'n', text: 'Not on either axis' },
    ],
    correct: ids[kind],
    feedback,
    calculator: 'not-allowed',
    hints: ['The first number tells you how far across. The second number tells you how far up.', 'Is either number 0? A 0 means you do not move that way at all.'],
    solution:
      kind === 'y-axis'
        ? `$${pt(p)}$ is 0 across and ${k} up. Moving straight up from the origin keeps you on the **y-axis**.`
        : kind === 'x-axis'
          ? `$${pt(p)}$ is ${k} across and 0 up. Moving straight across from the origin keeps you on the **x-axis**.`
          : `$${pt(p)}$ is ${p[0]} across and ${p[1]} up. Neither number is 0, so it is **not on either axis**.`,
  };
}

export const whichPoint: QuestionTemplate = {
  id: 'm6.alg.coordinates.which-point',
  topicId: 'm6.alg.coordinates',
  title: 'Which point is at these coordinates?',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 2 && rng.chance(0.4)) return axisMcq(rng);
    const max = difficulty === 1 ? 6 : 10;
    let target: P;
    if (difficulty === 2) {
      const k = rng.int(1, max);
      target = rng.chance(0.5) ? [0, k] : [k, 0];
    } else {
      do target = [rng.int(1, max), rng.int(1, max)];
      while (target[0] === target[1]);
    }
    const swapped: P = [target[1], target[0]];
    const near: P = rng.chance(0.5) ? [target[0], target[1] === max ? target[1] - 1 : target[1] + 1] : [target[0] === max ? target[0] - 1 : target[0] + 1, target[1]];
    const extra = distinctPoints(rng, 1, 1, max, [target, swapped, near])[0]!;
    const all = rng.shuffle([target, swapped, near, extra]);
    const named = all.map((p, i) => ({ name: LETTERS[i]!, at: p }));
    const nameOf = (p: P) => named.find((q) => q.at === p)!.name;
    const feedback: Record<string, string> = {
      [nameOf(swapped)]: `Point ${nameOf(swapped)} is at ${pt(swapped)}. You went up first. The first number is how far **across**, then the second number is how far **up**.`,
      [nameOf(near)]: `Point ${nameOf(near)} is at ${pt(near)}. Count the grid lines carefully from 0.`,
      [nameOf(extra)]: `Point ${nameOf(extra)} is at ${pt(extra)}.`,
    };
    return {
      type: 'mcq',
      prompt: `Which point is at $${pt(target)}$?`,
      figure: {
        svg: gridFigure(max, named),
        alt: `A coordinate grid with both axes numbered from 0 to ${max}. Points A, B, C and D are marked.`,
      },
      options: LETTERS.slice(0, 4).map((l) => ({ id: l, text: l })),
      correct: nameOf(target),
      feedback,
      calculator: 'not-allowed',
      hints: ['Start at (0, 0). Go across first, then up.', `Go ${target[0]} across and ${target[1]} up.`],
      solution: `${describe(target)}. That is point **${nameOf(target)}**.\n\nPoint ${nameOf(swapped)} is at ${pt(swapped)}: the numbers are the other way round, so it is a different point.`,
    };
  },
};

// ---------------------------------------------------------------- moving on a grid
function rectangleQuestion(rng: Rng): TemplateOutput {
  const x1 = rng.int(0, 4);
  const y1 = rng.int(0, 4);
  const w = rng.int(2, 6);
  const h = rng.int(2, 5);
  if (w === h) return rectangleQuestion(rng);
  // Corners in order around the rectangle, starting at a random corner, either direction.
  const corners: P[] = [
    [x1, y1],
    [x1 + w, y1],
    [x1 + w, y1 + h],
    [x1, y1 + h],
  ];
  const start = rng.int(0, 3);
  const dir = rng.chance(0.5) ? 1 : 3;
  const order = [0, 1, 2, 3].map((i) => corners[(start + i * dir) % 4]!);
  const [A, B, C, Dp] = order as [P, P, P, P];
  const name = rng.pick(NAMES);
  if (rng.chance(0.5)) {
    const abHorizontal = A[1] === B[1];
    return {
      type: 'cloze',
      prompt: `${name} is drawing rectangle ABCD on a coordinate grid. The corners go in order around the rectangle.\n\nA is $${pt(A)}$, B is $${pt(B)}$ and C is $${pt(C)}$.\n\nWhat are the coordinates of corner D?\n\nD = ([[x]], [[y]])`,
      blanks: [
        { id: 'x', accepted: [String(Dp[0])] },
        { id: 'y', accepted: [String(Dp[1])] },
      ],
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Sketch the three corners on a grid.', 'D is joined to both A and C. The sides of a rectangle go straight across or straight up.'],
      solution: [
        abHorizontal
          ? `A and B have the same y-coordinate, so side AB goes straight across. Side DC must go straight across too, so D has the same y-coordinate as C: ${C[1]}.`
          : `A and B have the same x-coordinate, so side AB goes straight up and down. Side DC must too, so D has the same x-coordinate as C: ${C[0]}.`,
        abHorizontal
          ? `Side BC goes straight up and down, so side AD does too. D has the same x-coordinate as A: ${A[0]}.`
          : `Side BC goes straight across, so side AD does too. D has the same y-coordinate as A: ${A[1]}.`,
        `So D = ${pt(Dp)}.`,
      ].join('\n\n'),
    };
  }
  const area = rng.chance(0.5);
  const sorted = [...corners];
  return {
    type: 'numeric',
    prompt: `A rectangle is drawn on a coordinate grid. Its corners are at $${sorted.map(pt).join('$, $')}$. Each grid square is 1 unit by 1 unit.\n\nWhat is the ${area ? '**area** of the rectangle, in square units' : '**perimeter** of the rectangle, in units'}?`,
    answer: area ? w * h : 2 * (w + h),
    form: 'integer',
    marks: 2,
    calculator: 'not-allowed',
    hints: [
      'Find how long the bottom side is: compare the x-coordinates of two corners that are level with each other.',
      area ? 'Area of a rectangle = length × width.' : 'Perimeter is the distance all the way around: add all four sides.',
    ],
    solution: [
      `The bottom side goes from x = ${x1} to x = ${x1 + w}, so it is $${x1 + w} - ${x1} = ${w}$ units long.`,
      `The left side goes from y = ${y1} to y = ${y1 + h}, so it is $${y1 + h} - ${y1} = ${h}$ units tall.`,
      area ? `Area $= ${w} \\times ${h} = ${w * h}$ square units.` : `Perimeter $= ${w} + ${h} + ${w} + ${h} = ${2 * (w + h)}$ units.`,
    ].join('\n\n'),
  };
}

export const gridMoves: QuestionTemplate = {
  id: 'm6.alg.coordinates.grid-moves',
  topicId: 'm6.alg.coordinates',
  title: 'Moving on a coordinate grid, and rectangles',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 4) return rectangleQuestion(rng);
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const start: P = [rng.int(0, 6), rng.int(0, 6)];
      const dx = rng.int(-Math.min(start[0], 4), 5);
      const dy = rng.int(-Math.min(start[1], 4), 5);
      if (dx === 0 || dy === 0) return gridMoves.generate({ rng, difficulty });
      const end: P = [start[0] + dx, start[1] + dy];
      const h = `${Math.abs(dx)} unit${Math.abs(dx) === 1 ? '' : 's'} ${dx > 0 ? 'right' : 'left'}`;
      const v = `${Math.abs(dy)} unit${Math.abs(dy) === 1 ? '' : 's'} ${dy > 0 ? 'up' : 'down'}`;
      return {
        type: 'cloze',
        prompt: `${name} starts at $${pt(start)}$ and moves ${h} and ${v}. Where does ${name} finish?\n\n([[x]], [[y]])`,
        blanks: [
          { id: 'x', accepted: [String(end[0])] },
          { id: 'y', accepted: [String(end[1])] },
        ],
        calculator: 'not-allowed',
        hints: ['Moving right or left changes the x-coordinate (the first number).', 'Moving up or down changes the y-coordinate (the second number).'],
        solution: `x-coordinate: $${start[0]} ${dx > 0 ? '+' : '-'} ${Math.abs(dx)} = ${end[0]}$\n\ny-coordinate: $${start[1]} ${dy > 0 ? '+' : '-'} ${Math.abs(dy)} = ${end[1]}$\n\n${name} finishes at ${pt(end)}.`,
      };
    }
    // difficulty 3
    if (rng.chance(0.4)) {
      const shared = rng.int(1, 9);
      const a = rng.int(0, 10);
      let b = rng.int(0, 10);
      while (Math.abs(a - b) < 2) b = rng.int(0, 10);
      const vertical = rng.chance(0.5);
      const P1: P = vertical ? [shared, a] : [a, shared];
      const P2: P = vertical ? [shared, b] : [b, shared];
      return {
        type: 'numeric',
        prompt: `On a coordinate grid, point A is at $${pt(P1)}$ and point B is at $${pt(P2)}$. How many units apart are A and B?`,
        answer: Math.abs(a - b),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Both points have the same ${vertical ? 'x' : 'y'}-coordinate, so they are in a straight line ${vertical ? 'up and down' : 'across'}.`, `Find the difference between the ${vertical ? 'y' : 'x'}-coordinates.`],
        solution: `A and B have the same ${vertical ? 'x' : 'y'}-coordinate (${shared}), so one is straight ${vertical ? 'above' : 'across from'} the other.\n\nThe distance is $${Math.max(a, b)} - ${Math.min(a, b)} = ${Math.abs(a - b)}$ units.`,
      };
    }
    let from: P;
    let to: P;
    do {
      from = [rng.int(0, 9), rng.int(0, 9)];
      to = [rng.int(0, 9), rng.int(0, 9)];
    } while (from[0] === to[0] || from[1] === to[1]);
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return {
      type: 'cloze',
      prompt: `${name} walks from $${pt(from)}$ to $${pt(to)}$, moving across first and then up or down. How many units does ${name} move each way?\n\nMove [[h]] [[hd]], then [[v]] [[vd]].`,
      blanks: [
        { id: 'h', accepted: [String(Math.abs(dx))] },
        { id: 'hd', accepted: [dx > 0 ? 'right' : 'left'], options: ['right', 'left'] },
        { id: 'v', accepted: [String(Math.abs(dy))] },
        { id: 'vd', accepted: [dy > 0 ? 'up' : 'down'], options: ['up', 'down'] },
      ],
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Compare the x-coordinates to find the move across.', 'Compare the y-coordinates to find the move up or down.'],
      solution: `Across: x goes from ${from[0]} to ${to[0]}, which is ${Math.abs(dx)} unit${Math.abs(dx) === 1 ? '' : 's'} **${dx > 0 ? 'right' : 'left'}**.\n\nUp or down: y goes from ${from[1]} to ${to[1]}, which is ${Math.abs(dy)} unit${Math.abs(dy) === 1 ? '' : 's'} **${dy > 0 ? 'up' : 'down'}**.`,
    };
  },
};

// ---------------------------------------------------------------- plotting a growing pattern
export const patternPoints: QuestionTemplate = {
  id: 'm6.alg.coordinates.pattern-points',
  topicId: 'm6.alg.coordinates',
  title: 'Plot a growing pattern as points (position, term)',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    // Keep the 4th point on a 0–10 grid, and a ≠ d so "position × jump" is a real distractor.
    const d = rng.int(1, 3);
    let a = rng.int(1, 10 - 3 * d);
    if (a === d) a = d === 1 ? 2 : 1;
    const f = (n: number) => a + (n - 1) * d;
    const pts: P[] = [1, 2, 3, 4].map((n) => [n, f(n)]);
    const rule = `start with ${a} and add ${d} each time`;
    if (difficulty === 3) {
      const A = rng.int(1, 9);
      const D = rng.int(2, 6);
      const g = (n: number) => A + (n - 1) * D;
      return {
        type: 'cloze',
        prompt: `The table shows a growing pattern.\n\n| Position | 1 | 2 | 3 | 4 |\n|---|---|---|---|---|\n| Term | ${g(1)} | ${g(2)} | ${g(3)} | ${g(4)} |\n\n${rng.pick(NAMES)} plots each column as a point (position, term), so the first point is $${pt([1, g(1)])}$. If the pattern carries on, what is the point for position 5?\n\n([[x]], [[y]])`,
        blanks: [
          { id: 'x', accepted: ['5'] },
          { id: 'y', accepted: [String(g(5))] },
        ],
        calculator: 'not-allowed',
        hints: ['The x-coordinate is the position number.', 'Find the next term in the pattern for the y-coordinate.'],
        solution: `The terms go up by ${D} each time, so the term in position 5 is $${g(4)} + ${D} = ${g(5)}$.\n\nThe point is (position, term) = ${pt([5, g(5)])}.`,
      };
    }
    const maxY = 10;
    const figure = {
      svg: gridFigure(6, pts.map((p) => ({ name: '', at: p })), maxY),
      alt: `A coordinate grid with points plotted at ${pts.map(pt).join(', ')}.`,
    };
    if (difficulty === 4) {
      const k = rng.int(6, 12);
      return {
        type: 'numeric',
        prompt: `The points on the grid show a growing pattern. The x-coordinate is the position and the y-coordinate is the term.\n\nIf the pattern carries on, what is the y-coordinate of the point with x-coordinate ${k}?`,
        figure,
        answer: f(k),
        form: 'integer',
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Read the points from the grid and write them in a table.', 'How much does y go up by each time x goes up by 1?'],
        solution: [
          `The points are ${pts.map(pt).join(', ')}. Each time x goes up by 1, y goes up by ${d}. The rule is: ${rule}.`,
          `From x = 1 to x = ${k} there are ${k - 1} jumps: $${a} + ${k - 1} \\times ${d} = ${f(k)}$.`,
          `The point is ${pt([k, f(k)])}, so the y-coordinate is **${f(k)}**.`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: which point belongs to the pattern?
    for (;;) {
      const k = rng.int(8, 15);
      const right: P = [k, f(k)];
      const swappedP: P = [f(k), k];
      const extraJump: P = [k, f(k) + d];
      const noStart: P = [k, k * d];
      const keys = [right, swappedP, extraJump, noStart].map(pt);
      if (new Set(keys).size < 4) continue;
      return {
        type: 'mcq',
        prompt: `The points on the grid show a growing pattern. The x-coordinate is the position and the y-coordinate is the term. If the pattern carries on, which point will be plotted for position ${k}?`,
        figure,
        options: [
          { id: 'a', text: `$${pt(right)}$` },
          { id: 'b', text: `$${pt(swappedP)}$` },
          { id: 'c', text: `$${pt(extraJump)}$` },
          { id: 'd', text: `$${pt(noStart)}$` },
        ],
        correct: 'a',
        feedback: {
          b: `The numbers are the wrong way round. The position (${k}) is the x-coordinate, so it comes first.`,
          c: `That adds ${k} jumps of ${d}. From position 1 to position ${k} there are only ${k - 1} jumps.`,
          d: `$${k} \\times ${d} = ${k * d}$ forgets where the pattern starts. Position 1 has ${a}, not ${d}.`,
        },
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Find the rule for the pattern from the points.', 'For each option, use the x-coordinate as the position and work out the term.'],
        solution: [
          `The points are ${pts.map(pt).join(', ')}, so the rule is: ${rule}.`,
          `From position 1 to position ${k} there are ${k - 1} jumps of ${d}: $${a} + ${k - 1} \\times ${d} = ${f(k)}$.`,
          `So the point for position ${k} is $${pt(right)}$. The position goes first, because it is the x-coordinate.`,
        ].join('\n\n'),
      };
    }
  },
};

export const templates: QuestionTemplate[] = [readPoint, whichPoint, gridMoves, patternPoints];
