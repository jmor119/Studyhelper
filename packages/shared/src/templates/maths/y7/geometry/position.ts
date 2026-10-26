import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { coordinatePlane, dot, label, svgDoc, type Pt } from '../../../svg';
import { arrow } from './angles-helpers';

// m7.geo.position templates: the eight compass points (NE is 45° east of north), turns in
// degrees, reading and giving directions on a grid map, and following pathways made of
// distances and turns. Compass answers are MCQs or dropdowns, so "north-east" and
// "north-west" can't be confused by the typo-tolerant text marker.

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
type Dir = (typeof POINTS)[number];
const WORDS: Record<Dir, string> = {
  N: 'north',
  NE: 'north-east',
  E: 'east',
  SE: 'south-east',
  S: 'south',
  SW: 'south-west',
  W: 'west',
  NW: 'north-west',
};
const STEP: Record<Dir, [number, number]> = {
  N: [0, 1],
  NE: [1, 1],
  E: [1, 0],
  SE: [1, -1],
  S: [0, -1],
  SW: [-1, -1],
  W: [-1, 0],
  NW: [-1, 1],
};

/** Clockwise angle from north. */
const bearing = (d: Dir) => POINTS.indexOf(d) * 45;
const fromBearing = (b: number): Dir => POINTS[(((Math.round(b / 45) % 8) + 8) % 8)]!;
const full = (d: Dir) => `${WORDS[d]} (${d})`;

const NUM = { type: 'numeric' as const, calculator: 'not-allowed' as const };

/** Four compass options: the answer plus distinct distractors (falls back to neighbours). */
function dirOptions(rng: Rng, answer: Dir, candidates: Dir[]) {
  const picked: Dir[] = [];
  for (const c of [...candidates, ...rng.shuffle(POINTS)]) {
    if (c !== answer && !picked.includes(c)) picked.push(c);
    if (picked.length === 3) break;
  }
  return rng.shuffle([answer, ...picked]).map((d) => ({ id: d.toLowerCase(), text: full(d) }));
}

/** An 8-point compass rose. */
function compassRose(c: Pt, r: number): string {
  let body = '';
  for (const d of POINTS) {
    const b = bearing(d);
    const main = d.length === 1;
    const len = main ? r : r * 0.68;
    const tip = { x: c.x + len * Math.sin((b * Math.PI) / 180), y: c.y - len * Math.cos((b * Math.PI) / 180) };
    body += arrow(c, tip, { stroke: main ? '#1f2937' : '#6b7280', width: main ? 2 : 1.5 });
    const lp = { x: c.x + (len + 13) * Math.sin((b * Math.PI) / 180), y: c.y - (len + 13) * Math.cos((b * Math.PI) / 180) };
    body += label(lp, d, { size: main ? 13 : 11, bold: main });
  }
  return body;
}

/** A small north arrow. */
const northArrow = (at: Pt) => arrow({ x: at.x, y: at.y + 30 }, at, { width: 2.2 }) + label({ x: at.x, y: at.y - 10 }, 'N', { bold: true });

// ---------------------------------------------------------------- compass points

