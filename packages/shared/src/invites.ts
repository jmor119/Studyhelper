import type { Role } from './types';

// The wording of a family invite email. Used both for the "open in my email app" version (mailto)
// and for emails the server sends when an email service is configured.

export interface InviteEmailInput {
  fromName: string;
  /** The role of the person being invited. */
  forRole: Role;
  url: string;
  code: string;
  expiresAt: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inviteEmail(i: InviteEmailInput): { subject: string; text: string; html: string } {
  const expires = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(i.expiresAt));
  const why =
    i.forRole === 'student'
      ? `${i.fromName} has invited you to link your Study Helper account with theirs, so they can see how your study is going and set goals with you.`
      : `${i.fromName} has invited you to link with their Study Helper account, so you can see how their study is going and set goals with them.`;
  const subject = `${i.fromName} invited you to Study Helper`;
  const text = [
    'Kia ora,',
    '',
    why,
    '',
    `1. Open this link: ${i.url}`,
    `2. Sign in, or create a free ${i.forRole} account if you don't have one yet.`,
    '3. Choose "Accept and link".',
    '',
    `You can also enter this code in Settings → Family: ${i.code}`,
    '',
    `The invite works once and expires on ${expires}.`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1f2937;line-height:1.5">
  <p>Kia ora,</p>
  <p>${esc(why)}</p>
  <p style="margin:24px 0"><a href="${esc(i.url)}" style="background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Accept the invite</a></p>
  <p>Or enter this code in <b>Settings → Family</b>: <span style="font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:2px">${esc(i.code)}</span></p>
  <p style="color:#6b7280;font-size:13px">The invite works once and expires on ${esc(expires)}. If you weren't expecting this, you can ignore it.</p>
</div>`;
  return { subject, text, html };
}

/** A mailto: link with the invite ready to send from the user's own email app. */
export function inviteMailto(to: string, input: InviteEmailInput): string {
  const { subject, text } = inviteEmail(input);
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
