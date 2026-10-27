import { describe, expect, it } from 'vitest';
import { BADGES } from './gamification';
import { inviteEmail, listNames } from './invites';
import {
  CHARACTERS,
  describeUnlocks,
  eggForLevel,
  FRAMES,
  isRobotId,
  isUnlocked,
  PALETTES,
  pendingEggs,
  rarityOdds,
  rollCreature,
  TITLES,
  unlocksAtLevel,
  type OwnedCharacter,
} from './rewards';
import { createRng } from './rng';

const owned = (...ids: string[]): OwnedCharacter[] => ids.map((id, i) => ({ id, level: i + 2, at: 0 }));

describe('characters', () => {
  it('has 40 unique creatures with a fact each', () => {
    expect(CHARACTERS).toHaveLength(40);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(40);
    for (const c of CHARACTERS) {
      expect(c.id).toMatch(/^[a-z][a-z-]{1,38}$/);
      expect(c.fact.length).toBeGreaterThan(20);
    }
  });

  it('recognises robot ids', () => {
    expect(isRobotId('robot-a7f2c9')).toBe(true);
    expect(isRobotId('robot-A7F2C9')).toBe(false);
    expect(isRobotId('kiwi')).toBe(false);
  });
});

describe('eggs', () => {
  it('gives one egg per level from level 2, with a robot every fifth level', () => {
    expect(eggForLevel(1)).toBeNull();
    expect(eggForLevel(2)).toBe('creature');
    expect(eggForLevel(5)).toBe('robot');
    expect(eggForLevel(10)).toBe('robot');
    expect(eggForLevel(11)).toBe('creature');
  });

  it('lists unopened eggs oldest first', () => {
    expect(pendingEggs(1, [])).toEqual([]);
    expect(pendingEggs(4, [])).toEqual([
      { level: 2, kind: 'creature' },
      { level: 3, kind: 'creature' },
      { level: 4, kind: 'creature' },
    ]);
    expect(pendingEggs(5, owned('kiwi', 'tui')).map((e) => e.level)).toEqual([4, 5]);
  });

  it('never hatches a creature the student already has', () => {
    const rng = createRng(7);
    let have: OwnedCharacter[] = [];
    for (let level = 2; level < 60; level++) {
      const id = rollCreature(level, have, rng.next);
      if (!id) break;
      expect(have.some((h) => h.id === id)).toBe(false);
      have = [...have, { id, level, at: 0 }];
    }
    expect(have).toHaveLength(40);
    expect(rollCreature(61, have, rng.next)).toBeNull();
  });

  it('only hatches commons and rares from early levels, while there are some left', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const id = rollCreature(3, [], rng.next)!;
      expect(['common', 'rare']).toContain(CHARACTERS.find((c) => c.id === id)!.rarity);
    }
  });

  it('roughly follows the odds', () => {
    const rng = createRng(11);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) {
      const id = rollCreature(25, [], rng.next);
      const r = CHARACTERS.find((c) => c.id === id)!.rarity;
      counts[r] = (counts[r] ?? 0) + 1;
    }
    const odds = rarityOdds(25);
    for (const [r, pct] of Object.entries(odds)) expect(Math.abs((counts[r] ?? 0) / 40 - pct)).toBeLessThan(4);
  });

  it('still hatches something when only zero-odds rarities are left', () => {
    const notLegendary = CHARACTERS.filter((c) => c.rarity !== 'legendary').map((c) => c.id);
    const id = rollCreature(3, owned(...notLegendary), createRng(1).next);
    expect(CHARACTERS.find((c) => c.id === id)?.rarity).toBe('legendary');
  });
});

describe('frames, colour themes and titles', () => {
  it('have unique ids and valid unlock conditions', () => {
    const badgeIds = new Set(BADGES.map((b) => b.id));
    for (const list of [FRAMES, PALETTES, TITLES]) {
      expect(new Set(list.map((d) => d.id)).size).toBe(list.length);
      for (const d of list) {
        expect(d.level !== undefined || (d.badge !== undefined && badgeIds.has(d.badge))).toBe(true);
      }
    }
  });

  it('unlock by level or badge', () => {
    const silver = FRAMES.find((f) => f.id === 'silver')!;
    const fire = FRAMES.find((f) => f.id === 'fire')!;
    expect(isUnlocked(silver, 5, [])).toBe(false);
    expect(isUnlocked(silver, 6, [])).toBe(true);
    expect(isUnlocked(fire, 50, [])).toBe(false);
    expect(isUnlocked(fire, 1, ['streak-7'])).toBe(true);
  });

  it('describes what each level unlocks', () => {
    expect(describeUnlocks(unlocksAtLevel(1))).toEqual([]);
    expect(describeUnlocks(unlocksAtLevel(3))).toEqual(['a mystery egg', 'the Bronze frame', 'the “Problem Solver” title']);
    expect(describeUnlocks(unlocksAtLevel(5))).toEqual(['a robot egg', 'the “Number Ninja” title']);
    expect(describeUnlocks(unlocksAtLevel(4))).toEqual(['a mystery egg', 'the Ocean colour theme']);
  });
});

describe('co-parent invites', () => {
  it('lists names naturally', () => {
    expect(listNames([])).toBe('');
    expect(listNames(['Sem'])).toBe('Sem');
    expect(listNames(['Norah', 'Sem'])).toBe('Norah and Sem');
    expect(listNames(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('words the email for a co-parent', () => {
    const mail = inviteEmail({
      fromName: 'Jonathan',
      forRole: 'parent',
      kind: 'coparent',
      childNames: ['Norah', 'Sem'],
      url: 'https://example.com/join/ABCD-EFGH',
      code: 'ABCD-EFGH',
      expiresAt: Date.UTC(2026, 10, 3),
    });
    expect(mail.subject).toBe('Jonathan invited you to be a co-parent on Study Helper');
    expect(mail.text).toContain('how Norah and Sem are getting on');
    expect(mail.text).toContain('create a free parent account');
  });
});
