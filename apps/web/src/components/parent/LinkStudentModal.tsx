import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { InvitePanel } from '../family/InvitePanel';
import { Button, Field, Input, Modal, Notice, Tabs } from '../ui';

/** Link a student who already has their own account: send them an invite, or accept their code. */
export function LinkStudentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'invite' | 'accept'>('invite');
  const [code, setCode] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{ name: string; already: boolean } | null>(null);
  const [error, setError] = useState('');
  // Remount the invite panel each time the modal opens, so a fresh invite is made.
  const [session, setSession] = useState(0);

  const close = () => {
    onClose();
    setCode('');
    setAccepted(null);
    setError('');
    setMode('invite');
    setSession((s) => s + 1);
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
      <div className="grid grid-cols-1 gap-4">
        <p className="text-sm text-muted">
          If your child already has their own Study Helper account (or will make one with their email or Google), link it to yours so you can see their progress and set goals.
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
          open && <InvitePanel key={session} autoCreate />
        ) : accepted ? (
          <Notice tone="good" title={accepted.already ? 'Already linked' : 'You’re linked!'}>
            {accepted.already ? `You and ${accepted.name} were already linked.` : `${accepted.name} now appears on your Family page.`}
          </Notice>
        ) : (
          <form onSubmit={accept} className="grid grid-cols-1 gap-3">
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
