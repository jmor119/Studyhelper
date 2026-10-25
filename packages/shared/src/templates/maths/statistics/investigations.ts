import type { QuestionTemplate } from '../../types';
import { NAMES, PLACES } from '../../format';

// m9.sta.investigations — variable types, investigation types (summary, comparison,
// relationship, time-series), and the parts of a good statistical question.

const CATEGORICAL: ReadonlyArray<readonly [string, string?]> = [
  ['Favourite colour'],
  ['Eye colour'],
  ['Month of birth'],
  ['Usual way of getting to school'],
  ['Favourite sport'],
  ['Type of pet'],
  ['Whether a student has a part-time job (yes or no)'],
  ['Hand used for writing (left or right)'],
  ['Favourite native bird'],
  ['Country of birth'],
  ['Favourite ice cream flavour'],
  ['Super Rugby team supported'],
  ['Postcode', 'Postcodes are numbers, but they are labels for areas. It makes no sense to add them or find their mean.'],
  ['Netball bib position (GS, GA, WA, C, WD, GD, GK)'],
  ['Rugby jersey number', 'Jersey numbers are labels for positions. A number 8 is not "twice" a number 4.'],
  ['Phone brand'],
];

const NUMERICAL: ReadonlyArray<readonly [string, string?]> = [
  ['Height (cm)'],
  ['Arm span (cm)'],
  ['Number of siblings'],
  ['Time taken to get to school (minutes)'],
  ['Hours of sleep last night'],
  ['Number of pets'],
  ['Shoe size', 'Shoe sizes are numbers that can be ordered and compared, so shoe size is numerical.'],
  ['Mass of school bag (kg)'],
  ['Number of text messages sent yesterday'],
  ['Reaction time (seconds)'],
  ['Distance from home to school (km)'],
  ['Age (years)'],
  ['Score in a maths quiz'],
  ['Number of books read last term'],
  ['Maximum daily temperature (°C)'],
];

const CAT_WHY = 'A **categorical** variable sorts each person or thing into a group or category (often words, sometimes number labels).';
const NUM_WHY = 'A **numerical** variable is a count or a measurement: a number you could sensibly order, add or average.';

export const variableType: QuestionTemplate = {
  id: 'm9.sta.investigations.variable-type',
  topicId: 'm9.sta.investigations',
  title: 'Categorical or numerical variable?',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const isCat = rng.chance(0.5);
      const [v, note] = rng.pick(isCat ? CATEGORICAL : NUMERICAL);
      return {
        type: 'mcq',
        prompt: `A class is planning a survey. Is this variable **categorical** or **numerical**?\n\n> ${v}`,
        options: [
          { id: 'cat', text: 'Categorical' },
          { id: 'num', text: 'Numerical' },
        ],
        correct: isCat ? 'cat' : 'num',
        shuffle: false,
        feedback: (isCat
          ? { num: `"${v}" puts each person into a group; it isn't a count or a measurement.` }
          : { cat: `"${v}" is a count or measurement, so it is numerical.` }) as Record<string, string>,
        hints: ['Ask yourself: is the answer a group name (or label), or a count or measurement?'],
        solution: `${isCat ? CAT_WHY : NUM_WHY}\n\n"${v}" is **${isCat ? 'categorical' : 'numerical'}**.${note ? ` ${note}` : ''}`,
      };
    }
    const wantNum = rng.chance(0.5);
    const nNum = rng.int(2, 3);
    const nums = rng.sample(NUMERICAL, nNum);
    const tricky = CATEGORICAL.filter(([, note]) => note);
    const cats = [...(rng.chance(0.6) ? [rng.pick(tricky)] : []), ...rng.sample(CATEGORICAL.filter(([, note]) => !note), 5)].slice(0, 5 - nNum);
    const all = rng.shuffle([...nums.map((x) => ({ x, num: true })), ...cats.map((x) => ({ x, num: false }))]);
    const options = all.map((o, i) => ({ id: 'abcde'[i]!, text: o.x[0] }));
    const correct = all.flatMap((o, i) => (o.num === wantNum ? ['abcde'[i]!] : []));
    const notes = all.filter((o) => o.x[1]).map((o) => o.x[1]!);
    return {
      type: 'multi',
      prompt: `${rng.pick(NAMES)}'s class is planning a survey of ${rng.pick(GROUPS)}. Here are some of the variables on their list.\n\nSelect **all** the **${wantNum ? 'numerical' : 'categorical'}** variables.`,
      options,
      correct,
      hints: [
        'Numerical variables are counts or measurements. Categorical variables put things into groups.',
        'Be careful with variables that use numbers as labels.',
      ],
      solution: [
        `Numerical: ${all.filter((o) => o.num).map((o) => o.x[0]).join('; ')}.`,
        `Categorical: ${all.filter((o) => !o.num).map((o) => o.x[0]).join('; ')}.`,
        ...notes,
      ].join('\n\n'),
    };
  },
};

