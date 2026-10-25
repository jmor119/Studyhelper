import { inviteEmail, inviteMailto, type Role } from '@study-helper/shared';
import { Check, Copy, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Button, Input, Notice } from '../ui';

export interface InviteForEmail {
  code: string;
  url: string;
  expiresAt: number;
  /** Role of the person being invited. */
  forRole: Role;
}

/**
 * "Email the invite": sends it from Study Helper when an email service is connected; otherwise opens
 * the user's own email app with the message ready to send (and offers to copy it as a fallback).
 */
export function InviteEmail({ invite, fromName }: { invite: InviteForEmail; fromName: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: 'sent' | 'mailto'; to: string } | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const message = { fromName, forRole: invite.forRole, url: invite.url, code: invite.code, expiresAt: invite.expiresAt };
  const who = invite.forRole === 'student' ? 'your child' : 'your parent';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const to = email.trim();
    if (!to || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.emailInvite({ code: invite.code, email: to });
      if (res.emailed) {
        setResult({ kind: 'sent', to });
      } else {
        setResult({ kind: 'mailto', to });
        window.location.href = inviteMailto(to, message);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyMessage = async () => {
    const { subject, text } = inviteEmail(message);
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Couldn’t copy — select the link above and copy it instead.');
    }
  };

  return (
    <div className="min-w-0">
      <form onSubmit={submit} className="grid gap-2">
        <label htmlFor="invite-email" className="text-sm font-semibold">
          Email the invite to {who}
        </label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder={invite.forRole === 'student' ? 'child@example.com' : 'parent@example.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1"
            required
          />
          <Button type="submit" loading={busy} icon={<Mail className="size-4" />}>
            Email it
          </Button>
        </div>
      </form>
      {result?.kind === 'sent' && (
        <Notice tone="good" className="mt-3">
          Invite sent to {result.to}. Ask them to check their spam folder if it doesn’t arrive.
        </Notice>
      )}
      {result?.kind === 'mailto' && (
        <Notice tone="info" className="mt-3">
          <p>Your email app should open with the invite ready to send to {result.to} — just press Send.</p>
          <p className="mt-1">
            Nothing opened? Copy the message and paste it into an email or text instead.
          </p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={copyMessage} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
            {copied ? 'Copied' : 'Copy message'}
          </Button>
        </Notice>
      )}
      {error && (
        <Notice tone="bad" className="mt-3">
          {error}
        </Notice>
      )}
    </div>
  );
}
