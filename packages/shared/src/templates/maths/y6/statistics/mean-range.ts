import type { QuestionTemplate } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES, PLACES, clean, tex } from '../../../format';
import { barGraph, dotPlot } from './graphs-helpers';

// m6.sta.mean-range — the mean (sum ÷ count) and range (highest − lowest) of small data sets,
// including measured decimal data. Counts stay at 9 or fewer (or 10) so the division is by a
// one-digit number, as in the Year 6 curriculum.

interface ListContext {
  intro: (name: string, n: number, place: string) => string;
  /** What the mean is "of", e.g. "number of goals". */
  of: string;
  units: string;
  /** Number in prose with its unit, e.g. "12 cm", "\$4". */
  show: (v: string) => string;
  /** Range of values, in units of 10^-dp. */
  lo: number;
  hi: number;
  dp: number;
}

const plain = (v: string) => v;
const withUnit = (u: string) => (v: string) => `${v} ${u}`;

const WHOLE: readonly ListContext[] = [
  { intro: (p) => `${p}'s netball team scored these goals in their last few games:`, of: 'number of goals', units: '', show: plain, lo: 8, hi: 30, dp: 0 },
  { intro: (p, n) => `${p} counted the tūī in the garden each morning for ${n} days:`, of: 'number of tūī', units: '', show: plain, lo: 2, hi: 15, dp: 0 },
  { intro: (p, n) => `${p} measured the heights of ${n} seedlings in centimetres:`, of: 'height', units: 'cm', show: withUnit('cm'), lo: 4, hi: 25, dp: 0 },
  { intro: (_p, n, place) => `The highest temperature in ${place} each day for ${n} days was (in °C):`, of: 'temperature', units: '°C', show: (v) => `${v}°C`, lo: 12, hi: 28, dp: 0 },
  { intro: (p, n) => `${p} asked ${n} friends how many dollars of pocket money they get each week:`, of: 'pocket money', units: '$', show: (v) => `\\$${v}`, lo: 5, hi: 20, dp: 0 },
  { intro: (p) => `${p}'s spelling test scores (out of 20) this term were:`, of: 'score', units: '', show: plain, lo: 8, hi: 20, dp: 0 },
  { intro: (_p, n) => `${n} students counted how many books they read over the holidays:`, of: 'number of books', units: '', show: plain, lo: 0, hi: 12, dp: 0 },
  { intro: (p, n) => `${p} weighed ${n} apples. Their masses in grams were:`, of: 'mass', units: 'g', show: withUnit('g'), lo: 120, hi: 220, dp: 0 },
  { intro: (_p, n, place) => `The rainfall in ${place} each day for ${n} days, in millimetres, was:`, of: 'rainfall', units: 'mm', show: withUnit('mm'), lo: 0, hi: 30, dp: 0 },
  { intro: (p, n) => `${p} timed ${n} friends balancing on one leg, in seconds:`, of: 'time', units: 's', show: withUnit('seconds'), lo: 10, hi: 45, dp: 0 },
];

const DECIMAL: readonly ListContext[] = [
  { intro: (_p, n) => `${n} students ran 100 metres. Their times, in seconds, were:`, of: 'time', units: 's', show: withUnit('s'), lo: 140, hi: 199, dp: 1 },
  { intro: (p, n) => `${p} measured the heights of ${n} students in metres:`, of: 'height', units: 'm', show: withUnit('m'), lo: 130, hi: 165, dp: 2 },
  { intro: (_p, n) => `The long jump results of ${n} students at athletics day, in metres, were:`, of: 'jump', units: 'm', show: withUnit('m'), lo: 180, hi: 320, dp: 2 },
  { intro: (_p, n) => `The masses of ${n} puppies at the vet, in kilograms, were:`, of: 'mass', units: 'kg', show: withUnit('kg'), lo: 25, hi: 90, dp: 1 },
  { intro: (p, n) => `${p} measured the lengths of ${n} snapper caught off the wharf, in centimetres:`, of: 'length', units: 'cm', show: withUnit('cm'), lo: 255, hi: 420, dp: 1 },
];

const fmt = (v: number, dp: number) => (v / 10 ** dp).toFixed(dp);
const val = (v: number, dp: number) => clean(v / 10 ** dp);

/** "4, 7, 9 and 12" */
function listText(vals: readonly string[]): string {
  return vals.length < 2 ? vals.join('') : `${vals.slice(0, -1).join(', ')} and ${vals[vals.length - 1]}`;
}

