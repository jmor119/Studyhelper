import { coParentId, inviteEmail, type CoParentLink, type FamilyLink, type InviteKind, type UserProfile } from '@study-helper/shared';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { inviteCode } from '../lib/crypto';
import { appBaseUrl, auth, CHILD_EMAIL_DOMAIN, db } from '../lib/firebase';
import { MAIL_SECRETS, mailAvailable, sendMail } from '../lib/mail';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { linkedParents, linkedStudents, linkId, MAX_PARENTS, requireProfile, shareWithCoParents } from '../lib/users';

const INVITE_DAYS = 7;
const MAX_CHILDREN = 12;
const MAX_COPARENTS = 3;

interface Invite {
  fromUid: string;
  fromRole: UserProfile['role'];
  fromName: string;
  /** Missing on invites made before co-parents existed (they're all 'family'). */
  kind?: InviteKind;
  createdAt: number;
  expiresAt: number;
  usedBy?: string;
  usedAt?: number;
}

function normaliseCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : raw.toUpperCase();
}

const forRoleOf = (invite: Pick<Invite, 'fromRole' | 'kind'>): UserProfile['role'] =>
  invite.kind === 'coparent' || invite.fromRole === 'student' ? 'parent' : 'student';

const childNamesOf = async (parentUid: string) => (await linkedStudents(parentUid)).map((l) => l.studentName).sort();

/**
 * A student invites a parent, or a parent invites a student. A parent can also invite a co-parent:
 * another parent, and the two then share all their children. The other side accepts.
 */
export const createInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  const me = await requireProfile(uid);
  const { kind } = parseInput(z.object({ kind: z.enum(['family', 'coparent']).default('family') }), req.data ?? {});
  if (kind === 'coparent' && me.role !== 'parent') throw fail.denied('Only parent accounts can invite a co-parent.');
  await rateLimit(`invite:${uid}`, 20, 86400, "You've made a lot of invites today — try again tomorrow.");
  const code = inviteCode();
  const now = Date.now();
  const invite: Invite = {
    fromUid: uid,
    fromRole: me.role,
    fromName: me.displayName,
    kind,
    createdAt: now,
    expiresAt: now + INVITE_DAYS * 86_400_000,
  };
  await db.doc(`invites/${code}`).create(invite);
  return {
    code,
    url: `${appBaseUrl()}/join/${code}`,
    expiresAt: invite.expiresAt,
    forRole: forRoleOf(invite),
    kind,
  };
});

/**
 * Emails an existing invite from Study Helper (via Resend). If email can't be sent, returns
 * emailed: false and the browser opens the user's own email app with the same message instead.
 */
export const emailInvite = onCall({ secrets: MAIL_SECRETS }, async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(z.object({ code: z.string().min(4).max(20), email: z.string().trim().toLowerCase().email().max(200) }), req.data);
  const ref = db.doc(`invites/${normaliseCode(input.code)}`);
  const invite = (await ref.get()).data() as (Invite & { sentTo?: string[] }) | undefined;
  if (!invite || invite.fromUid !== uid) throw fail.notFound('That invite');
  if (invite.usedBy || invite.expiresAt < Date.now()) throw fail.precondition('That invite has been used or has expired — make a new one.');
  const sentTo = [...new Set([...(invite.sentTo ?? []), input.email])];
  if (sentTo.length > 3) throw fail.precondition('This invite has already been sent to 3 addresses. Make a new one.');
  await ref.update({ sentTo });

  if (!mailAvailable()) return { emailed: false as const };
  // Open sign-up means anyone could try to use this to email strangers, so keep the limits tight.
  await rateLimit(`invite-email:${uid}`, 10, 86400, "You've emailed a lot of invites today — try again tomorrow.");
  const message = inviteEmail({
    fromName: invite.fromName,
    forRole: forRoleOf(invite),
    kind: invite.kind ?? 'family',
    ...(invite.kind === 'coparent' && { childNames: await childNamesOf(uid) }),
    url: `${appBaseUrl()}/join/${normaliseCode(input.code)}`,
    code: normaliseCode(input.code),
    expiresAt: invite.expiresAt,
  });
  // Replies go to the person who sent the invite (if they have a real email address).
  const inviterEmail = (await auth.getUser(uid)).email;
  const replyTo = inviterEmail && !inviterEmail.endsWith(`@${CHILD_EMAIL_DOMAIN}`) ? inviterEmail : undefined;
  const emailed = await sendMail({ to: input.email, ...message, ...(replyTo && { replyTo }) });
  return { emailed };
});

