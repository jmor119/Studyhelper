// Loads and validates everything under content/. Used by validate-content and seed.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  getTopic,
  markResponse,
  QuestionSchema,
  type Question,
  type Subject,
} from '@study-helper/shared';
import { parseLesson, type Lesson } from '../packages/shared/src/content/lesson';
import type { Flashcard } from '../packages/shared/src/srs';
import { correctResponseFor } from '../packages/shared/src/testing/correct-response';

export const CONTENT_DIR = path.resolve(import.meta.dirname, '..', 'content');

export interface ContentReport {
  questions: Question[];
  flashcards: Flashcard[];
  lessons: Lesson[];
  errors: string[];
  warnings: string[];
}

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
}

function listMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

const rel = (f: string) => path.relative(CONTENT_DIR, f).replace(/\\/g, '/');

export function loadContent(): ContentReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const questions: Question[] = [];
  const flashcards: Flashcard[] = [];
  const lessons: Lesson[] = [];
  const ids = new Set<string>();

  // ---- Questions: content/questions/<subject>/<topicId>.json ----
  for (const file of listJson(path.join(CONTENT_DIR, 'questions'))) {
    const topicId = path.basename(file, '.json');
    const topic = getTopic(topicId);
    if (!topic) {
      errors.push(`${rel(file)}: file name must be a topic id (unknown topic "${topicId}")`);
      continue;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel(file)}: invalid JSON — ${(e as Error).message}`);
      continue;
    }
    if (!Array.isArray(raw)) {
      errors.push(`${rel(file)}: must contain a JSON array of questions`);
      continue;
    }
    raw.forEach((item, i) => {
      const where = `${rel(file)}[${i}]${(item as { id?: string })?.id ? ` (${(item as { id: string }).id})` : ''}`;
      const parsed = QuestionSchema.safeParse({ subject: topic.subject, yearLevel: topic.yearLevel, topicId, ...item });
      if (!parsed.success) {
        errors.push(`${where}: ${parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`);
        return;
      }
      const q = parsed.data;
      if (q.topicId !== topicId) errors.push(`${where}: topicId must match the file name`);
      if (!q.id.startsWith(`${topicId}.`)) errors.push(`${where}: id must start with "${topicId}."`);
      if (ids.has(q.id)) errors.push(`${where}: duplicate id`);
      ids.add(q.id);
      if (!q.hints.length && q.type !== 'extended') warnings.push(`${where}: no hints`);
      if (q.type === 'mcq' && !q.options.some((o) => o.id === q.correct)) errors.push(`${where}: correct option missing`);
      if (q.type === 'multi' && q.correct.some((c) => !q.options.some((o) => o.id === c))) {
        errors.push(`${where}: a correct option is missing`);
      }
      if (q.type === 'mcq' || q.type === 'multi') {
        const texts = q.options.map((o) => o.text.trim().toLowerCase());
        if (new Set(texts).size !== texts.length) errors.push(`${where}: duplicate option text`);
        const oids = q.options.map((o) => o.id);
        if (new Set(oids).size !== oids.length) errors.push(`${where}: duplicate option ids`);
      }
      if (q.type === 'cloze') {
        for (const b of q.blanks) {
          if (!q.prompt.includes(`[[${b.id}]]`)) errors.push(`${where}: prompt is missing marker [[${b.id}]]`);
          if (b.options && !b.accepted.every((a) => b.options!.includes(a))) {
            errors.push(`${where}: blank ${b.id} accepted answers must be among its options`);
          }
        }
      }
      if (q.type === 'extended') {
        const total = q.rubric.reduce((s, r) => s + r.marks, 0);
        if (total !== q.marks) errors.push(`${where}: rubric marks (${total}) must add up to marks (${q.marks})`);
      }
      const response = correctResponseFor(q);
      if (response && !markResponse(q, response).correct) {
        errors.push(`${where}: its own correct answer is not marked correct — check answer/options`);
      }
      if (/\$[^$]*\\[^\\a-zA-Z{}$ ,;!]/.test(q.prompt)) {
        warnings.push(`${where}: suspicious backslash in maths — remember JSON needs "\\\\frac"`);
      }
      questions.push(q);
    });
  }

  // ---- Flashcards: content/flashcards/<subject>/<topicId>.json ----
  const cardIds = new Set<string>();
  for (const file of listJson(path.join(CONTENT_DIR, 'flashcards'))) {
    const topicId = path.basename(file, '.json');
    if (!getTopic(topicId)) {
      errors.push(`${rel(file)}: unknown topic "${topicId}"`);
      continue;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel(file)}: invalid JSON — ${(e as Error).message}`);
      continue;
    }
    if (!Array.isArray(raw)) {
      errors.push(`${rel(file)}: must be an array`);
      continue;
    }
    raw.forEach((c: Partial<Flashcard>, i) => {
      const where = `${rel(file)}[${i}]`;
      if (!c.id || !c.front || !c.back) {
        errors.push(`${where}: needs id, front and back`);
        return;
      }
      if (!c.id.startsWith(`${topicId}.`)) errors.push(`${where}: id must start with "${topicId}."`);
      if (cardIds.has(c.id)) errors.push(`${where}: duplicate id ${c.id}`);
      cardIds.add(c.id);
      flashcards.push({ id: c.id, topicId, front: c.front, back: c.back, ...(c.tags && { tags: c.tags }) });
    });
  }

  // ---- Lessons: content/lessons/<subject>/<topicId>.md ----
  for (const file of listMd(path.join(CONTENT_DIR, 'lessons'))) {
    const topicId = path.basename(file, '.md');
    const topic = getTopic(topicId);
    if (!topic) {
      errors.push(`${rel(file)}: unknown topic "${topicId}"`);
      continue;
    }
    try {
      const lesson = parseLesson(readFileSync(file, 'utf8'), { subject: topic.subject, yearLevel: topic.yearLevel });
      if (lesson.meta.topicId !== topicId) errors.push(`${rel(file)}: front-matter topicId must match the file name`);
      if (lesson.sections.length < 2) warnings.push(`${rel(file)}: only ${lesson.sections.length} section(s)`);
      for (const s of lesson.sections) {
        for (const c of s.checks) {
          const response = correctResponseFor(c);
          if (response && !markResponse(c, response).correct) {
            errors.push(`${rel(file)}: quick check in "${s.title}" — its correct answer is not marked correct`);
          }
        }
      }
      lessons.push(lesson);
    } catch (e) {
      errors.push(`${rel(file)}: ${(e as Error).message}`);
    }
  }

  return { questions, flashcards, lessons, errors, warnings };
}

export function coverageBySubject(report: ContentReport, subject: Subject) {
  const byTopic = new Map<string, { questions: number; flashcards: number; lesson: boolean }>();
  for (const q of report.questions.filter((x) => x.subject === subject)) {
    const e = byTopic.get(q.topicId) ?? { questions: 0, flashcards: 0, lesson: false };
    e.questions++;
    byTopic.set(q.topicId, e);
  }
  for (const c of report.flashcards) {
    const t = getTopic(c.topicId);
    if (t?.subject !== subject) continue;
    const e = byTopic.get(c.topicId) ?? { questions: 0, flashcards: 0, lesson: false };
    e.flashcards++;
    byTopic.set(c.topicId, e);
  }
  for (const l of report.lessons) {
    const t = getTopic(l.meta.topicId);
    if (t?.subject !== subject) continue;
    const e = byTopic.get(l.meta.topicId) ?? { questions: 0, flashcards: 0, lesson: false };
    e.lesson = true;
    byTopic.set(l.meta.topicId, e);
  }
  return byTopic;
}
