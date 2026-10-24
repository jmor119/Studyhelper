import { getTopic } from '../curriculum';
import { QuestionSchema, type Question } from '../questions/schema';
import { createRng } from '../rng';
import { templates as algebra } from './maths/algebra';
import { templates as geometry } from './maths/geometry';
import { templates as measurement } from './maths/measurement';
import { templates as number } from './maths/number';
import { templates as probability } from './maths/probability';
import { templates as statistics } from './maths/statistics';
import { templates as science } from './science';
import type { QuestionTemplate } from './types';

export const TEMPLATES: readonly QuestionTemplate[] = [
  ...number,
  ...algebra,
  ...measurement,
  ...geometry,
  ...statistics,
  ...probability,
  ...science,
];

const byId = new Map<string, QuestionTemplate>();
for (const t of TEMPLATES) {
  if (byId.has(t.id)) throw new Error(`Duplicate template id ${t.id}`);
  byId.set(t.id, t);
}

export function getTemplate(id: string): QuestionTemplate | undefined {
  return byId.get(id);
}

export function templatesForTopic(topicId: string): QuestionTemplate[] {
  return TEMPLATES.filter((t) => t.topicId === topicId);
}

const PREFIX = 'tpl:';

export function templateQuestionId(templateId: string, difficulty: number, seed: number): string {
  return `${PREFIX}${templateId}:${difficulty}:${seed}`;
}

export function isTemplateQuestionId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export function parseTemplateQuestionId(
  id: string,
): { templateId: string; difficulty: number; seed: number } | null {
  if (!id.startsWith(PREFIX)) return null;
  const parts = id.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  const [templateId, d, s] = parts as [string, string, string];
  const difficulty = Number(d);
  const seed = Number(s);
  if (!Number.isInteger(difficulty) || !Number.isInteger(seed) || seed < 0) return null;
  return { templateId, difficulty, seed };
}

/** Builds a full (answer-bearing) question from a template. Deterministic for a given seed. */
export function instantiateTemplate(template: QuestionTemplate, difficulty: number, seed: number): Question {
  if (!template.difficulties.includes(difficulty)) {
    throw new Error(`Template ${template.id} does not support difficulty ${difficulty}`);
  }
  const topic = getTopic(template.topicId);
  if (!topic) throw new Error(`Template ${template.id} has unknown topic ${template.topicId}`);
  const rng = createRng((seed * 2654435761 + difficulty * 97) >>> 0);
  const out = template.generate({ rng, difficulty });
  return QuestionSchema.parse({
    ...out,
    id: templateQuestionId(template.id, difficulty, seed),
    subject: topic.subject,
    yearLevel: topic.yearLevel,
    topicId: template.topicId,
    difficulty,
    tags: [...(out.tags ?? []), 'template'],
  });
}

/** Rebuilds a template question from its id (used by the server to mark answers). */
export function questionFromTemplateId(id: string): Question | null {
  const parsed = parseTemplateQuestionId(id);
  if (!parsed) return null;
  const template = byId.get(parsed.templateId);
  if (!template || !template.difficulties.includes(parsed.difficulty)) return null;
  return instantiateTemplate(template, parsed.difficulty, parsed.seed);
}
