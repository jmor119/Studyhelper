import type { UserProfile } from '@study-helper/shared';
import { KeyRound, Trash2, Unlink, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, errorMessage } from '../../lib/api';
import { Button, Card, Field, Input, Modal, Notice, Select, useToast } from '../ui';
import { CardTitle } from './bits';

const YEARS = Array.from({ length: 13 }, (_, i) => i + 1);

function NameAndYear({ uid, profile }: { uid: string; profile: UserProfile & { id: string } }) {
  const toast = useToast();
  const [name, setName] = useState(profile.displayName);
  const [year, setYear] = useState(profile.yearLevel ?? 9);
  const [savingName, setSavingName] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [error, setError] = useState('');

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const displayName = name.trim();
    if (!displayName || displayName === profile.displayName) return;
    setSavingName(true);
    setError('');
    try {
      await api.renameChild({ childUid: uid, displayName });
      toast('Name updated', 'good');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const saveYear = async (e: FormEvent) => {
    e.preventDefault();
    if (year === profile.yearLevel) return;
    setSavingYear(true);
    setError('');
    try {
      await api.setYearLevel({ studentUid: uid, yearLevel: year });
      toast(`Moved to Year ${year}`, 'good');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingYear(false);
    }
  };

  return (
    <Card as="section">
      <CardTitle icon={<UserRound className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />}>Profile</CardTitle>
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
        <form onSubmit={saveName} className="flex min-w-0 flex-col gap-2">
          <Field label="Name" hint="Shown in the app and on your Family page.">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
          </Field>
          <Button type="submit" size="sm" variant="secondary" className="self-start" loading={savingName} disabled={!name.trim() || name.trim() === profile.displayName}>
            Save name
          </Button>
        </form>
        <form onSubmit={saveYear} className="flex min-w-0 flex-col gap-2">
          <Field label="Year level" hint="Topics and practice follow the year level. Update it each new school year.">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="sm" variant="secondary" className="self-start" loading={savingYear} disabled={year === profile.yearLevel}>
            Save year level
          </Button>
        </form>
      </div>
      {error && (
        <Notice tone="bad" className="mt-3">
          {error}
        </Notice>
      )}
    </Card>
  );
}

function Password({ uid, profile }: { uid: string; profile: UserProfile & { id: string } }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || confirm !== password) return;
    setBusy(true);
    setError('');
    try {
      await api.resetChildPassword({ childUid: uid, password });
      setPassword('');
      setConfirm('');
      toast('Password changed', 'good');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section">
      <CardTitle icon={<KeyRound className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" />}>Password</CardTitle>
      {profile.username ? (
        <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-3">
          <p className="text-sm text-muted">
            {profile.displayName} signs in on the <b>Username</b> tab with <span className="rounded bg-canvas px-1.5 py-0.5 font-mono font-semibold text-ink">{profile.username}</span>.
            Set a new password if they’ve forgotten theirs. They’ll be signed out on other devices.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="New password" hint="At least 8 characters." error={tooShort ? 'At least 8 characters.' : null}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
            </Field>
            <Field label="Confirm new password" error={mismatch ? 'The passwords don’t match.' : null}>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={128} required />
            </Field>
          </div>
          {error && <Notice tone="bad">{error}</Notice>}
          <Button type="submit" size="sm" variant="secondary" className="justify-self-start" loading={busy} disabled={password.length < 8 || confirm !== password}>
            Set new password
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {profile.displayName} signs in with their own email or Google account, so they manage their own password. If they forget it, they can use “Forgot your
          password?” on the sign-in page.
        </p>
      )}
    </Card>
  );
}

function DeleteAccount({ uid, name }: { uid: string; name: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const matches = typed.trim().toLocaleLowerCase('en-NZ') === name.trim().toLocaleLowerCase('en-NZ');

  const close = () => {
    setOpen(false);
    setTyped('');
    setError('');
  };

  const confirm = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.deleteChildAccount({ childUid: uid });
      navigate('/parent', { replace: true });
      toast(`${name}’s account has been deleted`, 'neutral');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="border-bad/40">
      <CardTitle icon={<Trash2 className="size-5 text-bad" aria-hidden="true" />}>Delete account</CardTitle>
      <p className="mt-2 text-sm text-muted">
        You created this account, so you can delete it. This permanently removes {name}’s sign-in, progress, mock exams, tutor chats, goals and uploads, and frees
        up the username. It can’t be undone.
      </p>
      <Button variant="danger" size="sm" className="mt-3" onClick={() => setOpen(true)} icon={<Trash2 className="size-4" />}>
        Delete {name}’s account
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={`Delete ${name}’s account?`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => confirm()} loading={busy} disabled={!matches}>
              Delete for good
            </Button>
          </>
        }
      >
        <form onSubmit={confirm} className="grid grid-cols-1 gap-3">
          <p className="text-sm">Everything in this account will be deleted straight away. There’s no undo.</p>
          <Field label={`Type “${name}” to confirm`}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
          {error && <Notice tone="bad">{error}</Notice>}
        </form>
      </Modal>
    </Card>
  );
}

function UnlinkAccount({ uid, name }: { uid: string; name: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await api.unlink({ otherUid: uid });
      navigate('/parent', { replace: true });
      toast(`You’re no longer linked with ${name}`, 'neutral');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Card as="section">
      <CardTitle icon={<Unlink className="size-5 text-muted" aria-hidden="true" />}>Unlink</CardTitle>
      <p className="mt-2 text-sm text-muted">
        {name} has their own account, so you can’t delete it — but you can unlink. You’ll stop seeing their progress and chats. Their account and progress stay as they
        are, and so do any goals you’ve set (archive them first if you’d rather they didn’t). You can link again later with a new invite.
      </p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen(true)} icon={<Unlink className="size-4" />}>
        Unlink {name}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError('');
        }}
        title={`Unlink ${name}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirm} loading={busy}>
              Unlink
            </Button>
          </>
        }
      >
        <p className="text-sm">You’ll lose access to {name}’s progress straight away.</p>
        {error && (
          <Notice tone="bad" className="mt-3">
            {error}
          </Notice>
        )}
      </Modal>
    </Card>
  );
}

export function AccountTab({ uid, parentUid, profile }: { uid: string; parentUid: string; profile: UserProfile & { id: string } }) {
  const name = profile.displayName;
  return (
    <div className="grid grid-cols-1 gap-5">
      <NameAndYear key={`${profile.displayName}|${profile.yearLevel}`} uid={uid} profile={profile} />
      <Password uid={uid} profile={profile} />
      {profile.managedBy === parentUid ? <DeleteAccount uid={uid} name={name} /> : <UnlinkAccount uid={uid} name={name} />}
    </div>
  );
}
