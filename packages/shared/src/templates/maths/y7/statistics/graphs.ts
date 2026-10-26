import type { Rng } from '../../../../rng';
import type { QuestionTemplate } from '../../../types';
import { NAMES, frac, gcd } from '../../../format';
import { CAT_CONTEXTS, countOf, maxOf, minOf, modesOf } from './averages-helpers';
import { barGraph, clusteredBarGraph, dotPlot, stackedBarGraph, timeSeriesGraph } from './graphs-helpers';

// m7.sta.graphs — reading bar graphs, dot plots, time-series graphs and clustered/stacked bar
// graphs, and choosing the right display for the data. All data is made up for practice.

const ALPHA = 'abcdefgh';

// ---------------- Bar graphs ----------------

export const readBarGraph: QuestionTemplate = {
  id: 'm7.sta.graphs.read-bar',
  topicId: 'm7.sta.graphs',
  title: 'Read values, differences and totals from a bar graph',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    const ctx = rng.pick(CAT_CONTEXTS);
    const k = difficulty === 1 ? 4 : 5;
    const cats = ctx.categories.slice(0, k);
    let values: number[];
    let axis: { yMax: number; grid: number; labelEvery: number };
    if (difficulty === 1) {
      values = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], k);
      axis = { yMax: Math.max(...values) + 1 + (Math.max(...values) % 2 ? 0 : 1), grid: 1, labelEvery: 2 };
    } else if (rng.chance(0.5)) {
      values = rng.sample([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], k);
      axis = { yMax: 22, grid: 2, labelEvery: 4 };
    } else {
      values = rng.sample([5, 10, 15, 20, 25, 30, 35, 40, 45], k);
      axis = { yMax: 50, grid: 5, labelEvery: 10 };
    }
    const svg = barGraph(cats, values, { ...axis, title: ctx.title, xAxis: capitalise(ctx.variable), yAxis: ctx.yAxis });
    const alt = `Bar graph titled "${ctx.title}". ${cats.map((c, i) => `${c}: ${values[i]}`).join(', ')}. The vertical axis has gridlines every ${axis.grid}.`;
    const scaleHint = `Each gridline on the vertical axis is worth ${axis.grid}. Not every gridline has a number.`;

    if (difficulty === 1) {
      const i = rng.int(0, k - 1);
      return {
        type: 'numeric',
        prompt: `${ctx.intro(rng.pick(NAMES))}. The bar graph shows the results.\n\n${ctx.count(cats[i]!)}`,
        figure: { svg, alt },
        answer: values[i]!,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find the bar for ${cats[i]}. Go across from the top of the bar to the vertical axis.`, scaleHint],
        solution: `The top of the ${cats[i]} bar lines up with **${values[i]}** on the vertical axis.`,
      };
    }
    if (rng.chance(0.5)) {
      const [i, j] = rng.sample([...Array(k).keys()], 2) as [number, number];
      const [a, b] = values[i]! > values[j]! ? [i, j] : [j, i];
      return {
        type: 'numeric',
        prompt: `${ctx.intro(rng.pick(NAMES))}. The bar graph shows the results.\n\n${ctx.more(cats[a]!, cats[b]!)}`,
        figure: { svg, alt },
        answer: values[a]! - values[b]!,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Read the value for ${cats[a]} and the value for ${cats[b]}.`, scaleHint, '"How many more" means find the difference: subtract.'],
        solution: `${cats[a]}: ${values[a]}. ${cats[b]}: ${values[b]}.\n\nDifference: $${values[a]} - ${values[b]} = ${values[a]! - values[b]!}$`,
      };
    }
    const sum = values.reduce((s, v) => s + v, 0);
    return {
      type: 'numeric',
      prompt: `${ctx.intro(rng.pick(NAMES))}. The bar graph shows the results.\n\n${ctx.totalQ}`,
      figure: { svg, alt },
      answer: sum,
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['Read the value of every bar.', scaleHint, 'Then add all the values together.'],
      solution: `${cats.map((c, i) => `${c}: ${values[i]}`).join(', ')}\n\nTotal: $${values.join(' + ')} = ${sum}$`,
    };
  },
};

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------- Dot plots ----------------

interface DotContext {
  intro: (name: string) => string;
  title: string;
  axis: string;
  lo: number;
  hi: number;
  /** "have 3 siblings" */
  exactly: (v: number) => string;
  /** "have more than 3 siblings" */
  moreThan: (v: number) => string;
  /** Who each dot is, plural ("students", "games"). */
  who: string;
  /** For outlier questions: where the typical values sit, and where the outlier goes. */
  outlier: { base: [number, number]; value: [number, number] };
}

const s = (v: number, word: string, plural = `${word}s`) => `${v} ${v === 1 ? word : plural}`;

