import {
  addDays,
  BADGES,
  currentStreak,
  levelForXp,
  MASTERY_LEVELS,
  nzDateKey,
  weekStart,
  xpForLevel,
  type AttemptRecord,
} from '@study-helper/shared';
import clsx from 'clsx';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, Flame, Lock, Sparkles, Table2, BarChart3 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ActivityChart, ActivityTable, type ActivityDay } from '../../components/study/ActivityChart';
import { plural } from '../../components/study/format';
import { MeterRow } from '../../components/study/Meter';
import { Badge, Button, Card, Notice, PageHeader, ProgressBar, Spinner } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { curriculaFor, LEVEL_TONE, levelFor, subjectLabel, useMastery } from '../../lib/study';

const DAYS = 30;

function StatTile({ icon, label, value, sub, children }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="min-w-0 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      {children}
    </Card>
  );
}

export default function Progress() {
  const { user, profile, stats } = useUser();
  const today = nzDateKey();
  const mastery = useMastery(user.uid);
  const curricula = curriculaFor(profile.yearLevel);
  const [activity, setActivity] = useState<ActivityDay[] | null>(null);
  const [activityError, setActivityError] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Attempts from the last 30 days, totalled per NZ calendar day.
  useEffect(() => {
    let cancelled = false;
    const since = Date.now() - DAYS * 86_400_000;
    getDocs(query(collection(db, 'students', user.uid, 'attempts'), where('createdAt', '>=', since)))
      .then((snap) => {
        const rows = new Map<string, ActivityDay>();
        for (let i = DAYS - 1; i >= 0; i--) {
          const date = addDays(today, -i);
          rows.set(date, { date, answered: 0, correct: 0 });
        }
        snap.forEach((d) => {
          const a = d.data() as AttemptRecord;
          const row = rows.get(nzDateKey(a.createdAt));
          if (!row) return;
          row.answered += 1;
          if (a.correct) row.correct += 1;
        });
        if (!cancelled) setActivity([...rows.values()]);
      })
      .catch(() => !cancelled && setActivityError(true));
    return () => {
      cancelled = true;
    };
  }, [user.uid, today]);

  const xp = stats?.xp ?? 0;
  const level = levelForXp(xp);
  const streak = stats ? currentStreak(stats, today) : 0;
  const answered = stats?.totalAnswered ?? 0;
  const accuracy = answered ? Math.round(((stats?.totalCorrect ?? 0) / answered) * 100) : null;
  const thisWeek = stats?.weekStart === weekStart(today);
  const week = {
    answered: thisWeek ? (stats?.weekAnswered ?? 0) : 0,
    correct: thisWeek ? (stats?.weekCorrect ?? 0) : 0,
    xp: thisWeek ? (stats?.weekXp ?? 0) : 0,
    minutes: thisWeek ? Math.round(stats?.weekMinutes ?? 0) : 0,
  };
  const earned = new Set(stats?.badges ?? []);

  const activeDays = activity?.filter((d) => d.answered > 0).length ?? 0;
  const monthTotal = activity?.reduce((s, d) => s + d.answered, 0) ?? 0;
  const activitySummary = `${plural(monthTotal, 'question')} in the last ${DAYS} days, on ${plural(activeDays, 'day')}`;

  return (
    <div>
      <PageHeader title="My progress" subtitle="How far you’ve come — and where to go next." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Sparkles className="size-4 text-xp" aria-hidden />}
          label="Level"
          value={level}
          sub={`${xp.toLocaleString('en-NZ')} XP · ${(xpForLevel(level + 1) - xp).toLocaleString('en-NZ')} to level ${level + 1}`}
        >
          <ProgressBar className="mt-2" tone="xp" value={xp - xpForLevel(level)} max={xpForLevel(level + 1) - xpForLevel(level)} />
        </StatTile>
        <StatTile
          icon={<Flame className={clsx('size-4', streak ? 'text-streak' : 'text-muted')} aria-hidden />}
          label="Streak"
          value={plural(streak, 'day')}
          sub={`Best: ${plural(stats?.bestStreak ?? 0, 'day')}`}
        />
        <StatTile
          icon={<CheckCircle2 className="size-4 text-good" aria-hidden />}
          label="Questions answered"
          value={answered.toLocaleString('en-NZ')}
          sub={accuracy === null ? 'No answers yet' : `${accuracy}% correct`}
        />
        <StatTile
          icon={<CalendarDays className="size-4 text-brand-700 dark:text-brand-300" aria-hidden />}
          label="This week"
          value={week.answered.toLocaleString('en-NZ')}
          sub={`${week.answered === 1 ? 'question' : 'questions'} · ${week.correct} correct · ${week.xp.toLocaleString('en-NZ')} XP · ${week.minutes} min`}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {plural(stats?.flashcardsReviewed ?? 0, 'flashcard')} reviewed · {plural(stats?.examsTaken ?? 0, 'mock exam')} finished
      </p>

      <Card as="section" className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold">Questions answered per day</h2>
            <p className="text-sm text-muted">{activity ? activitySummary : `Last ${DAYS} days`}</p>
          </div>
          {activity && (
            <Button
              variant="secondary"
              size="sm"
              aria-pressed={showTable}
              onClick={() => setShowTable((s) => !s)}
              icon={showTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            >
              {showTable ? 'Show chart' : 'Show table'}
            </Button>
          )}
        </div>
        <div className="mt-4">
          {activityError ? (
            <Notice tone="bad">Couldn’t load your activity. Check your connection and try again.</Notice>
          ) : !activity ? (
            <Spinner label="Loading activity" />
          ) : showTable ? (
            <ActivityTable days={activity} />
          ) : (
            <ActivityChart days={activity} label={`Bar chart: ${activitySummary}. Use “Show table” for each day’s numbers.`} />
          )}
        </div>
      </Card>

      <section className="mt-8" aria-labelledby="mastery-heading">
        <h2 id="mastery-heading" className="text-lg font-bold">
          Mastery by topic
        </h2>
        <p className="text-sm text-muted">Mastery grows as you answer harder questions correctly. The levels follow the curriculum’s progress descriptors.</p>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Mastery levels, lowest to highest">
          {MASTERY_LEVELS.map((l) => (
            <Badge key={l.id} tone={LEVEL_TONE[l.id]}>
              {l.label}
            </Badge>
          ))}
        </div>
        {mastery.loading ? (
          <Spinner label="Loading mastery" />
        ) : (
          curricula.map((c) => {
            const strong = c.topics.filter((t) => ['proficient', 'exceeding'].includes(levelFor(mastery.byTopic.get(t.id)).id)).length;
            return (
              <Card as="section" key={c.id} className="mt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold">{subjectLabel(c.subject)}</h3>
                  <p className="text-sm text-muted">
                    {strong} of {c.topics.length} topics at Proficient or above
                  </p>
                </div>
                {c.strands.map((strand) => {
                  const topics = c.topics.filter((t) => t.strandId === strand.id);
                  if (!topics.length) return null;
                  return (
                    <div key={strand.id} className="mt-5">
                      <h4 className="text-sm font-bold text-muted">{strand.title}</h4>
                      <ul className="mt-2 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                        {topics.map((t) => {
                          const m = mastery.byTopic.get(t.id);
                          const lv = levelFor(m);
                          return (
                            <li key={t.id}>
                              <MeterRow
                                label={
                                  <Link to={`/learn/${t.id}`} className="hover:underline">
                                    {t.title}
                                  </Link>
                                }
                                ariaLabel={`${t.title} mastery`}
                                value={m?.mastery ?? 0}
                                valueText={m ? String(m.mastery) : '–'}
                                extra={<Badge tone={LEVEL_TONE[lv.id]}>{lv.label}</Badge>}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </Card>
            );
          })
        )}
      </section>

      <section className="mt-8" aria-labelledby="badges-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="badges-heading" className="text-lg font-bold">
            Badges
          </h2>
          <p className="text-sm text-muted">
            {BADGES.filter((b) => earned.has(b.id)).length} of {BADGES.length} earned
          </p>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BADGES.map((b) => {
            const has = earned.has(b.id);
            return (
              <li
                key={b.id}
                className={clsx(
                  'flex min-w-0 flex-col items-center rounded-2xl border p-4 text-center',
                  has ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-dashed border-line bg-surface',
                )}
              >
                <span className={clsx('text-4xl', !has && 'opacity-40 grayscale')} aria-hidden>
                  {b.icon}
                </span>
                <p className="mt-2 text-sm font-bold">{b.title}</p>
                <p className="mt-0.5 text-xs text-muted">{b.description}</p>
                <p className="mt-auto pt-2 text-xs font-semibold">
                  {has ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-3.5" aria-hidden /> Earned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted">
                      <Lock className="size-3.5" aria-hidden /> Locked
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
