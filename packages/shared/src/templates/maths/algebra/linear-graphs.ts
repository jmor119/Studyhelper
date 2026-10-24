import type { QuestionTemplate } from '../../types';
import { polyAnswer, tex, texSigned } from '../../format';
import { lineGraphSvg, lineTex, mcqFields, t } from './helpers';

// m9.alg.linear-graphs — y = mx + c: tables of values, the y-intercept (0, c), the sign of the
// gradient, and horizontal lines y = c. Year 9 finds the SIGN of m and the value of c; working out
// the size of a gradient from a graph is left to Year 10 (except from a table, as a d5 extension).

const GRAPH_M = [-3, -2, -1, -0.5, 0.5, 1, 2, 3] as const;

/** "2 × 3 + 1" style substitution into mx + c. */
function sub(m: number, x: number, c: number): string {
  const mx = m === 1 ? texSigned(x) : m === -1 ? `-${texSigned(x)}` : `${tex(m)} \\times ${texSigned(x)}`;
  return c === 0 ? mx : `${mx} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
}

/**
 * Alt text giving two grid points on the line (not the intercept or slope directly), so a
 * screen-reader user has the same information as the picture without being handed the answer.
 */
function graphAlt(m: number, c: number): string {
  const xs = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5].filter((x) => Number.isInteger(m * x + c) && Math.abs(m * x + c) <= 5);
  const pts = [xs[0]!, xs[xs.length - 1]!].map((x) => `(${x}, ${m * x + c})`.replace(/-/g, '−'));
  return `A straight line drawn on a coordinate grid from −5 to 5 on both axes, passing through the points ${pts[0]} and ${pts[1]}.`;
}

export const tableOfValues: QuestionTemplate = {
  id: 'm9.alg.linear-graphs.table-of-values',
  topicId: 'm9.alg.linear-graphs',
  title: 'Tables of values and points on a line',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const m = rng.int(1, 5);
      const c = rng.int(-5, 9);
      const x = rng.int(0, 6);
      const y = m * x + c;
      return {
        type: 'numeric',
        prompt: `For the line $${lineTex(m, c)}$, find the value of $y$ when $x = ${x}$.`,
        answer: y,
        calculator: 'not-allowed',
        hints: [`Substitute $x = ${x}$ into the equation.`],
        solution: `$y = ${sub(m, x, c)} = ${tex(y)}$`,
      };
    }
    if (difficulty === 2) {
      const m = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
      const c = rng.int(-5, 5);
      const start = rng.int(-3, -1);
      const xs = [start, start + 1, start + 2, start + 3, start + 4];
      const missing = rng.pick(xs.filter((x) => x !== 0));
      const ys = xs.map((x) => (x === missing ? '?' : String(m * x + c).replace('-', '−')));
      const y = m * missing + c;
      return {
        type: 'numeric',
        prompt: [
          `Here is part of a table of values for $${lineTex(m, c)}$.`,
          `| $x$ | ${xs.map((x) => String(x).replace('-', '−')).join(' | ')} |\n|---|${xs.map(() => '---').join('|')}|\n| $y$ | ${ys.join(' | ')} |`,
          'Find the missing $y$ value.',
        ].join('\n\n'),
        answer: y,
        calculator: 'not-allowed',
        hints: [`The missing value is in the column for $x = ${missing}$. Substitute this $x$ value into the equation.`, 'Put negative numbers in brackets when you substitute.'],
        solution: `$y = ${sub(m, missing, c)} = ${tex(y)}$\n\nYou can check it fits the pattern: the $y$ values change by $${tex(m)}$ each time $x$ goes up by 1.`,
      };
    }
    // difficulty 3
    const m = rng.pick([-3, -2, -1, 1, 2, 3, 4]);
    const c = rng.int(-6, 6);
    const kind = rng.pick(['on-line', 'on-line', 'missing-y', 'missing-x'] as const);
    if (kind === 'on-line') {
      const x = rng.int(-4, 5);
      const yTrue = m * x + c;
      const isOn = rng.chance(0.5);
      const y = isOn ? yTrue : yTrue + rng.pick([-2, -1, 1, 2]);
      return {
        type: 'mcq',
        prompt: `Does the point $(${x}, ${y})$ lie on the line $${lineTex(m, c)}$?`,
        options: [
          { id: 'yes', text: 'Yes, it lies on the line' },
          { id: 'no', text: 'No, it does not lie on the line' },
        ],
        correct: isOn ? 'yes' : 'no',
        shuffle: false,
        calculator: 'not-allowed',
        hints: [`Substitute $x = ${x}$ into the equation and see whether you get $y = ${y}$.`],
        solution: [
          `When $x = ${x}$: $y = ${sub(m, x, c)} = ${tex(yTrue)}$`,
          isOn
            ? `This matches the point's $y$-coordinate, so $(${x}, ${y})$ **is** on the line. Its coordinates make the equation true.`
            : `The point has $y = ${y}$, not $${tex(yTrue)}$, so it is **not** on the line.`,
        ].join('\n\n'),
      };
    }
    if (kind === 'missing-y') {
      const x = rng.int(-5, 6);
      const y = m * x + c;
      return {
        type: 'numeric',
        prompt: `The point $(${x}, k)$ lies on the line $${lineTex(m, c)}$. Find the value of $k$.`,
        answer: y,
        calculator: 'not-allowed',
        hints: ['A point lies on a line when its coordinates make the equation true.', `Substitute $x = ${x}$.`],
        solution: `$k = ${sub(m, x, c)} = ${tex(y)}$`,
      };
    }
    const x = rng.int(-5, 6);
    const y = m * x + c;
    return {
      type: 'numeric',
      prompt: `The point $(k, ${y})$ lies on the line $${lineTex(m, c)}$. Find the value of $k$.`,
      answer: x,
      calculator: 'not-allowed',
      hints: [`Substitute $y = ${y}$, then solve the equation for $x$.`],
      solution: [
        `$${y} = ${lineTex(m, c).replace('y = ', '')}$`,
        c === 0 ? '' : `${c > 0 ? `Subtract ${c}` : `Add ${-c}`}: $${tex(y - c)} = ${m === 1 ? '' : m === -1 ? '-' : m}x$`,
        Math.abs(m) === 1 && m === 1 ? `So $k = ${x}$.` : `Divide by ${tex(m)}: $x = ${x}$, so $k = ${x}$.`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
  },
};

