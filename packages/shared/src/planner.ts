import { addDays, daysBetween, weekday } from './dates';
import type { DateKey } from './types';

// Builds a day-by-day revision plan from today up to an exam, weighted towards weaker topics,
// with spaced revisits and a mock exam near the end.

export type PlanItemKind = 'learn' | 'practice' | 'review' | 'flashcards' | 'mock-exam' | 'rest';

export interface PlanItem {
  kind: PlanItemKind;
  topicId?: string;
  minutes: number;
  label: string;
}

export interface PlanDay {
  date: DateKey;
  items: PlanItem[];
}

export interface PlanTopicInput {
  topicId: string;
  title: string;
  /** 0–100; undefined = not started. */
  mastery?: number;
  /** Extra weight, e.g. 2 for a topic the teacher said is important. */
  weight?: number;
}

export interface PlanInput {
  today: DateKey;
  examDate: DateKey;
  topics: PlanTopicInput[];
  minutesPerDay: number;
  /** Weekdays to skip: 0 = Sunday … 6 = Saturday. */
  restDays?: number[];
  subjectLabel?: string;
}

const SESSION_MINUTES = 15;

export function buildStudyPlan(input: PlanInput): PlanDay[] {
  const totalDays = daysBetween(input.today, input.examDate);
  if (totalDays <= 0 || !input.topics.length) return [];
  const rest = new Set(input.restDays ?? []);
  const studyDates: DateKey[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(input.today, i);
    if (!rest.has(weekday(d))) studyDates.push(d);
  }
  if (!studyDates.length) return [];

  const sessionsPerDay = Math.max(1, Math.floor(input.minutesPerDay / SESSION_MINUTES));
  const mockDay = studyDates.length >= 4 ? studyDates[studyDates.length - 2] : undefined;
  const lastDay = studyDates[studyDates.length - 1]!;

  // Priority: weaker topics need more sessions. Not-started topics need a "learn" session first.
  const queue = input.topics.map((t) => {
    const m = t.mastery ?? 0;
    const need = (1.2 - m / 100) * (t.weight ?? 1);
    return { ...t, need, learned: t.mastery !== undefined && t.mastery >= 30, lastDay: -99, sessions: 0 };
  });

  const days: PlanDay[] = [];
  studyDates.forEach((date, dayIndex) => {
    const items: PlanItem[] = [];
    if (date === mockDay) {
      items.push({ kind: 'mock-exam', minutes: Math.max(30, input.minutesPerDay), label: `Mock exam${input.subjectLabel ? ` — ${input.subjectLabel}` : ''}` });
      days.push({ date, items });
      return;
    }
    if (date === lastDay && studyDates.length > 1) {
      items.push({ kind: 'review', minutes: Math.min(30, input.minutesPerDay), label: 'Light review of your mistakes' });
      items.push({ kind: 'flashcards', minutes: 10, label: 'Flashcards — key terms' });
      days.push({ date, items });
      return;
    }
    const used = new Set<string>();
    for (let s = 0; s < sessionsPerDay; s++) {
      // Score each topic: need, boosted when it hasn't been seen for a while (spacing), never twice a day.
      let best: (typeof queue)[number] | undefined;
      let bestScore = -Infinity;
      for (const t of queue) {
        if (used.has(t.topicId)) continue;
        const gap = dayIndex - t.lastDay;
        const spacing = gap <= 1 ? 0.3 : gap <= 2 ? 0.8 : 1 + Math.min(gap, 7) * 0.05;
        const score = (t.need / (1 + t.sessions * 0.6)) * spacing;
        if (score > bestScore) {
          bestScore = score;
          best = t;
        }
      }
      if (!best) break;
      used.add(best.topicId);
      const kind: PlanItemKind = best.learned ? 'practice' : 'learn';
      items.push({
        kind,
        topicId: best.topicId,
        minutes: SESSION_MINUTES,
        label: `${kind === 'learn' ? 'Learn' : 'Practise'}: ${best.title}`,
      });
      best.learned = true;
      best.lastDay = dayIndex;
      best.sessions += 1;
    }
    if (input.minutesPerDay - sessionsPerDay * SESSION_MINUTES >= 5 || dayIndex % 2 === 1) {
      items.push({ kind: 'flashcards', minutes: 5, label: 'Flashcards' });
    }
    days.push({ date, items });
  });
  return days;
}
