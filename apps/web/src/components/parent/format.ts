import {
  addDays,
  formatDateKey,
  getTopic,
  weekStart,
  type AttemptRecord,
  type Goal,
  type GoalMetric,
  type GoalPeriod,
  type MasteryRecord,
  type StudentStats,
} from '@study-helper/shared';

// Formatting and small derivations shared by the parent portal.

const NZ_TZ = 'Pacific/Auckland';
const dateTimeFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** e.g. "3 Nov, 4:05 pm" (NZ time). */
export const formatDateTime = (ms: number) => dateTimeFmt.format(ms);
/** e.g. "4:05 pm" (NZ time). */
export const formatTime = (ms: number) => timeFmt.format(ms);
/** e.g. "Mon, 3 Nov 2026" (NZ time). */
export const formatDate = (ms: number) => dateFmt.format(ms);

/** "Today", "Yesterday" or "Mon 3 Nov" for a NZ date key. */
export function dayLabel(key: string | null | undefined, today: string, never = 'Not yet'): string {
  if (!key) return never;
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  return formatDateKey(key);
}

/** "45 s", "2 min 5 s", "1 h 10 min". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

/** "35 min", "1 h 20 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 60)} h`;
}

export const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-NZ')} ${n === 1 ? one : many}`;

export const topicTitle = (topicId: string) => getTopic(topicId)?.title ?? topicId;

/** This week's counters, which only count when they belong to the current NZ week. */
export function weekSummary(stats: StudentStats | null | undefined, today: string) {
  const current = !!stats && stats.weekStart === weekStart(today);
  const answered = current ? (stats.weekAnswered ?? 0) : 0;
  const correct = current ? (stats.weekCorrect ?? 0) : 0;
  return {
    answered,
    correct,
    accuracy: percent(correct, answered),
    minutes: current ? (stats.weekMinutes ?? 0) : 0,
    xp: current ? (stats.weekXp ?? 0) : 0,
  };
}

/** The practised topic with the lowest mastery. */
export function weakestTopic(records: MasteryRecord[]): MasteryRecord | null {
  let worst: MasteryRecord | null = null;
  for (const m of records) {
    if (!m.attempts) continue;
    if (!worst || m.mastery < worst.mastery) worst = m;
  }
  return worst;
}

// ---------------- Attempts ----------------

export const CONTEXT_LABELS: Record<AttemptRecord['context'], string> = {
  practice: 'Practice',
  review: 'Mistakes review',
  exam: 'Mock exam',
  plan: 'Study plan',
  mcp: 'AI app (MCP)',
};

export function attemptOutcome(a: Pick<AttemptRecord, 'needsReview' | 'correct' | 'score'>): { label: string; tone: 'good' | 'warn' | 'bad' | 'info' } {
  if (a.needsReview) return { label: 'Awaiting marking', tone: 'info' };
  if (a.correct) return { label: 'Correct', tone: 'good' };
  if (a.score > 0) return { label: 'Partly correct', tone: 'warn' };
  return { label: 'Incorrect', tone: 'bad' };
}

/** Cloze prompts contain [[blank]] markers; show them as gaps. */
export const displayPrompt = (prompt: string) => prompt.replace(/\[\[[a-z0-9]+\]\]/g, '\\_\\_\\_\\_');

// ---------------- Goals ----------------

export const METRICS: { value: GoalMetric; label: string; unit: [string, string]; hint: string }[] = [
  { value: 'questions', label: 'Questions answered', unit: ['question', 'questions'], hint: 'Every practice, review or exam answer counts.' },
  { value: 'correct', label: 'Correct answers', unit: ['correct answer', 'correct answers'], hint: 'Only fully correct answers count.' },
  { value: 'minutes', label: 'Minutes of practice', unit: ['minute', 'minutes'], hint: 'Time spent answering questions and sitting mock exams.' },
  { value: 'xp', label: 'XP earned', unit: ['XP', 'XP'], hint: 'XP comes from answers, flashcards, lessons and exams.' },
  { value: 'sessions', label: 'Days studied', unit: ['day', 'days'], hint: 'Counts each day they do any study.' },
  { value: 'flashcards', label: 'Flashcards reviewed', unit: ['flashcard', 'flashcards'], hint: 'Each flashcard reviewed counts once.' },
  { value: 'exams', label: 'Mock exams finished', unit: ['mock exam', 'mock exams'], hint: 'Counts each mock exam they submit.' },
];

export const PERIODS: { value: GoalPeriod; label: string; hint: string }[] = [
  { value: 'day', label: 'Every day', hint: 'Resets each morning (NZ time).' },
  { value: 'week', label: 'Every week', hint: 'Resets each Monday (NZ time).' },
  { value: 'once', label: 'One-off', hint: 'Finished once the target is reached.' },
];

export const metricInfo = (m: GoalMetric) => METRICS.find((x) => x.value === m) ?? METRICS[0]!;
export const periodLabel = (p: GoalPeriod) => PERIODS.find((x) => x.value === p)?.label ?? p;

export function unitFor(metric: GoalMetric, n: number) {
  const [one, many] = metricInfo(metric).unit;
  return n === 1 ? one : many;
}

/** A friendly default title, e.g. "Answer 20 questions every day". */
export function suggestGoalTitle(metric: GoalMetric, target: number, period: GoalPeriod): string {
  const n = Number.isFinite(target) && target > 0 ? target : 0;
  const suffix = period === 'day' ? ' every day' : period === 'week' ? ' every week' : '';
  switch (metric) {
    case 'questions':
      return `Answer ${n} ${n === 1 ? 'question' : 'questions'}${suffix}`;
    case 'correct':
      return `Get ${n} ${n === 1 ? 'answer' : 'answers'} right${suffix}`;
    case 'minutes':
      return `Practise for ${n} ${n === 1 ? 'minute' : 'minutes'}${suffix}`;
    case 'xp':
      return `Earn ${n} XP${suffix}`;
    case 'sessions':
      return period === 'day' ? 'Study every day' : `Study on ${n} ${n === 1 ? 'day' : 'days'}${suffix}`;
    case 'flashcards':
      return `Review ${n} ${n === 1 ? 'flashcard' : 'flashcards'}${suffix}`;
    case 'exams':
      return `Finish ${n} mock ${n === 1 ? 'exam' : 'exams'}${suffix}`;
  }
}

export function goalPeriodKey(period: GoalPeriod, today: string): string {
  return period === 'day' ? today : period === 'week' ? weekStart(today) : 'once';
}

/** Progress in the current period (recurring goals reset each day/week). */
export function goalProgress(g: Goal, today: string) {
  const key = goalPeriodKey(g.period, today);
  const raw = g.period === 'once' || g.periodStart === key ? g.progress : 0;
  const current = Math.floor(raw);
  return {
    current,
    achievedThisPeriod: g.lastAchievedPeriod === key || current >= g.target,
    periodText: g.period === 'day' ? 'today' : g.period === 'week' ? 'this week' : '',
  };
}

export const GOAL_STATUS: Record<Goal['status'], { label: string; tone: 'good' | 'neutral' | 'brand' | 'warn' }> = {
  active: { label: 'Active', tone: 'brand' },
  paused: { label: 'Paused', tone: 'warn' },
  achieved: { label: 'Achieved', tone: 'good' },
  archived: { label: 'Archived', tone: 'neutral' },
};
