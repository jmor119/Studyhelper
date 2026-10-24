import {
  applyActivity,
  emptyStats,
  levelForXp,
  masteryLevel,
  newBadges,
  nzDateKey,
  updateMastery,
  weekStart,
  xpForAnswer,
  type AttemptRecord,
  type Goal,
  type GoalMetric,
  type MarkResult,
  type MasteryRecord,
  type Question,
  type StudentStats,
} from '@study-helper/shared';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { db, FieldValue } from './firebase';

const SEEN_LIMIT = 300;

/** Roll weekly/daily counters when the NZ date or week changes. */
function rollPeriods(stats: StudentStats, today: string): StudentStats {
  const s = applyActivity(stats, today);
  const wk = weekStart(today);
  if (s.weekStart !== wk) {
    return { ...s, weekStart: wk, weekAnswered: 0, weekCorrect: 0, weekXp: 0, weekMinutes: 0 };
  }
  return s;
}

function periodKey(goal: Goal, today: string): string {
  if (goal.period === 'day') return today;
  if (goal.period === 'week') return weekStart(today);
  return 'once';
}

export type GoalIncrements = Partial<Record<GoalMetric, number>>;

/** Applies increments to the student's active goals inside a transaction. Returns titles achieved now. */
async function applyGoals(
  tx: Transaction,
  studentUid: string,
  today: string,
  inc: GoalIncrements,
  newDay: boolean,
): Promise<string[]> {
  const goals = await tx.get(db.collection(`students/${studentUid}/goals`).where('status', '==', 'active'));
  const achieved: string[] = [];
  for (const doc of goals.docs) {
    const goal = doc.data() as Goal;
    const key = periodKey(goal, today);
    const base = goal.periodStart === key ? goal.progress : 0;
    const add = goal.metric === 'sessions' ? (newDay ? 1 : 0) : (inc[goal.metric] ?? 0);
    if (!add && goal.periodStart === key) continue;
    const progress = base + add;
    const update: Record<string, unknown> = { progress, periodStart: key };
    if (progress >= goal.target && goal.lastAchievedPeriod !== key) {
      achieved.push(goal.title);
      update.lastAchievedPeriod = key;
      update.achievedCount = (goal.achievedCount ?? 0) + 1;
      update.achievedAt = Date.now();
      if (goal.period === 'once') update.status = 'achieved';
    }
    tx.update(doc.ref, update);
  }
  return achieved;
}

export interface ProgressResult {
  attemptId: string;
  xpGained: number;
  xp: number;
  level: number;
  streak: number;
  mastery: number;
  masteryLevel: string;
  newBadges: string[];
  goalsAchieved: string[];
  todayCount: number;
}

