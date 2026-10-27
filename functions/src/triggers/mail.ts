import { onDocumentCreated } from 'firebase-functions/firestore';
import { auth, CHILD_EMAIL_DOMAIN } from '../lib/firebase';
import { MAIL_SECRETS, mailAvailable, sendMail, type QueuedMail } from '../lib/mail';

/** Sends emails queued with queueMail (see lib/mail.ts). Only to verified, real addresses. */
export const deliverMail = onDocumentCreated({ document: 'mail/{mailId}', secrets: MAIL_SECRETS }, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const mail = snap.data() as QueuedMail;
  if (mail.status !== 'queued') return;
  const user = await auth.getUser(mail.toUid).catch(() => null);
  const to = user?.email;
  if (!mailAvailable() || !to || !user.emailVerified || to.endsWith(`@${CHILD_EMAIL_DOMAIN}`)) {
    await snap.ref.update({ status: 'skipped' });
    return;
  }
  const ok = await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html });
  await snap.ref.update({ status: ok ? 'sent' : 'failed', sentAt: Date.now() });
});
