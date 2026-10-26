import { describe, expect, it } from 'vitest';
import { QuestionSchema, type QuestionInput } from '../questions/schema';
import { areEquivalent, isExpanded, isFactorised, isSimplified, parseExpression } from './expression';
import { latexToPlain } from './latex';
import { markResponse } from './mark';
import { parseNumber } from './numeric';
import { textMatches } from './text';

const q = (input: Partial<QuestionInput> & Pick<QuestionInput, 'type'>) =>
  QuestionSchema.parse({
    id: 'test.q1',
    subject: 'maths',
    yearLevel: 9,
    topicId: 'm9.num.fractions',
    difficulty: 2,
    prompt: 'Test',
    solution: 'Because.',
    ...input,
  } as QuestionInput);

describe('parseNumber', () => {
  it.each([
    ['42', 42, 'integer'],
    ['-7', -7, 'integer'],
    ['\u22127', -7, 'integer'],
    ['3.50', 3.5, 'decimal'],
    ['.5', 0.5, 'decimal'],
    ['1,234.5', 1234.5, 'decimal'],
    ['1 234', 1234, 'integer'],
    ['3/4', 0.75, 'fraction'],
    ['-3/4', -0.75, 'fraction'],
    ['2 1/2', 2.5, 'mixed'],
    ['\\frac{3}{4}', 0.75, 'fraction'],
    ['2\\frac{1}{2}', 2.5, 'mixed'],
    ['-\\frac{1}{2}', -0.5, 'fraction'],
    ['3.2 \\times 10^{4}', 32000, 'scientific'],
    ['3.2e-3', 0.0032, 'scientific'],
    ['x = 5', 5, 'integer'],
    ['$12.50', 12.5, 'decimal'],
  ])('%s → %d', (input, value, kind) => {
    const r = parseNumber(input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBeCloseTo(value, 10);
      expect(r.kind).toBe(kind);
    }
  });

  it('understands magnification and micro units', () => {
    for (const v of ['×400', 'x400', '400x', '400×', 'X 400']) {
      const r = parseNumber(v);
      expect(r.ok && r.value, v).toBe(400);
    }
    const mag = QuestionSchema.parse({
      id: 'test.mag', subject: 'science', yearLevel: 9, topicId: 's9.bio.cells', difficulty: 2,
      prompt: 'Magnification?', solution: '.', type: 'numeric', answer: 400, units: '×',
    });
    expect(markResponse(mag, { type: 'numeric', value: '400x' }).correct).toBe(true);
    expect(markResponse(mag, { type: 'numeric', value: '×400' }).correct).toBe(true);
    const size = QuestionSchema.parse({
      id: 'test.size', subject: 'science', yearLevel: 9, topicId: 's9.bio.cells', difficulty: 2,
      prompt: 'Size?', solution: '.', type: 'numeric', answer: 50, units: 'µm',
    });
    for (const v of ['50 um', '50 μm', '50µm', '50 micrometres']) {
      expect(markResponse(size, { type: 'numeric', value: v }).correct, v).toBe(true);
    }
    expect(parseNumber('x = 5').ok && (parseNumber('x = 5') as { value: number }).value).toBe(5);
  });

  it('accepts unit words', () => {
    const force = QuestionSchema.parse({
      id: 'test.force', subject: 'science', yearLevel: 9, topicId: 's9.phy.forces', difficulty: 2,
      prompt: 'Force?', solution: '.', type: 'numeric', answer: 500, units: 'N',
    });
    for (const v of ['500', '500 N', '500 newtons', '500N']) expect(markResponse(force, { type: 'numeric', value: v }).correct, v).toBe(true);
    const speed = QuestionSchema.parse({
      id: 'test.speed', subject: 'science', yearLevel: 9, topicId: 's9.phy.motion', difficulty: 2,
      prompt: 'Speed?', solution: '.', type: 'numeric', answer: 60, units: 'km/h',
    });
    for (const v of ['60 km/h', '60 kph', '60 km/hr']) expect(markResponse(speed, { type: 'numeric', value: v }).correct, v).toBe(true);
    const current = QuestionSchema.parse({
      id: 'test.amps', subject: 'science', yearLevel: 9, topicId: 's9.phy.electricity', difficulty: 2,
      prompt: 'Current?', solution: '.', type: 'numeric', answer: 2, units: 'A',
    });
    expect(markResponse(current, { type: 'numeric', value: '2 amps' }).correct).toBe(true);
    const temp = QuestionSchema.parse({
      id: 'test.temp', subject: 'science', yearLevel: 9, topicId: 's9.chem.particles', difficulty: 2,
      prompt: 'Temperature?', solution: '.', type: 'numeric', answer: 46, units: '°C',
    });
    for (const v of ['46', '46°C', '46 °C', '46°', '46 degrees', '46 celsius']) {
      expect(markResponse(temp, { type: 'numeric', value: v }).correct, v).toBe(true);
    }
    const vol = QuestionSchema.parse({
      id: 'test.vol', subject: 'science', yearLevel: 9, topicId: 's9.phy.pressure-floating', difficulty: 2,
      prompt: 'Volume?', solution: '.', type: 'numeric', answer: 8, units: 'cm³',
    });
    for (const v of ['8 cm³', '8 cm3', '8 mL', '8ml']) expect(markResponse(vol, { type: 'numeric', value: v }).correct, v).toBe(true);
    expect(markResponse(vol, { type: 'numeric', value: '8 L' }).correct).toBe(false);
  });

  it('checks the letter in "y = …" answers when the question names one', () => {
    const q = QuestionSchema.parse({
      id: 'test.line', subject: 'maths', yearLevel: 9, topicId: 'm9.alg.linear-graphs', difficulty: 2,
      prompt: 'Equation of the horizontal line?', solution: '.', type: 'numeric', answer: -3, variable: 'y',
    });
    expect(markResponse(q, { type: 'numeric', value: 'y = -3' }).correct).toBe(true);
    expect(markResponse(q, { type: 'numeric', value: '-3' }).correct).toBe(true);
    expect(markResponse(q, { type: 'numeric', value: 'x = -3' }).correct).toBe(false);
  });

  it('splits units and percentages', () => {
    const cm = parseNumber('12.5 cm');
    expect(cm.ok && cm.unit).toBe('cm');
    const pct = parseNumber('25%');
    expect(pct.ok && pct.percent).toBe(true);
  });

  it('rejects non-numbers', () => {
    expect(parseNumber('banana').ok).toBe(false);
    expect(parseNumber('').ok).toBe(false);
    expect(parseNumber('3/0').ok).toBe(false);
  });
});