export const compassPoints: QuestionTemplate = {
  id: 'm7.geo.position.compass-points',
  topicId: 'm7.geo.position',
  title: 'The eight compass points and the angles between them',
  difficulties: [1, 2],
  generate({ rng, difficulty }): TemplateOutput {
    const rose = { svg: svgDoc(240, 220, compassRose({ x: 120, y: 110 }, 72)), alt: 'An eight-point compass rose showing N, NE, E, SE, S, SW, W and NW.' };
    if (difficulty === 1) {
      const kind = rng.pick(['halfway', 'opposite', 'opposite', 'neighbours'] as const);
      if (kind === 'halfway') {
        const i = rng.pick([0, 2, 4, 6]);
        const a = POINTS[i]!;
        const b = POINTS[(i + 2) % 8]!;
        const ans = POINTS[(i + 1) % 8]!;
        return {
          type: 'mcq',
          prompt: `Which compass point is halfway between ${WORDS[a]} and ${WORDS[b]}?`,
          options: dirOptions(rng, ans, [POINTS[(i + 5) % 8]!, POINTS[(i + 7) % 8]!, POINTS[(i + 3) % 8]!]),
          correct: ans.toLowerCase(),
          calculator: 'not-allowed',
          hints: ['The halfway points are named by putting the two main directions together.', 'North or south always comes first in the name: north-east, not east-north.'],
          solution: `Halfway between ${WORDS[a]} and ${WORDS[b]} is **${full(ans)}**. It is 45° from each of them.`,
        };
      }
      if (kind === 'opposite') {
        const d = rng.pick(POINTS);
        const i = POINTS.indexOf(d);
        const ans = POINTS[(i + 4) % 8]!;
        return {
          type: 'mcq',
          prompt: `Which direction is exactly opposite ${full(d)}?`,
          figure: rose,
          options: dirOptions(rng, ans, [POINTS[(i + 2) % 8]!, POINTS[(i + 6) % 8]!, POINTS[(i + 3) % 8]!]),
          correct: ans.toLowerCase(),
          calculator: 'not-allowed',
          hints: ['Opposite means a half turn (180°) away.', 'Swap north with south and east with west.'],
          solution: `A half turn from ${WORDS[d]} points ${WORDS[ans]}. Swap north ↔ south and east ↔ west: the opposite of ${d} is **${ans}**.`,
        };
      }
      const i = rng.int(0, 7);
      const a = POINTS[i]!;
      const b = POINTS[(i + 1) % 8]!;
      return {
        ...NUM,
        prompt: `How many degrees is it from ${full(a)} to ${full(b)}?`,
        figure: rose,
        answer: 45,
        units: '°',
        hints: ['A full turn is 360°, and the compass rose has 8 equal gaps.', `Are ${a} and ${b} next to each other on the compass rose?`],
        solution: `The 8 compass points split a full turn into 8 equal parts: $360° \\div 8 = 45°$.\n\n${a} and ${b} are next to each other, so the angle is **45°**. (That is why NE is 45° east of north.)`,
      };
    }
    // difficulty 2: clockwise angle from one direction to another.
    const a = rng.pick(POINTS);
    let b: Dir;
    do b = rng.pick(POINTS);
    while (b === a);
    const steps = (POINTS.indexOf(b) - POINTS.indexOf(a) + 8) % 8;
    const cw = rng.chance(0.65);
    const ans = cw ? steps * 45 : ((8 - steps) % 8) * 45;
    return {
      ...NUM,
      prompt: `You are facing ${full(a)}. How many degrees must you turn **${cw ? 'clockwise' : 'anticlockwise'}** to face ${full(b)}?`,
      figure: rose,
      answer: ans,
      units: '°',
      hints: ['Each step between neighbouring compass points is 45°.', `Count the steps from ${a} to ${b} going ${cw ? 'clockwise (the way clock hands move)' : 'anticlockwise (against the clock)'}.`],
      solution: `Going ${cw ? 'clockwise' : 'anticlockwise'} from ${a} to ${b} is ${ans / 45} step${ans === 45 ? '' : 's'} of 45°.\n\n$${ans / 45} \\times 45° = ${ans}°$`,
    };
  },
};

// ---------------------------------------------------------------- turns