// ---------------- Investigation types ----------------

const GROUPS = [
  'Year 9 students at our school',
  'students in our class',
  'Year 9 students in New Zealand',
  'students at our school',
] as const;

/** Numerical variables, with the phrases needed to build each kind of question. */
const NUM_VARS = [
  { v: 'arm span', typical: 'arm span', more: 'have longer arm spans' },
  { v: 'height', typical: 'height', more: 'be taller' },
  { v: 'travel time to school', typical: 'time taken to get to school', more: 'take longer to get to school' },
  { v: 'sleep on a school night', typical: 'amount of sleep on a school night', more: 'get more sleep on a school night' },
  { v: 'daily screen time', typical: 'daily screen time', more: 'spend more time on screens each day' },
  { v: 'reaction time', typical: 'reaction time', more: 'have faster reaction times' },
  { v: 'school bag mass', typical: 'school bag mass', more: 'carry heavier school bags' },
] as const;

const PAIRS = [
  ['Year 9 students at our school', 'Year 13 students at our school'],
  ['students at our school who play a team sport', 'students at our school who do not'],
  ['Year 9 students at our school who walk to school', 'Year 9 students at our school who are driven'],
  ['Year 9 students in Auckland', 'Year 9 students in Christchurch'],
] as const;

const REL_PAIRS = [
  ['height', 'arm span'],
  ['daily screen time', 'amount of sleep on a school night'],
  ['hours of sleep', 'reaction time'],
  ['height', 'shoe size'],
  ['time spent studying', 'test score'],
  ['travel time to school', 'distance from home to school'],
] as const;

type InvType = 'summary' | 'comparison' | 'relationship' | 'time-series';

function makeQuestion(rng: Parameters<QuestionTemplate['generate']>[0]['rng'], type: InvType) {
  const g = rng.pick(GROUPS);
  if (type === 'summary') {
    if (rng.chance(0.3)) {
      const [variable, text] = rng.pick([
        ['way of getting to school', `What is the most common way of getting to school for ${g}?`],
        ['favourite sport to play', `What is the most popular sport to play among ${g}?`],
        ['favourite native bird', `What is the most popular native bird among ${g}?`],
      ] as const);
      return { text, variable, group: g };
    }
    const nv = rng.pick(NUM_VARS);
    return { text: `What is the typical ${nv.typical} of ${g}?`, variable: nv.v, group: g };
  }
  if (type === 'comparison') {
    const nv = rng.pick(NUM_VARS);
    const [a, b] = rng.pick(PAIRS);
    const more = nv.more === 'be taller' ? 'tend to be taller' : `tend to ${nv.more}`;
    return { text: `Do ${a} ${more} than ${b}?`, variable: nv.v, group: `${a} and ${b}` };
  }
  if (type === 'relationship') {
    const [x, y] = rng.pick(REL_PAIRS);
    return { text: `Is there a relationship between ${x} and ${y} for ${g}?`, variable: `${x} and ${y}`, group: g };
  }
  const place = rng.pick(PLACES);
  const ts = rng.pick([
    `How has the number of students enrolled at our school changed each year since 2015?`,
    `How did the daily maximum temperature in ${place} change over January?`,
    `How has the price of a 2-litre bottle of milk changed each month over the last five years?`,
    `How has the number of visitors to the ${place} i-SITE changed month by month over the last three years?`,
    `How did the number of tūī visiting our school's feeder change each week during Term 3?`,
  ]);
  return { text: ts, variable: '', group: '' };
}