describe('latexToPlain', () => {
  it('converts nested fractions and roots', () => {
    expect(latexToPlain('\\frac{x+1}{2}')).toBe('((x+1)/(2))');
    expect(latexToPlain('\\sqrt{16}')).toBe('sqrt(16)');
    expect(latexToPlain('x^{2}+3x')).toBe('x^(2)+3x');
    expect(latexToPlain('2\\cdot x').replace(/\s/g, '')).toBe('2*x');
  });
});

describe('expressions', () => {
  const vars = ['x'];
  it('detects equivalence', () => {
    expect(areEquivalent(parseExpression('3(x+2)', vars), parseExpression('3x+6', vars), vars)).toBe(true);
    expect(areEquivalent(parseExpression('x^2+5x+6', vars), parseExpression('(x+2)(x+3)', vars), vars)).toBe(true);
    expect(areEquivalent(parseExpression('3x+5', vars), parseExpression('3x+6', vars), vars)).toBe(false);
  });
  it('handles implicit products of variables', () => {
    const v = ['a', 'b'];
    expect(areEquivalent(parseExpression('2ab', v), parseExpression('2*a*b', v), v)).toBe(true);
  });
  it('checks forms', () => {
    expect(isExpanded(parseExpression('3x + 6', vars))).toBe(true);
    expect(isExpanded(parseExpression('3(x + 2)', vars))).toBe(false);
    expect(isFactorised(parseExpression('3(x + 2)', vars))).toBe(true);
    expect(isFactorised(parseExpression('3x + 6', vars))).toBe(false);
    const model = parseExpression('5x + 2', vars);
    expect(isSimplified(parseExpression('5x+2', vars), model)).toBe(true);
    expect(isSimplified(parseExpression('2x + 3x + 2', vars), model)).toBe(false);
  });
  it('reads a letter before a bracket as multiplication, and accepts capitals', () => {
    const v = ['x', 'y'];
    expect(areEquivalent(parseExpression('3x(2y+1)', v), parseExpression('6*x*y + 3*x', v), v)).toBe(true);
    const lw = ['l', 'w', 'p'];
    expect(areEquivalent(parseExpression('P/2 - L', lw), parseExpression('p/2 - l', lw), lw)).toBe(true);
    // "x = 2x + 1" is an equation, not an expression for something else.
    expect(() => parseExpression('x = 2x + 1', ['x'])).toThrow();
    expect(areEquivalent(parseExpression('y = 2x + 1', ['x']), parseExpression('2x+1', ['x']), ['x'])).toBe(true);
  });
  it('requires full factorisation and collected terms', () => {
    expect(isFactorised(parseExpression('3(4x+6)', vars), vars)).toBe(false);
    expect(isFactorised(parseExpression('2(6x+9)', vars), vars)).toBe(false);
    expect(isFactorised(parseExpression('6(2x+3)', vars), vars)).toBe(true);
    expect(isFactorised(parseExpression('x(x+3)', vars), vars)).toBe(true);
    const ab = ['a', 'b'];
    const model = parseExpression('12ab', ab);
    expect(isSimplified(parseExpression('3a*4b', ab), model)).toBe(false);
    expect(isSimplified(parseExpression('12ab', ab), model)).toBe(true);
    expect(isSimplified(parseExpression('2*x*x', vars), parseExpression('2x^2', vars))).toBe(false);
  });
  it('rejects unknown symbols and unsafe input', () => {
    expect(() => parseExpression('y + 1', vars)).toThrow();
    expect(() => parseExpression('import(1)', vars)).toThrow();
    expect(() => parseExpression('x = 3', vars)).toThrow(); // an equation in x, not an expression
  });
});

