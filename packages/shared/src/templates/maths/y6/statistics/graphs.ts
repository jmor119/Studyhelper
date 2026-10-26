import type { QuestionTemplate, TemplateOutput } from '../../../types';
import type { Rng } from '../../../../rng';
import { NAMES } from '../../../format';
import {
  CATEGORY_CONTEXTS,
  TIME_CONTEXTS,
  axisFor,
  barGraph,
  dotPlot,
  timeSeriesGraph,
  timeSeriesValues,
  type AxisOpts,
  type TimeContext,
  type TrendKind,
} from './graphs-helpers';

// m6.sta.graphs — read bar graphs, dot plots and time-series graphs, spot trends, and choose a
// suitable graph. Values always sit on a gridline, so every answer can be read exactly.

const ids = ['a', 'b', 'c', 'd', 'e'];

function mcq(rng: Rng, correct: string, wrong: Array<[string, string]>, base: Omit<Extract<TemplateOutput, { type: 'mcq' }>, 'type' | 'options' | 'correct' | 'feedback'>): TemplateOutput {
  const seen = new Set([correct]);
  const distractors = wrong.filter(([t]) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 3);
  const all: Array<[string, string | undefined]> = [[correct, undefined], ...distractors];
  const order = rng.shuffle(all);
  const options = order.map(([text], i) => ({ id: ids[i]!, text }));
  const feedback: Record<string, string> = {};
  order.forEach(([, fb], i) => {
    if (fb) feedback[ids[i]!] = fb;
  });
  return { type: 'mcq', options, correct: ids[order.findIndex(([t]) => t === correct)]!, feedback, ...base };
}

const unitAfter = (c: TimeContext, v: number) => `${v}${c.unitText}`;

function lineFigure(c: TimeContext, vals: number[], extra: Partial<AxisOpts> = {}) {
  const axis = axisFor(vals, c.grid);
  return {
    axis,
    figure: {
      svg: timeSeriesGraph(c.times, vals, { ...axis, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis, ...extra }),
      alt: `Time-series graph titled "${c.title}", with ${c.xAxis.toLowerCase()} along the x-axis and ${c.yAxis.toLowerCase()} up the y-axis.`,
    },
  };
}

// ---------------------------------------------------------------- bar graphs

export const barRead: QuestionTemplate = {
  id: 'm6.sta.graphs.bar-read',
  topicId: 'm6.sta.graphs',
  title: 'Read values from a bar graph',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const c = rng.pick(CATEGORY_CONTEXTS);
    const grid = difficulty === 1 ? rng.pick([1, 2]) : difficulty === 2 ? rng.pick([1, 2]) : 5;
    const maxUnits = difficulty === 1 ? (grid === 1 ? 10 : 6) : difficulty === 2 ? (grid === 1 ? 18 : 10) : 9;
    let vals: number[];
    do vals = c.cats.map(() => rng.int(1, maxUnits) * grid);
    while (new Set(vals).size < c.cats.length - 1);
    const axis = axisFor(vals, grid);
    // At difficulty 1 every gridline is labelled; at 2–3 some values sit between labels.
    if (difficulty === 1) axis.labelEvery = grid;
    else if (difficulty === 3) axis.labelEvery = 10;
    const figure = {
      svg: barGraph(c.cats, vals, { ...axis, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis }),
      alt: `Bar graph titled "${c.title}", with a bar for each of: ${c.cats.join(', ')}.`,
    };
    const scaleHint = `Each gridline on the scale goes up by ${grid}.`;
    if (difficulty === 1) {
      const i = rng.int(0, c.cats.length - 1);
      return {
        type: 'numeric',
        prompt: `Look at the bar graph. ${c.one(c.cats[i]!)}`,
        figure,
        answer: vals[i]!,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find the bar for ${c.cats[i]}. Go straight across from the top of the bar to the scale.`, scaleHint],
        solution: `The top of the ${c.cats[i]} bar lines up with **${vals[i]}** on the scale.`,
      };
    }
    // Two different bars, a bigger and a smaller one.
    let i = 0;
    let j = 1;
    do {
      i = rng.int(0, c.cats.length - 1);
      j = rng.int(0, c.cats.length - 1);
    } while (i === j || vals[i] === vals[j]);
    if (vals[i]! < vals[j]!) [i, j] = [j, i];
    const a = vals[i]!;
    const b = vals[j]!;
    const total = vals.reduce((s, v) => s + v, 0);
    const kind = rng.pick(difficulty === 2 ? (['more', 'more', 'total'] as const) : (['more', 'pair', 'total'] as const));
    if (kind === 'more') {
      return {
        type: 'numeric',
        prompt: `Look at the bar graph. ${c.more(c.cats[i]!, c.cats[j]!)}`,
        figure,
        answer: a - b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Read the values for ${c.cats[i]} and ${c.cats[j]} first.`, scaleHint, '"How many more" means find the difference: subtract.'],
        solution: `${c.cats[i]}: ${a}. ${c.cats[j]}: ${b}.\n\n$${a} - ${b} = ${a - b}$, so the answer is **${a - b}**.`,
      };
    }
    if (kind === 'pair') {
      return {
        type: 'numeric',
        prompt: `Look at the bar graph. What is the total for ${c.cats[i]} and ${c.cats[j]} together?`,
        figure,
        answer: a + b,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [scaleHint, `Read the values for ${c.cats[i]} and ${c.cats[j]}, then add them.`],
        solution: `${c.cats[i]}: ${a}. ${c.cats[j]}: ${b}.\n\n$${a} + ${b} = ${a + b}$`,
      };
    }
    return {
      type: 'numeric',
      prompt: `Look at the bar graph. ${c.total}`,
      figure,
      answer: total,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [scaleHint, 'Read the value for every bar, then add them all up.'],
      solution: `The bars show ${vals.join(', ')}.\n\n$${vals.join(' + ')} = ${total}$`,
    };
  },
};

