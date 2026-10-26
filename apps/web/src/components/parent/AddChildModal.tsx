import { CheckCircle2, ChevronLeft, KeyRound, Loader2, Mail, XCircle } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api';
import { InvitePanel } from '../family/InvitePanel';
import { Button, Field, Input, Modal, Notice, Select } from '../ui';
import { CopyButton } from './bits';

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const YEARS = Array.from({ length: 13 }, (_, i) => i + 1);

type Availability = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

function usernameProblem(u: string): string | null {
  if (!u) return null;
  if (u.length < 3) return 'At least 3 characters.';
  if (u.length > 24) return 'No more than 24 characters.';
  if (!/^[a-z0-9]/.test(u)) return 'Start with a letter or number.';
  if (!USERNAME_RE.test(u)) return 'Use only lowercase letters, numbers, dots, dashes or underscores.';
  return null;
}

/** Live username availability, debounced so we don't call the function on every keystroke. */
function useUsernameAvailability(username: string): Availability {
  const [state, setState] = useState<Availability>('idle');
  useEffect(() => {
    if (!username) return setState('idle');
    if (usernameProblem(username)) return setState('invalid');
    setState('checking');
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .checkUsername({ username })
        .then((r) => !cancelled && setState(r.available ? 'available' : 'taken'))
        .catch(() => !cancelled && setState('error'));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username]);
  return state;
}

interface Created {
  uid: string;
  username: string;
  displayName: string;
}