const DOT_CONTEXTS: readonly DotContext[] = [
  { intro: (n) => `${n} asked each student in Room 9 how many siblings (brothers and sisters) they have`, title: 'Siblings of Room 9 students', axis: 'Number of siblings', lo: 0, hi: 7, exactly: (v) => `have ${s(v, 'sibling')}`, moreThan: (v) => `have more than ${s(v, 'sibling')}`, who: 'students', outlier: { base: [0, 4], value: [9, 11] } },
  { intro: (n) => `${n} asked each student in the class how many pets they have`, title: 'Number of pets', axis: 'Number of pets', lo: 0, hi: 6, exactly: (v) => `have ${s(v, 'pet')}`, moreThan: (v) => `have more than ${s(v, 'pet')}`, who: 'students', outlier: { base: [0, 3], value: [8, 11] } },
  { intro: (n) => `${n} counted the letters in the first name of each student in Room 2`, title: 'Letters in first names', axis: 'Number of letters', lo: 3, hi: 10, exactly: (v) => `have ${v} letters in their first name`, moreThan: (v) => `have more than ${v} letters in their first name`, who: 'students', outlier: { base: [3, 7], value: [12, 14] } },
  { intro: (n) => `${n} asked each student how many hours they slept last night (to the nearest hour)`, title: 'Hours of sleep last night', axis: 'Hours of sleep', lo: 6, hi: 12, exactly: (v) => `slept for ${v} hours`, moreThan: (v) => `slept for more than ${v} hours`, who: 'students', outlier: { base: [8, 11], value: [4, 5] } },
  { intro: (n) => `${n} recorded the number of goals the school hockey team scored in each game this season`, title: 'Hockey goals per game', axis: 'Goals scored', lo: 0, hi: 7, exactly: (v) => `did the team score ${s(v, 'goal')}`, moreThan: (v) => `did the team score more than ${s(v, 'goal')}`, who: 'games', outlier: { base: [0, 4], value: [10, 12] } },
  { intro: (n) => `${n} asked each student how many times they went to the swimming pool in the holidays`, title: 'Trips to the pool in the holidays', axis: 'Number of trips', lo: 0, hi: 9, exactly: (v) => `went to the pool ${v === 1 ? 'once' : `${v} times`}`, moreThan: (v) => `went to the pool more than ${v === 1 ? 'once' : `${v} times`}`, who: 'students', outlier: { base: [0, 5], value: [14, 17] } },
  { intro: (n) => `${n} asked each student how many pieces of fruit they ate yesterday`, title: 'Fruit eaten yesterday', axis: 'Pieces of fruit', lo: 0, hi: 6, exactly: (v) => `ate ${s(v, 'piece')} of fruit`, moreThan: (v) => `ate more than ${s(v, 'piece')} of fruit`, who: 'students', outlier: { base: [0, 4], value: [9, 10] } },
  { intro: (n) => `${n} recorded the number of tries scored by the school rugby team in each game this season`, title: 'Rugby tries per game', axis: 'Tries scored', lo: 0, hi: 8, exactly: (v) => `did the team score ${s(v, 'try', 'tries')}`, moreThan: (v) => `did the team score more than ${s(v, 'try', 'tries')}`, who: 'games', outlier: { base: [0, 4], value: [11, 13] } },
];

/** n whole numbers in [lo, hi], roughly mound-shaped. */
function moundData(rng: Rng, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => Math.round(lo + ((hi - lo) * (rng.next() + rng.next())) / 2));
}

/** "How many students ..." or "In how many games ..." */
const howMany = (c: DotContext, phrase: string) => (c.who === 'games' ? `In how many games ${phrase}?` : `How many ${c.who} ${phrase}?`);

