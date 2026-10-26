import type { QuestionTemplate } from '../../../types';
import { NAMES, poly, polyAnswer, tex } from '../../../format';
import { coordinatePlane, dot, label, svgDoc, ACCENT } from '../../../svg';
import { mcqFields, sticksFor, stickPatternSvg, t, type Choice, type StickShape } from './notation-helpers';

// m7.alg.linear-patterns — the four-quadrant coordinate plane, linear patterns with a constant
// increase or decrease, rules of the form t = a × n + d (in words and as equations), and using a
// rule to predict and test conjectures. Year 7 scope: patterns go up or down by a whole number,
// and negative numbers only come from adding or subtracting.
//
// Marking note: an ordered pair like (−3, 2) can't be typed into the numeric marker, so questions
// that ask for both coordinates are MCQs.

const NO_CALC = { calculator: 'not-allowed' as const };

const pair = (x: number, y: number) => `$(${tex(x)}, ${tex(y)})$`;

/** A Markdown table of positions and terms; null shows as "?". */
function tableMd(positions: number[], terms: Array<number | null>): string {
  const head = `| Position ($n$) | ${positions.join(' | ')} |`;
  const sep = `|---|${positions.map(() => '---').join('|')}|`;
  const row = `| Term ($t$) | ${terms.map((v) => (v === null ? '?' : `$${tex(v)}$`)).join(' | ')} |`;
  return `${head}\n${sep}\n${row}`;
}

/** "t = 3n + 2" as TeX (no "+ 0"). */
function ruleTex(a: number, d: number): string {
  return `t = ${poly([t(a, 'n'), t(d)])}`;
}

