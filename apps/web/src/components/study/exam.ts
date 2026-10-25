import { examGrade, type PublicQuestion } from '@study-helper/shared';
import type { ExamResultItem, ExamSummary } from '../../lib/api';

/** students/{uid}/exams/{examId} — written by the startExam/submitExam functions. */
export interface ExamDoc {
  title: string;
  subject: 'maths' | 'science' | 'mixed';
  topicIds: string[];
  durationMinutes: number;
  calculator: 'allowed' | 'not-allowed';
  startedAt: number;
  endsAt: number;
  status: 'in-progress' | 'marking' | 'submitted';
  questionIds: string[];
  questionCount: number;
  totalMarks: number;
  submittedAt?: number;
  timeTakenMs?: number;
  late?: boolean;
  results?: ExamResultItem[];
  summary?: ExamSummary;
}

/** students/{uid}/exams/{examId}/questions/{nnn} */
export type ExamQuestion = PublicQuestion & { order: number };

/**
 * Summary recomputed from the per-question results. The stored summary isn't fully refreshed
 * after AI marking (grade and per-topic marks go stale), so the UI always derives it.
 */
export function summariseResults(items: readonly ExamResultItem[]): ExamSummary {
  const byTopic: ExamSummary['byTopic'] = {};
  let awarded = 0;
  let available = 0;
  let pendingReview = 0;
  for (const i of items) {
    const t = (byTopic[i.topicId] ??= { awarded: 0, available: 0 });
    t.available += i.marksAvailable;
    available += i.marksAvailable;
    if (i.needsReview) pendingReview++;
    else {
      t.awarded += i.marksAwarded;
      awarded += i.marksAwarded;
    }
  }
  const percent = available ? Math.round((awarded / available) * 100) : 0;
  return { awarded, available, percent, grade: examGrade(percent), byTopic, pendingReview };
}

export const GRADE_TONE: Record<string, 'brand' | 'good' | 'info' | 'warn' | 'bad'> = {
  'A+': 'brand',
  A: 'good',
  B: 'info',
  C: 'info',
  D: 'warn',
  E: 'bad',
};
