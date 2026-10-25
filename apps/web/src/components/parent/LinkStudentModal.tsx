import { KeyRound, Link2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button, Field, Input, Modal, Notice, Tabs } from '../ui';
import { CopyButton } from './bits';
import { formatDateTime } from './format';

type Invite = Awaited<ReturnType<typeof api.createInvite>>;

/** Link a student who already has their own account: send them an invite, or accept their code. */
export function LinkStudentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'invite' | 'accept'>('invite');
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviting, setInviting] = useState(false);
  const [code, setCode] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{ name: string; already: boolean } | null>(null);
  const [error, setError] = useState('');

  const close = () => {
    onClose();
    setInvite(null);
    setCode('');
    setAccepted(null);
    setError('');
    setMode('invite');
  };

  const createInvite = async () => {
    setInviting(true);
    setError('');
    try {
      setInvite(await api.createInvite({}));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setInviting(false);
    }
  };

  const accept = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim() || accepting) return;
    setAccepting(true);
    setError('');
    try {
      const res = await api.acceptInvite({ code: code.trim() });
      setAccepted({ name: res.otherName, already: res.alreadyLinked });
      setCode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Link an existing student account" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          If your child already signed up with their own email or Google account, link it to yours so you can see their progress and set goals.
        </p>
        <Tabs
          className="w-full"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError('');
          }}
          options={[
            { value: 'invite', label: 'Send an invite' },
            { value: 'accept', label: 'I have a code' },
          ]}
        />

        {mode === 'invite' ? (
          invite ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-brand-50 p-4 text-center dark:bg-brand-900/40">
                <p className="text-sm font-semibold text-muted">Invite code</p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-widest">{invite.code}</p>
                <p className="mt-1 text-xs text-muted">Expires {formatDateTime(invite.expiresAt)} · single use</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <CopyButton text={invite.code} label="Copy code" />
                  <CopyButton text={invite.url} label="Copy link" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Invite link</p>
                <p className="mt-1 rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm break-all">{invite.url}</p>
              </div>
              <div>
                <h3 className="font-bold">What your child does</h3>
                <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-sm">
                  <li>Sign in to their own Study Helper account.</li>
                  <li>
                    Open the link, <b>or</b> go to <b>Settings</b> and enter the code.
                  </li>
                  <li>Tap “Accept and link”. They’ll appear on your Family page straight away.</li>
                </ol>
              </div>
              <Button variant="ghost" size="sm" onClick={createInvite} loading={inviting} className="justify-self-start">
                Make a new code
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm">We’ll make a one-time code and link to send your child. It lasts for 7 days.</p>
              <Button onClick={createInvite} loading={inviting} icon={<Link2 className="size-4" />} className="justify-self-start">
                Create an invite
              </Button>
            </div>
          )
        ) : accepted ? (
          <Notice tone="good" title={accepted.already ? 'Already linked' : 'You’re linked!'}>
            {accepted.already ? `You and ${accepted.name} were already linked.` : `${accepted.name} now appears on your Family page.`}
          </Notice>
        ) : (
          <form onSubmit={accept} className="grid gap-3">
            <p className="text-sm">If your child made an invite in their Settings, enter their code here.</p>
            <Field label="Invite code" hint="Eight letters and numbers, like ABCD-EFGH.">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                className="font-mono tracking-widest"
                required
              />
            </Field>
            <Button type="submit" loading={accepting} disabled={code.replace(/[^A-Za-z0-9]/g, '').length < 4} icon={<KeyRound className="size-4" />} className="justify-self-start">
              Link account
            </Button>
          </form>
        )}

        {error && <Notice tone="bad">{error}</Notice>}
      </div>
    </Modal>
  );
}