/** "multiply the position number by 3, then add 2" */
function ruleWords(a: number, d: number): string {
  const times = a === 1 ? 'take the position number' : `multiply the position number by ${a}`;
  if (d === 0) return times;
  return `${times}, then ${d > 0 ? `add ${d}` : `subtract ${-d}`}`;
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function quadrantOf(x: number, y: number): 'first' | 'second' | 'third' | 'fourth' {
  if (x > 0 && y > 0) return 'first';
  if (x < 0 && y > 0) return 'second';
  if (x < 0 && y < 0) return 'third';
  return 'fourth';
}

/** Two non-zero coordinates with different sizes, so swapping or flipping signs always gives a new point. */
function pointPair(rng: Parameters<QuestionTemplate['generate']>[0]['rng'], max = 5): [number, number] {
  for (;;) {
    const x = rng.nonZeroInt(-max, max);
    const y = rng.nonZeroInt(-max, max);
    if (Math.abs(x) !== Math.abs(y)) return [x, y];
  }
}

function gridSvg(points: Array<{ x: number; y: number; name: string }>): string {
  const plane = coordinatePlane({ xMin: -6, xMax: 6, yMin: -6, yMax: 6, scale: 22 });
  let body = plane.body;
  for (const p of points) {
    const px = plane.toPx(p);
    body += dot(px, 4.5, ACCENT);
    body += label({ x: px.x + (p.x < 0 ? -11 : 11), y: px.y + (p.y < 0 ? 12 : -11) }, p.name, { bold: true, fill: ACCENT });
  }
  return svgDoc(plane.width, plane.height, body);
}

export const coordinates: QuestionTemplate = {
  id: 'm7.alg.linear-patterns.coordinates',
  topicId: 'm7.alg.linear-patterns',
  title: 'Coordinates in four quadrants (MCQ)',
  difficulties: [1, 2, 3],
  generate({ rng, difficulty }) {
    const hints = ['The $x$-coordinate comes first: how far across (right is positive, left is negative).', 'The $y$-coordinate comes second: how far up (positive) or down (negative).'];
    if (difficulty === 1) {
      const [x, y] = pointPair(rng);
      return {
        ...NO_CALC,
        prompt: 'What are the coordinates of point A?',
        figure: { svg: gridSvg([{ x, y, name: 'A' }]), alt: 'A coordinate grid from −6 to 6 on both axes with one point labelled A.' },
        ...mcqFields(rng, { text: pair(x, y) }, [
          { text: pair(y, x), feedback: 'The numbers are the wrong way round. Write the $x$-coordinate (across) first, then the $y$-coordinate (up or down).' },
          { text: pair(-x, y), feedback: `Check the $x$-coordinate. Points to the ${x < 0 ? 'left' : 'right'} of the $y$-axis have ${x < 0 ? 'negative' : 'positive'} $x$-coordinates.` },
          { text: pair(x, -y), feedback: `Check the $y$-coordinate. Points ${y < 0 ? 'below' : 'above'} the $x$-axis have ${y < 0 ? 'negative' : 'positive'} $y$-coordinates.` },
        ]),
        hints,
        solution: `Start at the origin $(0, 0)$. Point A is ${Math.abs(x)} ${x > 0 ? 'right' : 'left'} and ${Math.abs(y)} ${y > 0 ? 'up' : 'down'}.\n\nSo A is at ${pair(x, y)}.`,
      };
    }

    if (difficulty === 2) {
      const [x, y] = pointPair(rng, 9);
      if (rng.chance(0.5)) {
        const q = quadrantOf(x, y);
        const why: Record<string, string> = {
          first: 'The first quadrant (top right) has $x$ positive and $y$ positive.',
          second: 'The second quadrant (top left) has $x$ negative and $y$ positive.',
          third: 'The third quadrant (bottom left) has $x$ negative and $y$ negative.',
          fourth: 'The fourth quadrant (bottom right) has $x$ positive and $y$ negative.',
        };
        const all = ['first', 'second', 'third', 'fourth'] as const;
        return {
          ...NO_CALC,
          prompt: `Which quadrant is the point ${pair(x, y)} in?`,
          ...mcqFields(
            rng,
            { text: `The ${q} quadrant` },
            all.filter((o) => o !== q).map((o) => ({ text: `The ${o} quadrant`, feedback: `${why[o]} Check the signs of ${tex(x)} and ${tex(y)}.` })),
          ),
          hints: ['Is the $x$-coordinate positive (right) or negative (left)? Is the $y$-coordinate positive (up) or negative (down)?', 'The quadrants are numbered anticlockwise, starting from the top right.'],
          solution: `$x = ${tex(x)}$ is ${x > 0 ? 'positive, so the point is right of' : 'negative, so the point is left of'} the $y$-axis. $y = ${tex(y)}$ is ${y > 0 ? 'positive, so it is above' : 'negative, so it is below'} the $x$-axis.\n\n${why[q]} So ${pair(x, y)} is in the **${q} quadrant**.`,
        };
      }
      const [px, py] = pointPair(rng);
      const spots = [
        { x: px, y: py, kind: 'right' },
        { x: py, y: px, kind: 'swap' },
        { x: -px, y: py, kind: 'flip-x' },
        { x: px, y: -py, kind: 'flip-y' },
      ];
      const names = rng.shuffle(['A', 'B', 'C', 'D']);
      const named = spots.map((s, i) => ({ ...s, name: names[i]! }));
      const right = named[0]!;
      const fb: Record<string, string> = {
        swap: 'The coordinates are the wrong way round. Go across first ($x$), then up or down ($y$).',
        'flip-x': 'Check the $x$-coordinate: is the point left or right of the $y$-axis?',
        'flip-y': 'Check the $y$-coordinate: is the point above or below the $x$-axis?',
      };
      return {
        ...NO_CALC,
        prompt: `Which point is at ${pair(px, py)}?`,
        figure: { svg: gridSvg(named), alt: 'A coordinate grid from −6 to 6 on both axes with four points labelled A, B, C and D.' },
        ...mcqFields(
          rng,
          { text: `Point ${right.name}` },
          named.slice(1).map((s) => ({ text: `Point ${s.name}`, feedback: `Point ${s.name} is at ${pair(s.x, s.y)}. ${fb[s.kind]}` })),
        ),
        hints,
        solution: `From the origin, go ${Math.abs(px)} ${px > 0 ? 'right' : 'left'} and then ${Math.abs(py)} ${py > 0 ? 'up' : 'down'}. You reach point ${right.name}.`,
      };
    }

    // difficulty 3: move a point
    const [x, y] = pointPair(rng, 4);
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const dx = rng.sign() * a;
    const dy = rng.sign() * b;
    const name = rng.pick(NAMES);
    const nx = x + dx;
    const ny = y + dy;
    const words = `${a} unit${a > 1 ? 's' : ''} ${dx > 0 ? 'right' : 'left'} and ${b} unit${b > 1 ? 's' : ''} ${dy > 0 ? 'up' : 'down'}`;
    return {
      ...NO_CALC,
      prompt: `${name} puts a counter on the point ${pair(x, y)} on a coordinate grid. ${name} moves it ${words}. Where does the counter end up?`,
      ...mcqFields(rng, { text: pair(nx, ny) }, [
        { text: pair(x - dx, ny), feedback: `Moving ${dx > 0 ? 'right' : 'left'} makes the $x$-coordinate ${dx > 0 ? 'bigger' : 'smaller'}. You moved the wrong way across.` },
        { text: pair(nx, y - dy), feedback: `Moving ${dy > 0 ? 'up' : 'down'} makes the $y$-coordinate ${dy > 0 ? 'bigger' : 'smaller'}. You moved the wrong way up or down.` },
        { text: pair(x + Math.sign(dx) * b, y + Math.sign(dy) * a), feedback: `Left and right moves change the $x$-coordinate; up and down moves change the $y$-coordinate.` },
        { text: pair(ny, nx), feedback: 'Write the $x$-coordinate first, then the $y$-coordinate.' },
      ]),
      hints: ['Left and right moves change the $x$-coordinate. Up and down moves change the $y$-coordinate.', 'Right and up add; left and down subtract. A number line can help when you cross 0.'],
      solution: `$x$: $${tex(x)} ${dx > 0 ? '+' : '-'} ${a} = ${tex(nx)}$\n\n$y$: $${tex(y)} ${dy > 0 ? '+' : '-'} ${b} = ${tex(ny)}$\n\nThe counter ends up at ${pair(nx, ny)}.`,
    };
  },
};

export const continuePattern: QuestionTemplate = {
  id: 'm7.alg.linear-patterns.continue',
  topicId: 'm7.alg.linear-patterns',
  title: 'Continue a linear pattern',
  difficulties: [1, 2],
  generate({ rng, difficulty }) {
    if (difficulty === 1) {
      const d = rng.int(2, 9);
      const first = rng.int(1, 20);
      const terms = [0, 1, 2, 3].map((i) => first + i * d);
      const list = `${terms.join(', ')}, …`;
      if (rng.chance(0.4)) {
        return {
          type: 'numeric',
          ...NO_CALC,
          prompt: `What is the constant difference in the pattern ${list}?`,
          answer: d,
          form: 'integer',
          hints: ['Subtract each term from the next one.'],
          solution: `$${terms[1]} - ${terms[0]} = ${d}$, $${terms[2]} - ${terms[1]} = ${d}$ and $${terms[3]} - ${terms[2]} = ${d}$.\n\nThe pattern goes up by the same amount each time, so the constant difference is ${d}.`,
        };
      }
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: `What is the next term in the pattern ${list}?`,
        answer: first + 4 * d,
        form: 'integer',
        hints: ['How much does the pattern go up by each time?'],
        solution: `The pattern goes up by ${d} each time. The next term is $${terms[3]} + ${d} = ${first + 4 * d}$.`,
      };
    }
    if (rng.chance(0.5)) {
      // decreasing, possibly past zero
      const d = rng.int(2, 6);
      const first = rng.int(8, 30);
      const k = rng.int(6, 8);
      const terms = Array.from({ length: k }, (_, i) => first - i * d);
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: `The pattern ${terms.slice(0, 4).join(', ')}, … keeps going down by the same amount. What is term number ${k}?`,
        answer: terms[k - 1]!,
        form: 'integer',
        hints: ['Find how much the pattern goes down by each time.', 'Keep subtracting. If you go past 0, a number line can help.'],
        solution: `The pattern goes down by ${d} each time.\n\nThe terms are $${terms.map((x) => tex(x)).join(', ')}$.\n\nTerm number ${k} is $${tex(terms[k - 1]!)}$.`,
      };
    }
    const d = rng.int(3, 12);
    const first = rng.int(1, 25);
    const terms = [0, 1, 2, 3, 4].map((i) => first + i * d);
    const gap = rng.int(1, 3);
    const shown = terms.map((x, i) => (i === gap ? '□' : String(x)));
    return {
      type: 'numeric',
      ...NO_CALC,
      prompt: `What is the missing term in this linear pattern? ${shown.join(', ')}, …`,
      answer: terms[gap]!,
      form: 'integer',
      hints: ['Use two terms that are next to each other to find the constant difference.'],
      solution: `The constant difference is $${terms[gap === 1 ? 3 : 1]! } - ${terms[gap === 1 ? 2 : 0]!} = ${d}$.\n\nThe missing term is $${terms[gap - 1]} + ${d} = ${terms[gap]}$. Check: $${terms[gap]} + ${d} = ${terms[gap + 1]}$ ✓`,
    };
  },
};

