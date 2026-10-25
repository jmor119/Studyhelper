import type { QuestionTemplate, TemplateOutput } from '../../types';
import type { Rng } from '../../../rng';
import { clean, NAMES, num, round, tex } from '../../format';
import { dot, label, svgDoc } from '../../svg';
import { graphAxes, polyline } from './figures';

// m9.mea.speed — speed = distance ÷ time, rearranged to find distance or time, plus
// position–time graphs (the gradient is the speed). Answers are chosen first.

interface Mover {
  who: string;
  unitD: 'km' | 'm';
  unitT: 'h' | 's';
  speeds: number[];
  times: number[];
}

function mover(rng: Rng): Mover {
  const name = rng.pick(NAMES);
  return rng.pick<Mover>([
    { who: `${name}'s family car`, unitD: 'km', unitT: 'h', speeds: [50, 60, 70, 80, 90], times: [2, 3, 4] },
    { who: 'A train', unitD: 'km', unitT: 'h', speeds: [60, 70, 80, 90, 120], times: [2, 3, 4] },
    { who: 'A cyclist', unitD: 'km', unitT: 'h', speeds: [12, 15, 18, 20, 24], times: [2, 3, 4] },
    { who: 'A runner', unitD: 'm', unitT: 's', speeds: [3, 4, 5, 6, 7], times: [20, 30, 40, 50, 60] },
    { who: 'A remote-control car', unitD: 'm', unitT: 's', speeds: [2, 3, 4, 5, 6, 8], times: [5, 8, 10, 12, 15] },
  ]);
}

const speedUnit = (m: Mover) => (m.unitT === 'h' ? 'km/h' : 'm/s');
const timeWord = (m: Mover, t: number) => (m.unitT === 'h' ? `${num(t)} hour${t === 1 ? '' : 's'}` : `${num(t)} seconds`);

