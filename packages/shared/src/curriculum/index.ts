import type { Subject } from '../types';
import { year6Maths } from './nz/year6-maths';
import { year7Maths } from './nz/year7-maths';
import { year9Maths } from './nz/year9-maths';
import { year9Science } from './nz/year9-science';
import type { Curriculum, Topic } from './types';

export * from './types';

/** Every curriculum the app knows about. Add new year levels here. */
export const CURRICULA: readonly Curriculum[] = [year6Maths, year7Maths, year9Maths, year9Science];

const topicIndex = new Map<string, Topic>();
for (const c of CURRICULA) {
  for (const t of c.topics) {
    if (topicIndex.has(t.id)) throw new Error(`Duplicate topic id ${t.id}`);
    topicIndex.set(t.id, t);
  }
}

export function getCurriculum(subject: Subject, yearLevel: number): Curriculum | undefined {
  return CURRICULA.find((c) => c.subject === subject && c.yearLevel === yearLevel);
}

export function getTopic(topicId: string): Topic | undefined {
  return topicIndex.get(topicId);
}

export function isTopicId(topicId: string): boolean {
  return topicIndex.has(topicId);
}

export function allTopics(): Topic[] {
  return [...topicIndex.values()];
}

export function topicsFor(subject: Subject, yearLevel: number): Topic[] {
  return getCurriculum(subject, yearLevel)?.topics ?? [];
}

/** Year levels that have at least one curriculum. */
export function supportedYearLevels(): number[] {
  return [...new Set(CURRICULA.map((c) => c.yearLevel))].sort((a, b) => a - b);
}

export function subjectsForYear(yearLevel: number): Subject[] {
  return CURRICULA.filter((c) => c.yearLevel === yearLevel).map((c) => c.subject);
}

/**
 * The curricula a student in this year level studies. For each subject, use their own year if we
 * have it, otherwise the year either side (the lower one on a tie, e.g. Year 8 sees Year 7 maths),
 * but never further away: a Year 6 student is not shown Year 9 science.
 */
export function curriculaForYear(yearLevel: number): Curriculum[] {
  const result: Curriculum[] = [];
  for (const subject of [...new Set(CURRICULA.map((c) => c.subject))]) {
    for (const year of [yearLevel, yearLevel - 1, yearLevel + 1]) {
      const c = getCurriculum(subject, year);
      if (c) {
        result.push(c);
        break;
      }
    }
  }
  return result;
}