export const findRule: QuestionTemplate = {
  id: 'm7.alg.linear-patterns.find-rule',
  topicId: 'm7.alg.linear-patterns',
  title: 'Find the rule for a linear pattern from a table',
  difficulties: [2, 3, 4],
  generate({ rng, difficulty }) {
    const ruleHints = [
      'Find the constant difference. The rule starts with (difference) × $n$.',
      'Compare (difference) × $n$ with the actual terms. What do you need to add or subtract?',
    ];
    if (difficulty === 2) {
      const a = rng.int(2, 6);
      let d = rng.int(1, 9);
      if (d === a) d += 1;
      const positions = [1, 2, 3, 4];
      const terms = positions.map((n) => a * n + d);
      const steps = `The terms go up by ${a} each time, so multiply the position number by ${a}. For position 1 that gives ${a}, but the term is ${a + d}, so add ${d}.\n\nCheck position 3: $${a} \\times 3 + ${d} = ${3 * a + d}$ ✓`;
      if (rng.chance(0.5)) {
        return {
          ...NO_CALC,
          prompt: `Which rule fits this pattern?\n\n${tableMd(positions, terms)}`,
          ...mcqFields(rng, { text: `$${ruleTex(a, d)}$` }, [
            { text: `$t = n + ${a}$`, feedback: `The terms go up by ${a} each time, so the position is multiplied by ${a}, not added to ${a}.` },
            { text: `$t = ${a}n$`, feedback: `$${a}n$ gives ${a}, ${2 * a}, ${3 * a}, … Each term is ${d} more than that.` },
            { text: `$${ruleTex(d, a)}$`, feedback: `Try position 2: $${d} \\times 2 + ${a} = ${2 * d + a}$, but the term is ${2 * a + d}.` },
          ]),
          hints: ruleHints,
          solution: steps,
        };
      }
      return {
        ...NO_CALC,
        prompt: `Which rule in words fits this pattern?\n\n${tableMd(positions, terms)}`,
        ...mcqFields(rng, { text: cap(ruleWords(a, d)) }, [
          { text: `Add ${a} to the position number`, feedback: `Try position 1: $1 + ${a} = ${1 + a}$, but the term is ${a + d}.` },
          { text: cap(ruleWords(a, 0)), feedback: `Multiplying by ${a} gives ${a}, ${2 * a}, ${3 * a}, … Each term is ${d} more than that.` },
          { text: cap(ruleWords(d, a)), feedback: `Try position 2: $${d} \\times 2 + ${a} = ${2 * d + a}$, but the term is ${2 * a + d}.` },
        ]),
        hints: ruleHints,
        solution: steps,
      };
    }

    if (difficulty === 3) {
      const a = rng.int(2, 9);
      const d = rng.int(Math.max(-5, 1 - a), 12);
      const positions = [1, 2, 3, 4, 5];
      const terms = positions.map((n) => a * n + d);
      return {
        type: 'expression',
        ...NO_CALC,
        prompt: `Write the rule for this linear pattern as an equation, $t = \\ldots$\n\n${tableMd(positions, terms)}`,
        answer: polyAnswer([t(a, 'n'), t(d)]),
        variables: ['n'],
        form: 'any',
        hints: ruleHints,
        solution: [
          `The terms go up by ${a} each time, so the rule starts with $${a}n$.`,
          `For $n = 1$, $${a}n = ${a}$, but the term is ${a + d}. ${d === 0 ? 'They match, so nothing else is needed.' : `To get from ${a} to ${a + d}, ${d > 0 ? `add ${d}` : `subtract ${-d}`}.`}`,
          `So the rule is $${ruleTex(a, d)}$.`,
          `Check: for $n = 4$, $${a} \\times 4 ${d === 0 ? '' : d > 0 ? `+ ${d}` : `- ${-d}`} = ${4 * a + d}$ ✓`,
        ].join('\n\n'),
      };
    }

    // difficulty 4: decreasing patterns, or tables with a gap in the positions
    if (rng.chance(0.5)) {
      const a = rng.int(2, 6);
      const D = rng.int(4 * a + 1, 50);
      const positions = [1, 2, 3, 4, 5];
      const terms = positions.map((n) => D - a * n);
      return {
        type: 'expression',
        ...NO_CALC,
        marks: 2,
        prompt: `Write the rule for this linear pattern as an equation, $t = \\ldots$\n\n${tableMd(positions, terms)}`,
        answer: `${D} - ${a}*n`,
        variables: ['n'],
        form: 'any',
        hints: ['The terms go **down**. By how much each time?', `Going down by the same amount each time means the rule has "$- \\square n$" in it. Work out what $n = 0$ would give.`],
        solution: [
          `The terms go down by ${a} each time, so the rule includes $- ${a}n$.`,
          `Work back one step to position 0: $${D - a} + ${a} = ${D}$. So the rule starts at ${D}.`,
          `The rule is $t = ${D} - ${a}n$.`,
          `Check: for $n = 3$, $${D} - ${a} \\times 3 = ${D} - ${3 * a} = ${D - 3 * a}$ ✓`,
        ].join('\n\n'),
      };
    }
    const a = rng.int(2, 9);
    const d = rng.int(-4, 15);
    const positions = [1, 2, 3, rng.int(5, 8), rng.int(10, 20)];
    const terms = positions.map((n) => a * n + d);
    return {
      type: 'expression',
      ...NO_CALC,
      marks: 2,
      prompt: `Write the rule for this linear pattern as an equation, $t = \\ldots$ (Look carefully at the positions.)\n\n${tableMd(positions, terms)}`,
      answer: polyAnswer([t(a, 'n'), t(d)]),
      variables: ['n'],
      form: 'any',
      hints: ['Only use positions that are next to each other (1, 2 and 3) to find the constant difference.', ruleHints[1]!],
      solution: [
        `From position 1 to 2 to 3 the terms go up by ${a}, so the rule starts with $${a}n$.`,
        `For $n = 1$, $${a}n = ${a}$, but the term is ${a + d}, so ${d === 0 ? 'nothing else is needed' : d > 0 ? `add ${d}` : `subtract ${-d}`}.`,
        `The rule is $${ruleTex(a, d)}$.`,
        `Check with position ${positions[4]}: $${a} \\times ${positions[4]} ${d === 0 ? '' : d > 0 ? `+ ${d}` : `- ${-d}`} = ${terms[4]}$ ✓`,
      ].join('\n\n'),
    };
  },
};