describe('textMatches', () => {
  it('is lenient with case, articles, US spelling and small typos', () => {
    expect(textMatches('The Nucleus', 'nucleus', true)).toBe(true);
    // Negative signs survive, in any dash style; numbers compare by value.
    expect(textMatches('14', '−14', true)).toBe(false);
    expect(textMatches('−14', '-14', true)).toBe(true);
    expect(textMatches('-3', '−3', false)).toBe(true);
    expect(textMatches('.4', '0.40', true)).toBe(true);
    expect(textMatches('1,283', '1283', true)).toBe(true);
    expect(textMatches('1 283', '1283', false)).toBe(true);
    expect(textMatches('07', '7', false)).toBe(true);
    // Look-alike subject words are not typos.
    expect(textMatches('north-west', 'north-east', true)).toBe(false);
    expect(textMatches('hundreds', 'hundredths', true)).toBe(false);
    expect(textMatches('paralelogram', 'parallelogram', true)).toBe(true);
    expect(textMatches('vapor', 'vapour', true)).toBe(true);
    expect(textMatches('photosynthesis', 'photosynthesis', true)).toBe(true);
    expect(textMatches('photosyntesis', 'photosynthesis', true)).toBe(true);
    expect(textMatches('kōura', 'koura', true)).toBe(true);
  });
  it('does not accept a different word as a typo', () => {
    expect(textMatches('invertebrate', 'vertebrate', true)).toBe(false);
    expect(textMatches('vertebrate', 'invertebrate', true)).toBe(false);
    expect(textMatches('genus', 'genes', true)).toBe(false);
    expect(textMatches('father', 'mother', true)).toBe(false);
    expect(textMatches('endothermic', 'exothermic', true)).toBe(false);
    expect(textMatches('chlorophyl', 'chlorophyll', true)).toBe(true);
    expect(textMatches('mitochondrion', 'mitochondria', true)).toBe(true);
    expect(textMatches('enzymes', 'enzyme', true)).toBe(true);
    expect(textMatches('waning', 'waxing', true)).toBe(false);
    expect(textMatches('conduction', 'convection', true)).toBe(false);
    expect(textMatches('sodium chlorine', 'sodium chloride', true)).toBe(false);
    expect(textMatches('sodium cloride', 'sodium chloride', true)).toBe(true);
    expect(textMatches('convecshun', 'convection', true)).toBe(false); // 3 edits: too far
    expect(textMatches('convektion', 'convection', true)).toBe(true);
  });
  it('keeps inequality signs', () => {
    expect(textMatches('x < 4', 'x<4', true)).toBe(true);
    expect(textMatches('x > 4', 'x < 4', true)).toBe(false);
    expect(textMatches('x ≥ 2', 'x >= 2', true)).toBe(true);
  });
  it('is strict with short words and formulae', () => {
    expect(textMatches('ion', 'iron', true)).toBe(false);
    expect(textMatches('cell', 'cells', true)).toBe(true); // plural slips are forgiven
    expect(textMatches('H2O2', 'H2O', true)).toBe(false);
    expect(textMatches('H₂O', 'H2O', true)).toBe(true);
  });
});