export const readDotPlot: QuestionTemplate = {
  id: 'm7.sta.graphs.dot-plot',
  topicId: 'm7.sta.graphs',
  title: 'Read a dot plot: counts, totals, mode, range and outliers',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const c = rng.pick(DOT_CONTEXTS);
    const name = rng.pick(NAMES);
    const n = rng.int(14, 24);
    const outlierKind = difficulty === 3 && rng.chance(0.35);
    let xs: number[];
    let outlier = 0;
    for (;;) {
      if (outlierKind) {
        xs = moundData(rng, n - 1, c.outlier.base[0], c.outlier.base[1]);
        outlier = rng.int(c.outlier.value[0], c.outlier.value[1]);
        xs.push(outlier);
      } else {
        xs = moundData(rng, n, c.lo, c.hi);
      }
      if (maxOf(xs) > minOf(xs) + 2 && modesOf(xs).length === 1) break;
    }
    const svg = dotPlot(xs, {
      lo: outlierKind ? Math.min(c.lo, outlier - 1) : c.lo,
      hi: outlierKind ? Math.max(c.hi, outlier + 1) : c.hi,
      axis: c.axis,
      title: c.title,
    });
    const values = [...new Set(xs)].sort((a, b) => a - b);
    const alt = `Dot plot titled "${c.title}" with ${xs.length} dots. ${values.map((v) => `${v}: ${countOf(xs, v)} dot${countOf(xs, v) === 1 ? '' : 's'}`).join(', ')}.`;
    const fig = { svg, alt };
    const intro = `${c.intro(name)}. Each dot on the dot plot stands for one of the ${c.who}.`;
    const hintDots = 'Each dot is one value. Count the dots in the column above each number.';

    if (difficulty === 1) {
      const v = rng.pick(values);
      return {
        type: 'numeric',
        prompt: `${intro}\n\n${howMany(c, c.exactly(v))}`,
        figure: fig,
        answer: countOf(xs, v),
        form: 'integer',
        calculator: 'not-allowed',
        hints: [`Find ${v} on the number line.`, hintDots],
        solution: `There ${countOf(xs, v) === 1 ? 'is' : 'are'} ${countOf(xs, v)} dot${countOf(xs, v) === 1 ? '' : 's'} above ${v}, so the answer is **${countOf(xs, v)}**.`,
      };
    }
    if (difficulty === 2) {
      if (rng.chance(0.65)) {
        const cut = rng.pick(values.slice(0, -1));
        const above = xs.filter((x) => x > cut);
        const cols = values.filter((v) => v > cut);
        return {
          type: 'numeric',
          prompt: `${intro}\n\n${howMany(c, c.moreThan(cut))}`,
          figure: fig,
          answer: above.length,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [`"More than ${cut}" does not include ${cut} itself.`, 'Add up the dots in every column to the right of that number.'],
          solution: `Columns above ${cut}: ${cols.map((v) => `${v} (${countOf(xs, v)})`).join(', ')}.\n\nTotal: $${cols.map((v) => countOf(xs, v)).join(' + ')} = ${above.length}$`,
        };
      }
      return {
        type: 'numeric',
        prompt: `${intro}\n\nHow many ${c.who} are shown on the dot plot altogether?`,
        figure: fig,
        answer: xs.length,
        form: 'integer',
        calculator: 'not-allowed',
        hints: [hintDots, 'Add up the counts for all the columns.'],
        solution: `Counts: ${values.map((v) => `${v} (${countOf(xs, v)})`).join(', ')}.\n\nTotal: $${values.map((v) => countOf(xs, v)).join(' + ')} = ${xs.length}$`,
      };
    }
    // difficulty 3
    if (outlierKind) {
      const out = outlier;
      const rest = xs.filter((x) => x !== out);
      return {
        type: 'numeric',
        prompt: `${intro}\n\nOne value on the dot plot is an **outlier**. What is it?`,
        figure: fig,
        answer: out,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['An outlier is a value that is much bigger or much smaller than most of the data.', 'Look for a dot that sits on its own, far away from the others.'],
        solution: `Most of the dots are between ${minOf(rest)} and ${maxOf(rest)}. The dot at **${out}** is far away from all the others, so it is an outlier.\n\nAn outlier isn't always a mistake. Rare things do happen, so it is worth checking whether the value is real.`,
      };
    }
    if (rng.chance(0.5)) {
      const mode = modesOf(xs)[0]!;
      return {
        type: 'numeric',
        prompt: `${intro}\n\nWhat is the **mode**?`,
        figure: fig,
        answer: mode,
        form: 'integer',
        calculator: 'not-allowed',
        hints: ['The mode is the value that appears most often.', 'On a dot plot, look for the tallest column of dots. The answer is the number underneath it.'],
        solution: `The tallest column has ${countOf(xs, mode)} dots, above ${mode}. So the mode is **${mode}**.`,
      };
    }
    return {
      type: 'numeric',
      prompt: `${intro}\n\nWhat is the **range**?`,
      figure: fig,
      answer: maxOf(xs) - minOf(xs),
      form: 'integer',
      calculator: 'not-allowed',
      hints: ['The range is the highest value take away the lowest value.', 'Find the dot furthest to the right and the dot furthest to the left.'],
      solution: `Highest value: ${maxOf(xs)}. Lowest value: ${minOf(xs)}.\n\nRange $= ${maxOf(xs)} - ${minOf(xs)} = ${maxOf(xs) - minOf(xs)}$`,
    };
  },
};

// ---------------- Choosing a display ----------------

type DisplayKind = 'time' | 'twoCat' | 'oneCat' | 'oneNum';

interface Scenario {
  kind: DisplayKind;
  data: string;
  question: string;
}

