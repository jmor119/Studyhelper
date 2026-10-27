import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { db, isEmulator } from './firebase';

// Outgoing email through Resend's SMTP service (shared with the owner's Chronological app, whose
// verified sending domain is fiercespeed.nz). Credentials live in Secret Manager; functions that
// send mail must declare `secrets: MAIL_SECRETS`.

export const SMTP_USER = defineSecret('SMTP_USER');
export const SMTP_PASSWORD = defineSecret('SMTP_PASSWORD');
export const MAIL_SECRETS = [SMTP_USER, SMTP_PASSWORD];

const SMTP_HOST = process.env.SMTP_HOST ?? 'smtp.resend.com';
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
export const MAIL_FROM = process.env.MAIL_FROM ?? 'Study Helper <no-reply@fiercespeed.nz>';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** True when email can actually be sent (credentials present, and not in the emulator). */
export function mailAvailable(): boolean {
  if (isEmulator() && process.env.MAIL_IN_EMULATOR !== 'true') return false;
  try {
    return !!SMTP_USER.value() && !!SMTP_PASSWORD.value();
  } catch {
    return false;
  }
}

/** Sends one email. Returns false (and logs) on failure, so callers can fall back gracefully. */
export async function sendMail(mail: OutgoingMail): Promise<boolean> {
  if (!mailAvailable()) return false;
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
  });
  try {
    await transport.sendMail({
      from: MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(mail.replyTo && { replyTo: mail.replyTo }),
    });
    return true;
  } catch (e) {
    logger.error('email send failed', { to: mail.to.replace(/(.).*@/, '$1***@'), error: (e as Error).message });
    return false;
  } finally {
    transport.close();
  }
}

/** mail/{id}: email waiting to be sent by the deliverMail trigger (server-only). */
export interface QueuedMail {
  toUid: string;
  kind: string;
  subject: string;
  text: string;
  html: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  createdAt: number;
  /** cleanup deletes it after this. */
  expiresAt: number;
  sentAt?: number;
}

/**
 * Queues an email to a user. Functions that don't hold the mail secrets (e.g. answer marking) use this
 * instead of sendMail; the deliverMail trigger sends it moments later.
 */
export async function queueMail(toUid: string, kind: string, mail: Pick<OutgoingMail, 'subject' | 'text' | 'html'>): Promise<void> {
  const now = Date.now();
  await db.collection('mail').add({ toUid, kind, ...mail, status: 'queued', createdAt: now, expiresAt: now + 30 * 86_400_000 } satisfies QueuedMail);
}