/** n integers in [lo, hi] (not all equal, at most one repeat). */
function values(rng: Rng, n: number, lo: number, hi: number): number[] {
  for (;;) {
    const v = Array.from({ length: n }, () => rng.int(lo, hi));
    if (new Set(v).size >= n - 1 && new Set(v).size > 1) return v;
  }
}

/** n integers in [lo, hi] whose mean is a whole number of base units. */
function valuesWithWholeMean(rng: Rng, n: number, lo: number, hi: number): number[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const v = values(rng, n, lo, hi);
    const r = v.reduce((s, x) => s + x, 0) % n;
    const last = v[n - 1]! - r;
    if (last >= lo) {
      v[n - 1] = last;
      if (new Set(v).size > 1) return v;
    }
  }
  const v = Array.from({ length: n }, () => lo + 1);
  v[0] = lo;
  v[1] = lo + 2;
  return v;
}

const sumTex = (vals: readonly number[], dp: number) => vals.map((v) => tex(val(v, dp))).join(' + ');

function meanSolution(vals: readonly number[], dp: number, c: ListContext): string {
  const n = vals.length;
  const sum = vals.reduce((s, x) => s + x, 0);
  const total = val(sum, dp);
  const mean = clean(total / n);
  return `Add all the values: $${sumTex(vals, dp)} = ${tex(total)}$\n\nThere are ${n} values, so divide by ${n}: $${tex(total)} \\div ${n} = ${tex(mean)}$\n\nThe mean ${c.of} is **${c.show(String(mean))}**.`;
}

// ---------------------------------------------------------------- range

export const range: QuestionTemplate = {
  id: 'm6.sta.mean-range.range',
  topicId: 'm6.sta.mean-range',
  title: 'Find the range of a data set',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const place = rng.pick(PLACES);
    const c = difficulty === 2 ? rng.pick(DECIMAL) : rng.pick(WHOLE);
    const n = rng.int(5, 7);
    const v = values(rng, n, c.lo, c.hi);
    const max = Math.max(...v);
    const min = Math.min(...v);
    const shown = listText(v.map((x) => fmt(x, c.dp)));
    const unit = c.units ? { units: c.units } : {};
    if (difficulty <= 2) {
      const r = val(max - min, c.dp);
      return {
        type: 'numeric',
        prompt: `${c.intro(name, n, place)}\n\n${shown}\n\nWhat is the **range**?`,
        answer: r,
        form: c.dp ? 'any' : 'integer',
        ...unit,
        calculator: 'not-allowed',
        hints: ['Find the highest value and the lowest value.', 'Range = highest value − lowest value.'],
        solution: `Highest: ${c.show(fmt(max, c.dp))}. Lowest: ${c.show(fmt(min, c.dp))}.\n\nRange $= ${tex(val(max, c.dp))} - ${tex(val(min, c.dp))} = ${tex(r)}$, so the range is **${c.show(String(r))}**.`,
      };
    }
    // difficulty 3: work backwards, or add a new value.
    const kind = rng.pick(['findHigh', 'findLow', 'newValue'] as const);
    const r = max - min;
    if (kind === 'newValue') {
      const bigger = rng.chance(0.5) || min - 3 < 0;
      const extra = bigger ? max + rng.int(2, 6) : min - rng.int(2, Math.min(6, min));
      const newR = bigger ? extra - min : max - extra;
      return {
        type: 'numeric',
        prompt: `${c.intro(name, n, place)}\n\n${shown}\n\nOne more value, ${c.show(String(extra))}, is added to the list. What is the **new range**?`,
        answer: newR,
        form: 'integer',
        ...unit,
        calculator: 'not-allowed',
        hints: ['Is the new value the highest or lowest in the list now?', 'Range = highest value − lowest value.'],
        solution: `With ${extra} added, the highest value is ${bigger ? extra : max} and the lowest is ${bigger ? min : extra}.\n\nNew range $= ${bigger ? extra : max} - ${bigger ? min : extra} = ${newR}$, so the new range is **${c.show(String(newR))}**.`,
      };
    }
    const findHigh = kind === 'findHigh';
    return {
      type: 'numeric',
      prompt: `${c.intro(name, n, place).replace(/:$/, '.')} The range of the data is ${c.show(String(r))}. The ${findHigh ? 'lowest' : 'highest'} value is ${c.show(String(findHigh ? min : max))}.\n\nWhat is the **${findHigh ? 'highest' : 'lowest'}** value?`,
      answer: findHigh ? max : min,
      form: 'integer',
      ...unit,
      calculator: 'not-allowed',
      hints: ['Range = highest value − lowest value.', findHigh ? 'The highest value is the range more than the lowest value.' : 'The lowest value is the range less than the highest value.'],
      solution: findHigh
        ? `Highest − lowest = range, so highest $= ${min} + ${r} = ${max}$.\n\nThe highest value is **${c.show(String(max))}**.`
        : `Highest − lowest = range, so lowest $= ${max} - ${r} = ${min}$.\n\nThe lowest value is **${c.show(String(min))}**.`,
    };
  },
};