const SCENARIOS: readonly Scenario[] = [
  { kind: 'time', data: 'the temperature in the classroom every hour during one school day', question: 'How does the temperature in our classroom change during a school day?' },
  { kind: 'time', data: 'the height of a sunflower seedling, measured every week for 10 weeks', question: 'How does a sunflower seedling grow over 10 weeks?' },
  { kind: 'time', data: 'the number of students who walked to school in each week of Term 2', question: 'Did more students walk to school as Term 2 went on?' },
  { kind: 'time', data: 'the rainfall in Hamilton each month for a year', question: 'How does the rainfall in Hamilton change through the year?' },
  { kind: 'time', data: 'the number of books borrowed from the school library each day for a fortnight', question: 'Did the library get busier over the fortnight?' },
  { kind: 'time', data: 'the mass of a puppy, weighed once a month for its first year', question: 'How does a puppy’s mass change in its first year?' },
  { kind: 'time', data: 'the water level in the school water tank each day in February', question: 'How does the water level in the school tank change during February?' },
  { kind: 'time', data: 'the number of kererū counted in the school grounds each year from 2016 to 2026', question: 'Has the number of kererū in our school grounds changed over the last ten years?' },
  { kind: 'twoCat', data: 'the favourite sport of each student, sorted into Year 7 and Year 8', question: 'Do Year 7 and Year 8 students have different favourite sports?' },
  { kind: 'twoCat', data: 'how each student gets to school, for students in Room 3 and in Room 4', question: 'Do students in Room 3 and Room 4 travel to school in different ways?' },
  { kind: 'twoCat', data: 'the lunch each student chose, on a Monday and on a Friday', question: 'Do students choose different lunches on Mondays and Fridays?' },
  { kind: 'twoCat', data: 'the type of pet each student has, for students who live in town and students who live on farms', question: 'Do students who live on farms have different pets from students who live in town?' },
  { kind: 'twoCat', data: 'the favourite camp activity of each student, sorted by house group (Kauri, Rimu and Tōtara)', question: 'Do the three house groups have different favourite camp activities?' },
  { kind: 'twoCat', data: 'whether each student brought a drink bottle to school (yes or no), sorted by year group', question: 'Are Year 8 students more likely than Year 7 students to bring a drink bottle?' },
  { kind: 'oneCat', data: 'the favourite fruit of each student in Room 12', question: 'What is the most popular fruit in Room 12?' },
  { kind: 'oneCat', data: 'the way each student in Room 4 gets to school', question: 'How do most students in Room 4 get to school?' },
  { kind: 'oneCat', data: 'the type of each bird that visited the school bird feeder', question: 'Which bird visits our school feeder most often?' },
  { kind: 'oneCat', data: 'the flavour of each ice block sold at the school gala', question: 'Which ice block flavour sold best at the gala?' },
  { kind: 'oneCat', data: 'the favourite type of music of each student in the class', question: 'What type of music do students in our class like best?' },
  { kind: 'oneCat', data: 'the colour of each car in the school car park', question: 'What is the most common car colour in the school car park?' },
  { kind: 'oneNum', data: 'the number of siblings each student in the class has', question: 'How many siblings do students in our class usually have?' },
  { kind: 'oneNum', data: 'the number of letters in each student’s first name', question: 'How long are the first names of students in our class?' },
  { kind: 'oneNum', data: 'the number of hours each student slept last night', question: 'How much sleep do Year 7 students get on a school night?' },
  { kind: 'oneNum', data: 'the number of goals the school hockey team scored in each game this season', question: 'How many goals does our hockey team usually score in a game?' },
  { kind: 'oneNum', data: 'the number of books each student read in the holidays', question: 'How many books do students in our class read in the holidays?' },
  { kind: 'oneNum', data: 'the number of pets each student has', question: 'How many pets do students in our class have?' },
];

const D = {
  dot: 'Dot plot',
  bar: 'Bar graph',
  clustered: 'Clustered bar graph',
  stacked: 'Stacked bar graph',
  time: 'Time-series graph',
} as const;
type DisplayName = keyof typeof D;

const WHY_RIGHT: Record<DisplayKind, string> = {
  time: 'The data is collected over time, so a **time-series graph** is best. Time goes along the horizontal axis, and the line shows how the values change.',
  twoCat: 'There are two categorical variables, so you need a graph that compares the groups: a **clustered bar graph** (bars side by side) or a **stacked bar graph** (bars split into parts).',
  oneCat: 'There is one categorical variable, so a **bar graph** is best: one bar for each category, with the height showing how many.',
  oneNum: 'There is one numerical variable (a count), so a **dot plot** is best: one dot for each value, stacked above a number line.',
};

const WHY_WRONG: Record<DisplayName, string> = {
  dot: 'A dot plot shows one variable. It can’t show how values change over time or compare two groups clearly.',
  bar: 'A plain bar graph shows only one categorical variable.',
  clustered: 'A clustered bar graph is for comparing two categorical variables, but this data has only one variable.',
  stacked: 'A stacked bar graph is for two categorical variables, but this data has only one variable.',
  time: 'A time-series graph is for data collected over time. This data was not collected at different times.',
};