/** Looks up an invite before accepting (shows "Aroha has invited you to link as their parent"). */
export const peekInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`invite-peek:${uid}`, 30, 3600);
  const { code } = parseInput(z.object({ code: z.string().min(4).max(20) }), req.data);
  const snap = await db.doc(`invites/${normaliseCode(code)}`).get();
  const invite = snap.data() as Invite | undefined;
  if (!invite || invite.usedBy || invite.expiresAt < Date.now()) throw fail.notFound('That invite');
  const kind = invite.kind ?? 'family';
  return {
    fromName: invite.fromName,
    fromRole: invite.fromRole,
    forRole: forRoleOf(invite),
    kind,
    ...(kind === 'coparent' && { childNames: await childNamesOf(invite.fromUid) }),
  };
});

/**
 * Accepting a co-parent invite: records the pair and shares each parent's children with the other.
 * Those links are marked `coParent`, so removing the co-parent removes exactly those links.
 */
async function acceptCoParent(tx: Transaction, inviteRef: DocumentReference, invite: Invite, me: UserProfile) {
  const uid = me.uid;
  if (me.role !== 'parent') throw fail.precondition('This invite is for a parent account. Sign in with a parent account to accept it.');
  const pair = coParentId(uid, invite.fromUid);
  const pairRef = db.doc(`coparents/${pair}`);
  const [pairSnap, inviterSnap, mine, theirs, myKids, theirKids] = await Promise.all([
    tx.get(pairRef),
    tx.get(db.doc(`users/${invite.fromUid}`)),
    tx.get(db.collection('coparents').where('parents', 'array-contains', uid)),
    tx.get(db.collection('coparents').where('parents', 'array-contains', invite.fromUid)),
    tx.get(db.collection('links').where('parentUid', '==', uid)),
    tx.get(db.collection('links').where('parentUid', '==', invite.fromUid)),
  ]);
  const inviter = inviterSnap.data() as UserProfile | undefined;
  if (!inviter || inviter.role !== 'parent') throw fail.notFound('That invite');
  const used = { usedBy: uid, usedAt: Date.now() };
  if (pairSnap.exists) {
    tx.update(inviteRef, used);
    return { alreadyLinked: true, otherUid: invite.fromUid, otherName: inviter.displayName, kind: 'coparent' as const, shared: 0, skipped: [] as string[] };
  }
  if (mine.size >= MAX_COPARENTS) throw fail.precondition(`You can have up to ${MAX_COPARENTS} co-parents.`);
  if (theirs.size >= MAX_COPARENTS) throw fail.precondition(`${inviter.displayName} already has ${MAX_COPARENTS} co-parents.`);

  // Their children are shared with me, and mine with them.
  const plan = [
    ...theirKids.docs.map((d) => ({ parentUid: uid, parentName: me.displayName, link: d.data() as FamilyLink })),
    ...myKids.docs.map((d) => ({ parentUid: invite.fromUid, parentName: inviter.displayName, link: d.data() as FamilyLink })),
  ];
  const childUids = [...new Set(plan.map((p) => p.link.studentUid))];
  const existing = await Promise.all(childUids.map((c) => tx.get(db.collection('links').where('studentUid', '==', c))));
  const parentsOf = new Map(childUids.map((c, i) => [c, new Set(existing[i]!.docs.map((d) => d.data().parentUid as string))]));

  const now = Date.now();
  let shared = 0;
  const skipped: string[] = [];
  for (const { parentUid, parentName, link } of plan) {
    const parents = parentsOf.get(link.studentUid)!;
    if (parents.has(parentUid)) continue;
    if (parents.size >= MAX_PARENTS) {
      skipped.push(link.studentName);
      continue;
    }
    parents.add(parentUid);
    tx.set(db.doc(`links/${linkId(parentUid, link.studentUid)}`), {
      parentUid,
      studentUid: link.studentUid,
      parentName,
      studentName: link.studentName,
      createdAt: now,
      createdBy: invite.fromUid,
      coParent: pair,
    } satisfies FamilyLink);
    shared++;
  }
  tx.set(pairRef, {
    parents: [uid, invite.fromUid].sort() as [string, string],
    names: { [uid]: me.displayName, [invite.fromUid]: inviter.displayName },
    createdAt: now,
    createdBy: invite.fromUid,
  } satisfies CoParentLink);
  tx.update(inviteRef, used);
  return { alreadyLinked: false, otherUid: invite.fromUid, otherName: inviter.displayName, kind: 'coparent' as const, shared, skipped };
}