// ---------------------------------------------------------------- mean

export const mean: QuestionTemplate = {
  id: 'm6.sta.mean-range.mean',
  topicId: 'm6.sta.mean-range',
  title: 'Find the mean of a data set',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    const place = rng.pick(PLACES);
    let c: ListContext;
    let v: number[];
    if (difficulty === 1) {
      c = rng.pick(WHOLE.filter((x) => x.hi <= 30));
      v = valuesWithWholeMean(rng, rng.int(3, 4), c.lo, c.hi);
    } else if (difficulty === 2) {
      c = rng.pick(WHOLE);
      v = valuesWithWholeMean(rng, rng.int(5, 8), c.lo, c.hi);
    } else if (rng.chance(0.5)) {
      // Whole-number data with a decimal mean.
      c = rng.pick(WHOLE.filter((x) => x.units !== '$'));
      const n = rng.pick([4, 5]);
      do v = values(rng, n, c.lo, c.hi);
      while (v.reduce((s, x) => s + x, 0) % n === 0);
    } else {
      // Measured decimal data whose mean has the same number of decimal places.
      c = rng.pick(DECIMAL);
      v = valuesWithWholeMean(rng, rng.int(3, 5), c.lo, c.hi);
    }
    const n = v.length;
    const sum = v.reduce((s, x) => s + x, 0);
    const answer = clean(val(sum, c.dp) / n);
    return {
      type: 'numeric',
      prompt: `${c.intro(name, n, place)}\n\n${listText(v.map((x) => fmt(x, c.dp)))}\n\nWhat is the **mean**?${difficulty === 3 ? ' Give your answer as a decimal if you need to.' : ''}`,
      answer,
      form: 'any',
      ...(c.units ? { units: c.units } : {}),
      calculator: 'not-allowed',
      hints: ['First add up all the values.', `Then divide the total by how many values there are (${n}).`],
      solution: meanSolution(v, c.dp, c),
    };
  },
};

// ---------------------------------------------------------------- from a graph

interface GameContext {
  title: string;
  label: (i: number) => string;
  xAxis: string;
  yAxis: string;
  ask: string;
  max: number;
  units: string;
}

const GAMES: readonly GameContext[] = [
  { title: 'Goals scored in each game', label: (i) => `Game ${i + 1}`, xAxis: 'Game', yAxis: 'Goals', ask: 'number of goals per game', max: 12, units: '' },
  { title: 'Tūī seen each day', label: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]!, xAxis: 'Day', yAxis: 'Number of tūī', ask: 'number of tūī seen each day', max: 12, units: '' },
  { title: 'Fish caught each day of the holiday', label: (i) => `Day ${i + 1}`, xAxis: 'Day', yAxis: 'Number of fish', ask: 'number of fish caught per day', max: 10, units: '' },
  { title: 'Minutes of reading each night', label: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]!, xAxis: 'Night', yAxis: 'Minutes', ask: 'number of minutes of reading per night', max: 40, units: 'min' },
  { title: 'Points scored in each basketball game', label: (i) => `Game ${i + 1}`, xAxis: 'Game', yAxis: 'Points', ask: 'number of points per game', max: 24, units: '' },
];

interface FreqContext {
  title: string;
  axis: string;
  lo: number;
  hi: number;
  who: string;
  ask: string;
}

const FREQ: readonly FreqContext[] = [
  { title: 'Pets at home', axis: 'Number of pets', lo: 0, hi: 5, who: 'students', ask: 'number of pets per student' },
  { title: 'Brothers and sisters', axis: 'Number of brothers and sisters', lo: 0, hi: 5, who: 'students', ask: 'number of brothers and sisters per student' },
  { title: 'Goals scored by each player', axis: 'Goals scored', lo: 0, hi: 6, who: 'players', ask: 'number of goals per player' },
  { title: 'Hours of sport last weekend', axis: 'Hours of sport', lo: 0, hi: 6, who: 'students', ask: 'number of hours of sport per student' },
];