export const chooseDisplay: QuestionTemplate = {
  id: 'm7.sta.graphs.choose-display',
  topicId: 'm7.sta.graphs',
  title: 'Choose the best display for a data set or statistical question',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const sc = rng.pick(SCENARIOS);
    const name = rng.pick(NAMES);
    let right: DisplayName;
    let wrong: DisplayName[];
    switch (sc.kind) {
      case 'time':
        right = 'time';
        wrong = ['bar', 'dot', 'clustered'];
        break;
      case 'twoCat':
        right = rng.pick(['clustered', 'stacked'] as const);
        wrong = ['bar', 'dot', 'time'];
        break;
      case 'oneCat':
        right = 'bar';
        wrong = ['time', 'clustered', 'stacked'];
        break;
      default:
        right = 'dot';
        wrong = ['time', 'clustered', 'stacked'];
    }
    const all = [right, ...wrong];
    const wrongFeedback = (w: DisplayName): string => {
      if (sc.kind === 'time' && w === 'bar') return 'A bar graph shows how many are in each category. It doesn’t show change over time as clearly as a line does.';
      if (sc.kind === 'twoCat' && w === 'bar') return 'A plain bar graph shows only one categorical variable. Here there are two to compare.';
      if (sc.kind === 'twoCat' && w === 'dot') return 'A dot plot shows one variable. Here there are two categorical variables to compare.';
      return WHY_WRONG[w];
    };
    const prompt =
      difficulty === 2
        ? `${name} has collected data on ${sc.data}.\n\nWhich display is the best choice for this data?`
        : `${name} wants to answer this statistical question:\n\n"${sc.question}"\n\nWhich display would be best for showing the data ${name} collects?`;
    return {
      type: 'mcq',
      prompt,
      options: all.map((d, i) => ({ id: ALPHA[i]!, text: D[d] })),
      correct: 'a',
      feedback: Object.fromEntries(wrong.map((w, i) => [ALPHA[i + 1]!, wrongFeedback(w)])),
      calculator: 'not-allowed',
      hints: [
        difficulty === 3 ? `Think about the data ${name} would need to collect to answer the question.` : 'Is the data collected over time?',
        'How many variables are there, and are they categorical (groups) or numerical (numbers)?',
      ],
      solution: WHY_RIGHT[sc.kind],
    };
  },
};

// ---------------- Time-series graphs ----------------

interface TsContext {
  intro: (name: string) => string;
  title: string;
  xAxis: string;
  yAxis: string;
  times: readonly string[];
  /** Name of the quantity, e.g. "temperature". */
  quantity: string;
  /** Unit for answers. */
  unit: string;
  /** Short unit for prose ("°C", " cm"). */
  u: string;
  /** Names of the times for prose, if different from the axis labels. */
  say?: readonly string[];
  gen: (rng: Rng) => number[];
  axis: { yStart: number; yMax: number; grid: number; labelEvery: number };
}

const TS_CONTEXTS: readonly TsContext[] = [
  {
    intro: (n) => `${n}'s class recorded the temperature in their classroom every hour during a school day`,
    title: 'Classroom temperature',
    xAxis: 'Time',
    yAxis: 'Temperature (°C)',
    times: ['8 am', '9 am', '10 am', '11 am', '12 pm', '1 pm', '2 pm', '3 pm'],
    quantity: 'temperature',
    unit: '°C',
    u: '°C',
    gen: (rng) => {
      const v = [rng.int(12, 14)];
      for (let i = 0; i < 5; i++) v.push(v[i]! + rng.int(0, 2));
      v.push(v[5]! + rng.int(-1, 1));
      v.push(v[6]! + rng.int(-2, 0));
      return v;
    },
    axis: { yStart: 10, yMax: 26, grid: 1, labelEvery: 2 },
  },
  {
    intro: (n) => `${n} measured the height of a bean plant at the start of each week`,
    title: 'Height of a bean plant',
    xAxis: 'Week',
    yAxis: 'Height (cm)',
    times: ['1', '2', '3', '4', '5', '6'],
    quantity: 'height of the plant',
    unit: 'cm',
    u: ' cm',
    gen: (rng) => {
      const v = [rng.int(1, 2) * 2];
      for (let i = 0; i < 5; i++) v.push(v[i]! + rng.int(0, 3) * 2);
      return v;
    },
    axis: { yStart: 0, yMax: 36, grid: 2, labelEvery: 4 },
  },
  {
    intro: (n) => `${n} found the rainfall at their school in Hamilton for each month of one year`,
    title: 'Monthly rainfall at school',
    xAxis: 'Month',
    yAxis: 'Rainfall (mm)',
    times: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    say: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    quantity: 'rainfall',
    unit: 'mm',
    u: ' mm',
    gen: (rng) => [70, 60, 70, 80, 100, 120, 130, 110, 100, 90, 80, 90].map((b) => b + rng.int(-2, 2) * 10),
    axis: { yStart: 0, yMax: 160, grid: 10, labelEvery: 20 },
  },
  {
    intro: (n) => `${n} counted the number of students who biked to school in each week of Term 3`,
    title: 'Students biking to school',
    xAxis: 'Week',
    yAxis: 'Number of students',
    times: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    quantity: 'number of students biking',
    unit: '',
    u: '',
    gen: (rng) => {
      const v = [rng.int(3, 6) * 2];
      for (let i = 0; i < 9; i++) v.push(Math.max(2, Math.min(30, v[i]! + rng.int(-2, 3) * 2)));
      return v;
    },
    axis: { yStart: 0, yMax: 32, grid: 2, labelEvery: 4 },
  },
  {
    intro: (n) => `${n} recorded how many books were borrowed from the school library each school day for two weeks`,
    title: 'Library books borrowed each day',
    xAxis: 'School day',
    yAxis: 'Books borrowed',
    times: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    quantity: 'number of books borrowed',
    unit: '',
    u: '',
    gen: (rng) => Array.from({ length: 10 }, () => rng.int(2, 9) * 5),
    axis: { yStart: 0, yMax: 50, grid: 5, labelEvery: 10 },
  },
];

