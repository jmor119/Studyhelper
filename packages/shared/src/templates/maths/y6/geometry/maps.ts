import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES, clean, tex } from '../../../format';
import {
  DIRS,
  MAPS,
  ROWS,
  cap,
  drawMap,
  inMap,
  move,
  ref,
  sameSq,
  scatter,
  squares,
  turnDir,
  type Dir,
  type Place,
  type Square,
} from './maps-helpers';

// m6.geo.maps — alphanumeric grid references (row letter then column number, e.g. B4), simple
// map scales, the four main compass points, and turns in degrees to describe pathways.

const ids = ['a', 'b', 'c', 'd'];
type McqBase = Omit<Extract<TemplateOutput, { type: 'mcq' }>, 'type' | 'options' | 'correct' | 'feedback'>;

function mcq(rng: Rng, correct: string, wrong: Array<[string, string]>, base: McqBase, keepOrder?: readonly string[]): TemplateOutput {
  const seen = new Set([correct]);
  const distractors = wrong.filter(([t]) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 3);
  let order: Array<[string, string | undefined]> = rng.shuffle<[string, string | undefined]>([[correct, undefined], ...distractors]);
  if (keepOrder) order = [...order].sort((a, b) => keepOrder.indexOf(a[0]) - keepOrder.indexOf(b[0]));
  const feedback: Record<string, string> = {};
  order.forEach(([, fb], i) => {
    if (fb) feedback[ids[i]!] = fb;
  });
  return {
    type: 'mcq',
    options: order.map(([text], i) => ({ id: ids[i]!, text })),
    correct: ids[order.findIndex(([t]) => t === correct)]!,
    feedback,
    ...(keepOrder ? { shuffle: false } : {}),
    ...base,
  };
}

const refAccepted = (sq: Square) => [ref(sq), `${ROWS[sq[1]]} ${sq[0] + 1}`];
const REF_HINT = 'Find the row first and read its letter on the left. Then read the column number along the top. Write the letter first, then the number.';
const COMPASS_HINT = 'On this map north is up, south is down, east is to the right and west is to the left.';

function mapSize(rng: Rng): { cols: number; rows: number } {
  return { cols: rng.int(6, 7), rows: rng.int(5, 6) };
}

// ---------------------------------------------------------------- grid references

export const gridReferences: QuestionTemplate = {
  id: 'm6.geo.maps.grid-reference',
  topicId: 'm6.geo.maps',
  title: 'Read and use grid references',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const map = rng.pick(MAPS);
    const { cols, rows } = mapSize(rng);
    const names = rng.sample(map.places, 6);
    if (difficulty === 1) {
      const places = scatter(rng, names, cols, rows);
      const p = rng.pick(places);
      return {
        type: 'text',
        prompt: `This is a map of the ${map.title.toLowerCase()}. What is the grid reference of the **${p.name}**? (Write it like B4.)`,
        figure: { svg: drawMap(cols, rows, places), alt: `Grid map with rows A to ${ROWS[rows - 1]} and columns 1 to ${cols}. Places marked: ${places.map((x) => x.name).join(', ')}.` },
        accepted: refAccepted(p.at),
        calculator: 'not-allowed',
        hints: [REF_HINT],
        solution: `The ${p.name} is in row **${ROWS[p.at[1]]}** and column **${p.at[0] + 1}**, so its grid reference is **${ref(p.at)}**.`,
      };
    }
    // Which place is in a given square? Distractors sit next to it, or where the letter and number are swapped.
    for (;;) {
      const target: Square = [rng.int(0, cols - 1), rng.int(0, rows - 1)];
      const swapped: Square = [target[1], target[0]];
      const around: Square[] = [
        [target[0] + 1, target[1]],
        [target[0] - 1, target[1]],
        [target[0], target[1] + 1],
        [target[0], target[1] - 1],
      ];
      const spots = rng.shuffle([...(inMap(swapped, cols, rows) && !sameSq(swapped, target) ? [swapped] : []), ...rng.shuffle(around).filter((s) => inMap(s, cols, rows))]).slice(0, 3);
      if (spots.length < 3) continue;
      const placed: Place[] = [{ name: names[0]!, at: target }, ...spots.map((at, i) => ({ name: names[i + 1]!, at }))];
      const places = [...placed, ...scatter(rng, names.slice(4), cols, rows, placed.map((p) => p.at))];
      const wrong = placed.slice(1).map((p) => [p.name, `The ${p.name} is in ${ref(p.at)}. ${sameSq(p.at, swapped) ? 'It looks like the letter and number were read the wrong way round.' : 'Check the row letter and the column number again.'}`] as [string, string]);
      return mcq(rng, names[0]!, wrong, {
        prompt: `Look at the map of the ${map.title.toLowerCase()}. What is in square **${ref(target)}**?`,
        figure: { svg: drawMap(cols, rows, places), alt: `Grid map with rows A to ${ROWS[rows - 1]} and columns 1 to ${cols}. Places marked: ${places.map((x) => x.name).join(', ')}.` },
        calculator: 'not-allowed',
        hints: [`The letter ${ROWS[target[1]]} tells you the row. The number ${target[0] + 1} tells you the column.`, 'Put one finger on the row and one on the column, and slide them together until they meet.'],
        solution: `Row ${ROWS[target[1]]} and column ${target[0] + 1} meet at the **${names[0]}**.`,
      });
    }
  },
};