export const turns: QuestionTemplate = {
  id: 'm7.geo.position.turns',
  topicId: 'm7.geo.position',
  title: 'Turning through angles to face a new direction',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }): TemplateOutput {
    const start = rng.pick(POINTS);
    if (difficulty <= 3) {
      const moves: Array<{ deg: number; cw: boolean }> =
        difficulty === 2
          ? [{ deg: rng.pick([45, 90, 135, 180, 90]), cw: rng.chance(0.5) }]
          : [
              { deg: rng.pick([45, 90, 135, 180, 225, 270]), cw: rng.chance(0.5) },
              { deg: rng.pick([45, 90, 135]), cw: rng.chance(0.5) },
            ];
      if (difficulty === 3 && moves[0]!.cw === moves[1]!.cw && rng.chance(0.6)) moves[1]!.cw = !moves[1]!.cw;
      const net = moves.reduce((s, m) => s + (m.cw ? m.deg : -m.deg), 0);
      const ans = fromBearing(bearing(start) + net);
      const wrongWay = fromBearing(bearing(start) - net);
      const turnText = moves.map((m) => `${m.deg}° ${m.cw ? 'clockwise' : 'anticlockwise'}`).join(', then ');
      const name = rng.pick(['Aroha', 'Tama', 'Priya', 'Sione', 'Isla', 'Nikau', 'Ruby', 'Mateo']);
      const working =
        moves.length === 1
          ? `${moves[0]!.deg === 45 ? '45° is one step on the compass rose' : `${moves[0]!.deg}° is ${moves[0]!.deg / 45} steps of 45°`}. Counting ${moves[0]!.cw ? 'clockwise' : 'anticlockwise'} from ${start} lands on **${ans}**.`
          : `Overall the turns add up to ${Math.abs(net) % 360 === 0 ? 'no change' : `${Math.abs(net)}° ${net > 0 ? 'clockwise' : 'anticlockwise'}`}: $${moves.map((m, i) => (i ? `${m.cw ? ' + ' : ' - '}${m.deg}` : `${m.cw ? '' : '-'}${m.deg}`)).join('')} =${net}$ (clockwise counts as +, anticlockwise as −).\n\nTurning that from ${start} leaves ${name} facing **${full(ans)}**.`;
      return {
        type: 'mcq',
        marks: difficulty === 3 ? 2 : 1,
        prompt: `${name} is facing ${full(start)}. ${name} turns ${turnText}. Which direction is ${name} facing now?`,
        figure: { svg: svgDoc(240, 220, compassRose({ x: 120, y: 110 }, 72)), alt: 'An eight-point compass rose showing N, NE, E, SE, S, SW, W and NW.' },
        options: dirOptions(rng, ans, [wrongWay, fromBearing(bearing(ans) + 45), fromBearing(bearing(ans) + 180)]),
        correct: ans.toLowerCase(),
        calculator: 'not-allowed',
        hints: ['Each step between neighbouring compass points is 45°. So 90° is two steps.', difficulty === 3 ? 'Do one turn at a time, or combine them first: clockwise turns add, anticlockwise turns take away.' : 'Clockwise is the way clock hands move: N → NE → E.'],
        solution: moves.length === 1 ? working : `First turn: ${moves[0]!.deg}° ${moves[0]!.cw ? 'clockwise' : 'anticlockwise'} from ${start} gives ${fromBearing(bearing(start) + (moves[0]!.cw ? 1 : -1) * moves[0]!.deg)}.\n\nSecond turn: ${moves[1]!.deg}° ${moves[1]!.cw ? 'clockwise' : 'anticlockwise'} gives **${ans}**.\n\n${working}`,
      };
    }
    // difficulty 4: what turn is needed?
    let end: Dir;
    let steps: number;
    do {
      end = rng.pick(POINTS);
      steps = (POINTS.indexOf(end) - POINTS.indexOf(start) + 8) % 8;
    } while (steps === 0 || steps === 4);
    const cw = steps < 4;
    const size = (cw ? steps : 8 - steps) * 45;
    return {
      type: 'cloze',
      marks: 2,
      prompt: `A drone is facing ${full(start)}. What is the **smallest** turn that makes it face ${full(end)}?\n\nTurn [[deg]]° [[dir]]`,
      blanks: [
        { id: 'deg', accepted: [String(size)] },
        { id: 'dir', accepted: [cw ? 'clockwise' : 'anticlockwise'], options: ['clockwise', 'anticlockwise'] },
      ],
      figure: { svg: svgDoc(240, 220, compassRose({ x: 120, y: 110 }, 72)), alt: 'An eight-point compass rose showing N, NE, E, SE, S, SW, W and NW.' },
      calculator: 'not-allowed',
      hints: [`Count the 45° steps from ${start} to ${end} both ways round.`, 'The smallest turn is the way with fewer steps.'],
      solution: `Clockwise from ${start} to ${end} is ${steps} step${steps === 1 ? '' : 's'} (${steps * 45}°). Anticlockwise is ${8 - steps} step${8 - steps === 1 ? '' : 's'} (${(8 - steps) * 45}°).\n\nThe smallest turn is **${size}° ${cw ? 'clockwise' : 'anticlockwise'}**.`,
    };
  },
};