// ---------------------------------------------------------------- dot plots

interface DotContext {
  title: string;
  axis: string;
  lo: number;
  hi: number;
  who: string;
  /** "have 3 pets" */
  have: (v: number) => string;
  /** "have more than 3 pets" */
  more: (v: number) => string;
  fewer: (v: number) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const DOT_CONTEXTS: readonly DotContext[] = [
  { title: 'Pets at home', axis: 'Number of pets', lo: 0, hi: 6, who: 'students', have: (v) => `have ${plural(v, 'pet', 'pets')}`, more: (v) => `have more than ${plural(v, 'pet', 'pets')}`, fewer: (v) => `have fewer than ${plural(v, 'pet', 'pets')}` },
  { title: 'Brothers and sisters', axis: 'Number of brothers and sisters', lo: 0, hi: 6, who: 'students', have: (v) => `have ${v} brother${v === 1 ? ' or sister' : 's and sisters'}`, more: (v) => `have more than ${v} brother${v === 1 ? ' or sister' : 's and sisters'}`, fewer: (v) => `have fewer than ${v} brothers and sisters` },
  { title: 'Goals scored by each player', axis: 'Goals scored this season', lo: 0, hi: 8, who: 'players', have: (v) => `scored ${plural(v, 'goal', 'goals')}`, more: (v) => `scored more than ${plural(v, 'goal', 'goals')}`, fewer: (v) => `scored fewer than ${plural(v, 'goal', 'goals')}` },
  { title: 'Hours of sleep last night', axis: 'Hours of sleep', lo: 6, hi: 12, who: 'students', have: (v) => `slept for ${v} hours`, more: (v) => `slept for more than ${v} hours`, fewer: (v) => `slept for fewer than ${v} hours` },
  { title: 'Books read in the holidays', axis: 'Number of books', lo: 0, hi: 8, who: 'students', have: (v) => `read ${plural(v, 'book', 'books')}`, more: (v) => `read more than ${plural(v, 'book', 'books')}`, fewer: (v) => `read fewer than ${plural(v, 'book', 'books')}` },
  { title: 'Shoe sizes in our class', axis: 'Shoe size', lo: 3, hi: 9, who: 'students', have: (v) => `wear size ${v} shoes`, more: (v) => `wear a shoe size bigger than ${v}`, fewer: (v) => `wear a shoe size smaller than ${v}` },
];

export const dotPlotRead: QuestionTemplate = {
  id: 'm6.sta.graphs.dot-plot',
  topicId: 'm6.sta.graphs',
  title: 'Read a dot plot',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const c = rng.pick(DOT_CONTEXTS);
    const n = rng.int(10, 20);
    const values = Array.from({ length: n }, () => {
      // A hump in the middle so the dot plot has a sensible shape.
      const a = rng.int(c.lo, c.hi);
      const b = rng.int(c.lo, c.hi);
      return Math.round((a + b) / 2);
    }).sort((x, y) => x - y);
    const count = (f: (v: number) => boolean) => values.filter(f).length;
    const figure = {
      svg: dotPlot(values, { lo: c.lo, hi: c.hi, axis: c.axis, title: c.title }),
      alt: `Dot plot titled "${c.title}". Each dot is one of the ${c.who}, stacked above the number line.`,
    };
    const present = [...new Set(values)];
    if (difficulty === 1) {
      const v = rng.pick(present);
      const k = count((x) => x === v);
      return {
        type: 'numeric',
        prompt: `Each dot stands for one of the ${c.who}. How many ${c.who} ${c.have(v)}?`,
        figure,
        answer: k,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find ${v} on the number line.`, 'Count the dots in the column above it.'],
        solution: `There ${k === 1 ? 'is 1 dot' : `are ${k} dots`} above ${v}, so **${k}** ${c.who} ${c.have(v)}.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.5)) {
        return {
          type: 'numeric',
          prompt: `Each dot stands for one of the ${c.who}. How many ${c.who} are shown on the dot plot altogether?`,
          figure,
          answer: n,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Each dot is one person.', 'Count the dots in each column, then add the counts.'],
          solution: `Counting the dots in each column and adding: ${present.map((v) => count((x) => x === v)).join(' + ')} = **${n}**.`,
        };
      }
      // Which value has the most dots (only when there's a single tallest column).
      const tallest = Math.max(...present.map((v) => count((x) => x === v)));
      const tops = present.filter((v) => count((x) => x === v) === tallest);
      if (tops.length === 1) {
        const v = tops[0]!;
        return {
          type: 'numeric',
          prompt: `Look at the dot plot. Which value on the number line has the most dots above it?`,
          figure,
          answer: v,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Look for the tallest column of dots.'],
          solution: `The tallest column is above **${v}**. It has ${tallest} dots.`,
        };
      }
    }
    // difficulty 3 (and the fallback above): more than / fewer than.
    const more = rng.chance(0.5);
    const useful = present.filter((v) => {
      const k = count((x) => (more ? x > v : x < v));
      return k > 0 && k < n;
    });
    const v = useful.length ? rng.pick(useful) : rng.pick(present);
    const k = count((x) => (more ? x > v : x < v));
    const used = present.filter((x) => (more ? x > v : x < v));
    return {
      type: 'numeric',
      prompt: `Each dot stands for one of the ${c.who}. How many ${c.who} ${more ? c.more(v) : c.fewer(v)}?`,
      figure,
      answer: k,
      form: 'integer',
      calculator: 'not-allowed',
      hints: [`${more ? 'More' : 'Fewer'} than ${v} does not include ${v} itself.`, `Count the dots to the ${more ? 'right' : 'left'} of ${v}.`],
      solution: used.length
        ? `Count the dots ${more ? 'above' : 'below'} ${v} (not including ${v}): ${used.map((x) => `${count((y) => y === x)} at ${x}`).join(', ')}.\n\nTotal: **${k}**.`
        : `There are no dots ${more ? 'above' : 'below'} ${v}, so the answer is **0**.`,
    };
  },
};

