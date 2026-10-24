// Small seeded PRNG (mulberry32) so template questions are reproducible from a seed.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Non-zero integer in [min, max]. */
  nonZeroInt(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** n distinct items. */
  sample<T>(items: readonly T[], n: number): T[];
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
  sign(): 1 | -1;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };
  return {
    next,
    int,
    nonZeroInt(min, max) {
      if (min === 0 && max === 0) throw new Error('nonZeroInt: empty range');
      for (;;) {
        const v = int(min, max);
        if (v !== 0) return v;
      }
    },
    pick(items) {
      if (!items.length) throw new Error('pick: empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    sample(items, n) {
      return shuffle(items).slice(0, n);
    },
    shuffle,
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

/** A fresh random 31-bit seed. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}

/** Deterministic 32-bit hash of a string (FNV-1a), useful for stable shuffles. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