export const speedDistanceTime: QuestionTemplate = {
  id: 'm9.mea.speed.calculate',
  topicId: 'm9.mea.speed',
  title: 'Speed, distance and time calculations',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const m = mover(rng);
    const v = rng.pick(m.speeds);
    const t = rng.pick(m.times);
    const d = v * t;
    const su = speedUnit(m);
    if (difficulty === 1) {
      return {
        type: 'numeric',
        prompt: `${m.who} travels ${num(d)} ${m.unitD} in ${timeWord(m, t)}. What is its average speed, in ${su}?`,
        answer: v,
        units: su,
        calculator: 'allowed',
        hints: ['Speed = distance ÷ time.'],
        solution: `Speed $= \\dfrac{\\text{distance}}{\\text{time}} = \\dfrac{${tex(d)}}{${t}} = ${v}$ ${su}.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `${m.who} travels at an average speed of ${v} ${su} for ${timeWord(m, t)}. How far does it go?`,
          answer: d,
          units: m.unitD,
          calculator: 'allowed',
          hints: ['Distance = speed × time.', `Every ${m.unitT === 'h' ? 'hour' : 'second'} it covers ${v} ${m.unitD}.`],
          solution: `Distance $= \\text{speed} \\times \\text{time} = ${v} \\times ${t} = ${tex(d)}$ ${m.unitD}.`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${m.who} travels ${num(d)} ${m.unitD} at an average speed of ${v} ${su}. How long does this take, in ${m.unitT === 'h' ? 'hours' : 'seconds'}?`,
        answer: t,
        units: m.unitT,
        calculator: 'allowed',
        hints: ['Time = distance ÷ speed.', `How many lots of ${v} ${m.unitD} make ${num(d)} ${m.unitD}?`],
        solution: `Time $= \\dfrac{\\text{distance}}{\\text{speed}} = \\dfrac{${tex(d)}}{${v}} = ${t}$ ${m.unitT}.`,
      };
    }
    // difficulty 3: times given or wanted in minutes.
    const name = rng.pick(NAMES);
    const kind = rng.pick(['speed', 'distance', 'time'] as const);
    const vk = rng.pick([12, 15, 20, 24, 30, 36, 40, 45, 48, 60, 72, 80, 90]);
    // Minutes that give a whole number of km at this speed.
    const mins = rng.pick([10, 15, 20, 30, 40, 45, 50, 75, 90].filter((mm) => Number.isInteger((vk * mm) / 60)));
    const dk = (vk * mins) / 60;
    const what = vk <= 24 ? 'cycles' : 'drives';
    const hrs = clean(mins / 60);
    const hrsTex = Number.isInteger(round(hrs * 100, 6)) ? tex(hrs) : `\\frac{${mins}}{60}`;
    if (kind === 'speed') {
      return {
        type: 'numeric',
        prompt: `${name} ${what} ${dk} km in ${mins} minutes. What is ${name}'s average speed in km/h?`,
        answer: vk,
        units: 'km/h',
        calculator: 'allowed',
        hints: ['Change the time into hours first: divide the minutes by 60.', 'Then speed = distance ÷ time.'],
        solution: [
          `${mins} min $= ${mins} \\div 60 = ${hrsTex}$ h.`,
          `Speed $= ${dk} \\div ${hrsTex} = ${vk}$ km/h.`,
          `(Or: in 60 minutes ${name} would go $\\frac{60}{${mins}}$ times as far: $${dk} \\times \\frac{60}{${mins}} = ${vk}$ km.)`,
        ].join('\n\n'),
      };
    }
    if (kind === 'distance') {
      return {
        type: 'numeric',
        prompt: `${name} ${what} at an average speed of ${vk} km/h for ${mins} minutes. How far does ${name} travel, in km?`,
        answer: dk,
        units: 'km',
        calculator: 'allowed',
        hints: ['Change the minutes into hours: divide by 60.', 'Then distance = speed × time.'],
        solution: `${mins} min $= ${hrsTex}$ h.\n\nDistance $= ${vk} \\times ${hrsTex} = ${dk}$ km.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `${name} ${what} ${dk} km at an average speed of ${vk} km/h. How many **minutes** does the trip take?`,
      answer: mins,
      units: 'min',
      calculator: 'allowed',
      hints: ['Time = distance ÷ speed gives the time in hours.', 'Multiply hours by 60 to get minutes.'],
      solution: `Time $= ${dk} \\div ${vk} = ${hrsTex}$ h.\n\nIn minutes: $${hrsTex} \\times 60 = ${mins}$ min.`,
    };
  },
};

export const averageSpeed: QuestionTemplate = {
  id: 'm9.mea.speed.multi-step',
  topicId: 'm9.mea.speed',
  title: 'Average speed over a journey, and m/s ↔ km/h',
  difficulties: [4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const name = rng.pick(NAMES);
    if (difficulty === 4) {
      if (rng.chance(0.5)) {
        // Two legs, each given as a distance and a time.
        let v1: number;
        let t1: number;
        let v2: number;
        let t2: number;
        let D: number;
        let T: number;
        do {
          v1 = rng.pick([50, 60, 70, 80, 90]);
          t1 = rng.pick([1, 1.5, 2, 2.5]);
          v2 = rng.pick([40, 50, 60, 70, 80, 90].filter((x) => x !== v1));
          t2 = rng.pick([0.5, 1, 1.5, 2]);
          D = v1 * t1 + v2 * t2;
          T = t1 + t2;
        } while (!Number.isInteger(D / T));
        const avg = D / T;
        const d1 = v1 * t1;
        const d2 = v2 * t2;
        return {
          type: 'numeric',
          prompt: `${name}'s family drives ${num(d1)} km in ${num(t1)} h, stops for lunch, then drives another ${num(d2)} km in ${num(t2)} h. Not counting the lunch stop, what is the average speed for the whole drive, in km/h?`,
          answer: avg,
          units: 'km/h',
          calculator: 'allowed',
          hints: ['Average speed = total distance ÷ total time.', 'Add the two distances, and add the two times.'],
          solution: [
            `Total distance: $${tex(d1)} + ${tex(d2)} = ${tex(D)}$ km.`,
            `Total driving time: $${tex(t1)} + ${tex(t2)} = ${tex(T)}$ h.`,
            `Average speed $= ${tex(D)} \\div ${tex(T)} = ${tex(avg)}$ km/h.`,
          ].join('\n\n'),
        };
      }
      // Race time → m/s → km/h.
      const [event, dist, speeds] = rng.pick([
        ['100 m race', 100, [5, 6.25, 8]],
        ['200 m race', 200, [5, 6.25, 8]],
        ['400 m race', 400, [4, 5, 6.25, 8]],
        ['50 m swim', 50, [1.25, 2, 2.5]],
        ['1500 m race', 1500, [4, 5, 6, 6.25]],
      ] as const);
      const ms = rng.pick(speeds);
      const time = dist / ms;
      const kmh = clean(ms * 3.6);
      return {
        type: 'numeric',
        prompt: `${name} finishes a ${event} in ${num(time)} seconds. What is ${name}'s average speed in **km/h**?`,
        answer: kmh,
        units: 'km/h',
        calculator: 'allowed',
        hints: ['First find the speed in m/s: distance ÷ time.', 'Then change m/s to km/h by multiplying by 3.6.'],
        solution: [
          `Speed $= ${tex(dist)} \\div ${tex(time)} = ${tex(ms)}$ m/s.`,
          `In km/h: $${tex(ms)} \\times 3.6 = ${tex(kmh)}$ km/h.`,
          '(× 3.6 because there are 3600 seconds in an hour and 1000 m in a km: $\\times 3600 \\div 1000 = \\times 3.6$.)',
        ].join('\n\n'),
      };
    }
    // difficulty 5: average speed when each leg is given as a distance and a speed.
    const PAIRS: Array<[number, number, number]> = [
      // [distance of each leg, speed 1, speed 2] chosen so the times are tidy.
      [60, 40, 60],
      [60, 30, 60],
      [120, 40, 60],
      [120, 60, 80],
      [90, 30, 45],
      [120, 30, 40],
      [180, 60, 90],
      [240, 80, 120],
      [30, 10, 15],
      [24, 8, 12],
      [36, 12, 18],
      [40, 10, 20],
    ];
    const [legD, s1, s2] = rng.pick(PAIRS);
    const [va, vb] = rng.chance(0.5) ? [s2, s1] : [s1, s2];
    const ta = legD / va;
    const tb = legD / vb;
    const total = 2 * legD;
    const T = ta + tb;
    const avg = clean(total / T);
    const tidy = Number.isInteger(round(avg * 10, 6));
    const ctx = legD <= 40 ? rng.pick(['cycles', 'rides an e-scooter']) : 'drives';
    const naive = (va + vb) / 2;
    return {
      type: 'numeric',
      prompt: `${name} ${ctx} ${legD} km to a friend's place at an average speed of ${va} km/h, and then ${legD} km home again at an average speed of ${vb} km/h. What is the average speed for the whole trip?${tidy ? '' : ' Give your answer to 1 decimal place.'}`,
      answer: tidy ? avg : round(avg, 1),
      ...(tidy ? {} : { decimals: 1 }),
      units: 'km/h',
      calculator: 'allowed',
      hints: [
        `It is **not** just the average of ${va} and ${vb}. The slower leg takes longer, so it counts for more.`,
        'Find the time for each leg (time = distance ÷ speed), then use total distance ÷ total time.',
      ],
      solution: [
        `Time there: $${legD} \\div ${va} = ${tex(clean(ta))}$ h. Time back: $${legD} \\div ${vb} = ${tex(clean(tb))}$ h.`,
        `Total distance: $2 \\times ${legD} = ${total}$ km. Total time: $${tex(clean(ta))} + ${tex(clean(tb))} = ${tex(clean(T))}$ h.`,
        `Average speed $= ${total} \\div ${tex(clean(T))} ${tidy ? '=' : '\\approx'} ${tidy ? tex(avg) : tex(round(avg, 1), 1)}$ km/h.`,
        `(Averaging the two speeds would give ${num(naive)} km/h. That is wrong because more time is spent at the slower speed.)`,
      ].join('\n\n'),
    };
  },
};

