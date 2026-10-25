import {
  addDays,
  currentStreak,
  levelForXp,
  MASTERY_LEVELS,
  nzDateKey,
  xpForLevel,
  type AttemptRecord,
  type Goal,
  type MasteryRecord,
  type StudentStats,
} from '@study-helper/shared';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { BarChart3, ClipboardCheck, Flame, Gauge, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { curriculaFor, LEVEL_TONE, levelFor, subjectLabel } from '../../lib/study';
import { Badge, Card, Notice, ProgressBar, Spinner } from '../ui';
import { ActivityChart, buildDays } from './ActivityChart';
import { CardTitle, LinkButton, StatTile } from './bits';
import type { ExamDoc } from './ExamsTab';
import { dayLabel, formatDate, formatMinutes, goalProgress, percent, plural, unitFor, weekSummary } from './format';

export type ChildTab = 'overview' | 'topics' | 'activity' | 'exams' | 'chats' | 'goals' | 'account';

interface Props {
  uid: string;
  name: string;
  yearLevel: number | undefined;
  stats: StudentStats | null;
  goals: Array<Goal & { id: string }>;
  mastery: { byTopic: Map<string, MasteryRecord>; loading: boolean };
  onTab: (tab: ChildTab) => void;
}

export function OverviewTab({ uid, name, yearLevel, stats, goals, mastery, onTab }: Props) {
  const today = nzDateKey();
  // Fixed for the life of the tab so the live query key stays stable.
  const [firstDay] = useState(() => addDays(today, -13));
  const [since] = useState(() => Date.now() - 15 * 86_400_000);

  const attempts = useQuery<AttemptRecord>(
    query(collection(db, 'students', uid, 'attempts'), where('createdAt', '>=', since), orderBy('createdAt'), limit(3000)),
    `attempts:14d:${uid}:${firstDay}`,
  );
  const exams = useQuery<ExamDoc>(query(collection(db, 'students', uid, 'exams'), orderBy('startedAt', 'desc'), limit(3)), `exams:recent:${uid}`);
  const days = useMemo(() => buildDays(attempts.data, today), [attempts.data, today]);

  const streak = stats ? currentStreak(stats, today) : 0;
  const xp = stats?.xp ?? 0;
  const level = levelForXp(xp);
  const week = weekSummary(stats, today);
  const allTimeAccuracy = percent(stats?.totalCorrect ?? 0, stats?.totalAnswered ?? 0);
  const active = goals.filter((g) => g.status === 'active');
  const lastLabel = dayLabel(stats?.lastActiveDate, today);
  const lastActive = !stats?.lastActiveDate
    ? 'not active yet'
    : lastLabel === 'Today' || lastLabel === 'Yesterday'
      ? `last active ${lastLabel.toLowerCase()}`
      : `last active ${lastLabel}`;

  return (
    <div className="grid grid-cols-1 gap-5">
      <section aria-label="Key numbers" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Flame className="size-4 text-streak" aria-hidden="true" />}
          label="Current streak"
          value={plural(streak, 'day')}
          sub={`Best ${plural(stats?.bestStreak ?? 0, 'day')} · ${lastActive}`}
        />
        <StatTile
          icon={<Sparkles className="size-4 text-xp" aria-hidden="true" />}
          label="Level"
          value={`Level ${level}`}
          sub={`${xp.toLocaleString('en-NZ')} XP · ${(xpForLevel(level + 1) - xp).toLocaleString('en-NZ')} to the next level`}
        />
        <StatTile
          icon={<TrendingUp className="size-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />}
          label="This week"
          value={plural(week.answered, 'question')}
          sub={week.answered ? `${week.accuracy}% correct · ${formatMinutes(week.minutes)}` : 'Nothing yet this week'}
        />
        <StatTile
          icon={<Gauge className="size-4 text-brand-700 dark:text-brand-300" aria-hidden="true" />}
          label="All time"
          value={plural(stats?.totalAnswered ?? 0, 'question')}
          sub={`${allTimeAccuracy ?? 0}% correct · ${plural(stats?.examsTaken ?? 0, 'mock exam')}`}
        />
      </section>

      <Card as="section">
        <CardTitle icon={<BarChart3 className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />} action={<LinkButton onClick={() => onTab('activity')}>See answers</LinkButton>}>
          Last 14 days
        </CardTitle>
        <div className="mt-2">
          {attempts.loading ? (
            <Spinner label="Loading activity" />
          ) : attempts.error ? (
            <Notice tone="bad">We couldn’t load {name}’s recent activity.</Notice>
          ) : (
            <ActivityChart days={days} />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card as="section">
          <CardTitle action={<LinkButton onClick={() => onTab('topics')}>All topics</LinkButton>}>Mastery by subject</CardTitle>
          {mastery.loading ? (
            <Spinner />
          ) : (
            <div className="mt-3 grid gap-5">
              {curriculaFor(yearLevel).map((c) => {
                const counts = new Map<string, number>();
                for (const t of c.topics) {
                  const id = levelFor(mastery.byTopic.get(t.id)).id;
                  counts.set(id, (counts.get(id) ?? 0) + 1);
                }
                const practised = c.topics.length - (counts.get('not-started') ?? 0);
                return (
                  <div key={c.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{subjectLabel(c.subject)}</h3>
                      <span className="text-sm text-muted">
                        {practised} of {plural(c.topics.length, 'topic')} practised
                      </span>
                    </div>
                    <div aria-hidden="true">
                      <ProgressBar className="mt-1.5" value={practised} max={c.topics.length} />
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${subjectLabel(c.subject)} topics by level`}>
                      {[...MASTERY_LEVELS].reverse().map((l) =>
                        counts.get(l.id) ? (
                          <li key={l.id}>
                            <Badge tone={LEVEL_TONE[l.id]}>
                              {l.label} · {counts.get(l.id)}
                            </Badge>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card as="section">
          <CardTitle icon={<Target className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />} action={<LinkButton onClick={() => onTab('goals')}>{active.length ? 'Manage goals' : 'Set a goal'}</LinkButton>}>
            Active goals
          </CardTitle>
          {active.length ? (
            <ul className="mt-3 grid gap-3">
              {active.map((g) => {
                const p = goalProgress(g, today);
                return (
                  <li key={g.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 font-semibold">{g.title}</span>
                      <span className="text-muted">
                        {Math.min(p.current, g.target)}/{g.target} {unitFor(g.metric, g.target)}
                        {p.periodText && ` ${p.periodText}`}
                      </span>
                    </div>
                    <div aria-hidden="true">
                      <ProgressBar className="mt-1.5" tone="good" value={p.current} max={g.target} />
                    </div>
                    {g.reward && <p className="mt-1 text-xs text-muted">🎁 {g.reward}</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No active goals. A small, regular goal (like 20 questions a day) with a reward works well.</p>
          )}
        </Card>
      </div>

      <Card as="section">
        <CardTitle icon={<ClipboardCheck className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />} action={<LinkButton onClick={() => onTab('exams')}>All exams</LinkButton>}>
          Recent mock exams
        </CardTitle>
        {exams.loading ? (
          <Spinner />
        ) : !exams.data.length ? (
          <p className="mt-3 text-sm text-muted">{name} hasn’t taken a mock exam yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {exams.data.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-muted">{formatDate(e.submittedAt ?? e.startedAt)}</p>
                </div>
                {e.status === 'submitted' && e.summary ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{e.summary.percent}%</span>
                    <Badge tone={e.summary.percent >= 50 ? 'good' : 'warn'}>
                      {e.summary.grade.grade} · {e.summary.grade.label}
                    </Badge>
                  </div>
                ) : (
                  <Badge tone="info">{e.status === 'marking' ? 'Being marked' : 'Not finished'}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
