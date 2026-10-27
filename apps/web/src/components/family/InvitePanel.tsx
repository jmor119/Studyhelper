import type { InviteKind } from '@study-helper/shared';
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
 * existing account", "Invite a co-parent" and Settings so they all behave the same.
 */
export function InvitePanel({
  autoCreate = false,
  intro,
  kind = 'family',
  childNames,
}: {
  autoCreate?: boolean;
  intro?: ReactNode;
  kind?: InviteKind;
  /** Co-parent invites: the children who'll be shared (for the email wording). */
  childNames?: string[];
}) {
  const { profile } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setInvite(await api.createInvite({ kind }));
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
  const coParent = kind === 'coparent';
  const them = coParent ? 'your co-parent' : isParent ? 'your child' : 'your parent';

  if (!invite) {
    return (
      <div className="grid grid-cols-1 gap-3">
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
    <div className="grid grid-cols-1 gap-5">
      {intro}
      <InviteEmail invite={invite} fromName={profile?.displayName ?? (isParent ? 'Your parent' : 'Your child')} childNames={childNames} />

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
          <li>Signs in, or creates their own {coParent ? 'parent ' : ''}account with their email or Google.</li>
          <li>
            Taps “Accept and link”.{' '}
            {coParent
              ? 'You’ll both see all your children straight away, and any child either of you adds later.'
              : isParent
                ? 'They’ll appear on your Family page straight away.'
                : 'You’ll be linked straight away.'}
          </li>
        </ol>
      </div>

      <Button variant="ghost" size="sm" onClick={create} loading={busy} className="justify-self-start">
        Make a new invite instead
      </Button>
      {error && <Notice tone="bad">{error}</Notice>}
    </div>
  );
}
