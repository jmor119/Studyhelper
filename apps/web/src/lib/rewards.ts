import type { CharacterCollection, LevelReward } from '@study-helper/shared';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import { useDoc, useQuery } from './hooks';

/** The characters a student has hatched (written by the openEgg function). */
export function useCharacterCollection(uid: string | null) {
  return useDoc<CharacterCollection>(uid ? doc(db, 'students', uid, 'rewards', 'collection') : null, uid ? `collection:${uid}` : null);
}

/** Rewards parents have promised for reaching a level, lowest level first. */
export function useLevelRewards(uid: string | null) {
  return useQuery<LevelReward>(uid ? query(collection(db, 'students', uid, 'levelRewards'), orderBy('level')) : null, uid ? `levelRewards:${uid}` : null);
}
