import { Link2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CopyButton } from '../parent/bits';
import { Button, Notice, Spinner } from '../ui';
import { InviteEmail } from './InviteEmail';

type Invite = Awaited<ReturnType<typeof api.createInvite>>;

const dateTime = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * One family invite: email it, or share the code/link yourself. Used by "Add a child", "Link an
 * existing account" and Settings so they all behave the same.
 */
export function InvitePanel({ autoCreate = false, intro }: { autoCreate?: boolean; intro?: ReactNode }) {
  const { profile } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setInvite(await api.createInvite({}));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoCreate && !started.current) {
      started.current = true;
      void create();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate]);

  const isParent = profile?.role === 'parent';
  const them = isParent ? 'your child' : 'your parent';

  if (!invite) {
    return (
      <div className="grid gap-3">
        {intro}
        {busy ? (
          <Spinner className="py-4" label="Making an invite" />
        ) : (
          <Button onClick={create} icon={<Link2 className="size-4" />} className="justify-self-start">
            Create an invite
          </Button>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {intro}
      <InviteEmail invite={invite} fromName={profile?.displayName ?? (isParent ? 'Your parent' : 'Your child')} />

      <div className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-950/40">
        <p className="text-sm font-semibold">Or share it another way</p>
        <p className="mt-0.5 text-xs text-muted">Send the link in a text or message, or read out the code.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-2xl font-extrabold tracking-widest">{invite.code}</span>
          <CopyButton text={invite.code} label="Copy code" />
          <CopyButton text={invite.url} label="Copy link" />
        </div>
        <p className="mt-2 text-xs text-muted">Works once. Expires {dateTime.format(invite.expiresAt)}.</p>
      </div>

      <div>
        <h3 className="text-sm font-bold">What {them} does</h3>
        <ol className="mt-1.5 grid list-decimal gap-1 pl-5 text-sm">
          <li>Opens the link in the email (or goes to Settings → Family and enters the code).</li>
          <li>Signs in, or creates their own account with their email or Google.</li>
          <li>Taps “Accept and link”. {isParent ? 'They’ll appear on your Family page straight away.' : 'You’ll be linked straight away.'}</li>
        </ol>
      </div>

      <Button variant="ghost" size="sm" onClick={create} loading={busy} className="justify-self-start">
        Make a new invite instead
      </Button>
      {error && <Notice tone="bad">{error}</Notice>}
    </div>
  );
}
