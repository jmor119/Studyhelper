import type { UserProfile } from '@study-helper/shared';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { inviteCode } from '../lib/crypto';
import { appBaseUrl, db } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { linkedParents, linkedStudents, linkId, requireProfile } from '../lib/users';

const INVITE_DAYS = 7;
const MAX_PARENTS = 4;
const MAX_CHILDREN = 12;

interface Invite {
  fromUid: string;
  fromRole: UserProfile['role'];
  fromName: string;
  createdAt: number;
  expiresAt: number;
  usedBy?: string;
  usedAt?: number;
}

function normaliseCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : raw.toUpperCase();
}

/** A student invites a parent, or a parent invites a student. The other side accepts. */
export const createInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  const me = await requireProfile(uid);
  await rateLimit(`invite:${uid}`, 20, 86400, "You've made a lot of invites today — try again tomorrow.");
  const code = inviteCode();
  const now = Date.now();
  const invite: Invite = {
    fromUid: uid,
    fromRole: me.role,
    fromName: me.displayName,
    createdAt: now,
    expiresAt: now + INVITE_DAYS * 86_400_000,
  };
  await db.doc(`invites/${code}`).create(invite);
  return {
    code,
    url: `${appBaseUrl()}/join/${code}`,
    expiresAt: invite.expiresAt,
    forRole: me.role === 'parent' ? 'student' : 'parent',
  };
});

/** Looks up an invite before accepting (shows "Aroha has invited you to link as their parent"). */
export const peekInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`invite-peek:${uid}`, 30, 3600);
  const { code } = parseInput(z.object({ code: z.string().min(4).max(20) }), req.data);
  const snap = await db.doc(`invites/${normaliseCode(code)}`).get();
  const invite = snap.data() as Invite | undefined;
  if (!invite || invite.usedBy || invite.expiresAt < Date.now()) throw fail.notFound('That invite');
  return { fromName: invite.fromName, fromRole: invite.fromRole, forRole: invite.fromRole === 'parent' ? 'student' : 'parent' };
});

export const acceptInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`invite-accept:${uid}`, 10, 3600, 'Too many attempts — try again in an hour.');
  const { code } = parseInput(z.object({ code: z.string().min(4).max(20) }), req.data);
  const me = await requireProfile(uid);
  const inviteRef = db.doc(`invites/${normaliseCode(code)}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    const invite = snap.data() as Invite | undefined;
    if (!invite || invite.usedBy || invite.expiresAt < Date.now()) throw fail.notFound('That invite');
    if (invite.fromUid === uid) throw fail.precondition("You can't accept your own invite.");
    if (invite.fromRole === me.role) {
      throw fail.precondition(
        invite.fromRole === 'parent'
          ? 'This invite is for a student account. Sign in with the student account to accept it.'
          : 'This invite is for a parent account. Sign in with a parent account to accept it.',
      );
    }
    const parentUid = me.role === 'parent' ? uid : invite.fromUid;
    const studentUid = me.role === 'student' ? uid : invite.fromUid;
    const ref = db.doc(`links/${linkId(parentUid, studentUid)}`);
    if ((await tx.get(ref)).exists) {
      tx.update(inviteRef, { usedBy: uid, usedAt: Date.now() });
      return { alreadyLinked: true, otherUid: invite.fromUid, otherName: invite.fromName };
    }
    const [parents, children] = await Promise.all([linkedParents(studentUid), linkedStudents(parentUid)]);
    if (parents.length >= MAX_PARENTS) throw fail.precondition(`A student can link up to ${MAX_PARENTS} parents.`);
    if (children.length >= MAX_CHILDREN) throw fail.precondition(`A parent can link up to ${MAX_CHILDREN} children.`);
    const parentName = me.role === 'parent' ? me.displayName : invite.fromName;
    const studentName = me.role === 'student' ? me.displayName : invite.fromName;
    tx.set(ref, { parentUid, studentUid, parentName, studentName, createdAt: Date.now(), createdBy: invite.fromUid });
    tx.update(inviteRef, { usedBy: uid, usedAt: Date.now() });
    return { alreadyLinked: false, otherUid: invite.fromUid, otherName: invite.fromName };
  });
});

export const unlink = onCall(async (req) => {
  const uid = requireAuth(req);
  const { otherUid } = parseInput(z.object({ otherUid: z.string().min(1) }), req.data);
  const me = await requireProfile(uid);
  const parentUid = me.role === 'parent' ? uid : otherUid;
  const studentUid = me.role === 'student' ? uid : otherUid;
  const ref = db.doc(`links/${linkId(parentUid, studentUid)}`);
  if (!(await ref.get()).exists) throw fail.notFound('That link');
  const student = await requireProfile(studentUid, 'student');
  if (student.managedBy === parentUid) {
    throw fail.precondition(
      'This child account was created by the parent and depends on them. Delete the account instead of unlinking.',
    );
  }
  await ref.delete();
  return { ok: true };
});