// ---------------------------------------------------------------- time-series graphs

function pickContext(rng: Rng, kinds?: readonly TrendKind[]): { c: TimeContext; kind: TrendKind } {
  const pool = TIME_CONTEXTS.filter((c) => !kinds || c.trends.some((k) => kinds.includes(k)));
  const c = rng.pick(pool);
  const kind = rng.pick(c.trends.filter((k) => !kinds || kinds.includes(k)));
  return { c, kind };
}

export const timeSeriesRead: QuestionTemplate = {
  id: 'm6.sta.graphs.time-series',
  topicId: 'm6.sta.graphs',
  title: 'Read and interpret time-series graphs',
  difficulties: [1, 2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const { c, kind } = pickContext(rng, difficulty >= 4 ? ['up', 'down'] : undefined);
    const vals = timeSeriesValues(rng, c, kind);
    const { axis, figure } = lineFigure(c, vals);
    const n = vals.length;
    const scaleHint = `Each gridline on the scale goes up by ${c.grid}.`;
    const what = c.what.charAt(0).toUpperCase() + c.what.slice(1);

    if (difficulty === 1) {
      const onLabel = vals.map((v, i) => [v, i] as const).filter(([v]) => v % axis.labelEvery === 0);
      const [v, i] = onLabel.length ? rng.pick(onLabel) : [vals[0]!, 0];
      return {
        type: 'numeric',
        prompt: `Look at the time-series graph. What was ${c.what} ${c.at(c.times[i]!)}?`,
        figure,
        answer: v,
        form: 'integer',
        ...(c.units ? { units: c.units } : {}),
        calculator: 'not-allowed',
        hints: [`Find ${c.times[i]} on the x-axis (the bottom).`, 'Go up to the dot, then straight across to the scale.'],
        solution: `The dot above ${c.times[i]} lines up with **${unitAfter(c, v)}** on the scale.`,
      };
    }

    if (difficulty === 2) {
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const hi = vals.filter((v) => v === max).length === 1;
      const lo = vals.filter((v) => v === min).length === 1;
      if ((hi || lo) && rng.chance(0.5)) {
        const findHigh = hi && (!lo || rng.chance(0.5));
        const target = vals.indexOf(findHigh ? max : min);
        const other = vals.indexOf(findHigh ? min : max);
        const wrong: Array<[string, string]> = [
          [c.times[other]!, `That is when ${c.what} was ${findHigh ? 'lowest' : 'highest'}.`],
          ...rng.shuffle(c.times.filter((_, k) => k !== target && k !== other)).map((t) => [t, `Compare the height of the dot above ${t} with the others.`] as [string, string]),
        ];
        return mcq(rng, c.times[target]!, wrong, {
          prompt: `Look at the time-series graph. When was ${c.what} ${findHigh ? 'highest' : 'lowest'}?`,
          figure,
          calculator: 'not-allowed',
          hints: [`The ${findHigh ? 'highest' : 'lowest'} value is the dot that is ${findHigh ? 'highest up' : 'lowest down'} on the graph.`],
          solution: `The ${findHigh ? 'highest' : 'lowest'} dot is above **${c.times[target]}**, where ${c.what} was ${unitAfter(c, findHigh ? max : min)}.`,
        });
      }
      // Change between two neighbouring times.
      const i = rng.int(0, n - 2);
      const a = vals[i]!;
      const b = vals[i + 1]!;
      const up = b > a;
      return {
        type: 'numeric',
        prompt: `Look at the time-series graph. ${what} went ${up ? 'up' : 'down'} from ${c.times[i]} to ${c.times[i + 1]}. By how much did it go ${up ? 'up' : 'down'}?`,
        figure,
        answer: Math.abs(b - a),
        form: 'integer',
        ...(c.units ? { units: c.units } : {}),
        calculator: 'not-allowed',
        hints: [scaleHint, `Read the value at ${c.times[i]} and at ${c.times[i + 1]}, then find the difference.`],
        solution: `${c.times[i]}: ${unitAfter(c, a)}. ${c.times[i + 1]}: ${unitAfter(c, b)}.\n\n$${Math.max(a, b)} - ${Math.min(a, b)} = ${Math.abs(b - a)}$, so it went ${up ? 'up' : 'down'} by **${unitAfter(c, Math.abs(b - a))}**.`,
      };
    }

    if (difficulty === 3) {
      const diffs = vals.slice(1).map((v, k) => v - vals[k]!);
      const hasUp = diffs.some((d) => d > 0);
      const hasDown = diffs.some((d) => d < 0);
      const wantUp = hasUp && (!hasDown || rng.chance(0.6));
      const signed = diffs.map((d) => (wantUp ? d : -d));
      const best = Math.max(...signed);
      const k = signed.indexOf(best);
      const pair = (j: number) => `${c.times[j]} to ${c.times[j + 1]}`;
      if (best > 0 && signed.filter((d) => d === best).length === 1) {
        const wrong: Array<[string, string]> = diffs
          .map((_, j) => j)
          .filter((j) => j !== k)
          .map((j) => [pair(j), signed[j]! > 0 ? `${wantUp ? 'It went up' : 'It went down'} here, but by less (${Math.abs(diffs[j]!)}).` : `${wantUp ? 'It went down' : 'It went up'} here, not ${wantUp ? 'up' : 'down'}.`] as [string, string]);
        return mcq(rng, pair(k), rng.shuffle(wrong), {
          prompt: `Look at the time-series graph. Between which two neighbouring times did ${c.what} go ${wantUp ? 'up' : 'down'} the most?`,
          figure,
          calculator: 'not-allowed',
          hints: [`Look for the steepest line going ${wantUp ? 'up' : 'down'}.`, 'Check by working out the change for each step.'],
          solution: `The changes are ${diffs.map((d, j) => `${pair(j)}: ${d > 0 ? '+' : '−'}${Math.abs(d)}`).join('; ')}.\n\nThe biggest ${wantUp ? 'rise' : 'fall'} is from **${pair(k)}** (${Math.abs(diffs[k]!)}).`,
        });
      }
      // Fallback: the range shown on the graph.
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return {
        type: 'numeric',
        prompt: `Look at the time-series graph. What is the difference between the highest and lowest values of ${c.what}?`,
        figure,
        answer: max - min,
        form: 'integer',
        ...(c.units ? { units: c.units } : {}),
        calculator: 'not-allowed',
        hints: ['Find the highest dot and the lowest dot.', 'Subtract the lowest value from the highest value.'],
        solution: `Highest: ${unitAfter(c, max)}. Lowest: ${unitAfter(c, min)}.\n\n$${max} - ${min} = ${max - min}$`,
      };
    }

    if (difficulty === 4) {
      const first = vals[0]!;
      const last = vals[n - 1]!;
      const up = last > first;
      return {
        type: 'numeric',
        prompt: `Look at the time-series graph. Overall, how much did ${c.what} go ${up ? 'up' : 'down'} from ${c.times[0]} to ${c.times[n - 1]}?`,
        figure,
        answer: Math.abs(last - first),
        form: 'integer',
        ...(c.units ? { units: c.units } : {}),
        calculator: 'not-allowed',
        hints: [scaleHint, `You only need the first value (${c.times[0]}) and the last value (${c.times[n - 1]}).`],
        solution: `${c.times[0]}: ${unitAfter(c, first)}. ${c.times[n - 1]}: ${unitAfter(c, last)}.\n\n$${Math.max(first, last)} - ${Math.min(first, last)} = ${Math.abs(last - first)}$, so it went ${up ? 'up' : 'down'} by **${unitAfter(c, Math.abs(last - first))}** overall.`,
      };
    }

    // difficulty 5: the mean of the values on the graph (sum divisible by the count).
    let v2 = vals;
    let fig = figure;
    for (let attempt = 0; attempt < 60 && v2.reduce((s, v) => s + v, 0) % n !== 0; attempt++) {
      v2 = timeSeriesValues(rng, c, kind);
    }
    const sum = v2.reduce((s, v) => s + v, 0);
    if (sum % n === 0) {
      fig = lineFigure(c, v2).figure;
      const mean = sum / n;
      return {
        type: 'numeric',
        prompt: `Look at the time-series graph. Use all ${n} values on the graph to work out the mean (average) of ${c.what}.`,
        figure: fig,
        answer: mean,
        form: 'any',
        ...(c.units ? { units: c.units } : {}),
        calculator: 'not-allowed',
        hints: [`Read all ${n} values from the graph. ${scaleHint}`, `Add them up, then divide by ${n}.`],
        solution: `The values are ${v2.join(', ')}.\n\nTotal: $${v2.join(' + ')} = ${sum}$\n\nMean: $${sum} \\div ${n} = ${mean}$, so the mean is **${unitAfter(c, mean)}**.`,
      };
    }
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    return {
      type: 'numeric',
      prompt: `Look at the time-series graph. What was the range of ${c.what} over the times shown?`,
      figure,
      answer: max - min,
      form: 'integer',
      ...(c.units ? { units: c.units } : {}),
      calculator: 'not-allowed',
      hints: [scaleHint, 'Range = highest value − lowest value.'],
      solution: `Highest: ${unitAfter(c, max)}. Lowest: ${unitAfter(c, min)}.\n\nRange: $${max} - ${min} = ${max - min}$`,
    };
  },
};