const TYPE_LABEL: Record<InvType, string> = {
  summary: 'Summary',
  comparison: 'Comparison',
  relationship: 'Relationship',
  'time-series': 'Time-series',
};

const TYPE_WHY: Record<InvType, string> = {
  summary: 'It asks about one variable for one group (what is typical, or most common).',
  comparison: 'It compares the same variable across two groups.',
  relationship: 'It asks whether two variables measured on the same people (or things) are related.',
  'time-series': 'It asks how one variable changes over time.',
};

export const investigationType: QuestionTemplate = {
  id: 'm9.sta.investigations.investigation-type',
  topicId: 'm9.sta.investigations',
  title: 'Identify the type of investigation (summary, comparison, relationship, time-series)',
  difficulties: [2, 3],
  generate({ rng, difficulty }) {
    const types: InvType[] = ['summary', 'comparison', 'relationship', 'time-series'];
    if (difficulty === 2) {
      const t = rng.pick(types);
      const q = makeQuestion(rng, t);
      return {
        type: 'mcq',
        prompt: `What type of investigation would this statistical question lead to?\n\n> ${q.text}`,
        options: types.map((x) => ({ id: x, text: TYPE_LABEL[x] })),
        correct: t,
        shuffle: false,
        feedback: Object.fromEntries(
          types.filter((x) => x !== t).map((x) => [x, `A ${x} investigation: ${TYPE_WHY[x].charAt(0).toLowerCase()}${TYPE_WHY[x].slice(1)} That isn't what this question asks.`]),
        ),
        hints: [
          'Count the groups and the variables. One group and one variable? Two groups? Two variables? Over time?',
        ],
        solution: `This is a **${TYPE_LABEL[t].toLowerCase()}** investigation. ${TYPE_WHY[t]}`,
      };
    }
    const target = rng.pick(types);
    const qs = rng.shuffle(types).map((t) => ({ t, q: makeQuestion(rng, t) }));
    const ids = ['a', 'b', 'c', 'd'];
    return {
      type: 'mcq',
      prompt: `${rng.pick(NAMES)}'s group is choosing a question for a statistics project. They want to carry out a **${TYPE_LABEL[target].toLowerCase()}** investigation.\n\nWhich statistical question should they choose?`,
      options: qs.map((x, i) => ({ id: ids[i]!, text: x.q.text })),
      correct: ids[qs.findIndex((x) => x.t === target)]!,
      shuffle: false,
      feedback: Object.fromEntries(
        qs.filter((x) => x.t !== target).map((x) => [ids[qs.indexOf(x)]!, `This leads to a ${x.t} investigation. ${TYPE_WHY[x.t]}`]),
      ),
      hints: [`${TYPE_LABEL[target]} investigation: ${TYPE_WHY[target].charAt(0).toLowerCase()}${TYPE_WHY[target].slice(1)}`],
      solution: qs
        .map((x) => `- ${x.t === target ? '**' : ''}${x.q.text}${x.t === target ? '**' : ''} → ${x.t}`)
        .join('\n'),
    };
  },
};

