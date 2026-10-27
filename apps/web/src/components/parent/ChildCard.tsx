import { currentStreak, getTitle, levelForXp, nzDateKey, type FamilyLink, type StudentStats, type UserProfile } from '@study-helper/shared';
import { AlertTriangle, ChevronRight, Flame, Gift, Sparkles, ThumbsUp } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { Link } from 'react-router';
import { db } from '../../lib/firebase';
import { useDoc } from '../../lib/hooks';
import { useLevelRewards } from '../../lib/rewards';
import { LEVEL_TONE, levelFor, useMastery } from '../../lib/study';
import { ProfilePicture } from '../rewards/ProfilePicture';
import { Badge } from '../ui';
import { dayLabel, formatMinutes, plural, topicTitle, weakestTopic, weekSummary } from './format';

/** One linked child on the Family page, with live stats. */
export function ChildCard({ link }: { link: FamilyLink }) {
  const childUid = link.studentUid;
  const profile = useDoc<UserProfile>(doc(db, 'users', childUid), `users/${childUid}`);
  const statsState = useDoc<StudentStats>(doc(db, 'students', childUid), `students/${childUid}`);
  const mastery = useMastery(childUid);
  const rewards = useLevelRewards(childUid);
  const today = nzDateKey();

  const stats = statsState.data;
  const name = profile.data?.displayName ?? link.studentName;
  const streak = stats ? currentStreak(stats, today) : 0;
  const xp = stats?.xp ?? 0;
  const week = weekSummary(stats, today);
  const weakest = weakestTopic(mastery.data);
  const weakLevel = weakest ? levelFor(weakest) : null;
  const needsWork = !!weakest && weakest.mastery < 50;
  const earned = rewards.data.filter((r) => r.status !== 'given' && levelForXp(xp) >= r.level);
  const title = profile.data?.title ? getTitle(profile.data.title)?.name : undefined;

  return (
    <article className="relative flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500">
      <div className="flex items-center gap-3">
        <ProfilePicture name={name} avatar={profile.data?.avatar} frame={profile.data?.frame} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">
            <Link to={`/parent/child/${childUid}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl">
              {name}
              <span className="sr-only"> — view progress</span>
            </Link>
          </h2>
          <p className="truncate text-sm text-muted">
            {profile.data?.yearLevel ? `Year ${profile.data.yearLevel}` : 'Student'}
            {title && <> · {title}</>}
            {profile.data?.username && <> · signs in as {profile.data.username}</>}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="min-w-0 rounded-xl bg-canvas px-2 py-2.5">
          <dt className="text-xs font-semibold text-muted">Streak</dt>
          <dd className="mt-0.5 flex items-center justify-center gap-1 font-bold">
            <Flame className={streak ? 'size-4 text-streak' : 'size-4 text-muted'} aria-hidden="true" />
            {plural(streak, 'day')}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-canvas px-2 py-2.5">
          <dt className="text-xs font-semibold text-muted">Level</dt>
          <dd className="mt-0.5 font-bold">
            {levelForXp(xp)}
            <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-semibold text-muted">
              <Sparkles className="size-3 text-xp" aria-hidden="true" />
              {xp.toLocaleString('en-NZ')} XP
            </span>
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-canvas px-2 py-2.5">
          <dt className="text-xs font-semibold text-muted">Last active</dt>
          <dd className="mt-0.5 truncate font-bold">{dayLabel(stats?.lastActiveDate, today)}</dd>
        </div>
      </dl>

      {earned.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/40">
          <Gift className="mt-0.5 size-4 shrink-0 text-xp" aria-hidden="true" />
          <span>
            <b>Reward earned:</b> {earned.map((r) => r.reward).join(', ')}
          </span>
        </p>
      )}

      <div>
        <p className="text-sm font-semibold">This week</p>
        <p className="text-sm text-muted">
          {week.answered
            ? `${plural(week.answered, 'question')} · ${week.accuracy}% correct · ${formatMinutes(week.minutes)}`
            : 'No questions answered yet this week.'}
        </p>
      </div>

      <div className="mt-auto flex items-start gap-2 rounded-xl border border-line px-3 py-2.5 text-sm">
        {!weakest ? (
          <p className="text-muted">No topics practised yet.</p>
        ) : (
          <>
            {needsWork ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-xp" aria-hidden="true" />
            ) : (
              <ThumbsUp className="mt-0.5 size-4 shrink-0 text-good" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{needsWork ? 'Needs attention' : 'Going well'}</p>
              <p className="text-muted">
                {needsWork ? '' : 'Lowest topic: '}
                {topicTitle(weakest.topicId)} · {weakest.mastery}% mastery
              </p>
            </div>
            {weakLevel && <Badge tone={LEVEL_TONE[weakLevel.id]}>{weakLevel.label}</Badge>}
          </>
        )}
      </div>
    </article>
  );
}