// ---------------------------------------------------------------- trends

const TREND_TEXT: Record<TrendKind, string> = {
  up: 'An upward trend: it goes up over time.',
  down: 'A downward trend: it goes down over time.',
  none: 'No clear trend: it goes up and down.',
};

export const trends: QuestionTemplate = {
  id: 'm6.sta.graphs.trend',
  topicId: 'm6.sta.graphs',
  title: 'Spot and describe trends in time-series graphs',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const { c, kind } = pickContext(rng, difficulty === 4 ? ['up', 'down'] : undefined);
    const vals = timeSeriesValues(rng, c, kind);
    const { figure } = lineFigure(c, vals);
    const n = vals.length;
    if (difficulty === 3) {
      const wrong: Array<[string, string]> = (['up', 'down', 'none'] as const)
        .filter((k) => k !== kind)
        .map((k) => [TREND_TEXT[k], k === 'none' ? 'There is a small wiggle, but look at the overall direction from start to finish.' : `Read the graph from left to right: does it end ${k === 'up' ? 'higher' : 'lower'} than it started?`] as [string, string]);
      wrong.push(['It goes up by the same amount every time.', 'The steps between the dots are not all the same size.']);
      return mcq(rng, TREND_TEXT[kind], wrong, {
        prompt: `Look at the time-series graph of ${c.what}. Which describes the graph best?`,
        figure,
        calculator: 'not-allowed',
        hints: ['Read the graph from left to right, like reading a sentence.', 'Ignore small wiggles. What happens overall from the start to the end?'],
        solution:
          kind === 'none'
            ? `The values go up and down and end close to where they started (${vals[0]} to ${vals[n - 1]}), so there is **no clear trend**.`
            : `Reading from left to right, ${c.what} goes from ${unitAfter(c, vals[0]!)} to ${unitAfter(c, vals[n - 1]!)}. Even with ${vals.slice(1).some((v, i) => (kind === 'up' ? v < vals[i]! : v > vals[i]!)) ? 'a small dip' : 'some steps bigger than others'}, the overall direction is ${kind}, so it is **${kind === 'up' ? 'an upward' : 'a downward'} trend**.`,
      });
    }
    // difficulty 4: choose the correct statement (trend + start and end values).
    const first = vals[0]!;
    const last = vals[n - 1]!;
    const dir = kind === 'up' ? 'upward' : 'downward';
    const verb = kind === 'up' ? 'went up' : 'went down';
    const correct = `There is a${kind === 'up' ? 'n' : ''} ${dir} trend: ${c.what} ${verb} from ${unitAfter(c, first)} to ${unitAfter(c, last)}.`;
    const gap = Math.round(Math.abs(last - first) / c.grid);
    const nudged = last + (kind === 'up' ? -c.grid : c.grid) * (gap > 2 ? rng.pick([1, 2]) : 1);
    const wrong: Array<[string, string]> = [
      [`There is a${kind === 'up' ? ' downward' : 'n upward'} trend: ${c.what} ${kind === 'up' ? 'went down' : 'went up'} from ${unitAfter(c, last)} to ${unitAfter(c, first)}.`, 'This reads the graph from right to left. Time goes from left to right.'],
      [`There is a${kind === 'up' ? 'n' : ''} ${dir} trend: ${c.what} ${verb} from ${unitAfter(c, first)} to ${unitAfter(c, nudged)}.`, `Check the last value on the scale. Each gridline is ${c.grid}.`],
      [`There is no clear trend, because ${c.what} did not change every time by the same amount.`, 'A trend does not need equal steps. It is about the overall direction.'],
    ];
    return mcq(rng, correct, wrong, {
      prompt: `Look at the time-series graph. Which statement is correct?`,
      figure,
      calculator: 'not-allowed',
      hints: ['Read the graph from left to right.', 'Check the first and last values carefully on the scale.'],
      solution: `From ${c.times[0]} to ${c.times[n - 1]}, ${c.what} ${verb} from ${unitAfter(c, first)} to ${unitAfter(c, last)}. Small wiggles don't matter: the overall direction shows **a${kind === 'up' ? 'n' : ''} ${dir} trend**.`,
    });
  },
};

