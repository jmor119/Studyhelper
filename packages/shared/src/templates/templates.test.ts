import { describe, expect, it } from 'vitest';
import { getTopic } from '../curriculum';
import { markResponse } from '../marking/mark';
import { toPublicQuestion } from '../questions/split';
import { correctResponseFor, wrongResponseFor } from '../testing/correct-response';
import { instantiateTemplate, questionFromTemplateId, TEMPLATES } from './registry';

// Every template, at every difficulty, across many seeds: valid, deterministic, self-consistent.
const SEEDS = Number(process.env.TEMPLATE_SEEDS ?? 150);

describe.each(TEMPLATES.map((t) => [t.id, t] as const))('template %s', (_id, template) => {
  it('targets a real topic and has sensible metadata', () => {
    expect(getTopic(template.topicId), `unknown topic ${template.topicId}`).toBeDefined();
    expect(template.id.startsWith(template.topicId), 'template id should start with its topic id').toBe(true);
    expect(template.difficulties.length).toBeGreaterThan(0);
    for (const d of template.difficulties) expect(d >= 1 && d <= 5).toBe(true);
  });

  it.each(template.difficulties.map((d) => [d]))('difficulty %i generates valid, correct questions', (difficulty) => {
    const prompts = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const qn = instantiateTemplate(template, difficulty, seed);
      const text = `${qn.prompt}\n${qn.solution}\n${qn.hints.join('\n')}`;
      expect(text, `seed ${seed}`).not.toMatch(/undefined|NaN|Infinity|\[object Object\]/);
      expect(qn.hints.length, 'needs at least one hint').toBeGreaterThan(0);
      if (qn.figure) expect(qn.figure.svg.startsWith('<svg')).toBe(true);
      if (qn.type === 'mcq') {
        const texts = qn.options.map((o) => o.text);
        expect(new Set(texts).size, `duplicate options at seed ${seed}: ${texts.join(' | ')}`).toBe(texts.length);
      }

      // Deterministic: same seed → same question.
      const again = questionFromTemplateId(qn.id);
      expect(again?.prompt).toBe(qn.prompt);

      // Self-consistent: the computed answer marks as correct, an obviously wrong one doesn't.
      const right = correctResponseFor(qn);
      if (right) {
        const r = markResponse(qn, right);
        expect(r.correct, `seed ${seed}: correct answer marked wrong (${JSON.stringify(right)}) for "${qn.prompt}"`).toBe(true);
      }
      const wrong = wrongResponseFor(qn);
      if (wrong) {
        expect(markResponse(qn, wrong).correct, `seed ${seed}: wrong answer accepted`).toBe(false);
      }

      // The public version never leaks the answer (and the correct dropdown option isn't always first).
      const pubQ = toPublicQuestion(qn);
      if (pubQ.type === 'cloze' && qn.type === 'cloze') {
        for (const b of qn.blanks) {
          const shown = pubQ.blanks.find((x) => x.id === b.id)?.options;
          if (b.options && b.options.length > 1) expect(shown).not.toEqual(b.options);
        }
      }
      const pub = JSON.stringify(pubQ);
      expect(pub).not.toContain('"solution"');
      expect(pub).not.toContain('"correct"');
      prompts.add(`${qn.stem ?? ''}|${qn.prompt}|${qn.figure?.svg ?? ''}`);
    }
    // Enough variety that students don't see repeats constantly.
    expect(prompts.size, 'too few distinct questions').toBeGreaterThanOrEqual(Math.min(template.variety ?? 20, SEEDS / 4));
  });
});