export const fromDisplay: QuestionTemplate = {
  id: 'm6.sta.mean-range.from-display',
  topicId: 'm6.sta.mean-range',
  title: 'Mean and range from a bar graph or dot plot',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const c = rng.pick(GAMES);
      const n = rng.int(4, 6);
      const grid = c.max > 12 ? (c.max > 24 ? 5 : 2) : 1;
      const v = valuesWithWholeMean(rng, n, 1, Math.floor(c.max / grid)).map((x) => x * grid);
      const labels = v.map((_, i) => c.label(i));
      const yMax = Math.ceil((Math.max(...v) + grid) / grid) * grid;
      const figure = {
        svg: barGraph(labels, v, { yMax, grid, labelEvery: yMax / grid > 12 ? grid * 2 : grid, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis }),
        alt: `Bar graph titled "${c.title}", with one bar for each of ${labels.join(', ')}.`,
      };
      const sum = v.reduce((s, x) => s + x, 0);
      const unit = c.units ? { units: c.units } : {};
      if (rng.chance(0.65)) {
        return {
          type: 'numeric',
          prompt: `Look at the bar graph. What is the mean ${c.ask}?`,
          figure,
          answer: sum / n,
          form: 'any',
          ...unit,
          calculator: 'not-allowed',
          hints: [`Read the height of each of the ${n} bars.`, `Add them up, then divide by ${n}.`],
          solution: `The bars show ${listText(v.map(String))}.\n\nTotal: $${v.join(' + ')} = ${sum}$\n\nMean: $${sum} \\div ${n} = ${sum / n}$`,
        };
      }
      const max = Math.max(...v);
      const min = Math.min(...v);
      return {
        type: 'numeric',
        prompt: `Look at the bar graph. What is the range of the ${c.ask}?`,
        figure,
        answer: max - min,
        form: 'integer',
        ...unit,
        calculator: 'not-allowed',
        hints: ['Find the tallest bar and the shortest bar.', 'Range = highest value − lowest value.'],
        solution: `Tallest bar: ${max}. Shortest bar: ${min}.\n\nRange: $${max} - ${min} = ${max - min}$`,
      };
    }
    // difficulty 4: mean from a dot plot (each dot is one value).
    const c = rng.pick(FREQ);
    let n = rng.pick([5, 10, 10, 6, 8]);
    let v: number[] = [];
    for (let attempt = 0; ; attempt++) {
      if (attempt > 200) n = 10;
      v = Array.from({ length: n }, () => Math.round((rng.int(c.lo, c.hi) + rng.int(c.lo, c.hi)) / 2));
      const s = v.reduce((t, x) => t + x, 0);
      if (new Set(v).size >= 3 && (n === 5 || n === 10 || s % n === 0)) break;
    }
    v.sort((a, b) => a - b);
    const sum = v.reduce((t, x) => t + x, 0);
    const answer = clean(sum / n);
    const groups = [...new Set(v)].map((x) => [x, v.filter((y) => y === x).length] as const);
    return {
      type: 'numeric',
      prompt: `The dot plot shows the ${c.axis.toLowerCase()} for ${n} ${c.who}. Each dot is one of the ${c.who}. What is the mean ${c.ask}?`,
      figure: {
        svg: dotPlot(v, { lo: c.lo, hi: c.hi, axis: c.axis, title: c.title }),
        alt: `Dot plot titled "${c.title}". Each dot is one of the ${c.who}.`,
      },
      answer,
      form: 'any',
      calculator: 'not-allowed',
      hints: ['Each dot is one value. Three dots above 2 means the values 2, 2 and 2.', `Find the total of all ${n} values, then divide by ${n}.`],
      solution: `Multiply each value by its number of dots, then add: ${groups.map(([x, k]) => `$${x} \\times ${k}$`).join(' + ')} $= ${groups.map(([x, k]) => k * x).join(' + ')} = ${sum}$\n\nThere are ${n} dots, so the mean is $${sum} \\div ${n} = ${tex(answer)}$.`,
    };
  },
};

// ---------------------------------------------------------------- compare and missing values

const TEAMS = [
  ['Tūī', 'Kererū'],
  ['Kōwhai', 'Pōhutukawa'],
  ['Red', 'Blue'],
  ['Kiwi', 'Weka'],
  ['Sharks', 'Dolphins'],
] as const;