// ---------------------------------------------------------------- position–time graphs

type P = { t: number; d: number };

interface GraphSpec {
  unitT: 'h' | 's';
  unitD: 'km' | 'm';
  xMax: number;
  yMax: number;
  yStep: number;
}

function graphSvg(g0: GraphSpec, series: Array<{ pts: P[]; colour?: string; name?: string }>, segLabels = false) {
  const lines = g0.yMax / g0.yStep;
  const g = graphAxes({
    xMax: g0.xMax,
    yMax: g0.yMax,
    xStep: 1,
    yStep: g0.yStep,
    yLabelEvery: lines > 10 ? 2 : 1,
    xLabel: `Time (${g0.unitT})`,
    yLabel: `Distance from start (${g0.unitD})`,
  });
  let body = g.body;
  for (const s of series) {
    const px = s.pts.map((p) => g.toPx({ x: p.t, y: p.d }));
    body += polyline(px, s.colour ? { stroke: s.colour } : {});
    for (const p of px) body += dot(p, 3, s.colour ?? '#2563eb');
    if (s.name) {
      const last = px[px.length - 1]!;
      body += label({ x: last.x + 6, y: last.y - 12 }, s.name, { anchor: 'end', fill: s.colour ?? '#2563eb', bold: true, size: 13 });
    }
    if (segLabels) {
      const letters = ['A', 'B', 'C', 'D'];
      for (let i = 0; i + 1 < px.length; i++) {
        const a = px[i]!;
        const b = px[i + 1]!;
        body += label({ x: (a.x + b.x) / 2 - 9, y: (a.y + b.y) / 2 - 12 }, letters[i]!, { bold: true, fill: '#111827' });
      }
    }
  }
  return svgDoc(g.width, g.height, body);
}