export const questionParts: QuestionTemplate = {
  id: 'm9.sta.investigations.question-parts',
  topicId: 'm9.sta.investigations',
  title: 'The variable, the group, and what makes a good statistical question',
  difficulties: [3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const t = rng.pick(['summary', 'comparison'] as const);
      let q = makeQuestion(rng, t);
      while (t === 'summary' && !NUM_VARS.some((nv) => nv.v === q.variable)) q = makeQuestion(rng, t);
      const ask = rng.pick(['variable', 'group'] as const);
      const otherVar = rng.pick(NUM_VARS.filter((nv) => nv.v !== q.variable)).v;
      const otherGroup =
        t === 'summary' ? rng.pick(GROUPS.filter((g) => g !== q.group)) : rng.pick(GROUPS);
      const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
      const intent = t === 'summary' ? 'Finding the typical value' : 'Comparing the two groups';
      const options =
        ask === 'variable'
          ? [
              { id: 'right', text: cap(q.variable) },
              { id: 'group', text: cap(q.group) },
              { id: 'other', text: cap(otherVar) },
              { id: 'intent', text: intent },
            ]
          : [
              { id: 'right', text: cap(q.group) },
              { id: 'var', text: cap(q.variable) },
              { id: 'other', text: cap(otherGroup) },
              { id: 'all', text: 'Everyone in New Zealand' },
            ];
      return {
        type: 'mcq',
        prompt: `Here is a statistical question:\n\n> ${q.text}\n\nWhat is the **${ask === 'variable' ? 'variable' : 'group (population)'}** in this question?`,
        options,
        correct: 'right',
        feedback: (ask === 'variable'
          ? {
              group: 'That is the group being investigated, not the variable being measured.',
              other: "That variable isn't mentioned in the question.",
              intent: 'That is the intent (what the question wants to do), not the variable.',
            }
          : {
              var: 'That is the variable being measured, not the group.',
              other: 'Read the question again: this is a different group.',
              all: 'The question names a much more specific group than that.',
            }) as Record<string, string>,
        hints: [
          'A statistical question names the variable (what is measured), the group (who it is about) and the intent (summarise, compare, relationship).',
        ],
        solution: `In "${q.text}"\n\n- the **variable** is ${q.variable}\n- the **group** is ${q.group}\n- the **intent** is ${t === 'summary' ? 'to summarise (find what is typical)' : 'to compare two groups'}.`,
      };
    }

    // difficulty 4: choose the best statistical question
    const nv = rng.pick(NUM_VARS);
    const g = rng.pick(GROUPS);
    const [n1, n2] = rng.sample(NAMES, 2) as [string, string];
    const good = { id: 'good', text: `What is the typical ${nv.typical} of ${g}?` };
    const flawed = rng.sample(
      [
        { id: 'one', text: `What is ${n1}'s ${nv.typical}?`, why: `This is about one person, so there is no variation to investigate. It isn't a statistical question.` },
        { id: 'nogroup', text: `What is the typical ${nv.typical}?`, why: "It doesn't say which group of people it is about." },
        { id: 'vague', text: `Are ${g} good at sport?`, why: '"Good at sport" is vague. It is not clear what variable would be measured.' },
        { id: 'pair', text: `Is ${n1}'s ${nv.typical} greater than ${n2}'s?`, why: 'This compares two individuals and can be answered with two measurements, so it is not a statistical question.' },
      ],
      3,
    );
    const options = rng.shuffle([good, ...flawed.map(({ id, text }) => ({ id, text }))]);
    return {
      type: 'mcq',
      prompt: `${n2} is planning a statistics project about ${nv.v}. Which of these is the **best** statistical question for the project?`,
      options,
      correct: 'good',
      feedback: Object.fromEntries(flawed.map((f) => [f.id, f.why])),
      shuffle: false,
      hints: [
        'A good statistical question names a variable that can be measured, a clear group, and an intent.',
        'It should need data with variation to answer it, not just one or two measurements.',
      ],
      solution: [
        `**${good.text}** is the best. It names the variable (${nv.v}), the group (${g}) and the intent (to find what is typical), and answering it needs data from many people.`,
        ...flawed.map((f) => `- "${f.text}" ${f.why}`),
      ].join('\n\n'),
    };
  },
};

export const investigationTemplates: QuestionTemplate[] = [variableType, investigationType, questionParts];