// ---------------------------------------------------------------- graph features and choosing a graph

const MISSING = {
  title: { text: 'A title', why: 'The title tells you what the graph is about.' },
  yAxis: { text: 'A label on the y-axis (up the side)', why: 'The y-axis label tells you what the numbers measure.' },
  xAxis: { text: 'A label on the x-axis (along the bottom)', why: 'The x-axis label tells you what the bars or times are.' },
  scale: { text: 'Numbers on the scale', why: 'Without numbers on the scale you can’t read any values.' },
} as const;
type MissingKey = keyof typeof MISSING;

interface ChoiceContext {
  text: string;
  time: boolean;
}

const CHOICE_CONTEXTS: readonly ChoiceContext[] = [
  { text: 'the temperature outside the classroom every hour from 9 am to 3 pm', time: true },
  { text: 'the height of a sunflower, measured every Monday for 8 weeks', time: true },
  { text: 'the mass of a bag of carrots, weighed every day for 5 days', time: true },
  { text: 'the number of people at the school pool each day for two weeks', time: true },
  { text: 'how many kererū visited the garden each month for a year', time: true },
  { text: 'the amount of rain in the rain gauge each day during the school camp', time: true },
  { text: 'how many books the class read each week this term', time: true },
  { text: 'a puppy’s mass at the start of every month', time: true },
  { text: 'the number of cars passing the school gate every 10 minutes one morning', time: true },
  { text: 'the length of the shadow of a pole every hour during the day', time: true },
  { text: 'the favourite colour of each student in the class', time: false },
  { text: 'which sport each student plays in winter', time: false },
  { text: 'how each student travels to school', time: false },
  { text: 'the flavour of chips each student likes best', time: false },
  { text: 'which planet each student would most like to visit', time: false },
  { text: 'the type of tree in each part of the school grounds', time: false },
  { text: 'which fruit each student brought for morning tea', time: false },
  { text: 'the favourite kind of music of each person in a whānau', time: false },
  { text: 'which day of the week each student’s birthday falls on this year', time: false },
  { text: 'the main colour of each car in the school car park', time: false },
];