describe('markResponse', () => {
  it('marks numeric answers with tolerance, units and forms', () => {
    const area = q({ type: 'numeric', answer: 12.57, decimals: 2, units: 'cm²' });
    expect(markResponse(area, { type: 'numeric', value: '12.57' }).correct).toBe(true);
    // Unrounded: half marks and a reminder; exact value with a trailing zero is fine.
    const unrounded = markResponse(area, { type: 'numeric', value: '12.566' });
    expect(unrounded.correct).toBe(false);
    expect(unrounded.score).toBe(0.5);
    expect(unrounded.feedback).toMatch(/round/);
    expect(markResponse(area, { type: 'numeric', value: '12.570' }).correct).toBe(true);
    // Plural word units and cents for a dollar answer.
    const cups = q({ type: 'numeric', answer: 1.5, units: 'cups' });
    expect(markResponse(cups, { type: 'numeric', value: '1.5 cup' }).correct).toBe(true);
    const metres = q({ type: 'numeric', answer: 4, units: 'm' });
    expect(markResponse(metres, { type: 'numeric', value: '4 ms' }).correct).toBe(false);
    const dollars = q({ type: 'numeric', answer: 0.45, units: '$' });
    expect(markResponse(dollars, { type: 'numeric', value: '45c' }).correct).toBe(true);
    expect(markResponse(dollars, { type: 'numeric', value: '45' }).correct).toBe(false);
    expect(markResponse(area, { type: 'numeric', value: '12.57 cm^2' }).correct).toBe(true);
    expect(markResponse(area, { type: 'numeric', value: '12.57 m' }).correct).toBe(false);
    expect(markResponse(area, { type: 'numeric', value: '12.6' }).correct).toBe(false);

    const simplest = q({ type: 'numeric', answer: 0.75, form: 'simplest-fraction' });
    expect(markResponse(simplest, { type: 'numeric', value: '3/4' }).correct).toBe(true);
    const unsimplified = markResponse(simplest, { type: 'numeric', value: '6/8' });
    expect(unsimplified.correct).toBe(false);
    expect(unsimplified.score).toBe(0.5);

    const pct = q({ type: 'numeric', answer: 0.25 });
    expect(markResponse(pct, { type: 'numeric', value: '25%' }).correct).toBe(true);

    const bad = markResponse(simplest, { type: 'numeric', value: 'three quarters' });
    expect(bad.invalid).toBe(true);
  });

  it('marks multi-select with partial credit', () => {
    const m = q({
      type: 'multi',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
      ],
      correct: ['a', 'b'],
    });
    expect(markResponse(m, { type: 'multi', optionIds: ['a', 'b'] }).correct).toBe(true);
    const partial = markResponse(m, { type: 'multi', optionIds: ['a'] });
    expect(partial.correct).toBe(false);
    expect(partial.score).toBeGreaterThan(0);
  });

  it('marks cloze, order and match per item', () => {
    const cloze = q({
      type: 'cloze',
      prompt: 'Water boils at [[a]] °C and freezes at [[b]] °C.',
      blanks: [
        { id: 'a', accepted: ['100'] },
        { id: 'b', accepted: ['0'] },
      ],
    });
    const r = markResponse(cloze, { type: 'cloze', values: { a: '100', b: '10' } });
    expect(r.score).toBe(0.5);
    expect(r.details).toEqual({ a: true, b: false });

    const order = q({
      type: 'order',
      items: [
        { id: '1', text: 'cell' },
        { id: '2', text: 'tissue' },
        { id: '3', text: 'organ' },
      ],
    });
    expect(markResponse(order, { type: 'order', order: ['1', '2', '3'] }).correct).toBe(true);
    expect(markResponse(order, { type: 'order', order: ['2', '1', '3'] }).correct).toBe(false);
  });
});
