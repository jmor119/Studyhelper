import {
  getCharacter,
  getFrame,
  getPalette,
  getTitle,
  isUnlocked,
  levelForXp,
  pendingEggs,
  rollCreature,
  type CharacterCollection,
  type OwnedCharacter,
  type StudentStats,
  type UserProfile,
} from '@study-helper/shared';
import { randomBytes, randomInt } from 'node:crypto';
import { onCall } from 'firebase-functions/https';
import { z } from 'zod';
import { db, FieldValue } from '../lib/firebase';
import { fail, parseInput, requireAuth } from '../lib/http';
import { rateLimit } from '../lib/ratelimit';
import { requireProfile } from '../lib/users';

/** Uniform random number in [0, 1) from the OS, so eggs can't be predicted or re-rolled. */
const random = () => randomInt(0, 2 ** 32) / 2 ** 32;

function newRobotId(owned: readonly OwnedCharacter[]): string {
  for (;;) {
    const id = `robot-${randomBytes(3).toString('hex')}`;
    if (!owned.some((o) => o.id === id)) return id;
  }
}

/** Opens the student's oldest unopened egg and adds what hatches to their collection. */
export const openEgg = onCall(async (req) => {
  const uid = requireAuth(req);
  await requireProfile(uid, 'student');
  await rateLimit(`egg:${uid}`, 120, 3600);
  const studentRef = db.doc(`students/${uid}`);
  const collectionRef = db.doc(`students/${uid}/rewards/collection`);
  const userRef = db.doc(`users/${uid}`);

  return db.runTransaction(async (tx) => {
    const [statsSnap, collectionSnap, userSnap] = await Promise.all([tx.get(studentRef), tx.get(collectionRef), tx.get(userRef)]);
    const level = levelForXp((statsSnap.data() as StudentStats | undefined)?.xp ?? 0);
    const owned = (collectionSnap.data() as CharacterCollection | undefined)?.characters ?? [];
    const eggs = pendingEggs(level, owned);
    if (!eggs.length) throw fail.precondition('No eggs to open — level up to earn another one.');
    const egg = eggs[0]!;
    // Once the whole crew is collected, every egg hatches a robot.
    const id = (egg.kind === 'creature' && rollCreature(egg.level, owned, random)) || newRobotId(owned);
    const now = Date.now();
    tx.set(collectionRef, { characters: [...owned, { id, level: egg.level, at: now }], updatedAt: now } satisfies CharacterCollection);
    // Their first character becomes their profile picture straight away.
    const firstPicture = !(userSnap.data() as UserProfile | undefined)?.avatar;
    if (firstPicture) tx.update(userRef, { avatar: id });
    return { id, level: egg.level, kind: egg.kind, remaining: eggs.length - 1, equipped: firstPicture };
  });
});

const Choice = z.string().min(1).max(40).nullable().optional();

/**
 * Sets the profile picture, frame, title and colour theme. Students can only use what they've
 * unlocked; parents can pick any common character as their picture.
 */
export const setLook = onCall(async (req) => {
  const uid = requireAuth(req);
  const input = parseInput(z.object({ avatar: Choice, frame: Choice, title: Choice, palette: Choice }), req.data);
  const profile = await requireProfile(uid);
  const update: Record<string, unknown> = {};
  const set = (key: 'avatar' | 'frame' | 'title' | 'palette', value: string | null | undefined) => {
    if (value !== undefined) update[key] = value === null ? FieldValue.delete() : value;
  };

  if (profile.role === 'parent') {
    if (input.frame || input.title || input.palette) throw fail.invalid('Frames, titles and colour themes are for students.');
    if (input.avatar && getCharacter(input.avatar)?.rarity !== 'common') throw fail.invalid('Choose one of the common characters.');
    set('avatar', input.avatar);
  } else {
    const [statsSnap, collectionSnap] = await Promise.all([db.doc(`students/${uid}`).get(), db.doc(`students/${uid}/rewards/collection`).get()]);
    const stats = statsSnap.data() as StudentStats | undefined;
    const level = levelForXp(stats?.xp ?? 0);
    const badges = stats?.badges ?? [];
    const owned = new Set(((collectionSnap.data() as CharacterCollection | undefined)?.characters ?? []).map((c) => c.id));
    const locked = (what: string) => fail.precondition(`You haven’t unlocked that ${what} yet.`);
    if (input.avatar && !owned.has(input.avatar)) throw locked('character');
    if (input.frame) {
      const f = getFrame(input.frame);
      if (!f || !isUnlocked(f, level, badges)) throw locked('frame');
    }
    if (input.title) {
      const t = getTitle(input.title);
      if (!t || !isUnlocked(t, level, badges)) throw locked('title');
    }
    if (input.palette) {
      const p = getPalette(input.palette);
      if (!p || !isUnlocked(p, level, badges)) throw locked('colour theme');
    }
    set('avatar', input.avatar);
    set('frame', input.frame);
    set('title', input.title);
    set('palette', input.palette);
  }
  if (!Object.keys(update).length) return { ok: true };
  await db.doc(`users/${uid}`).update(update);
  return { ok: true };
});