const gradient = (a: P, b: P) => (b.d - a.d) / (b.t - a.t);

export const distanceTimeGraphs: QuestionTemplate = {
  id: 'm9.mea.speed.graphs',
  topicId: 'm9.mea.speed',
  title: 'Position–time (distance–time) graphs: the gradient is the speed',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }): TemplateOutput {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      // One straight line from the origin, ending on grid lines.
      const metric = rng.chance(0.5);
      let v: number;
      let tEnd: number;
      let yStep: number;
      do {
        if (metric) {
          v = rng.pick([2, 3, 4, 5, 6, 8]);
          tEnd = rng.pick([4, 5, 6, 8, 10]);
          yStep = 5;
        } else {
          v = rng.pick([10, 15, 20, 25, 30, 50, 60, 80]);
          tEnd = rng.pick([2, 3, 4]);
          yStep = 10;
        }
      } while ((v * tEnd) % yStep !== 0);
      const dEnd = v * tEnd;
      const yMax = Math.ceil((dEnd + 1) / yStep) * yStep;
      const spec: GraphSpec = metric ? { unitT: 's', unitD: 'm', xMax: tEnd + 1, yMax, yStep } : { unitT: 'h', unitD: 'km', xMax: tEnd + 1, yMax, yStep };
      const su = metric ? 'm/s' : 'km/h';
      const verb = metric ? (v <= 3 ? 'walks' : 'runs') : v <= 30 ? 'cycles' : 'drives';
      return {
        type: 'numeric',
        prompt: `The graph shows ${name}'s journey. ${name} ${verb} at a steady speed. What is the speed, in ${su}?`,
        figure: {
          svg: graphSvg(spec, [{ pts: [{ t: 0, d: 0 }, { t: tEnd, d: dEnd }] }]),
          alt: `A distance–time graph with a straight line from (0, 0) to (${tEnd} ${spec.unitT}, ${dEnd} ${spec.unitD}).`,
        },
        answer: v,
        units: su,
        calculator: 'allowed',
        hints: ['Speed is the gradient (steepness) of the line: distance ÷ time.', 'Read off a point where the line crosses grid lines exactly, such as the end of the line.'],
        solution: `The line goes from $(0, 0)$ to $(${tEnd}, ${dEnd})$.\n\nSpeed $= \\dfrac{\\text{rise}}{\\text{run}} = \\dfrac{${dEnd}}{${tEnd}} = ${v}$ ${su}.`,
      };
    }

    if (difficulty === 4 && rng.chance(0.4)) {
      // Two riders from the same place at the same time.
      const vX = rng.pick([10, 15, 20, 25, 30]);
      const vY = rng.pick([10, 15, 20, 25, 30].filter((x) => Math.abs(x - vX) >= 10));
      const T = rng.pick([2, 4]);
      const other = rng.pick(NAMES.filter((n) => n !== name));
      const top = Math.max(vX, vY) * T;
      const spec: GraphSpec = { unitT: 'h', unitD: 'km', xMax: T + 1, yMax: Math.ceil((top + 5) / 10) * 10, yStep: 10 };
      return {
        type: 'numeric',
        prompt: `The graph shows ${name} and ${other} cycling from the same place at the same time. How much faster, in km/h, is the faster rider?`,
        figure: {
          svg: graphSvg(spec, [
            { pts: [{ t: 0, d: 0 }, { t: T, d: vX * T }], colour: '#2563eb', name },
            { pts: [{ t: 0, d: 0 }, { t: T, d: vY * T }], colour: '#dc2626', name: other },
          ]),
          alt: `Two straight lines from the origin on a distance–time graph: ${name} reaches ${vX * T} km after ${T} h, and ${other} reaches ${vY * T} km after ${T} h.`,
        },
        answer: Math.abs(vY - vX),
        units: 'km/h',
        calculator: 'allowed',
        hints: ['The steeper line belongs to the faster rider.', 'Find each speed (distance ÷ time), then subtract.'],
        solution: `${name}: $${vX * T} \\div ${T} = ${vX}$ km/h. ${other}: $${vY * T} \\div ${T} = ${vY}$ km/h.\n\nDifference: $${Math.max(vX, vY)} - ${Math.min(vX, vY)} = ${Math.abs(vY - vX)}$ km/h.`,
      };
    }

    // A three-part bike ride (h, km): ride, stop, then ride on or come back.
    const t1 = rng.pick([1, 2]);
    const v1 = rng.pick([10, 20, 30]);
    const t2 = rng.pick([1, 2]);
    const d1 = v1 * t1;
    const back = difficulty >= 4 && rng.chance(0.6);
    let t3: number;
    let d3: number;
    if (back) {
      const opts = [1, 2, 3, 4].filter((x) => (d1 / x) % 10 === 0 && d1 / x !== v1);
      t3 = opts.length ? rng.pick(opts) : t1;
      d3 = 0;
    } else {
      t3 = rng.pick([1, 2]);
      d3 = d1 + rng.pick([10, 20, 30].filter((x) => x !== v1)) * t3;
    }
    const pts: P[] = [
      { t: 0, d: 0 },
      { t: t1, d: d1 },
      { t: t1 + t2, d: d1 },
      { t: t1 + t2 + t3, d: d3 },
    ];
    const maxD = Math.max(d1, d3);
    const spec: GraphSpec = { unitT: 'h', unitD: 'km', xMax: t1 + t2 + t3 + 1, yMax: Math.ceil((maxD + 5) / 10) * 10, yStep: 10 };
    const svg = graphSvg(spec, [{ pts }], true);
    const alt = `A distance–time graph in three sections: A from (0, 0) to (${t1} h, ${d1} km); B flat from (${t1}, ${d1}) to (${t1 + t2}, ${d1}); C from (${t1 + t2}, ${d1}) to (${t1 + t2 + t3}, ${d3}).`;
    const vA = gradient(pts[0]!, pts[1]!);
    const vC = Math.abs(gradient(pts[2]!, pts[3]!));
    const ctx = `The graph shows ${name}'s bike ride in three sections, A, B and C.`;

    if (difficulty === 3) {
      if (rng.chance(0.35)) {
        return {
          type: 'mcq',
          prompt: `${ctx} What is happening during section B?`,
          figure: { svg, alt },
          options: [
            { id: 'stop', text: `${name} has stopped` },
            { id: 'slow', text: `${name} is riding slowly` },
            { id: 'steady', text: `${name} is riding at a steady speed` },
            { id: 'back', text: `${name} is riding back towards the start` },
          ],
          correct: 'stop',
          feedback: {
            slow: 'The distance from the start does not change at all in section B, so there is no movement.',
            steady: 'A flat line means the distance stays the same, so the speed is zero.',
            back: 'Riding back would make the line slope down towards the time axis.',
          },
          calculator: 'not-allowed',
          hints: ['Look at the distance from the start during section B. Does it change?'],
          solution: `Section B is **flat (horizontal)**: the distance stays at ${d1} km for ${t2} h. ${name} has stopped, so the speed is 0 km/h.`,
        };
      }
      const which = rng.chance(0.5) ? 'A' : 'C';
      const [p, q] = which === 'A' ? [pts[0]!, pts[1]!] : [pts[2]!, pts[3]!];
      const v = which === 'A' ? vA : vC;
      return {
        type: 'numeric',
        prompt: `${ctx} What was ${name}'s speed during section ${which}, in km/h?`,
        figure: { svg, alt },
        answer: v,
        units: 'km/h',
        calculator: 'allowed',
        hints: ['Speed is the gradient of the section: change in distance ÷ change in time.', `Read the start and end points of section ${which}.`],
        solution: `Section ${which} goes from $(${p.t}, ${p.d})$ to $(${q.t}, ${q.d})$.\n\nSpeed $= \\dfrac{${q.d} - ${p.d}}{${q.t} - ${p.t}} = \\dfrac{${q.d - p.d}}{${q.t - p.t}} = ${v}$ km/h.`,
      };
    }

    if (difficulty === 4) {
      if (back) {
        return {
          type: 'numeric',
          prompt: `${ctx} In section C, ${name} rides back to the start. What was ${name}'s speed in section C, in km/h?`,
          figure: { svg, alt },
          answer: vC,
          units: 'km/h',
          calculator: 'allowed',
          hints: ['The line slopes down because the distance from the start is getting smaller.', 'Speed is distance travelled ÷ time taken. It is never negative.'],
          solution: `In section C the distance from the start goes from ${d1} km down to 0 km in ${t3} h.\n\nSpeed $= ${d1} \\div ${t3} = ${vC}$ km/h. (The gradient is $-${vC}$. The minus sign only shows the direction: back towards the start.)`,
        };
      }
      const fastest = vA > vC ? 'A' : 'C';
      return {
        type: 'mcq',
        prompt: `${ctx} In which section was ${name} riding fastest?`,
        figure: { svg, alt },
        options: [
          { id: 'A', text: 'Section A' },
          { id: 'B', text: 'Section B' },
          { id: 'C', text: 'Section C' },
        ],
        correct: fastest,
        shuffle: false,
        feedback: {
          B: 'Section B is flat: the distance does not change, so the speed is zero.',
          [fastest === 'A' ? 'C' : 'A']: 'Compare the steepness (gradient) of each section, not how long it lasts or how high it is.',
        },
        calculator: 'allowed',
        hints: ['The steeper the line, the faster the speed.', 'Work out the gradient (distance ÷ time) of A and of C.'],
        solution: `Section A: $${d1} \\div ${t1} = ${vA}$ km/h. Section B: stopped (0 km/h). Section C: $${d3 - d1} \\div ${t3} = ${vC}$ km/h.\n\nSo ${name} was fastest in **section ${fastest}**.`,
      };
    }

    // difficulty 5: average speed over the whole ride, including the stop.
    const totalDist = back ? 2 * d1 : d3;
    const totalTime = t1 + t2 + t3;
    const avg = clean(totalDist / totalTime);
    const tidy = Number.isInteger(round(avg * 10, 6));
    return {
      type: 'numeric',
      prompt: `${ctx} What was ${name}'s average speed for the whole ride, including the stop?${tidy ? '' : ' Give your answer to 1 decimal place.'}`,
      figure: { svg, alt },
      answer: tidy ? avg : round(avg, 1),
      ...(tidy ? {} : { decimals: 1 }),
      units: 'km/h',
      calculator: 'allowed',
      hints: [
        'Average speed = total distance travelled ÷ total time taken (including stops).',
        back ? `${name} rides out and then back, so the total distance is more than the final distance from the start.` : 'Read the total distance from the end of the graph.',
      ],
      solution: [
        back
          ? `Total distance: ${d1} km out and ${d1} km back $= ${totalDist}$ km. (The graph ends at 0 km from the start, but ${name} still rode ${totalDist} km.)`
          : `Total distance: ${totalDist} km (the distance from the start at the end of the ride).`,
        `Total time: $${t1} + ${t2} + ${t3} = ${totalTime}$ h.`,
        `Average speed $= ${totalDist} \\div ${totalTime} ${tidy ? '=' : '\\approx'} ${tidy ? tex(avg) : tex(round(avg, 1), 1)}$ km/h.`,
      ].join('\n\n'),
    };
  },
};
