import { getTitle, type FamilyLink, type Goal, type StudentStats, type UserProfile } from '@study-helper/shared';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { UserX } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { AccountTab } from '../../components/parent/AccountTab';
import { ActivityTab } from '../../components/parent/ActivityTab';
import { ChatsTab } from '../../components/parent/ChatsTab';
import { ExamsTab } from '../../components/parent/ExamsTab';
import { GoalsTab } from '../../components/parent/GoalsTab';
import { OverviewTab, type ChildTab } from '../../components/parent/OverviewTab';
import { TopicsTab } from '../../components/parent/TopicsTab';
import { ProfilePicture } from '../../components/rewards/ProfilePicture';
import { ButtonLink, EmptyState, Notice, PageHeader, Spinner, Tabs } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useDoc, useQuery } from '../../lib/hooks';
import { useMastery } from '../../lib/study';

const TABS: { value: ChildTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'topics', label: 'Topics' },
  { value: 'activity', label: 'Activity' },
  { value: 'exams', label: 'Exams' },
  { value: 'chats', label: 'Tutor chats' },
  { value: 'goals', label: 'Goals & rewards' },
  { value: 'account', label: 'Account' },
];

function NotLinked() {
  return (
    <div>
      <PageHeader title="Child not found" back={{ to: '/parent', label: 'Family' }} />
      <EmptyState icon={<UserX className="size-10" />} title="We couldn’t find that child" action={<ButtonLink to="/parent">Back to your family</ButtonLink>}>
        They may have been unlinked from your account, or the link is out of date.
      </EmptyState>
    </div>
  );
}

function ChildView({ uid, parentUid, link }: { uid: string; parentUid: string; link: FamilyLink }) {
  const [params, setParams] = useSearchParams();
  const profile = useDoc<UserProfile>(doc(db, 'users', uid), `users/${uid}`);
  const stats = useDoc<StudentStats>(doc(db, 'students', uid), `students/${uid}`);
  const goals = useQuery<Goal>(query(collection(db, 'students', uid, 'goals'), orderBy('createdAt', 'desc')), `goals:all:${uid}`);
  const mastery = useMastery(uid);

  const requested = params.get('tab');
  const tab: ChildTab = TABS.some((t) => t.value === requested) ? (requested as ChildTab) : 'overview';
  const setTab = (next: ChildTab) => {
    setParams(next === 'overview' ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  if (profile.loading) return <Spinner label="Loading" />;
  if (!profile.data)
    return (
      <div>
        <PageHeader title={link.studentName} back={{ to: '/parent', label: 'Family' }} />
        <Notice tone="bad">We couldn’t load {link.studentName}’s profile. Check your connection and try again.</Notice>
      </div>
    );

  const p = profile.data;
  const name = p.displayName;
  const tabLabel = TABS.find((t) => t.value === tab)?.label ?? '';

  return (
    <div>
      <PageHeader
        back={{ to: '/parent', label: 'Family' }}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <ProfilePicture name={name} avatar={p.avatar} frame={p.frame} size="md" />
            <span className="min-w-0 break-words">{name}</span>
          </span>
        }
        subtitle={
          <>
            Year {p.yearLevel ?? 9}
            {p.title && getTitle(p.title) && <> · {getTitle(p.title)!.name}</>}
            {p.username ? <> · signs in with the username {p.username}</> : <> · own account</>}
          </>
        }
      />

      <nav aria-label={`${name}’s pages`} className="mb-5">
        <Tabs value={tab} onChange={setTab} options={TABS} />
      </nav>

      <div role="tabpanel" aria-label={tabLabel}>
        {tab === 'overview' && <OverviewTab uid={uid} name={name} yearLevel={p.yearLevel} stats={stats.data} goals={goals.data} mastery={mastery} onTab={setTab} />}
        {tab === 'topics' && <TopicsTab yearLevel={p.yearLevel} mastery={mastery} name={name} />}
        {tab === 'activity' && <ActivityTab uid={uid} name={name} />}
        {tab === 'exams' && <ExamsTab uid={uid} name={name} />}
        {tab === 'chats' && <ChatsTab uid={uid} name={name} />}
        {tab === 'goals' && <GoalsTab uid={uid} parentUid={parentUid} name={name} goals={goals} stats={stats.data} />}
        {tab === 'account' && <AccountTab uid={uid} parentUid={parentUid} profile={p} />}
      </div>
    </div>
  );
}

export default function Child() {
  const { uid = '' } = useParams();
  const { user } = useUser();
  const linkId = `${user.uid}_${uid}`;
  // Reading a link that doesn't exist is denied by the rules, so an error also means "not linked".
  const link = useDoc<FamilyLink>(uid ? doc(db, 'links', linkId) : null, uid ? `links/${linkId}` : null);

  if (link.loading) return <Spinner label="Loading" />;
  if (!link.data) return <NotLinked />;
  return <ChildView key={uid} uid={uid} parentUid={user.uid} link={link.data} />;
}