export function AddChildModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [yearLevel, setYearLevel] = useState(9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  // How the child will sign in: their own email/Google (invite) or a username we create.
  const [mode, setMode] = useState<'choose' | 'invite' | 'create'>('choose');
  const [inviteSession, setInviteSession] = useState(0);
  const availability = useUsernameAvailability(username);

  const reset = () => {
    setDisplayName('');
    setUsername('');
    setPassword('');
    setConfirm('');
    setYearLevel(9);
    setError('');
    setSubmitted(false);
    setCreated(null);
    setMode('choose');
    setInviteSession((n) => n + 1);
  };
  const close = () => {
    onClose();
    reset();
  };

  const nameError = submitted && !displayName.trim() ? 'Enter your child’s name.' : null;
  const usernameError =
    usernameProblem(username) ?? (availability === 'taken' ? 'That username is taken — try another.' : submitted && !username ? 'Choose a username.' : null);
  const passwordError = (submitted || password.length > 0) && password.length < 8 ? 'At least 8 characters.' : null;
  const confirmError = (submitted || confirm.length >= password.length) && confirm && confirm !== password ? 'The passwords don’t match.' : submitted && !confirm ? 'Type the password again.' : null;

  const canSubmit =
    displayName.trim().length > 0 &&
    !usernameProblem(username) &&
    username.length > 0 &&
    // Don't wait for the availability check: the server rejects taken usernames anyway.
    availability !== 'taken' &&
    password.length >= 8 &&
    confirm === password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.createChildAccount({ displayName: displayName.trim(), username, password, yearLevel });
      setCreated({ uid: res.uid, username: res.username, displayName: displayName.trim() });
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const site = window.location.origin;
  const instructions = created
    ? `How ${created.displayName} signs in to Study Helper:\n1. Go to ${site}\n2. Choose Sign in, then the Username tab.\n3. Username: ${created.username}\n4. Enter the password we chose together.\nYou can change your password later in Settings.`
    : '';

  return (
    <Modal
      open={open}
      onClose={close}
      title={created ? 'Account created' : mode === 'invite' ? 'Invite your child' : 'Add a child'}
      footer={
        created ? (
          <>
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
            <Button
              onClick={() => {
                const uid = created.uid;
                close();
                navigate(`/parent/child/${uid}`);
              }}
            >
              View {created.displayName}
            </Button>
          </>
        ) : mode === 'choose' ? (
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
        ) : mode === 'invite' ? (
          <>
            <Button variant="ghost" onClick={() => setMode('choose')} icon={<ChevronLeft className="size-4" />}>
              Back
            </Button>
            <Button onClick={close}>Done</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setMode('choose')} icon={<ChevronLeft className="size-4" />}>
              Back
            </Button>
            <Button type="submit" form={formId} loading={busy}>
              Create account
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="grid grid-cols-1 gap-4">
          <Notice tone="good" title={`${created.displayName}’s account is ready`}>
            They’re linked to you, so you’ll see their progress on your Family page.
          </Notice>
          <div>
            <h3 className="font-bold">How {created.displayName} signs in</h3>
            <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-sm">
              <li>
                Go to <span className="font-semibold break-all">{site}</span>
              </li>
              <li>
                Choose <b>Sign in</b>, then the <b>Username</b> tab.
              </li>
              <li>
                Enter the username <span className="rounded bg-canvas px-1.5 py-0.5 font-mono font-semibold">{created.username}</span> and the password you
                just chose.
              </li>
            </ol>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 text-sm text-muted">
            <li>They can change their password later in Settings.</li>
            <li>If they forget it, you can reset it from their page here (Account tab).</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={instructions} label="Copy sign-in instructions" />
            <Button
              size="sm"
              variant="secondary"
              icon={<Mail className="size-4" />}
              onClick={() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(`How to sign in to Study Helper`)}&body=${encodeURIComponent(instructions)}`;
              }}
            >
              Email these steps
            </Button>
          </div>
          <p className="text-xs text-muted">The steps don’t include the password — tell them that yourself.</p>
        </div>
      ) : mode === 'choose' ? (
        <div className="grid grid-cols-1 gap-3">
          <p className="text-sm text-muted">How will your child sign in?</p>
          <button
            type="button"
            onClick={() => setMode('invite')}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-line p-4 text-left transition-colors hover:border-brand-400"
          >
            <Mail className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            <span>
              <span className="block font-bold">Invite them by email</span>
              <span className="text-sm text-muted">
                They have their own email or Google account (usually 13+). We’ll email them an invite; they make their own login and it links to you.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-line p-4 text-left transition-colors hover:border-brand-400"
          >
            <KeyRound className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            <span>
              <span className="block font-bold">Create a username and password for them</span>
              <span className="text-sm text-muted">Best for younger children without email. You choose the login, and you can reset the password if they forget it.</span>
            </span>
          </button>
        </div>
      ) : mode === 'invite' ? (
        <InvitePanel
          key={inviteSession}
          autoCreate
          intro={<p className="text-sm text-muted">Enter your child’s email and we’ll send them an invite. When they accept it, they’ll appear on your Family page.</p>}
        />
      ) : (
        <form id={formId} onSubmit={submit} className="grid grid-cols-1 gap-4" noValidate>
          <p className="text-sm text-muted">For a child without their own email. They sign in with a username and password you choose — no email needed.</p>
          <Field label="Their name" hint="Shown in the app. A first name is fine." error={nameError}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} autoComplete="off" required aria-invalid={!!nameError} />
          </Field>
          <Field
            label="Username"
            error={usernameError}
            hint={
              <span className="flex items-center gap-1" aria-live="polite">
                {availability === 'checking' && (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking…
                  </>
                )}
                {availability === 'available' && (
                  <>
                    <CheckCircle2 className="size-3.5 text-good" aria-hidden="true" /> <span className="font-semibold text-good">{username} is available</span>
                  </>
                )}
                {availability === 'error' && <>Couldn’t check right now — we’ll check again when you create the account.</>}
                {availability === 'idle' && <>3–24 lowercase letters, numbers, dots, dashes or underscores.</>}
              </span>
            }
          >
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                maxLength={24}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-invalid={!!usernameError}
                className="pr-10"
              />
              {availability === 'taken' && <XCircle className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-bad" aria-hidden="true" />}
              {availability === 'available' && <CheckCircle2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-good" aria-hidden="true" />}
            </div>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Password" hint="At least 8 characters." error={passwordError}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required aria-invalid={!!passwordError} />
            </Field>
            <Field label="Confirm password" error={confirmError}>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={128} required aria-invalid={!!confirmError} />
            </Field>
          </div>
          <Field label="Year level" hint="You can change this each new school year.">
            <Select value={yearLevel} onChange={(e) => setYearLevel(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
          {error && <Notice tone="bad">{error}</Notice>}
        </form>
      )}
    </Modal>
  );
}