// ---------------------------------------------------------------- grid maps

const PLACES = ['Hall', 'Library', 'Pool', 'Field', 'Office', 'Canteen', 'Gym', 'Garden', 'Shed', 'Marae'] as const;

interface Place {
  name: string;
  p: [number, number];
}

function makeMap(rng: Rng): Place[] {
  for (;;) {
    const names = rng.sample(PLACES, 6);
    const places: Place[] = [];
    for (const name of names) {
      for (let tries = 0; tries < 50; tries++) {
        const p: [number, number] = [rng.int(1, 7), rng.int(1, 5)];
        if (places.every((q) => Math.max(Math.abs(q.p[0] - p[0]), Math.abs(q.p[1] - p[1])) >= 2 && !(q.p[1] === p[1] && Math.abs(q.p[0] - p[0]) < 3))) {
          places.push({ name, p });
          break;
        }
      }
    }
    if (places.length === 6) return places;
  }
}

function mapFigure(places: Place[], extra: { start?: [number, number] } = {}): string {
  const g = coordinatePlane({ xMin: 0, xMax: 8, yMin: 0, yMax: 6, scale: 36, padding: 26 });
  let body = g.body;
  for (const pl of places) {
    const px = g.toPx({ x: pl.p[0], y: pl.p[1] });
    body += dot(px, 5, '#1d4ed8') + label({ x: px.x + 8, y: px.y - 11 }, pl.name, { anchor: 'start', size: 12, bold: true, fill: '#1d4ed8' });
  }
  if (extra.start) {
    const px = g.toPx({ x: extra.start[0], y: extra.start[1] });
    body += dot(px, 5, '#dc2626');
  }
  body += northArrow({ x: g.width + 22, y: 40 });
  return svgDoc(g.width + 48, g.height, body);
}

const mapAlt = (places: Place[]) => `A grid map with north at the top. Places: ${places.map((p) => `${p.name} at (${p.p[0]}, ${p.p[1]})`).join(', ')}.`;

/** Compass direction from a to b, if b is exactly in one of the eight directions. */
function directionBetween(a: [number, number], b: [number, number]): Dir | undefined {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return undefined;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return undefined;
  return POINTS.find((d) => STEP[d][0] === Math.sign(dx) && STEP[d][1] === Math.sign(dy));
}

const squares = (n: number) => `${n} square${n === 1 ? '' : 's'}`;