/** Records a marked answer and updates mastery, XP, streaks, badges, goals and seen-history atomically. */
export async function recordAttempt(
  uid: string,
  question: Question,
  mark: MarkResult,
  meta: {
    hintsUsed: number;
    timeMs: number;
    context: AttemptRecord['context'];
    answerText?: string;
    examId?: string;
    /** Update an existing attempt (self/AI marking) instead of creating one. */
    attemptRef?: DocumentReference;
    selfMarked?: boolean;
    aiMarked?: boolean;
    /** Exam questions don't award per-question XP (the exam gives a lump sum). */
    noXp?: boolean;
  },
): Promise<ProgressResult> {
  const now = Date.now();
  const today = nzDateKey(now);
  const studentRef = db.doc(`students/${uid}`);
  const masteryRef = studentRef.collection('mastery').doc(question.topicId);
  const seenRef = studentRef.collection('seen').doc(question.topicId);
  const attemptRef = meta.attemptRef ?? studentRef.collection('attempts').doc();
  const dailyGoal = 20;

  const result = await db.runTransaction(async (tx) => {
    const [statsSnap, masterySnap, seenSnap, userSnap] = await Promise.all([
      tx.get(studentRef),
      tx.get(masteryRef),
      tx.get(seenRef),
      tx.get(db.doc(`users/${uid}`)),
    ]);
    const prevStats = (statsSnap.data() as StudentStats | undefined) ?? emptyStats(now);
    const newDay = prevStats.lastActiveDate !== today;
    let stats = rollPeriods(prevStats, today);
    const prevMastery = masterySnap.data() as MasteryRecord | undefined;

    const firstTry = !(seenSnap.data()?.ids as string[] | undefined)?.includes(question.id);
    const xpGained = meta.noXp ? 0 : xpForAnswer({ score: mark.score, difficulty: question.difficulty, hintsUsed: meta.hintsUsed, firstTry });
    const minutes = Math.min(meta.timeMs, 10 * 60_000) / 60_000;

    const m = updateMastery(prevMastery, question.difficulty, mark.score, meta.hintsUsed);
    const masteryRecord: MasteryRecord = {
      topicId: question.topicId,
      subject: question.subject,
      ability: m.ability,
      mastery: m.mastery,
      attempts: m.attempts,
      correct: m.correct,
      lastPracticedAt: now,
    };
    const level = masteryLevel(m.mastery, m.attempts);

    const goalTarget = (userSnap.data()?.prefs?.dailyGoal as number | undefined) ?? dailyGoal;
    const wasBelowGoal = stats.todayCount < goalTarget;
    stats = {
      ...stats,
      xp: stats.xp + xpGained,
      todayCount: stats.todayCount + 1,
      todayDate: today,
      totalAnswered: stats.totalAnswered + 1,
      totalCorrect: stats.totalCorrect + (mark.correct ? 1 : 0),
      runOfCorrect: mark.correct ? (stats.runOfCorrect ?? 0) + 1 : 0,
      weekAnswered: (stats.weekAnswered ?? 0) + 1,
      weekCorrect: (stats.weekCorrect ?? 0) + (mark.correct ? 1 : 0),
      weekXp: (stats.weekXp ?? 0) + xpGained,
      weekMinutes: (stats.weekMinutes ?? 0) + minutes,
      todayMinutes: (newDay ? 0 : (stats.todayMinutes ?? 0)) + minutes,
      updatedAt: now,
    };
    const dailyGoalMet = wasBelowGoal && stats.todayCount >= goalTarget;
    const bonus = dailyGoalMet ? 25 : 0;
    stats.xp += bonus;
    stats.weekXp = (stats.weekXp ?? 0) + bonus;
    stats.level = levelForXp(stats.xp);
    const badges = newBadges({ stats, runOfCorrect: stats.runOfCorrect, bestMasteryLevel: level.id, dailyGoalMet });
    stats.badges = [...stats.badges, ...badges];

    const goalsAchieved = await applyGoals(
      tx,
      uid,
      today,
      {
        questions: 1,
        correct: mark.correct ? 1 : 0,
        minutes,
        xp: xpGained + bonus,
      },
      newDay,
    );

    const attempt: AttemptRecord = {
      questionId: question.id,
      topicId: question.topicId,
      subject: question.subject,
      difficulty: question.difficulty,
      type: question.type,
      correct: mark.correct,
      score: mark.score,
      marksAwarded: mark.marksAwarded,
      marksAvailable: mark.marksAvailable,
      hintsUsed: meta.hintsUsed,
      timeMs: meta.timeMs,
      context: meta.context,
      createdAt: now,
      ...(meta.answerText && { answerText: meta.answerText.slice(0, 300) }),
      ...(meta.examId && { examId: meta.examId }),
      ...(mark.feedback && { feedback: mark.feedback }),
      ...(meta.selfMarked && { selfMarked: true }),
      ...(meta.aiMarked && { aiMarked: true }),
    };
    if (meta.attemptRef) tx.set(attemptRef, { ...attempt, needsReview: false }, { merge: true });
    else tx.set(attemptRef, attempt);
    tx.set(studentRef, stats);
    tx.set(masteryRef, masteryRecord);
    const ids = [question.id, ...((seenSnap.data()?.ids as string[] | undefined) ?? []).filter((x) => x !== question.id)];
    tx.set(seenRef, { ids: ids.slice(0, SEEN_LIMIT), updatedAt: now });

    return {
      attemptId: attemptRef.id,
      xpGained,
      xp: stats.xp,
      level: stats.level,
      streak: stats.streak,
      mastery: m.mastery,
      masteryLevel: level.id,
      newBadges: badges,
      goalsAchieved,
      todayCount: stats.todayCount,
    } satisfies ProgressResult;
  });

  // Bank question stats (outside the transaction to avoid contention on popular questions).
  if (!question.id.startsWith('tpl:') && !question.id.startsWith('note:')) {
    db.doc(`bank/${question.id}`)
      .update({ 'stats.attempts': FieldValue.increment(1), 'stats.correct': FieldValue.increment(mark.correct ? 1 : 0) })
      .catch(() => undefined);
  }
  return result;
}