const withU = (v: number, u: string) => `${v}${u}`;

export const readTimeSeries: QuestionTemplate = {
  id: 'm7.sta.graphs.time-series',
  topicId: 'm7.sta.graphs',
  title: 'Read changes from a time-series graph',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    const c = rng.pick(TS_CONTEXTS);
    const name = rng.pick(NAMES);
    const what = (t: string) => (c.say ? c.say[c.times.indexOf(t)]! : c.xAxis === 'Time' ? t : `${c.xAxis.toLowerCase()} ${t}`);
    for (;;) {
      const v = c.gen(rng);
      const svg = timeSeriesGraph(c.times, v, { ...c.axis, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis });
      const alt = `Time-series graph titled "${c.title}". ${c.times.map((t, i) => `${what(t)}: ${withU(v[i]!, c.u)}`).join(', ')}. Gridlines every ${c.axis.grid}.`;
      const scaleHint = `Each gridline on the vertical axis is worth ${c.axis.grid}${c.u}.`;
      const unit = c.unit ? { units: c.unit } : {};

      if (difficulty === 3) {
        const [i, j] = (rng.sample([...c.times.keys()], 2) as [number, number]).sort((a, b) => a - b);
        const d = v[j]! - v[i]!;
        if (d === 0 || j - i < 2) continue;
        const dir = d > 0 ? 'increase' : 'decrease';
        return {
          type: 'numeric',
          prompt: `${c.intro(name)}. The time-series graph shows the results.\n\nBy how much did the ${c.quantity} **${dir}** from ${what(c.times[i]!)} to ${what(c.times[j]!)}?`,
          figure: { svg, alt },
          answer: Math.abs(d),
          ...unit,
          calculator: 'not-allowed',
          hints: [`Read the value at ${what(c.times[i]!)} and at ${what(c.times[j]!)}.`, scaleHint, 'Then find the difference between them.'],
          solution: `At ${what(c.times[i]!)}: ${withU(v[i]!, c.u)}. At ${what(c.times[j]!)}: ${withU(v[j]!, c.u)}.\n\n${dir === 'increase' ? `Increase: $${v[j]} - ${v[i]} = ${d}$` : `Decrease: $${v[i]} - ${v[j]} = ${-d}$`}${c.u.trim() ? ` ${c.u.trim()}` : ''}`,
        };
      }
      // difficulty 4: which interval had the biggest increase?
      const rises = v.slice(1).map((x, i) => x - v[i]!);
      const best = Math.max(...rises);
      if (best <= 0 || rises.filter((r) => r === best).length !== 1) continue;
      const bi = rises.indexOf(best);
      const others = rng.sample(
        [...rises.keys()].filter((i) => i !== bi),
        3,
      );
      const opts = [bi, ...others];
      const interval = (i: number) => `From ${what(c.times[i]!)} to ${what(c.times[i + 1]!)}`;
      return {
        type: 'mcq',
        prompt: `${c.intro(name)}. The time-series graph shows the results.\n\nBetween which two readings next to each other did the ${c.quantity} **increase the most**?`,
        figure: { svg, alt },
        options: opts.map((i, k) => ({ id: ALPHA[k]!, text: interval(i) })),
        correct: 'a',
        feedback: Object.fromEntries(
          others.map((i, k) => [
            ALPHA[k + 1]!,
            rises[i]! > 0
              ? `It went up by ${rises[i]}${c.u} here. Look for a steeper part of the line.`
              : rises[i]! === 0
                ? 'The line is flat here, so there was no change.'
                : `The line goes down here, so the ${c.quantity} decreased.`,
          ]),
        ),
        calculator: 'not-allowed',
        hints: ['The steepest upward part of the line shows the biggest increase.', scaleHint],
        solution: `The steepest upward section is ${interval(bi).toLowerCase()}: from ${withU(v[bi]!, c.u)} to ${withU(v[bi + 1]!, c.u)}, an increase of ${withU(best, c.u)}. Every other increase on the graph is smaller.`,
      };
    }
  },
};

// ---------------- Clustered and stacked bar graphs ----------------

interface TwoWayContext {
  intro: (name: string) => string;
  title: string;
  xAxis: string;
  yAxis: string;
  cats: readonly string[];
  groups: readonly string[];
  /** "How many Year 8 students chose netball?" */
  ask: (group: string, cat: string) => string;
  /** "How many students chose netball altogether?" */
  askCat: (cat: string) => string;
  /** "Year 8 students" */
  groupNoun: (group: string) => string;
  /** "chose netball" */
  catVerb: (cat: string) => string;
  /** "How many more Year 8 students than Year 7 students chose netball?" */
  moreQ: (hi: string, lo: string, cat: string) => string;
  /** Axis label for the groups in a stacked bar graph. */
  groupAxis: string;
  /** What each category is, e.g. "sport". */
  catNoun: string;
}

