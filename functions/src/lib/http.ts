import { HttpsError, type CallableRequest } from 'firebase-functions/https';
import type { z } from 'zod';

export { HttpsError };

type AuthOnly = Pick<CallableRequest, 'auth'>;

export function requireAuth(req: AuthOnly): string {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in first.');
  return req.auth.uid;
}

export function isAdmin(req: AuthOnly): boolean {
  return req.auth?.token?.admin === true;
}

export function requireAdmin(req: AuthOnly): string {
  const uid = requireAuth(req);
  if (!isAdmin(req)) throw new HttpsError('permission-denied', 'Admins only.');
  return uid;
}

/** Validates callable input with zod, throwing a friendly invalid-argument error. */
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const msg = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
      .join('; ');
    throw new HttpsError('invalid-argument', msg);
  }
  return result.data;
}

export const fail = {
  notFound: (what = 'That item') => new HttpsError('not-found', `${what} wasn't found.`),
  denied: (msg = "You don't have access to that.") => new HttpsError('permission-denied', msg),
  precondition: (msg: string) => new HttpsError('failed-precondition', msg),
  invalid: (msg: string) => new HttpsError('invalid-argument', msg),
  exhausted: (msg: string) => new HttpsError('resource-exhausted', msg),
};