// ---------------------------------------------------------------- compass directions and turns

const TURNS = [
  { text: 'a quarter turn clockwise', q: 1 },
  { text: 'a quarter turn anticlockwise', q: -1 },
  { text: 'a half turn', q: 2 },
  { text: 'a 90° turn clockwise', q: 1 },
  { text: 'a 90° turn anticlockwise', q: -1 },
  { text: 'a 180° turn', q: 2 },
  { text: 'a 270° turn clockwise', q: 3 },
  { text: 'a three-quarter turn anticlockwise', q: -3 },
] as const;

const DIR_ORDER = ['North', 'East', 'South', 'West'];

function dirFeedback(correct: Dir, chosen: Dir, from: Dir): string {
  if (chosen === from) return `That is the way you were facing before the turn.`;
  if (turnDir(correct, 2) === chosen) return 'That is the opposite direction. Check which way the turn goes: clockwise is the way clock hands move.';
  return 'Turn one quarter at a time: north → east → south → west is clockwise.';
}

export const directions: QuestionTemplate = {
  id: 'm6.geo.maps.directions',
  topicId: 'm6.geo.maps',
  title: 'Compass directions and turns',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const who = rng.pick(NAMES);
    if (difficulty === 1) {
      const map = rng.pick(MAPS);
      const { cols, rows } = mapSize(rng);
      for (;;) {
        const a: Square = [rng.int(0, cols - 1), rng.int(0, rows - 1)];
        const d = rng.pick(DIRS);
        const b = move(a, d, rng.int(2, 4));
        if (!inMap(b, cols, rows)) continue;
        const names = rng.sample(map.places, 5);
        const two: Place[] = [{ name: names[0]!, at: a }, { name: names[1]!, at: b }];
        const places = [...two, ...scatter(rng, names.slice(2), cols, rows, [a, b])];
        const wrong = DIRS.filter((x) => x !== d).map((x) => [cap(x), x === turnDir(d, 2) ? `That is the way from the ${names[1]} back to the ${names[0]}. Start at the ${names[0]}.` : COMPASS_HINT] as [string, string]);
        return mcq(
          rng,
          cap(d),
          wrong,
          {
            prompt: `${who} walks in a straight line from the **${names[0]}** to the **${names[1]}**. Which direction does ${who} walk?`,
            figure: { svg: drawMap(cols, rows, places), alt: `Grid map with a compass showing north at the top. Places marked: ${places.map((x) => x.name).join(', ')}.` },
            calculator: 'not-allowed',
            hints: ['Start at the first place and look towards the second place.', COMPASS_HINT],
            solution: `The ${names[1]} is ${d === 'north' ? 'straight up' : d === 'south' ? 'straight down' : d === 'east' ? 'straight to the right' : 'straight to the left'} from the ${names[0]} on the map, so ${who} walks **${d}**.`,
          },
          DIR_ORDER,
        );
      }
    }
    if (difficulty === 2) {
      const from = rng.pick(DIRS);
      const t = rng.pick(TURNS);
      const to = turnDir(from, t.q);
      const where = rng.pick(['on the school field', 'at the beach', 'in the playground', 'on the netball court', 'at the top of the lookout']);
      const wrong = DIRS.filter((x) => x !== to).map((x) => [cap(x), dirFeedback(to, x, from)] as [string, string]);
      return mcq(
        rng,
        cap(to),
        wrong,
        {
          prompt: `${who} is standing ${where}, facing **${from}**. ${who} makes **${t.text}**. Which direction is ${who} facing now?`,
          calculator: 'not-allowed',
          hints: ['A quarter turn is 90°, a half turn is 180° and a three-quarter turn is 270°.', 'Clockwise goes north → east → south → west. Anticlockwise goes the other way.'],
          solution: `${cap(t.text.replace(/^a /, ''))} is ${Math.abs(t.q)} quarter turn${Math.abs(t.q) === 1 ? '' : 's'} ${t.q === 2 ? '(either way)' : t.q > 0 ? 'clockwise' : 'anticlockwise'}. Starting at ${from}: ${Array.from({ length: Math.abs(t.q) }, (_, i) => turnDir(from, Math.sign(t.q) * (i + 1))).join(' → ')}. ${who} is now facing **${to}**.`,
        },
        DIR_ORDER,
      );
    }
    // difficulty 3: which turn takes you from one direction to another, or two turns in a row.
    if (rng.chance(0.5)) {
      const from = rng.pick(DIRS);
      const q = rng.pick([1, -1, 2]);
      const to = turnDir(from, q);
      const opts = {
        1: 'A quarter turn (90°) clockwise',
        [-1]: 'A quarter turn (90°) anticlockwise',
        2: 'A half turn (180°)',
        4: 'A full turn (360°)',
      } as Record<number, string>;
      const wrong = [1, -1, 2, 4].filter((x) => x !== q).map((x) => [opts[x]!, x === 4 ? 'A full turn brings you back to where you started.' : `That would leave ${who} facing ${turnDir(from, x)}.`] as [string, string]);
      return mcq(rng, opts[q]!, wrong, {
        prompt: `${who} is facing **${from}** and wants to face **${to}**. Which turn should ${who} make?`,
        calculator: 'not-allowed',
        hints: ['Clockwise goes north → east → south → west.', 'Try each turn in your head and see where you end up.'],
        solution: `From ${from}, ${opts[q]!.toLowerCase()} leaves ${who} facing ${to}.${q === 1 ? ` (A three-quarter turn anticlockwise would also work, but it is not one of the choices.)` : q === -1 ? ` (A three-quarter turn clockwise would also work, but it is not one of the choices.)` : ''}`,
      });
    }
    const from = rng.pick(DIRS);
    const [t1, t2] = rng.sample(TURNS, 2) as [(typeof TURNS)[number], (typeof TURNS)[number]];
    const mid = turnDir(from, t1.q);
    const to = turnDir(mid, t2.q);
    const wrong = DIRS.filter((x) => x !== to).map((x) => [cap(x), x === mid ? 'That is where the first turn leaves you. Now do the second turn.' : 'Do one turn at a time. Clockwise goes north → east → south → west.'] as [string, string]);
    return mcq(
      rng,
      cap(to),
      wrong,
      {
        prompt: `${who} starts facing **${from}**. First ${who} makes ${t1.text}. Then ${who} makes ${t2.text}. Which direction is ${who} facing now?`,
        calculator: 'not-allowed',
        hints: ['Do one turn at a time and write down the direction after each one.', 'A quarter turn is 90°. Clockwise goes north → east → south → west.'],
        solution: `After the first turn (${t1.text}), ${who} faces ${mid}. After the second turn (${t2.text}), ${who} faces **${to}**.`,
      },
      DIR_ORDER,
    );
  },
};