export const compareMissing: QuestionTemplate = {
  id: 'm6.sta.mean-range.compare-missing',
  topicId: 'm6.sta.mean-range',
  title: 'Compare means, and find a missing value',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 4) {
      const [t1, t2] = rng.pick(TEAMS);
      const sport = rng.pick(['netball', 'hockey', 'basketball', 'touch rugby']);
      let a: number[];
      let b: number[];
      do {
        a = valuesWithWholeMean(rng, rng.int(4, 6), 2, 20);
        b = valuesWithWholeMean(rng, rng.int(4, 6), 2, 20);
      } while (a.reduce((s, x) => s + x, 0) / a.length === b.reduce((s, x) => s + x, 0) / b.length);
      const ma = a.reduce((s, x) => s + x, 0) / a.length;
      const mb = b.reduce((s, x) => s + x, 0) / b.length;
      const winner = ma > mb ? t1 : t2;
      const diff = Math.abs(ma - mb);
      return {
        type: 'cloze',
        prompt: `Two ${sport} teams recorded the goals they scored in each game.\n\n- **${t1}:** ${listText(a.map(String))}\n- **${t2}:** ${listText(b.map(String))}\n\nThe [[w]] team has the higher mean, by [[d]] goals per game.`,
        blanks: [
          { id: 'w', accepted: [winner], options: [t1, t2] },
          { id: 'd', accepted: [String(diff)] },
        ],
        marks: 2,
        calculator: 'not-allowed',
        hints: ['Work out the mean for each team separately: total ÷ number of games.', a.length === b.length ? 'Then find the difference between the two means.' : 'The teams played different numbers of games, so compare the means, not the totals.'],
        solution: `**${t1}:** $${a.join(' + ')} = ${a.reduce((s, x) => s + x, 0)}$, and $${a.reduce((s, x) => s + x, 0)} \\div ${a.length} = ${ma}$\n\n**${t2}:** $${b.join(' + ')} = ${b.reduce((s, x) => s + x, 0)}$, and $${b.reduce((s, x) => s + x, 0)} \\div ${b.length} = ${mb}$\n\nThe **${winner}** team has the higher mean, by $${Math.max(ma, mb)} - ${Math.min(ma, mb)} = ${diff}$ goals per game.`,
      };
    }
    // difficulty 5: missing value, or the new mean after adding a value.
    const name = rng.pick(NAMES);
    const kind = rng.pick(['missing', 'target', 'newMean'] as const);
    const n = rng.int(4, 6);
    const m = rng.int(8, 16);
    if (kind === 'newMean') {
      const v = valuesWithWholeMean(rng, n, m - 5, m + 5);
      const s = v.reduce((t, x) => t + x, 0);
      const oldMean = s / n;
      // A new value that keeps the new mean whole: extra = oldMean + k(n + 1) gives newMean = oldMean + k.
      const k = oldMean - (n + 1) >= 1 ? rng.pick([1, 2, -1]) : rng.pick([1, 2]);
      const extra = oldMean + k * (n + 1);
      const newMean = (s + extra) / (n + 1);
      return {
        type: 'numeric',
        prompt: `In ${name}'s first ${n} basketball games, the mean score was ${oldMean} points. In the next game, ${name} scores ${extra} points. What is the mean score for all ${n + 1} games now?`,
        answer: newMean,
        form: 'any',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`If the mean of ${n} games is ${oldMean}, the total for those games is ${n} × ${oldMean}.`, `Add the new score to the total, then divide by ${n + 1}.`],
        solution: `Total of the first ${n} scores: $${n} \\times ${oldMean} = ${s}$\n\nNew total: $${s} + ${extra} = ${s + extra}$\n\nNew mean: $${s + extra} \\div ${n + 1} = ${newMean}$`,
      };
    }
    const all = valuesWithWholeMean(rng, n, m - 6, m + 6);
    const total = all.reduce((t, x) => t + x, 0);
    const mm = total / n;
    const known = all.slice(0, n - 1);
    const missing = all[n - 1]!;
    const knownSum = known.reduce((t, x) => t + x, 0);
    const prompt =
      kind === 'missing'
        ? `The mean of ${name}'s ${n} spelling scores is ${mm}. ${n - 1} of the scores are ${listText(known.map(String))}. What is the other score?`
        : `${name} has played ${n - 1} games of cricket and scored ${listText(known.map(String))} runs. How many runs must ${name} score in the next game to have a mean of exactly ${mm} runs per game?`;
    return {
      type: 'numeric',
      prompt,
      answer: missing,
      form: 'integer',
      marks: 2,
      calculator: 'not-allowed',
      hints: [`Mean = total ÷ ${n}, so the total of all ${n} values must be ${n} × ${mm}.`, `Then take away the ${n - 1} values you already know.`],
      solution: `The total of all ${n} values must be $${n} \\times ${mm} = ${total}$.\n\nThe ${n - 1} known values add to $${known.join(' + ')} = ${knownSum}$.\n\nThe missing value is $${total} - ${knownSum} = ${missing}$.`,
    };
  },
};

export const templates: QuestionTemplate[] = [range, mean, fromDisplay, compareMissing];
