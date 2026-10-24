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
  it('rejects unknown symbols and unsafe input', () => {
    expect(() => parseExpression('y + 1', vars)).toThrow();
    expect(() => parseExpression('import(1)', vars)).toThrow();
    expect(() => parseExpression('x = 3', vars)).not.toThrow(); // "x = " prefix is stripped
  });
});

describe('textMatches', () => {
  it('is lenient with case, articles, US spelling and small typos', () => {
    expect(textMatches('The Nucleus', 'nucleus', true)).toBe(true);
    expect(textMatches('vapor', 'vapour', true)).toBe(true);
    expect(textMatches('photosynthesis', 'photosynthesis', true)).toBe(true);
    expect(textMatches('photosyntesis', 'photosynthesis', true)).toBe(true);
    expect(textMatches('kōura', 'koura', true)).toBe(true);
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
    expect(markResponse(area, { type: 'numeric', value: '12.566' }).correct).toBe(true);
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