export const gridMaps: QuestionTemplate = {
  id: 'm7.geo.position.grid-maps',
  topicId: 'm7.geo.position',
  title: 'Read positions and directions on a grid map',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }): TemplateOutput {
    let places = makeMap(rng);
    const intro = 'This is a map of a school. Each grid square is 10 metres across.';

    if (difficulty === 1) {
      const pl = rng.pick(places);
      if (rng.chance(0.5)) {
        return {
          type: 'cloze',
          prompt: `${intro} What are the coordinates of the ${pl.name.toLowerCase()}?\n\n( [[x]] , [[y]] )`,
          figure: { svg: mapFigure(places), alt: mapAlt(places) },
          blanks: [
            { id: 'x', accepted: [String(pl.p[0])] },
            { id: 'y', accepted: [String(pl.p[1])] },
          ],
          calculator: 'not-allowed',
          hints: ['The first coordinate is how far across (along the $x$-axis).', 'The second coordinate is how far up (along the $y$-axis).'],
          solution: `The ${pl.name.toLowerCase()} is ${pl.p[0]} across and ${pl.p[1]} up, so its coordinates are $(${pl.p[0]}, ${pl.p[1]})$.`,
        };
      }
      const others = rng.sample(places.filter((q) => q !== pl), 3);
      // A distractor with the coordinates swapped, if there is one.
      const swapped = places.find((q) => q.p[0] === pl.p[1] && q.p[1] === pl.p[0] && q !== pl);
      const opts = swapped && !others.includes(swapped) ? [pl, swapped, ...others.slice(0, 2)] : [pl, ...others];
      return {
        type: 'mcq',
        prompt: `${intro} What is at $(${pl.p[0]}, ${pl.p[1]})$?`,
        figure: { svg: mapFigure(places), alt: mapAlt(places) },
        options: opts.map((q) => ({ id: q.name.toLowerCase(), text: `The ${q.name.toLowerCase()}` })),
        correct: pl.name.toLowerCase(),
        feedback: swapped ? { [swapped.name.toLowerCase()]: `That place is at $(${swapped.p[0]}, ${swapped.p[1]})$. Go across first, then up.` } : {},
        calculator: 'not-allowed',
        hints: ['Go across first, then up.', `Start at $(0, 0)$, move ${pl.p[0]} along the bottom, then ${pl.p[1]} up.`],
        solution: `Across ${pl.p[0]}, up ${pl.p[1]}: that is the **${pl.name.toLowerCase()}**.`,
      };
    }

    if (difficulty === 2) {
      // Direction of one place from another (exactly on a compass line).
      let pairs: Array<[Place, Place, Dir]> = [];
      for (;;) {
        pairs = [];
        for (const a of places) for (const b of places) {
          const d = a !== b ? directionBetween(a.p, b.p) : undefined;
          if (d) pairs.push([a, b, d]);
        }
        if (pairs.length) break;
        places = makeMap(rng);
      }
      const [from, to, d] = rng.pick(pairs);
      const back = fromBearing(bearing(d) + 180);
      const dx = to.p[0] - from.p[0];
      const dy = to.p[1] - from.p[1];
      return {
        type: 'mcq',
        prompt: `${intro} In which direction is the ${to.name.toLowerCase()} from the ${from.name.toLowerCase()}?`,
        figure: { svg: mapFigure(places), alt: mapAlt(places) },
        options: dirOptions(rng, d, [back, fromBearing(bearing(d) + 90), fromBearing(bearing(d) - 90)]),
        correct: d.toLowerCase(),
        feedback: { [back.toLowerCase()]: `That is the direction of the ${from.name.toLowerCase()} from the ${to.name.toLowerCase()}. Start at the ${from.name.toLowerCase()} and face the ${to.name.toLowerCase()}.` },
        calculator: 'not-allowed',
        hints: [`Put your finger on the ${from.name.toLowerCase()}. Which way do you move to reach the ${to.name.toLowerCase()}?`, 'North is up the map, east is to the right. A diagonal move is one of the halfway points, like NE.'],
        solution: `From the ${from.name.toLowerCase()} $(${from.p[0]}, ${from.p[1]})$ to the ${to.name.toLowerCase()} $(${to.p[0]}, ${to.p[1]})$ you move ${[dx ? `${squares(Math.abs(dx))} ${dx > 0 ? 'east' : 'west'}` : '', dy ? `${squares(Math.abs(dy))} ${dy > 0 ? 'north' : 'south'}` : ''].filter(Boolean).join(' and ')}${dx && dy ? ', which is a diagonal line' : ''}.\n\nSo the ${to.name.toLowerCase()} is **${full(d)}** of the ${from.name.toLowerCase()}.`,
      };
    }

    // difficulty 3: give directions from one place to another.
    const [from, to] = rng.sample(places, 2) as [Place, Place];
    const dx = to.p[0] - from.p[0];
    const dy = to.p[1] - from.p[1];
    const route = (ax: number, ay: number) =>
      [ax ? `${squares(Math.abs(ax))} ${ax > 0 ? 'east' : 'west'}` : '', ay ? `${squares(Math.abs(ay))} ${ay > 0 ? 'north' : 'south'}` : ''].filter(Boolean).join(', then ');
    const right = route(dx, dy);
    const cands = [route(-dx, dy), route(dx, -dy), route(-dx, -dy), route(dy, dx), route(dx + Math.sign(dx || 1), dy)];
    const uniq: string[] = [];
    for (const c of cands) if (c && c !== right && !uniq.includes(c)) uniq.push(c);
    const opts = rng.shuffle([right, ...uniq.slice(0, 3)]);
    const ids = ['a', 'b', 'c', 'd'];
    const metres = (Math.abs(dx) + Math.abs(dy)) * 10;
    return {
      type: 'mcq',
      marks: 2,
      prompt: `${intro} Which directions take you from the ${from.name.toLowerCase()} to the ${to.name.toLowerCase()} along the grid lines?`,
      figure: { svg: mapFigure(places), alt: mapAlt(places) },
      options: opts.map((o, i) => ({ id: ids[i]!, text: capitalise(o) })),
      correct: ids[opts.indexOf(right)]!,
      calculator: 'not-allowed',
      hints: ['North is up the map and east is to the right.', `Compare the coordinates: how far across, and how far up or down, is the ${to.name.toLowerCase()} from the ${from.name.toLowerCase()}?`],
      solution: `The ${from.name.toLowerCase()} is at $(${from.p[0]}, ${from.p[1]})$ and the ${to.name.toLowerCase()} is at $(${to.p[0]}, ${to.p[1]})$.\n\nAcross: $${to.p[0]} - ${from.p[0]} = ${dx}$${dx ? `, so ${squares(Math.abs(dx))} ${dx > 0 ? 'east' : 'west'}` : ''}. Up or down: $${to.p[1]} - ${from.p[1]} = ${dy}$${dy ? `, so ${squares(Math.abs(dy))} ${dy > 0 ? 'north' : 'south'}` : ''}.\n\nThe route is **${right}**. That is ${metres} metres of walking.`,
    };
  },
};

