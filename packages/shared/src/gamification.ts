import { addDays } from './dates';
import type { DateKey, StudentStats } from './types';

export const XP = {
  correctBase: 10,
  perDifficulty: 3,
  firstTryBonus: 5,
  examCompleted: 50,
  flashcardReview: 2,
  lessonCompleted: 15,
  dailyGoalBonus: 25,
} as const;

/** XP for one marked answer. */
export function xpForAnswer(opts: { score: number; difficulty: number; hintsUsed: number; firstTry: boolean }): number {
  if (opts.score <= 0) return 1; // effort still counts a little
  const base = XP.correctBase + (opts.difficulty - 1) * XP.perDifficulty;
  const hintFactor = Math.max(0.4, 1 - opts.hintsUsed * 0.2);
  const bonus = opts.firstTry && opts.score >= 0.999 && opts.hintsUsed === 0 ? XP.firstTryBonus : 0;
  return Math.round(base * opts.score * hintFactor) + bonus;
}

/** Level n needs 50·n·(n−1) XP in total: 0, 100, 300, 600, 1000, … */
export function levelForXp(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + (8 * Math.max(0, xp)) / 100)) / 2);
}

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function emptyStats(now = Date.now()): StudentStats {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    todayCount: 0,
    todayDate: null,
    totalAnswered: 0,
    totalCorrect: 0,
    badges: [],
    updatedAt: now,
  };
}

/** Updates the daily streak for activity on `today` (NZ date). */
export function applyActivity(stats: StudentStats, today: DateKey): StudentStats {
  if (stats.lastActiveDate === today) return stats;
  const continued = stats.lastActiveDate === addDays(today, -1);
  const streak = continued ? stats.streak + 1 : 1;
  return {
    ...stats,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastActiveDate: today,
    todayCount: 0,
    todayDate: today,
  };
}

/** The streak to display: a streak is broken if the last activity was before yesterday. */
export function currentStreak(stats: Pick<StudentStats, 'streak' | 'lastActiveDate'>, today: DateKey): number {
  if (!stats.lastActiveDate) return 0;
  if (stats.lastActiveDate === today || stats.lastActiveDate === addDays(today, -1)) return stats.streak;
  return 0;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const BADGES: readonly BadgeDef[] = [
  { id: 'first-correct', title: 'First steps', description: 'Answer your first question correctly.', icon: '🌱' },
  { id: 'answers-100', title: 'Century', description: 'Answer 100 questions.', icon: '💯' },
  { id: 'answers-500', title: 'Machine', description: 'Answer 500 questions.', icon: '⚙️' },
  { id: 'streak-3', title: 'On a roll', description: 'Study three days in a row.', icon: '🔥' },
  { id: 'streak-7', title: 'Week warrior', description: 'Study seven days in a row.', icon: '📅' },
  { id: 'streak-30', title: 'Unstoppable', description: 'Study 30 days in a row.', icon: '🏔️' },
  { id: 'run-10', title: 'Ten in a row', description: 'Get 10 questions right in a row.', icon: '🎯' },
  { id: 'topic-proficient', title: 'Proficient', description: 'Reach Proficient in any topic.', icon: '⭐' },
  { id: 'topic-exceeding', title: 'Top of the class', description: 'Reach Exceeding in any topic.', icon: '🏆' },
  { id: 'first-exam', title: 'Exam ready', description: 'Finish your first mock exam.', icon: '📝' },
  { id: 'exam-80', title: 'Ace', description: 'Score 80% or more in a mock exam.', icon: '🥇' },
  { id: 'level-5', title: 'Level 5', description: 'Reach level 5.', icon: '🚀' },
  { id: 'level-10', title: 'Level 10', description: 'Reach level 10.', icon: '🌟' },
  { id: 'flashcards-100', title: 'Memory bank', description: 'Review 100 flashcards.', icon: '🧠' },
  { id: 'daily-goal', title: 'Goal getter', description: 'Hit your daily goal.', icon: '✅' },
];

export interface BadgeContext {
  stats: StudentStats;
  runOfCorrect?: number;
  bestMasteryLevel?: string;
  examPercent?: number;
  flashcardsReviewed?: number;
  dailyGoalMet?: boolean;
}

/** Returns badge ids newly earned in this context (not already held). */
export function newBadges(ctx: BadgeContext): string[] {
  const s = ctx.stats;
  const earned = new Set(s.badges);
  const out: string[] = [];
  const award = (id: string, cond: boolean) => {
    if (cond && !earned.has(id)) out.push(id);
  };
  award('first-correct', s.totalCorrect >= 1);
  award('answers-100', s.totalAnswered >= 100);
  award('answers-500', s.totalAnswered >= 500);
  award('streak-3', s.streak >= 3);
  award('streak-7', s.streak >= 7);
  award('streak-30', s.streak >= 30);
  award('run-10', (ctx.runOfCorrect ?? 0) >= 10);
  award('topic-proficient', ctx.bestMasteryLevel === 'proficient' || ctx.bestMasteryLevel === 'exceeding');
  award('topic-exceeding', ctx.bestMasteryLevel === 'exceeding');
  award('first-exam', ctx.examPercent !== undefined);
  award('exam-80', (ctx.examPercent ?? 0) >= 80);
  award('level-5', s.level >= 5);
  award('level-10', s.level >= 10);
  award('flashcards-100', (ctx.flashcardsReviewed ?? 0) >= 100);
  award('daily-goal', ctx.dailyGoalMet === true);
  return out;
}
