import type { CoParentLink, FamilyLink } from '@study-helper/shared';
import { collection, query, where } from 'firebase/firestore';
import { HeartHandshake, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { Button, Card, Modal, Notice, Spinner, useToast } from '../ui';
import { InvitePanel } from './InvitePanel';

const dateFmt = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Co-parents: another parent (e.g. a partner) who shares all of this parent's children, including
 * any added later. Shown on the Family page and in Settings.
 */
export function CoParents({ links }: { links: Array<FamilyLink & { id: string }> }) {
  const { user } = useUser();
  const toast = useToast();
  const pairs = useQuery<CoParentLink>(query(collection(db, 'coparents'), where('parents', 'array-contains', user.uid)), `coparents:${user.uid}`);
  const [inviting, setInviting] = useState(false);
  const [inviteSession, setInviteSession] = useState(0);
  const [removing, setRemoving] = useState<{ uid: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const childNames = links.map((c) => c.studentName).sort();
  const coParents = pairs.data.map((p) => {
    const uid = p.parents.find((x) => x !== user.uid)!;
    return { uid, name: p.names[uid] ?? 'Co-parent', since: p.createdAt };
  });

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    setError('');
    try {
      await api.removeCoParent({ otherUid: removing.uid });
      toast(`${removing.name} is no longer your co-parent.`, 'good');
      setRemoving(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold">
            <HeartHandshake className="size-5 text-brand-700 dark:text-brand-300" aria-hidden="true" /> Co-parents
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Invite your partner or another parent. You’ll share all your children — including any either of you adds later — and both see progress, set goals
            and rewards.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<UserPlus className="size-4" />}
          onClick={() => {
            setInviteSession((n) => n + 1);
            setInviting(true);
          }}
        >
          Invite a co-parent
        </Button>
      </div>

      {pairs.loading ? (
        <Spinner className="py-3" />
      ) : coParents.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {coParents.map((c) => (
            <li key={c.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="text-xs text-muted">Co-parent since {dateFmt.format(c.since)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRemoving(c)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal open={inviting} onClose={() => setInviting(false)} title="Invite a co-parent" footer={<Button onClick={() => setInviting(false)}>Done</Button>}>
        <InvitePanel
          key={inviteSession}
          kind="coparent"
          autoCreate
          childNames={childNames}
          intro={
            <p className="text-sm text-muted">
              Enter their email and we’ll send them an invite. Once they accept, they’ll see {childNames.length ? childNames.join(', ') : 'your children'} on
              their Family page.
            </p>
          }
        />
      </Modal>

      <Modal
        open={!!removing}
        onClose={() => {
          setRemoving(null);
          setError('');
        }}
        title={`Remove ${removing?.name ?? ''} as a co-parent?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              Remove
            </Button>
          </>
        }
      >
        <p>
          Children you shared through being co-parents will be unlinked from the other parent, and new children won’t be shared any more. Children either of you
          linked separately stay linked.
        </p>
        {error && (
          <Notice tone="bad" className="mt-3">
            {error}
          </Notice>
        )}
      </Modal>
    </Card>
  );
}
