import {
  buildStudyPlan,
  currentStreak,
  formatDateKey,
  getTopic,
  levelForXp,
  nzDateKey,
  weekStart,
  xpForLevel,
  type Goal,
} from '@study-helper/shared';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { BookOpen, CalendarDays, ClipboardCheck, Flame, GraduationCap, Layers, MessageCircle, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NoYearContent } from '../../components/study/NoYearContent';
import { Badge, ButtonLink, Card, ProgressBar, ProgressRing } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { LEVEL_TONE, levelFor, topicsForStudent, useMastery, useStudySettings } from '../../lib/study';

interface PlanDoc {
  title: string;
  subject: string;
  examDate: string;
  topicIds: string[];
  minutesPerDay: number;
  restDays?: number[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Mōrena' : 'Kia ora';
}

export default function Home() {
  const { user, profile, stats } = useUser();
  const today = nzDateKey();
  const mastery = useMastery(user.uid);
  const settings = useStudySettings(user.uid);
  const goals = useQuery<Goal>(query(collection(db, 'students', user.uid, 'goals'), where('status', '==', 'active')), `goals:${user.uid}`);
  const plans = useQuery<PlanDoc>(collection(db, 'students', user.uid, 'plans'), `plans:${user.uid}`);
  const [dueCards, setDueCards] = useState<number | null>(null);

  useEffect(() => {
    getCountFromServer(query(collection(db, 'students', user.uid, 'cards'), where('due', '<=', Date.now())))
      .then((s) => setDueCards(s.data().count))
      .catch(() => setDueCards(null));
  }, [user.uid]);

  const streak = stats ? currentStreak(stats, today) : 0;
  const level = levelForXp(stats?.xp ?? 0);
  const dailyGoal = profile.prefs?.dailyGoal ?? 20;
  const todayCount = stats?.todayDate === today ? stats.todayCount : 0;

  const topics = topicsForStudent(profile.yearLevel);
  const school = new Set(settings.data?.schoolTopics ?? []);
  const pool = school.size ? topics.filter((t) => school.has(t.id)) : topics;
  const recent = [...mastery.data].sort((a, b) => b.lastPracticedAt - a.lastPracticedAt).slice(0, 3);
  const focus = pool
    .map((t) => ({ t, m: mastery.byTopic.get(t.id) }))
    .filter(({ m }) => !m || m.mastery < 70)
    .sort((a, b) => (a.m?.mastery ?? 35) - (b.m?.mastery ?? 35))
    .slice(0, 4);

  // Today's items from the soonest upcoming plan.
  const plan = plans.data.filter((p) => p.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate))[0];
  const todayPlan = useMemo(() => {
    if (!plan) return null;
    const days = buildStudyPlan({
      today,
      examDate: plan.examDate,
      minutesPerDay: plan.minutesPerDay,
      restDays: plan.restDays ?? [],
      topics: plan.topicIds.map((id) => ({ topicId: id, title: getTopic(id)?.title ?? id, mastery: mastery.byTopic.get(id)?.mastery })),
    });
    return days.find((d) => d.date === today) ?? null;
  }, [plan, today, mastery.byTopic]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-muted">{formatDateKey(today)}</p>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {greeting()}, {profile.displayName}!
        </h1>
      </div>

      {!topics.length && (
        <div className="mb-6">
          <NoYearContent yearLevel={profile.yearLevel} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <ProgressRing value={(todayCount / dailyGoal) * 100} color="var(--color-good)">
            {todayCount}
          </ProgressRing>
          <div>
            <p className="font-bold">Daily goal</p>
            <p className="text-sm text-muted">
              {todayCount >= dailyGoal ? 'Done for today — awesome! 🎉' : `${dailyGoal - todayCount} questions to go`}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
            <Flame className={streak ? 'size-8 text-streak' : 'size-8 text-muted'} />
          </div>
          <div>
            <p className="font-bold">{streak}-day streak</p>
            <p className="text-sm text-muted">{streak ? 'Keep it going tomorrow!' : 'Answer a question to start one.'}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <p className="font-bold">Level {level}</p>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-xp">
              <Sparkles className="size-4" />
              {(stats?.xp ?? 0).toLocaleString('en-NZ')} XP
            </span>
          </div>
          <ProgressBar className="mt-3" tone="xp" value={(stats?.xp ?? 0) - xpForLevel(level)} max={xpForLevel(level + 1) - xpForLevel(level)} />
          <p className="mt-1.5 text-xs text-muted">{xpForLevel(level + 1) - (stats?.xp ?? 0)} XP to level {level + 1}</p>
        </Card>
      </div>

      {goals.data.length > 0 && (
        <Card className="mt-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Target className="size-5 text-brand-700" /> Goals from your family
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {goals.data.map((g) => {
              // Recurring goals reset each day/week; show 0 until progress is made in the current period.
              const progress = g.period === 'once' || g.periodStart === (g.period === 'day' ? today : weekStart(today)) ? g.progress : 0;
              return (
                <li key={g.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{g.title}</span>
                    <span className="text-muted">
                      {Math.min(progress, g.target)}/{g.target}
                      {g.reward && <> · 🎁 {g.reward}</>}
                    </span>
                  </div>
                  <ProgressBar className="mt-1.5" tone="good" value={progress} max={g.target} />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="size-5 text-brand-700" /> Today’s plan
            </h2>
            <Link to="/planner" className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {plan ? 'Open planner' : 'Make a plan'}
            </Link>
          </div>
          {plan && todayPlan ? (
            <>
              <p className="mt-1 text-sm text-muted">
                {plan.title} — exam {formatDateKey(plan.examDate)}
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-2">
                {todayPlan.items.map((item, i) => (
                  <li key={i}>
                    <Link
                      to={
                        item.kind === 'mock-exam'
                          ? '/exams'
                          : item.kind === 'flashcards'
                            ? '/flashcards'
                            : item.kind === 'review'
                              ? '/mistakes'
                              : item.kind === 'learn' && item.topicId
                                ? `/learn/${item.topicId}`
                                : item.topicId
                                  ? `/practice/${item.topicId}`
                                  : '/learn'
                      }
                      className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-sm text-muted">{item.minutes} min</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : plan ? (
            <p className="mt-3 text-sm text-muted">Rest day — or do some flashcards if you’re keen.</p>
          ) : (
            <p className="mt-3 text-sm text-muted">Got an exam coming up? Add the date and the topics, and you’ll get a day-by-day revision plan.</p>
          )}
        </Card>

        <Card>
          <h2 className="font-bold">Focus on these</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2">
            {focus.map(({ t, m }) => {
              const lv = levelFor(m);
              return (
                <li key={t.id}>
                  <Link to={`/learn/${t.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5">
                    <span className="min-w-0 truncate font-semibold">{t.title}</span>
                    <Badge tone={LEVEL_TONE[lv.id]}>{lv.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
          {recent.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-bold text-muted">Recently practised</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((m) => (
                  <ButtonLink key={m.topicId} size="sm" variant="secondary" to={`/practice/${m.topicId}`}>
                    {getTopic(m.topicId)?.title ?? m.topicId}
                  </ButtonLink>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { to: '/learn', label: 'Learn', icon: <BookOpen className="size-6" /> },
          { to: '/exams', label: 'Mock exam', icon: <ClipboardCheck className="size-6" /> },
          { to: '/flashcards', label: dueCards ? `Flashcards (${dueCards})` : 'Flashcards', icon: <Layers className="size-6" /> },
          { to: '/tutor', label: 'Ask the tutor', icon: <MessageCircle className="size-6" /> },
          { to: '/help', label: 'Homework help', icon: <GraduationCap className="size-6" /> },
          { to: '/mistakes', label: 'My mistakes', icon: <Target className="size-6" /> },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center text-sm font-semibold hover:shadow-md">
            <span className="text-brand-700 dark:text-brand-300">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