// ---------------------------------------------------------------- map scales

const PLACE_PAIRS = [
  ['the school', 'the pool'],
  ['the campsite', 'the waterfall'],
  ['the marae', 'the beach'],
  ['the bus stop', 'the library'],
  ['the car park', 'the lookout'],
  ['the wharf', 'the lighthouse'],
  ['the farm gate', 'the woolshed'],
  ['the dairy', 'the skate park'],
] as const;

export const mapScale: QuestionTemplate = {
  id: 'm6.geo.maps.scale',
  topicId: 'm6.geo.maps',
  title: 'Use a map scale to find real distances',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const [a, b] = rng.pick(PLACE_PAIRS);
    const who = rng.pick(NAMES);
    if (difficulty === 2) {
      const s = rng.pick([10, 20, 25, 50, 100, 200]);
      const d = rng.int(2, 9);
      return {
        type: 'numeric',
        prompt: `On ${who}'s map, 1 cm stands for ${s} m in real life. On the map, ${a} is ${d} cm from ${b}. How far apart are they in real life, in metres?`,
        answer: d * s,
        form: 'integer',
        units: 'm',
        calculator: 'not-allowed',
        hints: [`Every 1 cm on the map is ${s} m on the ground.`, `So ${d} cm on the map is ${d} lots of ${s} m.`],
        solution: `$${d} \\times ${s} = ${d * s}$, so they are **${d * s} m** apart.`,
      };
    }
    if (difficulty === 3) {
      const opt = rng.pick([
        { s: 500, d: rng.int(2, 9), text: '500 m' },
        { s: 250, d: rng.pick([2, 4, 6, 8, 10, 12]), text: '250 m' },
        { s: 1000, d: rng.int(3, 12), text: '1 km' },
        { s: 2000, d: rng.int(3, 9), text: '2 km' },
        { s: 5000, d: rng.int(2, 8), text: '5 km' },
      ]);
      const metres = opt.s * opt.d;
      const km = clean(metres / 1000);
      return {
        type: 'numeric',
        prompt: `The scale on a walking-track map is **1 cm = ${opt.text}**. On the map, the track from ${a} to ${b} is ${opt.d} cm long. How long is the real track, in kilometres?`,
        answer: km,
        form: 'any',
        units: 'km',
        calculator: 'not-allowed',
        hints: [`Multiply the map distance by ${opt.text}.`, 'There are 1000 metres in 1 kilometre.'],
        solution:
          opt.s < 1000
            ? `$${opt.d} \\times ${opt.s} = ${metres}$ m.\n\n$${metres} \\text{ m} = ${tex(km)}$ km (divide by 1000), so the track is **${km} km** long.`
            : `$${opt.d} \\times ${opt.s / 1000} = ${km}$, so the track is **${km} km** long.`,
      };
    }
    // difficulty 4: work backwards to the map distance, or add up a route with several parts.
    if (rng.chance(0.5)) {
      const opt = rng.pick([
        { s: 50, unit: 'm' },
        { s: 100, unit: 'm' },
        { s: 200, unit: 'm' },
        { s: 250, unit: 'm' },
        { s: 500, unit: 'm' },
      ]);
      const d = rng.int(3, 12);
      const real = d * opt.s;
      const realText = real >= 1000 && real % 100 === 0 ? `${clean(real / 1000)} km` : `${real} m`;
      return {
        type: 'numeric',
        prompt: `${who} is drawing a map with the scale **1 cm = ${opt.s} m**. In real life, ${a} is ${realText} from ${b}. How long should the line between them be on the map, in centimetres?`,
        answer: d,
        form: 'integer',
        units: 'cm',
        calculator: 'not-allowed',
        hints: [realText.endsWith('km') ? 'Change the distance to metres first (1 km = 1000 m).' : `How many lots of ${opt.s} m are in ${realText}?`, `Divide the real distance in metres by ${opt.s}.`],
        solution: `${realText.endsWith('km') ? `${realText} = ${real} m. ` : ''}$${real} \\div ${opt.s} = ${d}$, so the line should be **${d} cm** long.`,
      };
    }
    const s = rng.pick([100, 200, 250, 500]);
    const legs = Array.from({ length: 3 }, () => rng.pick([1, 1.5, 2, 2.5, 3, 4, 5]));
    const total = clean(legs.reduce((t, x) => t + x, 0));
    const metres = clean(total * s);
    const km = clean(metres / 1000);
    return {
      type: 'numeric',
      prompt: `On a map with the scale **1 cm = ${s} m**, ${who}'s bike ride has three parts. They measure ${legs.map((x) => `${x} cm`).join(', ').replace(/, ([^,]*)$/, ' and $1')} on the map. How far does ${who} ride altogether, in kilometres?`,
      answer: km,
      form: 'any',
      units: 'km',
      marks: 2,
      calculator: 'not-allowed',
      hints: ['Add the three map distances first.', `Then multiply by ${s} to get metres, and divide by 1000 to get kilometres.`],
      solution: `Map distance: $${legs.map((x) => tex(x)).join(' + ')} = ${tex(total)}$ cm.\n\nReal distance: $${tex(total)} \\times ${s} = ${tex(metres)}$ m $= ${tex(km)}$ km.\n\n${who} rides **${km} km**.`,
    };
  },
};