export const graphFeatures: QuestionTemplate = {
  id: 'm6.sta.graphs.features',
  topicId: 'm6.sta.graphs',
  title: 'Scales, graph features and choosing a graph',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const useBar = rng.chance(0.5);
      if (useBar) {
        const c = rng.pick(CATEGORY_CONTEXTS);
        const grid = rng.pick([2, 5, 10]);
        const vals = c.cats.map(() => rng.int(1, 8) * grid);
        const axis = axisFor(vals, grid);
        axis.labelEvery = grid * rng.pick([1, 2]);
        return {
          type: 'numeric',
          prompt: 'Look at the scale on the side of this bar graph. How much does it go up by from one gridline to the next?',
          figure: {
            svg: barGraph(c.cats, vals, { ...axis, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis }),
            alt: `Bar graph titled "${c.title}", with a numbered scale up the side.`,
          },
          answer: grid,
          form: 'integer',
          calculator: 'not-allowed',
          hints: ['Find two labelled numbers on the scale.', 'Count how many gridline steps there are between them.'],
          solution:
            axis.labelEvery === grid
              ? `The labels go 0, ${grid}, ${grid * 2}, … and there is a gridline at each label, so each step is **${grid}**.`
              : `The labels go 0, ${axis.labelEvery}, ${axis.labelEvery * 2}, … with one extra gridline halfway between, so each step is $${axis.labelEvery} \\div 2 = ${grid}$.`,
        };
      }
      const { c, kind } = pickContext(rng);
      const vals = timeSeriesValues(rng, c, kind);
      const { axis, figure } = lineFigure(c, vals);
      return {
        type: 'numeric',
        prompt: 'Look at the scale on the side of this time-series graph. How much does it go up by from one gridline to the next?',
        figure,
        answer: c.grid,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['Find two labelled numbers on the scale.', 'Count how many gridline steps there are between them.'],
        solution:
          axis.labelEvery === c.grid
            ? `The labels go 0, ${c.grid}, ${c.grid * 2}, … and there is a gridline at each label, so each step is **${c.grid}**.`
            : `The labels go 0, ${axis.labelEvery}, ${axis.labelEvery * 2}, … with one extra gridline halfway between, so each step is $${axis.labelEvery} \\div 2 = ${c.grid}$.`,
      };
    }
    if (difficulty === 2) {
      const missing = rng.pick(Object.keys(MISSING) as MissingKey[]);
      const useBar = rng.chance(0.5);
      let svg: string;
      if (useBar) {
        const c = rng.pick(CATEGORY_CONTEXTS);
        const grid = rng.pick([1, 2, 5]);
        const vals = c.cats.map(() => rng.int(1, 9) * grid);
        const axis = axisFor(vals, grid);
        svg = barGraph(c.cats, vals, {
          ...axis,
          ...(missing !== 'title' && { title: c.title }),
          ...(missing !== 'xAxis' && { xAxis: c.xAxis }),
          ...(missing !== 'yAxis' && { yAxis: c.yAxis }),
          hideScale: missing === 'scale',
        });
      } else {
        const { c, kind } = pickContext(rng);
        const vals = timeSeriesValues(rng, c, kind);
        const axis = axisFor(vals, c.grid);
        svg = timeSeriesGraph(c.times, vals, {
          ...axis,
          ...(missing !== 'title' && { title: c.title }),
          ...(missing !== 'xAxis' && { xAxis: c.xAxis }),
          ...(missing !== 'yAxis' && { yAxis: c.yAxis }),
          hideScale: missing === 'scale',
        });
      }
      const wrong = (Object.keys(MISSING) as MissingKey[])
        .filter((k) => k !== missing)
        .map((k) => [MISSING[k].text, 'Look again: this graph already has that.'] as [string, string]);
      return mcq(
        rng,
        MISSING[missing].text,
        wrong,
        {
          prompt: `${rng.pick(NAMES)} drew this ${useBar ? 'bar graph' : 'time-series graph'}, but forgot one important thing. What is missing?`,
          figure: { svg, alt: `A ${useBar ? 'bar graph' : 'time-series graph'} with one feature missing.` },
          calculator: 'not-allowed',
          hints: ['A good graph has a title, a label on each axis, and numbers on the scale.', 'Check each of these in turn.'],
          solution: `The graph has no ${missing === 'title' ? 'title' : missing === 'scale' ? 'numbers on its scale' : `label on the ${missing === 'xAxis' ? 'x-axis' : 'y-axis'}`}. ${MISSING[missing].why}`,
        },
      );
    }
    // difficulty 3: choose a graph, with a reason.
    const ctx = rng.pick(CHOICE_CONTEXTS);
    const who = rng.pick(NAMES);
    const tsRight = 'A time-series graph, because the data was collected over time.';
    const barRight = 'A bar graph, because the data is sorted into groups (categories).';
    const tsWrong = 'A time-series graph, because there are lots of different answers.';
    const barWrong = 'A bar graph, because time-series graphs can only show temperatures.';
    const correct = ctx.time ? tsRight : barRight;
    const wrong: Array<[string, string]> = ctx.time
      ? [
          [barRight, 'The data is not sorted into groups: each value goes with a time.'],
          [tsWrong, 'This is the right graph, but the reason is wrong. Time-series graphs are for data collected over time.'],
          [barWrong, 'Time-series graphs can show anything that changes over time, not just temperatures.'],
        ]
      : [
          [tsRight, 'This data was not collected at different times. Each person gives a category answer.'],
          [tsWrong, 'Time-series graphs are only for data collected over time.'],
          ['A bar graph, because bar graphs always look the best.', 'This is the right graph, but the reason is wrong. Bar graphs suit data sorted into categories.'],
        ];
    return mcq(rng, correct, wrong, {
      prompt: `${who} collected data about ${ctx.text}. Which graph should ${who} use to show it?`,
      calculator: 'not-allowed',
      hints: ['Was the data collected again and again over time?', 'Or does each person or thing go into a group (category)?'],
      solution: ctx.time
        ? `The data about ${ctx.text} was collected over time, so it is **time-series data**. A time-series graph shows how it changes, with time along the x-axis.`
        : `The data about ${ctx.text} sorts each answer into a group, so it is **category data**. A bar graph shows how many are in each group.`,
    });
  },
};

export const templates: QuestionTemplate[] = [barRead, dotPlotRead, timeSeriesRead, trends, graphFeatures];