const TWO_WAY: readonly TwoWayContext[] = [
  { intro: (n) => `${n} asked Year 7 and Year 8 students to name their favourite sport`, title: 'Favourite sport by year group', xAxis: 'Sport', yAxis: 'Number of students', cats: ['Rugby', 'Netball', 'Football', 'Basketball'], groups: ['Year 7', 'Year 8'], ask: (g, c) => `How many ${g} students chose ${c.toLowerCase()}?`, askCat: (c) => `How many students chose ${c.toLowerCase()} altogether?`, groupNoun: (g) => `${g} students`, catVerb: (c) => `chose ${c.toLowerCase()}`, moreQ: (h, l, c) => `How many more ${h} students than ${l} students chose ${c.toLowerCase()}?`, groupAxis: 'Year group', catNoun: 'sport' },
  { intro: (n) => `${n} asked students in Room 3 and Room 4 how they get to school`, title: 'How students get to school', xAxis: 'Way of getting to school', yAxis: 'Number of students', cats: ['Walk', 'Bike', 'Car', 'Bus'], groups: ['Room 3', 'Room 4'], ask: (g, c) => `How many ${g} students answered "${c}"?`, askCat: (c) => `How many students answered "${c}" altogether?`, groupNoun: (g) => `${g} students`, catVerb: (c) => `answered "${c}"`, moreQ: (h, l, c) => `How many more ${h} students than ${l} students answered "${c}"?`, groupAxis: 'Room', catNoun: 'way of getting to school' },
  { intro: (n) => `${n} recorded the lunches students chose from the canteen on a Monday and on a Friday`, title: 'Canteen lunches', xAxis: 'Lunch', yAxis: 'Number of lunches', cats: ['Sushi', 'Pie', 'Wrap', 'Salad'], groups: ['Monday', 'Friday'], ask: (g, c) => `How many ${c.toLowerCase()} lunches were chosen on ${g}?`, askCat: (c) => `How many ${c.toLowerCase()} lunches were chosen altogether?`, groupNoun: (g) => `lunches chosen on ${g}`, catVerb: (c) => `were ${c.toLowerCase()}`, moreQ: (h, l, c) => `How many more ${c.toLowerCase()} lunches were chosen on ${h} than on ${l}?`, groupAxis: 'Day', catNoun: 'lunch' },
  { intro: (n) => `${n} asked students who live in town and students who live on farms which animal they like best`, title: 'Favourite animal: town and farm', xAxis: 'Animal', yAxis: 'Number of students', cats: ['Dog', 'Cat', 'Horse', 'Lamb'], groups: ['Town', 'Farm'], ask: (g, c) => `How many ${g.toLowerCase()} students chose ${c.toLowerCase()}?`, askCat: (c) => `How many students chose ${c.toLowerCase()} altogether?`, groupNoun: (g) => `${g.toLowerCase()} students`, catVerb: (c) => `chose ${c.toLowerCase()}`, moreQ: (h, l, c) => `How many more ${h.toLowerCase()} students than ${l.toLowerCase()} students chose ${c.toLowerCase()}?`, groupAxis: 'Where students live', catNoun: 'animal' },
  { intro: (n) => `${n} asked students in each house group which camp activity they enjoyed most`, title: 'Favourite camp activity by house', xAxis: 'Activity', yAxis: 'Number of students', cats: ['Kayaking', 'Archery', 'Climbing'], groups: ['Kauri', 'Rimu', 'Tōtara'], ask: (g, c) => `How many students in ${g} chose ${c.toLowerCase()}?`, askCat: (c) => `How many students chose ${c.toLowerCase()} altogether?`, groupNoun: (g) => `students in ${g}`, catVerb: (c) => `chose ${c.toLowerCase()}`, moreQ: (h, l, c) => `How many more students in ${h} than in ${l} chose ${c.toLowerCase()}?`, groupAxis: 'House', catNoun: 'activity' },
];