// ---------------------------------------------------------------- pathways

interface Leg {
  k: number;
  /** Quarter turns clockwise made before this leg (0 for the first leg). */
  turn: number;
}

function walk(start: Square, facing: Dir, legs: readonly Leg[]): { end: Square; facings: Dir[] } {
  let at = start;
  let f = facing;
  const facings: Dir[] = [];
  for (const l of legs) {
    f = turnDir(f, l.turn);
    facings.push(f);
    at = move(at, f, l.k);
  }
  return { end: at, facings };
}

const turnWords = (q: number) => (q === 1 ? 'turns 90° clockwise' : q === -1 ? 'turns 90° anticlockwise' : 'turns 180°');

export const pathways: QuestionTemplate = {
  id: 'm6.geo.maps.pathways',
  topicId: 'm6.geo.maps',
  title: 'Follow and describe pathways on a grid map',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    const map = rng.pick(MAPS);
    const who = rng.pick(NAMES);
    const cols = 7;
    const rows = 6;
    for (;;) {
      const start: Square = [rng.int(0, cols - 1), rng.int(0, rows - 1)];
      const names = rng.sample(map.places, 6);
      if (difficulty === 3) {
        const [d1, d2] = rng.pick([
          ['east', 'north'],
          ['east', 'south'],
          ['west', 'north'],
          ['west', 'south'],
          ['north', 'east'],
          ['south', 'west'],
        ] as const);
        const k1 = rng.int(1, 4);
        const k2 = rng.int(1, 4);
        const end = move(move(start, d1, k1), d2, k2);
        if (!inMap(end, cols, rows) || !inMap(move(start, d1, k1), cols, rows)) continue;
        const startPlace: Place = { name: names[0]!, at: start };
        const places = [startPlace, ...scatter(rng, names.slice(1, 4), cols, rows, [start, end])];
        return {
          type: 'text',
          prompt: `${who} starts at the **${names[0]}** (${ref(start)}). ${who} goes ${squares(k1)} ${d1}, then ${squares(k2)} ${d2}. What is the grid reference of the square where ${who} finishes? (Write it like B4.)`,
          figure: { svg: drawMap(cols, rows, places, { start }), alt: `Grid map, rows A to F and columns 1 to 7, with north at the top. The ${names[0]} is in ${ref(start)}.` },
          accepted: [ref(end), `${ROWS[end[1]]} ${end[0] + 1}`],
          calculator: 'not-allowed',
          hints: [COMPASS_HINT, 'Move one square at a time with your finger. Then read the row letter and the column number.'],
          solution: `From ${ref(start)}, going ${squares(k1)} ${d1} reaches ${ref(move(start, d1, k1))}. Then ${squares(k2)} ${d2} reaches **${ref(end)}**.`,
        };
      }
      const facing = rng.pick(DIRS);
      const scale = difficulty === 5 ? rng.pick([20, 50, 100]) : 0;
      const legs: Leg[] =
        difficulty === 4
          ? [{ k: rng.int(1, 4), turn: 0 }, { k: rng.int(1, 4), turn: rng.pick([1, -1]) }]
          : [{ k: rng.int(1, 3), turn: 0 }, { k: rng.int(1, 3), turn: rng.pick([1, -1]) }, { k: rng.int(1, 3), turn: rng.pick([1, -1]) }];
      if (legs[0]!.k === legs[1]!.k) continue;
      const path = walk(start, facing, legs);
      // Mistakes: a turn the wrong way, the distances swapped, or the last leg left out.
      const alts: Array<[Square, string]> = [
        [walk(start, facing, legs.map((l, i) => (i === 1 ? { ...l, turn: -l.turn } : l))).end, 'This is where you end up if the first turn goes the wrong way. Clockwise is the way clock hands move.'],
        [walk(start, facing, [{ ...legs[0]!, k: legs[1]!.k }, { ...legs[1]!, k: legs[0]!.k }, ...legs.slice(2)]).end, 'This is where you end up if the two distances are swapped.'],
        legs.length === 3
          ? [walk(start, facing, legs.map((l, i) => (i === 2 ? { ...l, turn: -l.turn } : l))).end, 'This is where you end up if the second turn goes the wrong way.']
          : [walk(start, turnDir(facing, 2), legs).end, `This is where you end up if you start facing ${turnDir(facing, 2)} instead of ${facing}.`],
      ];
      const ends = [path.end, ...alts.map(([sq]) => sq)];
      const visited: Square[] = [];
      {
        let at = start;
        legs.forEach((l, i) => {
          for (let j = 0; j < l.k; j++) {
            at = move(at, path.facings[i]!, 1);
            visited.push(at);
          }
        });
      }
      if (!ends.every((e) => inMap(e, cols, rows)) || !visited.every((v) => inMap(v, cols, rows))) continue;
      if (ends.some((e) => sameSq(e, start))) continue;
      if (ends.some((e, i) => ends.some((f, j) => j > i && sameSq(e, f)))) continue;
      const placed: Place[] = [{ name: names[0]!, at: start }, ...ends.map((at, i) => ({ name: names[i + 1]!, at }))];
      const places = [...placed, ...scatter(rng, names.slice(5), cols, rows, placed.map((p) => p.at))];
      const dist = (k: number) => (scale ? `${k * scale} m` : squares(k));
      const parts = legs.map((l, i) => (i === 0 ? `walks ${dist(l.k)} forward` : `${turnWords(l.turn)} and walks ${dist(l.k)}`));
      const steps = parts.length === 2 ? `${parts[0]}, then ${parts[1]}` : `${parts[0]}, ${parts[1]}, then ${parts[2]}`;
      const prompt = `${scale ? `Each square on the map is ${scale} m wide. ` : ''}${who} starts in the middle of the square with the **${names[0]}**, facing **${facing}**. ${who} ${steps}.\n\nWhere does ${who} finish?`;
      const wrong = alts.map(([sq, why], i) => [names[i + 2]!, why] as [string, string]);
      const working = legs
        .map((l, i) => `${i === 0 ? `Facing ${facing}` : `${cap(turnWords(l.turn))}: now facing ${path.facings[i]}`}, ${scale ? `${l.k * scale} m is ${squares(l.k)}, so ` : ''}go ${squares(l.k)} ${path.facings[i]}.`)
        .join('\n\n');
      return mcq(rng, names[1]!, wrong, {
        prompt,
        figure: { svg: drawMap(cols, rows, places, { start }), alt: `Grid map, rows A to F and columns 1 to 7, with north at the top. Places marked: ${places.map((x) => x.name).join(', ')}.` },
        marks: difficulty === 5 ? 2 : 1,
        calculator: 'not-allowed',
        hints: [scale ? `Change each distance into squares first: ${scale} m is 1 square.` : 'Move one square at a time with your finger.', 'After each turn, work out the new direction before you move. Clockwise goes north → east → south → west.'],
        solution: `${working}\n\n${who} finishes at the **${names[1]}** (${ref(path.end)}).`,
      });
    }
  },
};

export const templates: QuestionTemplate[] = [gridReferences, directions, mapScale, pathways];