/** Records a pending attempt for an answer that needs AI or self-marking. */
export async function recordPendingAttempt(
  uid: string,
  question: Question,
  meta: { hintsUsed: number; timeMs: number; context: AttemptRecord['context']; answerText: string; examId?: string },
): Promise<string> {
  const ref = db.collection(`students/${uid}/attempts`).doc();
  const attempt: AttemptRecord = {
    questionId: question.id,
    topicId: question.topicId,
    subject: question.subject,
    difficulty: question.difficulty,
    type: question.type,
    correct: false,
    score: 0,
    marksAwarded: 0,
    marksAvailable: question.marks,
    hintsUsed: meta.hintsUsed,
    timeMs: meta.timeMs,
    context: meta.context,
    createdAt: Date.now(),
    answerText: meta.answerText.slice(0, 4000),
    needsReview: true,
    ...(meta.examId && { examId: meta.examId }),
  };
  await ref.set(attempt);
  return ref.id;
}

/** XP and goal progress for non-question activity (flashcards, lessons, exams). */
export async function recordActivity(
  uid: string,
  activity: { xp: number; flashcards?: number; exams?: number; examPercent?: number; minutes?: number },
): Promise<{ xpGained: number; newBadges: string[]; goalsAchieved: string[] }> {
  const now = Date.now();
  const today = nzDateKey(now);
  const studentRef = db.doc(`students/${uid}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(studentRef);
    const prev = (snap.data() as StudentStats | undefined) ?? emptyStats(now);
    const newDay = prev.lastActiveDate !== today;
    let stats = rollPeriods(prev, today);
    stats = {
      ...stats,
      xp: stats.xp + activity.xp,
      weekXp: (stats.weekXp ?? 0) + activity.xp,
      weekMinutes: (stats.weekMinutes ?? 0) + (activity.minutes ?? 0),
      flashcardsReviewed: (stats.flashcardsReviewed ?? 0) + (activity.flashcards ?? 0),
      examsTaken: (stats.examsTaken ?? 0) + (activity.exams ?? 0),
      updatedAt: now,
    };
    stats.level = levelForXp(stats.xp);
    const badges = newBadges({
      stats,
      flashcardsReviewed: stats.flashcardsReviewed,
      ...(activity.examPercent !== undefined && { examPercent: activity.examPercent }),
    });
    stats.badges = [...stats.badges, ...badges];
    const goalsAchieved = await applyGoals(
      tx,
      uid,
      today,
      { xp: activity.xp, flashcards: activity.flashcards ?? 0, exams: activity.exams ?? 0, minutes: activity.minutes ?? 0 },
      newDay,
    );
    tx.set(studentRef, stats);
    return { xpGained: activity.xp, newBadges: badges, goalsAchieved };
  });
}
