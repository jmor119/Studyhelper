import { AI_PROVIDERS, nzDateKey, nzMonthKey, type AiProvider, type FamilyLink, type UserPrefs, type UserProfile } from '@study-helper/shared';
import clsx from 'clsx';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, type User } from 'firebase/auth';
import { collection, doc, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { Download, KeyRound, Link2, Plug, Shield, Sparkles, Trash2, UserRound, Users } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { modelLabel, useAiStatus } from '../../components/assist/ai';
import { CopyButton, CopyField } from '../../components/assist/CopyButton';
import { Badge, Button, Card, Field, Input, Modal, Notice, PageHeader, ProgressBar, Select, Spinner, useToast } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db, isUsernameEmail } from '../../lib/firebase';
import { useDoc, useQuery, type LiveState } from '../../lib/hooks';

type Profile = UserProfile & { id: string };
type Links = LiveState<Array<FamilyLink & { id: string }>>;

interface AiSettingsDoc {
  providers?: Partial<Record<AiProvider, { last4: string; addedAt: number; models: string[] }>>;
  activeProvider?: AiProvider;
  model?: string;
  monthlyLimitUsd?: number;
  updatedAt?: number;
}

interface UsageBucket {
  costUsd?: number;
  requests?: number;
}
interface UsageDoc extends UsageBucket {
  inputTokens?: number;
  outputTokens?: number;
  byUser?: Record<string, UsageBucket>;
  byFeature?: Record<string, UsageBucket>;
  updatedAt?: number;
}

const PROVIDER_LABEL: Record<AiProvider, string> = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI (ChatGPT)' };
const PROVIDER_KEY_HINT: Record<AiProvider, ReactNode> = {
  anthropic: (
    <>
      Starts with <code>sk-ant-</code>. Create one at{' '}
      <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        console.anthropic.com
      </a>
      .
    </>
  ),
  openai: (
    <>
      Starts with <code>sk-</code>. Create one at{' '}
      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        platform.openai.com
      </a>
      .
    </>
  ),
};
const FEATURE_LABEL: Record<string, string> = {
  tutor: 'Tutor chats',
  generate: 'Making new questions',
  verify: 'Checking new questions',
  mark: 'Marking written answers',
  notes: 'Analysing notes',
  working: 'Feedback on working',
};

const PREF_KEYS = ['theme', 'weeklyEmail', 'shareAiKey', 'dailyGoal', 'subjects'] as const;

/** Only the keys the security rules allow, and no undefined values. */
function cleanPrefs(p: UserPrefs): UserPrefs {
  const out: Record<string, unknown> = {};
  for (const k of PREF_KEYS) if (p[k] !== undefined) out[k] = p[k];
  return out as UserPrefs;
}

const dateFmt = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' });
const dateTimeFmt = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' });
const usd = (n: number | undefined) => `US$${(n ?? 0).toFixed(2)}`;

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number) as [number, number];
  return new Intl.DateTimeFormat('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
}

function Section({ id, icon, title, subtitle, children }: { id: string; icon: ReactNode; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <Card>
        <div className="mb-4 flex items-start gap-3">
          <span className="rounded-xl bg-brand-100 p-2 text-brand-700 dark:bg-brand-900 dark:text-brand-300" aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-lg font-bold">
              {title}
            </h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {children}
      </Card>
    </section>
  );
}

function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
  disabled,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy} disabled={disabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3">
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand-700" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------------------------

export default function Settings() {
  const { user, profile } = useUser();
  const location = useLocation();
  const isStudent = profile.role === 'student';
  const links: Links = useQuery<FamilyLink>(
    query(collection(db, 'links'), where(isStudent ? 'studentUid' : 'parentUid', '==', user.uid), orderBy('createdAt')),
    `links:${profile.role}:${user.uid}`,
  );

  // /settings#ai etc. — React Router doesn't scroll to hashes itself.
  useEffect(() => {
    if (!location.hash) return;
    const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    return () => clearTimeout(t);
  }, [location.hash]);

  const hasPassword = user.providerData.some((p) => p.providerId === 'password');
  const sections = [
    { id: 'profile', label: 'Profile' },
    ...(hasPassword ? [{ id: 'password', label: 'Password' }] : []),
    { id: 'family', label: 'Family' },
    { id: 'ai', label: 'AI' },
    { id: 'apps', label: 'Connect AI apps' },
    { id: 'privacy', label: 'Privacy' },
  ];

  return (
    <div>
      <PageHeader title="Settings" />
      <nav aria-label="Settings sections" className="-mt-2 mb-5 flex flex-wrap gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-muted hover:text-ink">
            {s.label}
          </a>
        ))}
      </nav>
      <div className="grid grid-cols-1 gap-5">
        <ProfileSection uid={user.uid} profile={profile} />
        {hasPassword && <PasswordSection user={user} />}
        <FamilySection profile={profile} links={links} />
        <AiSection uid={user.uid} profile={profile} links={links} />
        <AppsSection role={profile.role} />
        <PrivacySection profile={profile} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Profile