export const twoWayBars: QuestionTemplate = {
  id: 'm7.sta.graphs.two-way-bars',
  topicId: 'm7.sta.graphs',
  title: 'Read clustered and stacked bar graphs (two categorical variables)',
  difficulties: [4, 5],
  generate({ rng, difficulty }) {
    const c = rng.pick(TWO_WAY);
    const name = rng.pick(NAMES);

    if (difficulty === 4) {
      // Clustered bar graph: categories along the bottom, one bar per group.
      const series = c.groups.map((g) => ({ name: g, values: c.cats.map(() => rng.int(1, 12)) }));
      const svg = clusteredBarGraph(c.cats, series, { yMax: 14, grid: 1, labelEvery: 2, title: c.title, xAxis: c.xAxis, yAxis: c.yAxis });
      const alt = `Clustered bar graph titled "${c.title}". ${c.cats.map((cat, i) => `${cat}: ${series.map((s) => `${s.name} ${s.values[i]}`).join(', ')}`).join('; ')}. Gridlines every 1.`;
      const hints0 = 'Use the key to tell which bar is which group.';
      for (;;) {
        const i = rng.int(0, c.cats.length - 1);
        if (rng.chance(0.5)) {
          const [ga, gb] = rng.sample([...c.groups.keys()], 2) as [number, number];
          const a = series[ga]!.values[i]!;
          const b = series[gb]!.values[i]!;
          if (a === b) continue;
          const [hi, lo] = a > b ? [ga, gb] : [gb, ga];
          const diff = Math.abs(a - b);
          return {
            type: 'numeric',
            prompt: `${c.intro(name)}. The clustered bar graph shows the results.\n\n${c.moreQ(c.groups[hi]!, c.groups[lo]!, c.cats[i]!)}`,
            figure: { svg, alt },
            answer: diff,
            form: 'integer',
            calculator: 'not-allowed',
            hints: [hints0, `Find the two ${c.cats[i]} bars and read their heights.`, 'Subtract to find the difference.'],
            solution: `${c.cats[i]}: ${c.groups[hi]} ${series[hi]!.values[i]}, ${c.groups[lo]} ${series[lo]!.values[i]}.\n\nDifference: $${series[hi]!.values[i]} - ${series[lo]!.values[i]} = ${diff}$`,
          };
        }
        const vals = series.map((s) => s.values[i]!);
        const sum = vals.reduce((x, y) => x + y, 0);
        return {
          type: 'numeric',
          prompt: `${c.intro(name)}. The clustered bar graph shows the results.\n\n${c.askCat(c.cats[i]!)}`,
          figure: { svg, alt },
          answer: sum,
          form: 'integer',
          calculator: 'not-allowed',
          hints: [hints0, `Read every bar in the ${c.cats[i]} cluster, then add them.`],
          solution: `${c.cats[i]}: ${series.map((s) => `${s.name} ${s.values[i]}`).join(', ')}.\n\nTotal: $${vals.join(' + ')} = ${sum}$`,
        };
      }
    }

    // difficulty 5: stacked bar graph, one bar per group split into categories.
    for (;;) {
      const counts = c.groups.map(() => c.cats.map(() => rng.int(1, 5) * 2));
      const totals = counts.map((r) => r.reduce((x, y) => x + y, 0));
      if (Math.max(...totals) > 30) continue;
      const series = c.cats.map((cat, j) => ({ name: cat, values: counts.map((r) => r[j]!) }));
      const svg = stackedBarGraph(c.groups, series, { yMax: 32, grid: 2, labelEvery: 4, title: c.title, xAxis: c.groupAxis, yAxis: c.yAxis });
      const alt = `Stacked bar graph titled "${c.title}". ${c.groups.map((g, gi) => `${g}: ${c.cats.map((cat, j) => `${cat} ${counts[gi]![j]}`).join(', ')} (total ${totals[gi]})`).join('; ')}. Segments stacked from the bottom in the order ${c.cats.join(', ')}. Gridlines every 2.`;
      const gi = rng.int(0, c.groups.length - 1);
      const g = c.groups[gi]!;
      const row = counts[gi]!;
      if (rng.chance(0.5)) {
        const j = rng.int(1, c.cats.length - 1);
        const bottom = row.slice(0, j).reduce((x, y) => x + y, 0);
        const top = bottom + row[j]!;
        return {
          type: 'numeric',
          prompt: `${c.intro(name)}. The stacked bar graph shows the results. Each bar is split into parts, one for each ${c.catNoun}.\n\n${c.ask(g, c.cats[j]!)}`,
          figure: { svg, alt },
          answer: row[j]!,
          form: 'integer',
          marks: 2,
          calculator: 'not-allowed',
          hints: [`Find the ${c.cats[j]} part of the ${g} bar using the key.`, 'Read the value at the top of that part and at the bottom of that part.', 'The size of the part is the difference between those two values.'],
          solution: `In the ${g} bar, the ${c.cats[j]} part starts at ${bottom} and ends at ${top}.\n\nSo the answer is $${top} - ${bottom} = ${row[j]}$.\n\nWatch out: reading just the top of the part (${top}) gives the running total, not the size of the part.`,
        };
      }
      const j = rng.int(0, c.cats.length - 1);
      const t = totals[gi]!;
      const k = gcd(row[j]!, t);
      return {
        type: 'numeric',
        prompt: `${c.intro(name)}. The stacked bar graph shows the results.\n\nWhat fraction of the ${c.groupNoun(g)} ${c.catVerb(c.cats[j]!)}? Give your answer in simplest form.`,
        figure: { svg, alt },
        answer: row[j]! / t,
        form: 'simplest-fraction',
        marks: 2,
        calculator: 'not-allowed',
        hints: [`The top of the ${g} bar tells you how many there are in that group altogether.`, `Find the size of the ${c.cats[j]} part: the top of the part take away the bottom.`, 'Write it as a fraction of the total, then simplify.'],
        solution: `The ${g} bar reaches ${t}, so there are ${t} altogether.\n\nThe ${c.cats[j]} part is ${row[j]}.\n\nFraction: $${frac(row[j]!, t, true)}${k > 1 ? ` = ${frac(row[j]!, t)}` : ''}$`,
      };
    }
  },
};

export const templates: QuestionTemplate[] = [readBarGraph, readDotPlot, chooseDisplay, readTimeSeries, twoWayBars];