export const interceptAndGradient: QuestionTemplate = {
  id: 'm9.alg.linear-graphs.intercept-gradient',
  topicId: 'm9.alg.linear-graphs',
  title: 'The y-intercept and the sign of the gradient',
  difficulties: [1, 2, 3, 4],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const m = rng.pick(GRAPH_M);
      const c = rng.int(-4, 4);
      return {
        type: 'numeric',
        prompt: 'What is the $y$-intercept of the line shown? Give the $y$-value where the line crosses the $y$-axis.',
        figure: { svg: lineGraphSvg(m, c), alt: graphAlt(m, c) },
        answer: c,
        calculator: 'not-allowed',
        hints: ['The $y$-axis is the vertical axis, where $x = 0$.'],
        solution: `The line crosses the $y$-axis at $(0, ${c})$, so the $y$-intercept is $${tex(c)}$.`,
      };
    }
    if (difficulty === 2) {
      const m = rng.pick([...GRAPH_M, 0, 0]);
      const c = rng.int(-4, 4);
      const correct = m > 0 ? 'pos' : m < 0 ? 'neg' : 'zero';
      return {
        type: 'mcq',
        prompt: 'Is the gradient of this line positive, negative or zero?',
        figure: { svg: lineGraphSvg(m, c), alt: graphAlt(m, c) },
        options: [
          { id: 'pos', text: 'Positive' },
          { id: 'neg', text: 'Negative' },
          { id: 'zero', text: 'Zero' },
        ],
        correct,
        shuffle: false,
        feedback: {
          ...(correct !== 'pos' && { pos: 'A positive gradient slopes **up** as you move from left to right.' }),
          ...(correct !== 'neg' && { neg: 'A negative gradient slopes **down** as you move from left to right.' }),
          ...(correct !== 'zero' && { zero: 'A gradient of zero means a horizontal (flat) line.' }),
        },
        calculator: 'not-allowed',
        hints: ['Read the line from left to right, like reading a sentence.'],
        solution:
          m > 0
            ? 'Reading from left to right, the line goes **up**, so the gradient is **positive**.'
            : m < 0
              ? 'Reading from left to right, the line goes **down**, so the gradient is **negative**.'
              : `The line is horizontal, so its gradient is **zero**. Its equation is $y = ${c}$.`,
      };
    }
    if (difficulty === 3) {
      if (rng.chance(0.3)) {
        // horizontal line through (a, b)
        let [a, b] = [0, 0];
        while (a === 0 || b === 0 || Math.abs(a) === Math.abs(b)) [a, b] = [rng.int(-6, 6), rng.int(-6, 6)];
        const mcq = mcqFields(rng, { text: `$y = ${b}$` }, [
          { text: `$x = ${a}$`, feedback: `$x = ${a}$ is a **vertical** line: every point on it has $x$-coordinate ${tex(a)}.` },
          { text: `$y = ${a}$`, feedback: `On a horizontal line, the $y$-coordinate stays the same. Here that is ${tex(b)}, not ${tex(a)}.` },
          { text: `$x = ${b}$`, feedback: `Lines of the form $x = \\ldots$ are vertical, not horizontal.` },
        ]);
        return {
          type: 'mcq',
          prompt: `Which is the equation of the horizontal line through the point $(${a}, ${b})$?`,
          ...mcq,
          calculator: 'not-allowed',
          hints: ['On a horizontal line, which coordinate stays the same for every point?'],
          solution: `Every point on a horizontal line has the same $y$-coordinate. This line passes through $(${a}, ${b})$, so every point has $y = ${b}$.\n\nThe equation is $y = ${b}$. Its gradient is 0.`,
        };
      }
      let [m, c] = [0, 0];
      while (m === 0 || c === 0 || Math.abs(m) === Math.abs(c)) [m, c] = [rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]), rng.int(-6, 6)];
      const written = rng.chance(0.4) ? `y = ${c} ${m < 0 ? '-' : '+'} ${Math.abs(m) === 1 ? '' : Math.abs(m)}x` : lineTex(m, c);
      const up = 'Slopes **up** from left to right';
      const down = 'Slopes **down** from left to right';
      const desc = (slope: string, yi: number) => `${slope}, and crosses the $y$-axis at $(0, ${yi})$`;
      const mcq = mcqFields(rng, { text: desc(m > 0 ? up : down, c) }, [
        { text: desc(m > 0 ? down : up, c), feedback: `The sign of $m$ (the number in front of $x$) is ${m > 0 ? 'positive' : 'negative'}, so the line slopes ${m > 0 ? 'up' : 'down'}.` },
        { text: desc(m > 0 ? up : down, m), feedback: `The $y$-intercept is the number term, $${tex(c)}$, not the coefficient of $x$.` },
        { text: desc(m > 0 ? down : up, m), feedback: 'Both parts are mixed up: the coefficient of $x$ gives the slope, and the number term gives the $y$-intercept.' },
      ]);
      return {
        type: 'mcq',
        prompt: `Which statement describes the graph of $${written}$?`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['In $y = mx + c$, the sign of $m$ tells you which way the line slopes.', 'The $y$-intercept is at $(0, c)$: substitute $x = 0$.'],
        solution: [
          `In $y = mx + c$ form this is $${lineTex(m, c)}$, so $m = ${m}$ and $c = ${c}$.`,
          `$m$ is ${m > 0 ? 'positive, so the line slopes up' : 'negative, so the line slopes down'} from left to right.`,
          `When $x = 0$, $y = ${c}$, so the line crosses the $y$-axis at $(0, ${c})$.`,
        ].join('\n\n'),
      };
    }
    // difficulty 4
    if (rng.chance(0.5)) {
      // y-intercept from a table that doesn't include x = 0
      const m = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
      const c = rng.int(-8, 8);
      const start = rng.int(1, 3);
      const xs = [start, start + 1, start + 2, start + 3];
      const ys = xs.map((x) => m * x + c);
      return {
        type: 'numeric',
        prompt: [
          'The table shows some points on a straight line.',
          `| $x$ | ${xs.join(' | ')} |\n|---|${xs.map(() => '---').join('|')}|\n| $y$ | ${ys.map((y) => String(y).replace('-', '−')).join(' | ')} |`,
          'What is the $y$-intercept of the line?',
        ].join('\n\n'),
        answer: c,
        marks: 2,
        calculator: 'not-allowed',
        hints: ['The $y$-intercept is the value of $y$ when $x = 0$.', 'How much does $y$ change each time $x$ goes up by 1? Work backwards to $x = 0$.'],
        solution: [
          `Each time $x$ goes up by 1, $y$ changes by $${tex(m)}$.`,
          `Working backwards from $x = ${start}$ to $x = 0$ means going back ${start} step${start === 1 ? '' : 's'}: $y = ${tex(ys[0]!)} - ${start} \\times ${texSigned(m)} = ${tex(c)}$`,
          `So the line crosses the $y$-axis at $(0, ${c})$ and the $y$-intercept is $${tex(c)}$.`,
        ].join('\n\n'),
      };
    }
    // which line is steepest?
    const mags = rng.sample([1, 2, 3, 4, 5, 6], 4).sort((a, b) => a - b);
    const lines = mags.map((mag) => ({ m: mag * rng.sign(), c: rng.int(-6, 6) }));
    // make the steepest negative half the time, to test that steepness ignores the sign
    const steep = lines[3]!;
    if (rng.chance(0.5)) steep.m = -Math.abs(steep.m);
    const mcq = mcqFields(
      rng,
      { text: `$${lineTex(steep.m, steep.c)}$` },
      lines.slice(0, 3).map((l) => ({
        text: `$${lineTex(l.m, l.c)}$`,
        feedback: `Steepness depends on the size of $m$, ignoring its sign. Here the size is ${Math.abs(l.m)}, which is less than ${Math.abs(steep.m)}.`,
      })),
    );
    return {
      type: 'mcq',
      prompt: 'Which of these lines is the steepest?',
      ...mcq,
      calculator: 'not-allowed',
      hints: ['Look at the number in front of $x$ in each equation.', 'A bigger number (ignoring its sign) means a steeper line. The sign only tells you whether it slopes up or down.'],
      solution: [
        `The steepness depends on the size of the gradient $m$, ignoring the sign. The gradients are ${lines.map((l) => `$${tex(l.m)}$`).join(', ')}.`,
        `The largest size is ${Math.abs(steep.m)}, so $${lineTex(steep.m, steep.c)}$ is the steepest${steep.m < 0 ? ' (it slopes down, but steeply)' : ''}.`,
      ].join('\n\n'),
    };
  },
};