const SHAPE_WORDS: Record<StickShape, { what: string; a: number; d: number; why: string }> = {
  squares: { what: 'a row of squares', a: 3, d: 1, why: 'Each new square needs 3 more matchsticks (it shares one side with the square before it). Pattern 1 has 4 sticks, which is $3 \\times 1 + 1$.' },
  triangles: { what: 'a row of triangles', a: 2, d: 1, why: 'Each new triangle needs 2 more matchsticks (it shares one side). Pattern 1 has 3 sticks, which is $2 \\times 1 + 1$.' },
  'double-squares': { what: 'two rows of squares', a: 5, d: 2, why: 'Each new column of two squares needs 5 more matchsticks. Pattern 1 has 7 sticks, which is $5 \\times 1 + 2$.' },
};

export const useRule: QuestionTemplate = {
  id: 'm7.alg.linear-patterns.use-rule',
  topicId: 'm7.alg.linear-patterns',
  title: 'Use a rule: predict terms, matchstick patterns and conjectures',
  difficulties: [2, 3, 4, 5],
  generate({ rng, difficulty }) {
    const name = rng.pick(NAMES);
    if (difficulty === 2) {
      const a = rng.int(2, 9);
      const d = rng.int(-5, 12);
      const k = rng.int(8, 25);
      const value = a * k + d;
      const inWords = rng.chance(0.4);
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: inWords
          ? `The rule for a pattern is: "${ruleWords(a, d)}". What is the term at position ${k}?`
          : `The rule for a linear pattern is $${ruleTex(a, d)}$, where $n$ is the position number. What is the term at position ${k}?`,
        answer: value,
        form: 'integer',
        hints: ['Put the position number into the rule.', 'Multiply first, then add or subtract.'],
        solution: `$t = ${a} \\times ${k}${d === 0 ? '' : d > 0 ? ` + ${d}` : ` - ${-d}`} = ${a * k}${d === 0 ? '' : d > 0 ? ` + ${d}` : ` - ${-d}`} = ${value}$`,
      };
    }

    if (difficulty === 3) {
      const shape = rng.pick(['squares', 'triangles', 'double-squares'] as const);
      const info = SHAPE_WORDS[shape];
      const k = rng.int(6, 20);
      return {
        type: 'numeric',
        ...NO_CALC,
        prompt: `${name} makes ${info.what} with matchsticks. The first three patterns are shown. How many matchsticks will ${name} need for pattern ${k}?`,
        figure: { svg: stickPatternSvg(shape), alt: `Patterns 1, 2 and 3 of ${info.what} made from matchsticks, using ${sticksFor(shape, 1)}, ${sticksFor(shape, 2)} and ${sticksFor(shape, 3)} sticks.` },
        answer: sticksFor(shape, k),
        form: 'integer',
        hints: ['Count the matchsticks in patterns 1, 2 and 3. How many more does each new pattern need?', 'Write a rule: (number added each time) × (pattern number) + (something).'],
        solution: `Patterns 1, 2 and 3 use ${sticksFor(shape, 1)}, ${sticksFor(shape, 2)} and ${sticksFor(shape, 3)} matchsticks.\n\n${info.why} So the rule is $${ruleTex(info.a, info.d)}$.\n\nPattern ${k}: $${info.a} \\times ${k} + ${info.d} = ${sticksFor(shape, k)}$ matchsticks.`,
      };
    }

    if (difficulty === 4) {
      const kind = rng.pick(['stick-rule', 'which-position', 'conjecture'] as const);
      if (kind === 'stick-rule') {
        const shape = rng.pick(['squares', 'triangles', 'double-squares'] as const);
        const info = SHAPE_WORDS[shape];
        const noun = rng.pick(['matchsticks', 'iceblock sticks', 'toothpicks']);
        return {
          type: 'expression',
          ...NO_CALC,
          marks: 2,
          prompt: `${name} makes ${info.what} with ${noun}. Write a rule for the number of ${noun}, $t$, in pattern number $n$. Start your answer with $t =$.`,
          figure: { svg: stickPatternSvg(shape), alt: `Patterns 1, 2 and 3 of ${info.what}, using ${sticksFor(shape, 1)}, ${sticksFor(shape, 2)} and ${sticksFor(shape, 3)} sticks.` },
          answer: polyAnswer([t(info.a, 'n'), t(info.d)]),
          variables: ['n'],
          form: 'any',
          hints: ['Make a table: pattern number and number of sticks.', 'Find the constant difference, then work out what to add.'],
          solution: `Patterns 1, 2 and 3 use ${sticksFor(shape, 1)}, ${sticksFor(shape, 2)} and ${sticksFor(shape, 3)} ${noun}.\n\n${info.why}\n\nSo $${ruleTex(info.a, info.d)}$.`,
        };
      }
      const a = rng.int(2, 9);
      const d = rng.int(-3, 12);
      const k = rng.int(10, 40);
      const first4 = [1, 2, 3, 4].map((n) => a * n + d).join(', ');
      if (kind === 'which-position') {
        const value = a * k + d;
        return {
          type: 'numeric',
          ...NO_CALC,
          marks: 2,
          prompt: `The pattern ${first4}, … has the rule $${ruleTex(a, d)}$. Which position number has the term ${value}?`,
          answer: k,
          form: 'integer',
          hints: [`Write an equation: $${poly([t(a, 'n'), t(d)])} = ${value}$.`, 'Solve it with inverse operations.'],
          solution: `$${poly([t(a, 'n'), t(d)])} = ${value}$\n\n${d === 0 ? '' : `${d > 0 ? `Subtract ${d}` : `Add ${-d}`}: $${a}n = ${a * k}$\n\n`}Divide by ${a}: $n = ${k}$\n\nCheck: $${a} \\times ${k}${d === 0 ? '' : d > 0 ? ` + ${d}` : ` - ${-d}`} = ${value}$ ✓`,
        };
      }
      const isIn = rng.chance(0.5);
      const r = isIn ? 0 : rng.int(1, a - 1);
      const value = a * k + d + r;
      const termOf = (n: number) => a * n + d;
      const choices: { correct: Choice; wrong: Choice[] } = isIn
        ? {
            correct: { text: `Yes. It is term number ${k}.` },
            wrong: [
              { text: `Yes. It is term number ${k + 1}.`, feedback: `Term ${k + 1} is $${a} \\times ${k + 1}${d >= 0 ? ` + ${d}` : ` - ${-d}`} = ${termOf(k + 1)}$.` },
              { text: `Yes. It is term number ${k - 1}.`, feedback: `Term ${k - 1} is $${a} \\times ${k - 1}${d >= 0 ? ` + ${d}` : ` - ${-d}`} = ${termOf(k - 1)}$.` },
              { text: `No. ${value} is not in the pattern.`, feedback: `Solve $${poly([t(a, 'n'), t(d)])} = ${value}$. You get a whole number for $n$.` },
            ],
          }
        : {
            correct: { text: `No. ${value} is between term ${k} and term ${k + 1}.` },
            wrong: [
              { text: `Yes. It is term number ${k}.`, feedback: `Term ${k} is $${termOf(k)}$, not ${value}.` },
              { text: `Yes. It is term number ${k + 1}.`, feedback: `Term ${k + 1} is $${termOf(k + 1)}$, not ${value}.` },
              { text: `Yes. It is term number ${Math.round(value / a)}.`, feedback: `Term ${Math.round(value / a)} is $${termOf(Math.round(value / a))}$, not ${value}.` },
            ],
          };
      return {
        ...NO_CALC,
        marks: 2,
        prompt: `The pattern ${first4}, … has the rule $${ruleTex(a, d)}$. ${name} thinks that ${value} is in this pattern. Is ${name} right?`,
        ...mcqFields(rng, choices.correct, choices.wrong),
        hints: [`Try solving $${poly([t(a, 'n'), t(d)])} = ${value}$.`, 'If $n$ comes out as a whole number, the number is in the pattern.'],
        solution: isIn
          ? `Solve $${poly([t(a, 'n'), t(d)])} = ${value}$: $${a}n = ${a * k}$, so $n = ${k}$.\n\nThat's a whole number, so ${value} is term number ${k}. ${name} is right.`
          : `Term ${k} is $${termOf(k)}$ and term ${k + 1} is $${termOf(k + 1)}$. ${value} is between them, so it is not in the pattern. ${name} is not right.`,
      };
    }

    // difficulty 5
    if (rng.chance(0.5)) {
      const a = rng.int(3, 7);
      const first = rng.int(15, 40);
      const D = first + a;
      const firstNeg = Math.floor(D / a) + 1;
      const askPosition = rng.chance(0.5);
      const value = D - a * firstNeg;
      return {
        type: 'numeric',
        ...NO_CALC,
        marks: 2,
        prompt: `The pattern ${[0, 1, 2, 3].map((i) => first - i * a).join(', ')}, … keeps going down by the same amount. ${askPosition ? 'What is the position number of the first negative term?' : 'What is the first negative term?'}`,
        answer: askPosition ? firstNeg : value,
        form: 'integer',
        hints: ['Find the rule, or keep counting down.', 'Which term is the last one that is 0 or more? The next term is the first negative one.'],
        solution: `The pattern goes down by ${a} each time, so the rule is $t = ${D} - ${a}n$.\n\nTerm ${firstNeg - 1} is $${D} - ${a} \\times ${firstNeg - 1} = ${D - a * (firstNeg - 1)}$, which is not negative.\n\nTerm ${firstNeg} is $${D} - ${a} \\times ${firstNeg} = ${tex(value)}$, which is the first negative term.\n\n${askPosition ? `So the answer is position ${firstNeg}.` : `So the first negative term is $${tex(value)}$.`}`,
      };
    }
    // points on a graph, possibly below the x-axis
    let a: number;
    let d: number;
    const down = rng.chance(0.5);
    if (down) {
      a = rng.int(2, 3);
      d = rng.int(a + 1, 6);
    } else {
      a = rng.int(2, 3);
      d = rng.int(-6, -a - 1);
    }
    const slope = down ? -a : a;
    const pts = [1, 2, 3].map((n) => ({ x: n, y: slope * n + d, name: '' }));
    const plane = coordinatePlane({ xMin: -1, xMax: 6, yMin: -6, yMax: 6, scale: 22 });
    let body = plane.body;
    for (const p of pts) body += dot(plane.toPx(p), 5, ACCENT);
    const svg = svgDoc(plane.width, plane.height, body);
    const k = rng.int(8, 15);
    const value = slope * k + d;
    const rule = slope > 0 ? `t = ${poly([t(a, 'n'), t(d)])}` : `t = ${d} - ${a}n`;
    return {
      type: 'numeric',
      ...NO_CALC,
      marks: 2,
      prompt: `The graph shows the first three terms of a linear pattern, plotted as points (position, term). What is the term at position ${k}?`,
      figure: { svg, alt: `A coordinate grid with three points in a straight line at ${pts.map((p) => `(${p.x}, ${p.y})`).join(', ')}.` },
      answer: value,
      form: 'integer',
      hints: ['Read the coordinates of the three points. The $y$-coordinate is the term.', 'Find the constant increase or decrease, then write the rule.'],
      solution: `The points are ${pts.map((p) => pair(p.x, p.y)).join(', ')}, so the terms are $${pts.map((p) => tex(p.y)).join(', ')}$.\n\nThe terms go ${slope > 0 ? 'up' : 'down'} by ${a} each time. The rule is $${rule}$.\n\nPosition ${k}: $${slope > 0 ? `${a} \\times ${k} ${d < 0 ? `- ${-d}` : `+ ${d}`} = ${a * k} ${d < 0 ? `- ${-d}` : `+ ${d}`}` : `${d} - ${a} \\times ${k} = ${d} - ${a * k}`} = ${tex(value)}$`,
    };
  },
};

export const templates: QuestionTemplate[] = [coordinates, continuePattern, findRule, useRule];