const capitalise = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- pathways

interface Leg {
  turn?: { deg: number; cw: boolean };
  dist: number;
}

function pathFigure(start: [number, number]): string {
  const g = coordinatePlane({ xMin: -6, xMax: 6, yMin: -6, yMax: 6, scale: 23 });
  let body = g.body;
  const px = g.toPx({ x: start[0], y: start[1] });
  body += dot(px, 5, '#dc2626') + label({ x: px.x + 12, y: px.y - 11 }, 'Start', { bold: true, fill: '#dc2626', size: 12 });
  body += northArrow({ x: g.width + 20, y: 40 });
  return svgDoc(g.width + 44, g.height, body);
}

export const pathways: QuestionTemplate = {
  id: 'm7.geo.position.pathways',
  topicId: 'm7.geo.position',
  title: 'Follow a pathway of distances and turns',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const name = rng.pick(['Kai', 'Mere', 'Leo', 'Hana', 'Tevita', 'Grace', 'Wiremu', 'Ella']);
    for (;;) {
      const start: [number, number] = [rng.int(-4, 4), rng.int(-4, 4)];
      const face0: Dir = difficulty === 5 ? rng.pick(POINTS) : rng.pick(['N', 'E', 'S', 'W'] as const);
      const nLegs = difficulty === 3 ? 2 : 3;
      const legs: Leg[] = [{ dist: rng.int(1, 4) }];
      for (let i = 1; i < nLegs; i++) {
        const deg = difficulty === 5 && i === nLegs - 1 ? rng.pick([45, 135]) : rng.pick([90, 90, 180]);
        legs.push({ turn: { deg: difficulty === 3 ? 90 : deg, cw: rng.chance(0.5) }, dist: rng.int(1, difficulty === 5 && i === nLegs - 1 ? 3 : 4) });
      }
      // Walk it.
      let facing = face0;
      let pos: [number, number] = [...start];
      const trace: string[] = [];
      let ok = true;
      for (const leg of legs) {
        if (leg.turn) facing = fromBearing(bearing(facing) + (leg.turn.cw ? 1 : -1) * leg.turn.deg);
        const [sx, sy] = STEP[facing];
        pos = [pos[0] + sx * leg.dist, pos[1] + sy * leg.dist];
        if (Math.abs(pos[0]) > 6 || Math.abs(pos[1]) > 6) ok = false;
        trace.push(`${leg.turn ? `Turn ${leg.turn.deg}° ${leg.turn.cw ? 'clockwise' : 'anticlockwise'} to face ${facing}. ` : `Facing ${facing}. `}${leg.dist} ${leg.dist === 1 ? 'step' : 'steps'} ${WORDS[facing]}${facing.length === 2 ? ' (diagonally)' : ''} → $(${pos[0]}, ${pos[1]})$.`);
      }
      if (!ok || (pos[0] === start[0] && pos[1] === start[1])) continue;
      const steps = legs
        .map((leg) => `${leg.turn ? `turns ${leg.turn.deg}° ${leg.turn.cw ? 'clockwise' : 'anticlockwise'}, then ` : ''}walks ${leg.dist} square${leg.dist === 1 ? '' : 's'} forward`)
        .join(', ');
      const diagonalNote = difficulty === 5 ? ' When facing a halfway direction such as NE, one square forward means one square diagonally (1 across and 1 up or down).' : '';
      const solutionSteps = `Start at $(${start[0]}, ${start[1]})$ facing ${face0}.\n\n${trace.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
      if (difficulty === 5) {
        return {
          type: 'cloze',
          marks: 3,
          prompt: `${name} starts at $(${start[0]}, ${start[1]})$ facing ${full(face0)}. ${name} ${steps}.${diagonalNote}\n\nWhere does ${name} finish, and which way is ${name} facing?\n\nFinish: ( [[x]] , [[y]] ), facing [[dir]]`,
          figure: { svg: pathFigure(start), alt: 'A coordinate grid from −6 to 6 with the start point marked in red and north at the top.' },
          blanks: [
            { id: 'x', accepted: [String(pos[0])] },
            { id: 'y', accepted: [String(pos[1])] },
            { id: 'dir', accepted: [facing], options: [...POINTS] },
          ],
          calculator: 'not-allowed',
          hints: ['Do one instruction at a time and keep track of which way you are facing after each turn.', 'Moving north or south changes $y$; moving east or west changes $x$. Diagonal moves change both.'],
          solution: `${solutionSteps}\n\n${name} finishes at $(${pos[0]}, ${pos[1]})$ facing **${full(facing)}**.`,
        };
      }
      return {
        type: 'cloze',
        marks: 2,
        prompt: `${name} starts at $(${start[0]}, ${start[1]})$ facing ${full(face0)}. ${name} ${steps}.\n\nWhat are ${name}’s coordinates at the end?\n\n( [[x]] , [[y]] )`,
        figure: { svg: pathFigure(start), alt: 'A coordinate grid from −6 to 6 with the start point marked in red and north at the top.' },
        blanks: [
          { id: 'x', accepted: [String(pos[0])] },
          { id: 'y', accepted: [String(pos[1])] },
        ],
        calculator: 'not-allowed',
        hints: ['Do one instruction at a time and keep track of which way you are facing after each turn.', 'Moving north or south changes $y$; moving east or west changes $x$.'],
        solution: `${solutionSteps}\n\n${name} finishes at $(${pos[0]}, ${pos[1]})$.`,
      };
    }
  },
};

export const templates: QuestionTemplate[] = [compassPoints, turns, gridMaps, pathways];