function ProfileSection({ uid, profile }: { uid: string; profile: Profile }) {
  const toast = useToast();
  const isStudent = profile.role === 'student';
  const [name, setName] = useState(profile.displayName);
  const [goal, setGoal] = useState(String(profile.prefs?.dailyGoal ?? 20));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const theme = profile.prefs?.theme ?? 'system';

  const savePrefs = async (patch: Partial<UserPrefs>) => {
    try {
      await updateDoc(doc(db, 'users', uid), { prefs: cleanPrefs({ ...profile.prefs, ...patch }) });
      return true;
    } catch {
      toast('Couldn’t save that setting. Try again.', 'bad');
      return false;
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    const dailyGoal = Number(goal);
    if (!displayName || displayName.length > 60) return setError('Your name needs to be 1–60 characters.');
    if (isStudent && (!Number.isInteger(dailyGoal) || dailyGoal < 5 || dailyGoal > 200)) return setError('Pick a daily goal between 5 and 200 questions.');
    setError('');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        displayName,
        prefs: cleanPrefs({ ...profile.prefs, ...(isStudent && { dailyGoal }) }),
      });
      toast('Saved.', 'good');
    } catch {
      setError('Couldn’t save your changes. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section id="profile" icon={<UserRound className="size-5" />} title="Profile" subtitle={isStudent ? `Year ${profile.yearLevel ?? 9} student` : 'Parent account'}>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" hint={isStudent ? 'Shown to your linked parents.' : 'Shown to your linked children.'}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="nickname" required />
        </Field>
        {isStudent && (
          <Field label="Daily goal" hint="Questions to answer each day (5–200).">
            <Input type="number" inputMode="numeric" min={5} max={200} step={1} value={goal} onChange={(e) => setGoal(e.target.value)} required />
          </Field>
        )}
        {error && (
          <Notice tone="bad" className="sm:col-span-2">
            {error}
          </Notice>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">Appearance</legend>
        <div role="radiogroup" aria-label="Theme" className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={theme === t}
              onClick={() => theme !== t && void savePrefs({ theme: t })}
              className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors', theme === t ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
            >
              {t === 'system' ? 'Match my device' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </fieldset>

      {!isStudent && (
        <div className="mt-6">
          <Toggle
            checked={profile.prefs?.weeklyEmail !== false}
            onChange={(v) => void savePrefs({ weeklyEmail: v }).then((ok) => ok && toast(v ? 'Weekly email turned on.' : 'Weekly email turned off.', 'good'))}
            label="Weekly summary email"
            hint="A short email each week about how your children are going."
          />
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// Password

function passwordError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Your current password isn’t right.';
    case 'auth/weak-password':
      return 'Choose a stronger password — at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
    case 'auth/requires-recent-login':
      return 'Please sign out and back in, then try again.';
    default:
      return 'Couldn’t change your password. Please try again.';
  }
}

function PasswordSection({ user }: { user: User }) {
  const toast = useToast();
  const usernameAccount = isUsernameEmail(user.email);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setError('Your new password needs at least 8 characters.');
    if (next !== confirm) return setError('The new passwords don’t match.');
    if (!user.email) return setError('This account has no password to change.');
    setBusy(true);
    setError('');
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast('Password changed.', 'good');
    } catch (err) {
      setError(passwordError((err as { code?: string }).code ?? ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      id="password"
      icon={<KeyRound className="size-5" />}
      title="Password"
      subtitle={usernameAccount ? `You sign in with the username “${user.email?.split('@')[0]}”. If you forget your password, the parent who set up your account can reset it.` : `You sign in with ${user.email}.`}
    >
      <form onSubmit={submit} className="grid max-w-md grid-cols-1 gap-4">
        {/* Hidden username helps password managers save the right login. */}
        <input type="text" autoComplete="username" value={usernameAccount ? (user.email?.split('@')[0] ?? '') : (user.email ?? '')} readOnly hidden />
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <Input type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Field label="Type the new password again">
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </Field>
        {error && <Notice tone="bad">{error}</Notice>}
        <div>
          <Button type="submit" loading={busy}>
            Change password
          </Button>
        </div>
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// Family

function FamilySection({ profile, links }: { profile: Profile; links: Links }) {
  const toast = useToast();
  const isStudent = profile.role === 'student';
  const [invite, setInvite] = useState<{ code: string; url: string; expiresAt: number } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [code, setCode] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [unlinkTarget, setUnlinkTarget] = useState<{ uid: string; name: string } | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState('');

  const makeInvite = async () => {
    setInviting(true);
    setInviteError('');
    try {
      setInvite(await api.createInvite({}));
    } catch (e) {
      setInviteError(errorMessage(e));
    } finally {
      setInviting(false);
    }
  };

  const accept = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setAccepting(true);
    setAcceptError('');
    try {
      const res = await api.acceptInvite({ code: code.trim() });
      toast(res.alreadyLinked ? `You’re already linked with ${res.otherName}.` : `You’re now linked with ${res.otherName}! 🎉`, 'good');
      setCode('');
    } catch (err) {
      setAcceptError(errorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  const unlink = async () => {
    if (!unlinkTarget) return;
    setUnlinking(true);
    setUnlinkError('');
    try {
      await api.unlink({ otherUid: unlinkTarget.uid });
      toast(`Unlinked from ${unlinkTarget.name}.`, 'good');
      setUnlinkTarget(null);
    } catch (e) {
      setUnlinkError(errorMessage(e));
    } finally {
      setUnlinking(false);
    }
  };

  const share = async () => {
    if (!invite) return;
    try {
      await navigator.share({ title: 'Join me on Study Helper', text: `Link with me on Study Helper — code ${invite.code}`, url: invite.url });
    } catch {
      /* cancelled */
    }
  };

  return (
    <Section
      id="family"
      icon={<Users className="size-5" />}
      title="Family"
      subtitle={isStudent ? 'Linked parents can see your progress and tutor chats, and set goals with you.' : 'Linked children share their progress and tutor chats with you.'}
    >
      <h3 className="text-sm font-bold">{isStudent ? 'Your parents' : 'Your children'}</h3>
      {links.loading ? (
        <Spinner className="py-4" />
      ) : links.error ? (
        <p className="mt-1 text-sm text-muted">Couldn’t load your family links.</p>
      ) : !links.data.length ? (
        <p className="mt-1 text-sm text-muted">{isStudent ? 'No parents linked yet.' : 'No children linked yet.'}</p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-2">
          {links.data.map((l) => {
            const otherUid = isStudent ? l.parentUid : l.studentUid;
            const otherName = isStudent ? l.parentName : l.studentName;
            const managed = isStudent && profile.managedBy === l.parentUid;
            return (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{otherName}</p>
                  <p className="text-xs text-muted">{managed ? 'Set up your account' : `Linked ${dateFmt.format(l.createdAt)}`}</p>
                </div>
                {!managed && (
                  <Button variant="ghost" size="sm" onClick={() => setUnlinkTarget({ uid: otherUid, name: otherName })}>
                    Unlink
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!isStudent && (
        <p className="mt-2 text-sm text-muted">
          Child doesn’t have an account yet?{' '}
          <Link to="/parent" className="font-semibold text-brand-700 underline dark:text-brand-300">
            Create one from the Family page
          </Link>
          .
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{isStudent ? 'Invite a parent' : 'Invite a child'}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {isStudent ? 'Make a link or code to send to your parent. They accept it from their account.' : 'Make a code for a child who already has their own account. They enter it in their Settings.'}
          </p>
          {invite ? (
            <div className="mt-3 rounded-xl bg-brand-50 p-4 dark:bg-brand-950/40">
              <p className="text-xs font-semibold text-muted">Invite code</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-mono text-2xl font-extrabold tracking-widest">{invite.code}</p>
                <CopyButton text={invite.code} what="invite code" />
              </div>
              <p className="mt-3 text-xs font-semibold text-muted">Invite link</p>
              <div className="mt-1">
                <CopyField value={invite.url} what="invite link" />
              </div>
              <p className="mt-2 text-xs text-muted">Works once. Expires {dateTimeFmt.format(invite.expiresAt)}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {typeof navigator.share === 'function' && (
                  <Button size="sm" onClick={share}>
                    Share…
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={makeInvite} loading={inviting}>
                  Make a new code
                </Button>
              </div>
            </div>
          ) : (
            <Button className="mt-3" variant="secondary" icon={<Link2 className="size-4" />} onClick={makeInvite} loading={inviting}>
              {isStudent ? 'Invite a parent' : 'Invite a child'}
            </Button>
          )}
          {inviteError && (
            <Notice tone="bad" className="mt-3">
              {inviteError}
            </Notice>
          )}
        </div>

        <form onSubmit={accept} className="min-w-0">
          <h3 className="text-sm font-bold">I have a code</h3>
          <p className="mt-0.5 text-sm text-muted">Got a code from {isStudent ? 'your parent' : 'your child'}? Enter it here.</p>
          <div className="mt-3 flex gap-2">
            <label htmlFor="invite-code" className="sr-only">
              Invite code
            </label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              className="min-w-0 font-mono tracking-wider"
            />
            <Button type="submit" loading={accepting} disabled={!code.trim()}>
              Link
            </Button>
          </div>
          {acceptError && (
            <Notice tone="bad" className="mt-3">
              {acceptError}
            </Notice>
          )}
        </form>
      </div>

      <ConfirmModal
        open={!!unlinkTarget}
        title={`Unlink from ${unlinkTarget?.name ?? ''}?`}
        confirmLabel="Unlink"
        busy={unlinking}
        onConfirm={unlink}
        onClose={() => {
          setUnlinkTarget(null);
          setUnlinkError('');
        }}
      >
        <p>
          {isStudent
            ? `${unlinkTarget?.name} won’t be able to see your progress or chats any more, and you won’t be able to use their AI key.`
            : `You won’t be able to see ${unlinkTarget?.name}’s progress or chats any more, and they won’t be able to use your AI key.`}{' '}
          You can link again later with a new invite.
        </p>
        {unlinkError && (
          <Notice tone="bad" className="mt-3">
            {unlinkError}
          </Notice>
        )}
      </ConfirmModal>
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// AI

function AiSection({ uid, profile, links }: { uid: string; profile: Profile; links: Links }) {
  const isStudent = profile.role === 'student';
  const toast = useToast();
  const settings = useDoc<AiSettingsDoc>(doc(db, 'users', uid, 'private', 'ai'), `ai:${uid}`);
  const status = useAiStatus();
  const hasOwnKey = Object.keys(settings.data?.providers ?? {}).length > 0;
  const { reload } = status;
  // Refresh "whose key is in use" when the key settings change.
  const updatedAt = settings.data?.updatedAt;
  useEffect(() => {
    if (updatedAt) reload();
  }, [updatedAt, reload]);

  const shareOn = profile.prefs?.shareAiKey !== false;
  const setShare = async (v: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { prefs: cleanPrefs({ ...profile.prefs, shareAiKey: v }) });
      toast(v ? 'Your children can use your key.' : 'Your children can no longer use your key.', 'good');
    } catch {
      toast('Couldn’t save that setting.', 'bad');
    }
  };

  return (
    <Section
      id="ai"
      icon={<Sparkles className="size-5" />}
      title="AI"
      subtitle={
        isStudent
          ? 'The tutor, homework help and notes use an AI key from your parent (or your own).'
          : 'The tutor, homework help, notes and AI marking use your own AI key. You choose the model and set a monthly limit.'
      }
    >
      {isStudent && (
        <div className="mb-5">
          {status.loading ? (
            <Spinner className="py-3" />
          ) : status.status?.available ? (
            <Notice tone={status.status.budgetLeft ? 'good' : 'warn'} title={status.status.fromOwnName ? 'Using your own key' : `Using ${status.status.ownerName}’s key`}>
              {usd(status.status.spentUsd)} of {usd(status.status.limitUsd)} used this month · {modelLabel(status.status.model)}
              {!status.status.budgetLeft && ' — the monthly budget is used up.'}
            </Notice>
          ) : (
            <Notice tone="warn" title="No AI key yet">
              Ask a parent to add one in their Settings → AI. Once you’re linked, you can use their key straight away.
            </Notice>
          )}
        </div>
      )}

      {settings.loading ? (
        <Spinner />
      ) : isStudent && !hasOwnKey ? (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer font-semibold">Use my own key instead</summary>
          <div className="mt-4">
            <AiKeyManager settings={settings.data} />
          </div>
        </details>
      ) : (
        <AiKeyManager settings={settings.data} />
      )}

      {!isStudent && (
        <div className="mt-6">
          <Toggle
            checked={shareOn}
            onChange={setShare}
            label="Let my children use my key"
            hint="Linked children use your key for the tutor and other AI features, within your monthly limit."
          />
        </div>
      )}

      {(hasOwnKey || !isStudent) && <UsagePanel uid={uid} links={links} limit={settings.data?.monthlyLimitUsd} isStudent={isStudent} />}
    </Section>
  );
}

function AiKeyManager({ settings }: { settings: (AiSettingsDoc & { id: string }) | null }) {
  const toast = useToast();
  const providers = settings?.providers ?? {};
  const saved = AI_PROVIDERS.filter((p) => providers[p]);
  const active = settings?.activeProvider && providers[settings.activeProvider] ? settings.activeProvider : saved[0];
  const models = active ? (providers[active]?.models ?? []) : [];

  const [provider, setProvider] = useState<AiProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AiProvider | null>(null);

  useEffect(() => {
    if (settings?.monthlyLimitUsd !== undefined) setBudget(String(settings.monthlyLimitUsd));
  }, [settings?.monthlyLimitUsd]);

  const saveKey = async (e: FormEvent) => {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key) return;
    setSaving(true);
    setKeyError('');
    try {
      const res = await api.saveAiKey({ provider, apiKey: key });
      setApiKey('');
      toast(`Key saved. Using ${modelLabel(res.model)}.`, 'good');
    } catch (err) {
      setKeyError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const prefs = async (what: string, data: Parameters<typeof api.setAiPrefs>[0], done: string) => {
    setBusy(what);
    try {
      await api.setAiPrefs(data);
      toast(done, 'good');
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(null);
    }
  };

  const saveBudget = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(budget);
    if (!Number.isFinite(n) || n < 0 || n > 500) {
      toast('Choose a monthly limit between US$0 and US$500.', 'warn');
      return;
    }
    void prefs('budget', { monthlyLimitUsd: Math.round(n * 100) / 100 }, `Monthly limit set to ${usd(n)}.`);
  };

  const remove = async () => {
    if (!removeTarget) return;
    setBusy('remove');
    try {
      await api.deleteAiKey({ provider: removeTarget });
      toast(`${PROVIDER_LABEL[removeTarget]} key removed.`, 'good');
      setRemoveTarget(null);
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {saved.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">Your keys</h3>
          <ul className="mt-2 grid grid-cols-1 gap-2">
            {saved.map((p) => (
              <li key={p} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {PROVIDER_LABEL[p]} {p === active && <Badge tone="good">In use</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    Key ending <span className="font-mono">…{providers[p]!.last4}</span> · added {dateFmt.format(providers[p]!.addedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p !== active && (
                    <Button size="sm" variant="secondary" loading={busy === `use-${p}`} onClick={() => prefs(`use-${p}`, { activeProvider: p }, `Now using ${PROVIDER_LABEL[p]}.`)}>
                      Use this
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setRemoveTarget(p)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={saveKey} className="min-w-0">
        <h3 className="text-sm font-bold">{saved.length ? 'Add or replace a key' : 'Add a key'}</h3>
        <p className="mt-0.5 text-sm text-muted">
          Your key is encrypted and stored on our server. It’s only ever used there to talk to the AI — it’s never sent back to this browser, and you won’t be able to see it again (just the last four characters).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <Field label="Provider">
            <Select value={provider} onChange={(e) => setProvider(e.target.value as AiProvider)}>
              {AI_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="API key" hint={PROVIDER_KEY_HINT[provider]} error={keyError || null}>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} />
          </Field>
        </div>
        <Button type="submit" className="mt-3" loading={saving} disabled={!apiKey.trim()}>
          {providers[provider] ? 'Replace key' : 'Save key'}
        </Button>
        {saving && <p className="mt-2 text-xs text-muted">Checking the key with {PROVIDER_LABEL[provider]}…</p>}
      </form>

      {active && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Model"
            hint={
              active === 'anthropic'
                ? 'The default is Claude Opus 5.5, which makes the best tutor. Cheaper models such as Claude Sonnet or Claude Haiku cost less per message — it’s your choice.'
                : 'Smaller, cheaper models cost less per message but give weaker explanations — it’s your choice.'
            }
          >
            <Select
              value={settings?.model ?? ''}
              disabled={busy === 'model'}
              onChange={(e) => void prefs('model', { activeProvider: active, model: e.target.value }, `Now using ${modelLabel(e.target.value)}.`)}
            >
              {!settings?.model && <option value="">Choose a model…</option>}
              {models.map((m) => (
                <option key={m} value={m}>
                  {modelLabel(m)}
                  {modelLabel(m) !== m ? ` (${m})` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <form onSubmit={saveBudget} className="min-w-0">
            <Field label="Monthly limit (US$)" hint="AI features stop for the month once this much has been spent. Set 0 to pause AI.">
              <div className="flex gap-2">
                <Input type="number" inputMode="decimal" min={0} max={500} step={1} value={budget} onChange={(e) => setBudget(e.target.value)} className="min-w-0" />
                <Button type="submit" variant="secondary" loading={busy === 'budget'}>
                  Save
                </Button>
              </div>
            </Field>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!removeTarget}
        title={`Remove your ${removeTarget ? PROVIDER_LABEL[removeTarget] : ''} key?`}
        confirmLabel="Remove key"
        busy={busy === 'remove'}
        onConfirm={remove}
        onClose={() => setRemoveTarget(null)}
      >
        <p>
          The key is deleted from Study Helper straight away. AI features that rely on it will stop working until you add a key again. To be extra safe, you can also revoke the key with the provider.
        </p>
      </ConfirmModal>
    </div>
  );
}

function UsagePanel({ uid, links, limit, isStudent }: { uid: string; links: Links; limit?: number; isStudent: boolean }) {
  const month = nzMonthKey();
  const usage = useDoc<UsageDoc>(doc(db, 'usage', uid, 'months', month), `usage:${uid}:${month}`);
  const names = new Map<string, string>([[uid, 'You']]);
  links.data.forEach((l) => names.set(isStudent ? l.parentUid : l.studentUid, isStudent ? l.parentName : l.studentName));
  const u = usage.data;
  const byUser = Object.entries(u?.byUser ?? {}).sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0));
  const byFeature = Object.entries(u?.byFeature ?? {}).sort((a, b) => (b[1].costUsd ?? 0) - (a[1].costUsd ?? 0));

  return (
    <div className="mt-6 rounded-xl border border-line p-4">
      <h3 className="font-bold">Usage in {monthLabel(month)}</h3>
      {usage.loading ? (
        <Spinner className="py-4" />
      ) : !u?.requests ? (
        <p className="mt-1 text-sm text-muted">Nothing used yet this month.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <p>
              <span className="text-2xl font-extrabold">{usd(u.costUsd)}</span>
              {limit !== undefined && <span className="text-muted"> of {usd(limit)}</span>}
            </p>
            <p className="text-sm text-muted">
              {(u.requests ?? 0).toLocaleString('en-NZ')} request{u.requests === 1 ? '' : 's'}
            </p>
          </div>
          {limit !== undefined && limit > 0 && <ProgressBar className="mt-2" value={u.costUsd ?? 0} max={limit} />}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-muted">By person</h4>
              <ul className="mt-1 grid grid-cols-1 gap-1 text-sm">
                {byUser.map(([id, b]) => (
                  <li key={id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{names.get(id) ?? 'Someone no longer linked'}</span>
                    <span className="shrink-0 text-muted">
                      {usd(b.costUsd)} · {b.requests ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-muted">By feature</h4>
              <ul className="mt-1 grid grid-cols-1 gap-1 text-sm">
                {byFeature.map(([f, b]) => (
                  <li key={f} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">{FEATURE_LABEL[f] ?? f}</span>
                    <span className="shrink-0 text-muted">
                      {usd(b.costUsd)} · {b.requests ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Costs are estimates from token counts, in US dollars, for the NZ calendar month. Your provider’s bill is the final word.</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Connect AI apps (MCP)

type Connections = Awaited<ReturnType<typeof api.listConnections>>;

function AppsSection({ role }: { role: UserProfile['role'] }) {
  const toast = useToast();
  const mcpUrl = `${window.location.origin}/mcp`;
  const [connections, setConnections] = useState<Connections | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ kind: 'token' | 'app'; id: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(() => {
    api
      .listConnections({})
      .then((c) => {
        setConnections(c);
        setLoadError('');
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const name = tokenName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.createApiToken({ name });
      setNewToken(res.token);
      setTokenName('');
      load();
    } catch (err) {
      setCreateError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.revokeConnection(revokeTarget.kind === 'token' ? { tokenId: revokeTarget.id } : { clientId: revokeTarget.id });
      toast(`${revokeTarget.name} disconnected.`, 'good');
      setRevokeTarget(null);
      load();
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setRevoking(false);
    }
  };

  const command = `claude mcp add --transport http study-helper ${mcpUrl} --header "Authorization: Bearer ${newToken ?? '<token>'}"`;

  return (
    <Section
      id="apps"
      icon={<Plug className="size-5" />}
      title="Connect AI apps"
      subtitle={
        role === 'student'
          ? 'Use Study Helper from Claude or ChatGPT: practise questions and check your progress. They follow the same rule — hints, not answers.'
          : 'Use Study Helper from Claude or ChatGPT: see your children’s progress and tutor chats, and set goals.'
      }
    >
      <Field label="Your Study Helper connector URL">
        <CopyField value={mcpUrl} what="connector URL" />
      </Field>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-line p-4">
          <h3 className="font-bold">Claude</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>
              In Claude, open <b>Settings → Connectors</b>.
            </li>
            <li>
              Choose <b>Add custom connector</b> and paste the URL above.
            </li>
            <li>Claude opens a Study Helper sign-in page. Sign in and choose Allow.</li>
          </ol>
        </div>
        <div className="min-w-0 rounded-xl border border-line p-4">
          <h3 className="font-bold">ChatGPT</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>
              In ChatGPT, open <b>Settings → Connectors</b> (you may need to turn on <b>Developer mode</b> under Advanced).
            </li>
            <li>Create a connector and paste the same URL.</li>
            <li>Sign in to Study Helper when asked and choose Allow.</li>
          </ol>
        </div>
        <div className="min-w-0 rounded-xl border border-line p-4">
          <h3 className="font-bold">Claude Code</h3>
          <p className="mt-2 text-sm">Create a personal token below, then run this in your terminal:</p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-canvas p-2 font-mono text-xs whitespace-pre">{command}</code>
          <div className="mt-2">
            <CopyButton text={command} what="Claude Code command" label="Copy command" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold">Personal tokens</h3>
        <p className="mt-0.5 text-sm text-muted">For tools like Claude Code that don’t sign in through the browser. Treat a token like a password.</p>
        <form onSubmit={create} className="mt-3 flex max-w-lg gap-2">
          <label htmlFor="token-name" className="sr-only">
            Token name
          </label>
          <Input id="token-name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="e.g. Claude Code on my laptop" maxLength={60} className="min-w-0" />
          <Button type="submit" loading={creating} disabled={!tokenName.trim()}>
            Create
          </Button>
        </form>
        {createError && (
          <Notice tone="bad" className="mt-3">
            {createError}
          </Notice>
        )}
        {newToken && (
          <div className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
            <p className="font-semibold">Copy your token now — you won’t be able to see it again.</p>
            <div className="mt-2">
              <CopyField value={newToken} what="personal token" />
            </div>
            <p className="mt-3 text-sm">The Claude Code command above now includes it.</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setNewToken(null)}>
              I’ve saved it
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold">Connected apps and tokens</h3>
        {loadError ? (
          <p className="mt-1 text-sm text-muted">{loadError}</p>
        ) : !connections ? (
          <Spinner className="py-4" />
        ) : !connections.apps.length && !connections.tokens.length ? (
          <p className="mt-1 text-sm text-muted">Nothing connected yet.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2">
            {connections.apps.map((a) => (
              <li key={a.clientId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="min-w-0 truncate">{a.name}</span> <Badge tone="info">App</Badge>
                  </p>
                  <p className="text-xs text-muted">Connected {dateFmt.format(a.connectedAt)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRevokeTarget({ kind: 'app', id: a.clientId, name: a.name })}>
                  Disconnect
                </Button>
              </li>
            ))}
            {connections.tokens.map((t) => (
              <li key={t.tokenId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="min-w-0 truncate">{t.name}</span> <Badge>Token</Badge>
                  </p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{t.prefix}…</span> · created {dateFmt.format(t.createdAt)} · {t.lastUsedAt ? `last used ${dateFmt.format(t.lastUsedAt)}` : 'never used'}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRevokeTarget({ kind: 'token', id: t.tokenId, name: t.name })}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={!!revokeTarget}
        title={revokeTarget?.kind === 'app' ? `Disconnect ${revokeTarget.name}?` : `Revoke “${revokeTarget?.name ?? ''}”?`}
        confirmLabel={revokeTarget?.kind === 'app' ? 'Disconnect' : 'Revoke'}
        busy={revoking}
        onConfirm={revoke}
        onClose={() => setRevokeTarget(null)}
      >
        <p>
          {revokeTarget?.kind === 'app'
            ? 'It will lose access to your Study Helper account straight away. You can connect it again later.'
            : 'Anything using this token will stop working straight away.'}
        </p>
      </ConfirmModal>
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// Privacy

function PrivacySection({ profile }: { profile: Profile }) {
  const { signOut } = useUser();
  const navigate = useNavigate();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const isStudent = profile.role === 'student';

  const download = async () => {
    setExporting(true);
    try {
      const data = await api.exportMyData({});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-helper-data-${nzDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast(errorMessage(e), 'bad');
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteMyAccount({});
      await signOut().catch(() => undefined);
      navigate('/', { replace: true });
    } catch (e) {
      setDeleteError(errorMessage(e));
      setDeleting(false);
    }
  };

  return (
    <Section
      id="privacy"
      icon={<Shield className="size-5" />}
      title="Privacy"
      subtitle={
        <>
          Read our{' '}
          <Link to="/about#privacy" className="font-semibold text-brand-700 underline dark:text-brand-300">
            privacy policy
          </Link>{' '}
          to see what we collect and why.
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-line p-4">
          <h3 className="font-bold">Download my data</h3>
          <p className="mt-1 text-sm text-muted">
            A copy of everything we hold about you{isStudent ? ' — your profile, progress, answers, exams, flashcards, plans and tutor chats' : ' — your profile, family links and AI settings'} — as a JSON file.
          </p>
          <Button className="mt-3" variant="secondary" icon={<Download className="size-4" />} loading={exporting} onClick={download}>
            Download my data
          </Button>
        </div>
        <div className="min-w-0 rounded-xl border border-rose-200 p-4 dark:border-rose-900">
          <h3 className="font-bold">Delete my account</h3>
          <p className="mt-1 text-sm text-muted">
            Permanently deletes your account and {isStudent ? 'all your progress, chats and uploads' : 'your family links, AI keys and usage'}. This can’t be undone.
          </p>
          <Button className="mt-3" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete your account?"
        confirmLabel="Delete for good"
        busy={deleting}
        disabled={confirmText !== 'DELETE'}
        onConfirm={remove}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmText('');
          setDeleteError('');
        }}
      >
        <div className="grid grid-cols-1 gap-3">
          <p>
            {isStudent
              ? 'Your progress, answers, exams, flashcards, plans, tutor chats, notes and uploads will be deleted, and your parents will be unlinked.'
              : 'Your profile, family links, AI keys and usage history will be deleted. If you created accounts for your children, delete those first from the Family page.'}{' '}
            You might like to download your data first.
          </p>
          <Field label={<>Type <span className="font-mono">DELETE</span> to confirm</>}>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          </Field>
          {deleteError && <Notice tone="bad">{deleteError}</Notice>}
        </div>
      </ConfirmModal>
    </Section>
  );
}