export const matchEquation: QuestionTemplate = {
  id: 'm9.alg.linear-graphs.match-equation',
  topicId: 'm9.alg.linear-graphs',
  title: 'Match a line to its equation',
  difficulties: [3, 4, 5],
  generate({ rng, difficulty }) {
    if (difficulty === 3) {
      const m = rng.pick([-3, -2, -1, 1, 2, 3]);
      const c = rng.nonZeroInt(-4, 4);
      const mcq = mcqFields(rng, { text: `$${lineTex(m, c)}$` }, [
        { text: `$${lineTex(-m, c)}$`, feedback: `This has the right $y$-intercept, but its gradient is ${m > 0 ? 'negative' : 'positive'}, so it would slope the other way.` },
        { text: `$${lineTex(m, -c)}$`, feedback: `This slopes the right way, but it crosses the $y$-axis at $(0, ${-c})$.` },
        { text: `$${lineTex(-m, -c)}$`, feedback: 'Both the slope and the $y$-intercept are wrong for this graph.' },
      ]);
      return {
        type: 'mcq',
        prompt: 'Which equation could be the equation of the line shown?',
        figure: { svg: lineGraphSvg(m, c), alt: graphAlt(m, c) },
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Where does the line cross the $y$-axis? That gives $c$.', 'Does the line slope up or down from left to right? That gives the sign of $m$.'],
        solution: [
          `The line crosses the $y$-axis at $(0, ${c})$, so $c = ${c}$.`,
          `It slopes ${m > 0 ? 'up' : 'down'} from left to right, so $m$ is ${m > 0 ? 'positive' : 'negative'}.`,
          `The only option with both is $${lineTex(m, c)}$.`,
        ].join('\n\n'),
      };
    }
    // tables of values
    const m = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]);
    let c = rng.nonZeroInt(-7, 7);
    if (Math.abs(c) === Math.abs(m)) c += c > 0 ? 1 : -1;
    const start = difficulty === 4 ? rng.int(-2, 0) : rng.int(1, 3);
    const xs = [start, start + 1, start + 2, start + 3, start + 4];
    const ys = xs.map((x) => m * x + c);
    const tableMd = `| $x$ | ${xs.map((x) => String(x).replace('-', '−')).join(' | ')} |\n|---|${xs.map(() => '---').join('|')}|\n| $y$ | ${ys.map((y) => String(y).replace('-', '−')).join(' | ')} |`;
    if (difficulty === 4) {
      const mcq = mcqFields(rng, { text: `$${lineTex(m, c)}$` }, [
        { text: `$${lineTex(-m, c)}$`, feedback: `The $y$ values ${m > 0 ? 'increase' : 'decrease'} as $x$ increases, so the gradient is ${m > 0 ? 'positive' : 'negative'}.` },
        { text: `$${lineTex(c, m)}$`, feedback: 'The gradient and the $y$-intercept have been swapped.' },
        { text: `$${lineTex(m, m + c)}$`, feedback: `$${tex(m + c)}$ is the value of $y$ when $x = 1$. The $y$-intercept is the value when $x = 0$.` },
        { text: `$${lineTex(m, -c)}$`, feedback: `Check the table at $x = 0$: $y = ${c}$.` },
      ]);
      return {
        type: 'mcq',
        prompt: `Which equation matches this table of values?\n\n${tableMd}`,
        ...mcq,
        calculator: 'not-allowed',
        hints: ['Find $y$ when $x = 0$. That is $c$.', 'As $x$ increases, do the $y$ values go up or down?'],
        solution: [
          `When $x = 0$, $y = ${c}$, so $c = ${c}$.`,
          `Each time $x$ goes up by 1, $y$ changes by $${tex(m)}$, so $m = ${m}$.`,
          `The equation is $${lineTex(m, c)}$. Check with $x = ${xs[4]}$: $${sub(m, xs[4]!, c)} = ${tex(ys[4]!)}$ ✓`,
        ].join('\n\n'),
      };
    }
    // difficulty 5: write the equation from a table without x = 0
    return {
      type: 'expression',
      prompt: `The table shows points on a straight line.\n\n${tableMd}\n\nWrite the equation of the line in the form $y = mx + c$.`,
      answer: polyAnswer([t(m, 'x'), t(c)]),
      variables: ['x'],
      marks: 3,
      calculator: 'not-allowed',
      hints: [
        'How much does $y$ change each time $x$ goes up by 1? That is the gradient, $m$.',
        'Work backwards to find $y$ when $x = 0$. That is $c$.',
      ],
      solution: [
        `Each time $x$ goes up by 1, $y$ changes by $${tex(m)}$, so $m = ${m}$.`,
        `Work back from $x = ${start}$ to $x = 0$: $y = ${tex(ys[0]!)} - ${start} \\times ${texSigned(m)} = ${tex(c)}$, so $c = ${c}$.`,
        `The equation is $${lineTex(m, c)}$.`,
        `Check with $x = ${xs[2]}$: $${sub(m, xs[2]!, c)} = ${tex(ys[2]!)}$ ✓`,
      ].join('\n\n'),
    };
  },
};