export const acceptInvite = onCall(async (req) => {
  const uid = requireAuth(req);
  await rateLimit(`invite-accept:${uid}`, 10, 3600, 'Too many attempts — try again in an hour.');
  const { code } = parseInput(z.object({ code: z.string().min(4).max(20) }), req.data);
  const me = await requireProfile(uid);
  const inviteRef = db.doc(`invites/${normaliseCode(code)}`);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(inviteRef);
    const invite = snap.data() as Invite | undefined;
    if (!invite || invite.usedBy || invite.expiresAt < Date.now()) throw fail.notFound('That invite');
    if (invite.fromUid === uid) throw fail.precondition("You can't accept your own invite.");
    if (invite.kind === 'coparent') return acceptCoParent(tx, inviteRef, invite, me);
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
      return { alreadyLinked: true, otherUid: invite.fromUid, otherName: invite.fromName, kind: 'family' as const };
    }
    const [parents, children] = await Promise.all([linkedParents(studentUid), linkedStudents(parentUid)]);
    if (parents.length >= MAX_PARENTS) throw fail.precondition(`A student can link up to ${MAX_PARENTS} parents.`);
    if (children.length >= MAX_CHILDREN) throw fail.precondition(`A parent can link up to ${MAX_CHILDREN} children.`);
    const parentName = me.role === 'parent' ? me.displayName : invite.fromName;
    const studentName = me.role === 'student' ? me.displayName : invite.fromName;
    tx.set(ref, { parentUid, studentUid, parentName, studentName, createdAt: Date.now(), createdBy: invite.fromUid });
    tx.update(inviteRef, { usedBy: uid, usedAt: Date.now() });
    return {
      alreadyLinked: false,
      otherUid: invite.fromUid,
      otherName: invite.fromName,
      kind: 'family' as const,
      newLink: { parentUid, studentUid, studentName },
    };
  });
  // A newly linked child is shared with the parent's co-parents too.
  const newLink = 'newLink' in result ? result.newLink : undefined;
  if (newLink) await shareWithCoParents(newLink.parentUid, newLink.studentUid, newLink.studentName);
  const { alreadyLinked, otherUid, otherName, kind } = result;
  return { alreadyLinked, otherUid, otherName, kind, ...('shared' in result && { shared: result.shared, skipped: result.skipped }) };
});

/** Ends a co-parent partnership. Children shared because of it are unlinked; other links stay. */
export const removeCoParent = onCall(async (req) => {
  const uid = requireAuth(req);
  const { otherUid } = parseInput(z.object({ otherUid: z.string().min(1) }), req.data);
  const pair = coParentId(uid, otherUid);
  const ref = db.doc(`coparents/${pair}`);
  const snap = await ref.get();
  if (!snap.exists || !(snap.data() as CoParentLink).parents.includes(uid)) throw fail.notFound('That co-parent');
  const links = await db.collection('links').where('coParent', '==', pair).get();
  const batch = db.batch();
  links.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
  return { ok: true, unlinked: links.size };
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
    throw fail.precondition('This child account was created by the parent and depends on them. Delete the account instead of unlinking.');
  }
  await ref.delete();
  return { ok: true };
});
