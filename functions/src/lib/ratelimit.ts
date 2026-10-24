import { db } from './firebase';
import { fail } from './http';

/**
 * Fixed-window rate limit stored in Firestore. Throws resource-exhausted when exceeded.
 * Key examples: "tutor:<uid>", "invite:<uid>".
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, message?: string): Promise<void> {
  const ref = db.collection('rateLimits').doc(key.replace(/\//g, '_'));
  const now = Date.now();
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { count: number; windowStart: number } | undefined;
    if (!data || now - data.windowStart > windowSeconds * 1000) {
      tx.set(ref, { count: 1, windowStart: now, expiresAt: now + windowSeconds * 1000 });
      return true;
    }
    if (data.count >= limit) return false;
    tx.update(ref, { count: data.count + 1 });
    return true;
  });
  if (!allowed) throw fail.exhausted(message ?? 'Slow down a little — try again in a minute.');
}
