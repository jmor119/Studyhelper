// Level-up unlocks: collectable characters (hatched from mystery eggs), profile frames, colour themes
// and titles. Characters are random, so the server rolls them and stores what each student owns;
// frames, themes and titles follow directly from the student's level and badges.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'unique';
export type CreatureRarity = Exclude<Rarity, 'unique'>;

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  unique: 'One of a kind',
};

export interface CharacterDef {
  id: string;
  name: string;
  rarity: CreatureRarity;
  /** A true fact shown on the character's card. */
  fact: string;
}

/** The NZ creature crew. Artwork lives in apps/web/public/characters/<id>.svg. */
export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'kiwi', name: 'Kiwi', rarity: 'common', fact: 'Kiwi lay one of the biggest eggs for their size of any bird — up to a fifth of the mother’s weight.' },
  { id: 'pukeko', name: 'Pūkeko', rarity: 'common', fact: 'Pūkeko live in family groups, and older chicks help raise their younger brothers and sisters.' },
  { id: 'tui', name: 'Tūī', rarity: 'common', fact: 'Tūī have a double voice box, so they can sing two notes at once.' },
  { id: 'piwakawaka', name: 'Pīwakawaka', rarity: 'common', fact: 'Fantails follow people through the bush to catch the insects we disturb.' },
  { id: 'ruru', name: 'Ruru', rarity: 'common', fact: 'The ruru is also called the morepork, after its call: “more-pork, more-pork”.' },
  { id: 'weka', name: 'Weka', rarity: 'common', fact: 'Weka are famously nosy and will pinch shiny things — even car keys — from campsites.' },
  { id: 'takahe', name: 'Takahē', rarity: 'common', fact: 'Takahē can’t fly. They’re the biggest rail (the bird family that includes pūkeko) alive today.' },
  {
    id: 'kereru',
    name: 'Kererū',
    rarity: 'common',
    fact: 'Kererū swallow big fruit like taraire and tawa whole, then spread the seeds — they help plant our forests.',
  },
  { id: 'korora', name: 'Kororā', rarity: 'common', fact: 'Kororā (little penguins) are the smallest penguins in the world, only about 25 cm tall.' },
  { id: 'hoiho', name: 'Hoiho', rarity: 'common', fact: 'Hoiho (yellow-eyed penguins) are one of the rarest penguins in the world.' },
  { id: 'weta', name: 'Wētā', rarity: 'common', fact: 'Some giant wētā are heavier than a sparrow, which makes them among the heaviest insects on Earth.' },
  { id: 'green-gecko', name: 'Moko kākāriki', rarity: 'common', fact: 'Most lizards lay eggs, but New Zealand geckos give birth to live babies.' },
  {
    id: 'tuna',
    name: 'Tuna',
    rarity: 'common',
    fact: 'Longfin eels swim thousands of kilometres into the Pacific to breed, and some live for over 100 years.',
  },
  { id: 'tuatara', name: 'Tuatara', rarity: 'common', fact: 'Tuatara are the last survivors of a group of reptiles that lived alongside the dinosaurs.' },
  { id: 'sheep', name: 'Sheep', rarity: 'common', fact: 'New Zealand has more than four sheep for every person.' },
  { id: 'pupurangi', name: 'Pūpūrangi', rarity: 'common', fact: 'Pūpūrangi are giant meat-eating snails that slurp up earthworms like spaghetti.' },

  {
    id: 'kea-skater',
    name: 'Skater Kea',
    rarity: 'rare',
    fact: 'Kea are the world’s only alpine parrot, and they love to play — even with car windscreen wipers.',
  },
  { id: 'tuatara-ninja', name: 'Ninja Tuatara', rarity: 'rare', fact: 'Tuatara have a “third eye” on top of their head. In adults it’s hidden under scales.' },
  { id: 'weta-knight', name: 'Wētā Knight', rarity: 'rare', fact: 'Insects very like wētā were around about 190 million years ago.' },
  {
    id: 'kaka-pirate',
    name: 'Pirate Kākā',
    rarity: 'rare',
    fact: 'Kākā rip open bark with their strong beaks to find grubs, and lick up nectar with brush-tipped tongues.',
  },
  {
    id: 'dolphin-surfer',
    name: 'Surfer Dolphin',
    rarity: 'rare',
    fact: 'Hector’s dolphins are one of the smallest dolphins in the world, and they only live in New Zealand.',
  },
  { id: 'karearea-pilot', name: 'Pilot Kārearea', rarity: 'rare', fact: 'Kārearea (NZ falcons) can dive at well over 100 km/h to catch their prey.' },
  {
    id: 'fantail-detective',
    name: 'Detective Pīwakawaka',
    rarity: 'rare',
    fact: 'Fantails flick their tails to stir up insects, then snap them out of the air.',
  },
  { id: 'gecko-dj', name: 'DJ Gecko', rarity: 'rare', fact: 'Geckos can’t blink — they lick their eyes to keep them clean.' },
  { id: 'sheep-rugby', name: 'Rugby Sheep', rarity: 'rare', fact: 'A woolly sheep’s fleece keeps growing all its life unless it’s shorn.' },
  { id: 'pukeko-chef', name: 'Chef Pūkeko', rarity: 'rare', fact: 'Pūkeko are known for raiding gardens and pulling up freshly planted vegetables.' },
  {
    id: 'tui-rockstar',
    name: 'Rock Star Tūī',
    rarity: 'rare',
    fact: 'Tūī are brilliant copycats — they can mimic other birds, car alarms and even people talking.',
  },
  { id: 'hoiho-lifeguard', name: 'Lifeguard Hoiho', rarity: 'rare', fact: 'Hoiho can dive more than 100 metres deep to hunt for fish.' },

  {
    id: 'kiwi-astronaut',
    name: 'Astronaut Kiwi',
    rarity: 'epic',
    fact: 'Kiwi are the only birds with nostrils at the tip of their beak — they sniff out worms underground.',
  },
  {
    id: 'kea-scientist',
    name: 'Scientist Kea',
    rarity: 'epic',
    fact: 'Kea are so clever they can solve puzzles and use tools, and scientists study how they think.',
  },
  { id: 'ruru-wizard', name: 'Wizard Ruru', rarity: 'epic', fact: 'Ruru fly almost silently, thanks to soft fringes on their feathers.' },
  { id: 'kereru-superhero', name: 'Super Kererū', rarity: 'epic', fact: 'You can hear a kererū coming: its wings make a loud “whoosh, whoosh”.' },
  {
    id: 'takahe-explorer',
    name: 'Explorer Takahē',
    rarity: 'epic',
    fact: 'Takahē were thought to be extinct until they were rediscovered in Fiordland in 1948.',
  },
  { id: 'orca-captain', name: 'Captain Orca', rarity: 'epic', fact: 'Orca are actually the biggest members of the dolphin family.' },
  { id: 'tuatara-time-traveller', name: 'Time-travelling Tuatara', rarity: 'epic', fact: 'Tuatara can live for more than 100 years.' },
  { id: 'korora-diver', name: 'Diver Kororā', rarity: 'epic', fact: 'Kororā come ashore after dark, and some even nest under seaside houses.' },

  {
    id: 'golden-moa',
    name: 'Golden Moa',
    rarity: 'legendary',
    fact: 'The tallest moa could reach about 3.6 metres with their necks stretched up — twice as tall as an adult.',
  },
  {
    id: 'pouakai',
    name: 'Pouākai',
    rarity: 'legendary',
    fact: 'Pouākai (Haast’s eagle) was the biggest eagle that ever lived, with wings nearly 3 metres across.',
  },
  { id: 'lava-kakapo', name: 'Lava Kākāpō', rarity: 'legendary', fact: 'Kākāpō are the world’s heaviest parrot, and they can’t fly.' },
  { id: 'starlight-kiwi', name: 'Starlight Kiwi', rarity: 'legendary', fact: 'Kiwi are nocturnal — they come out at night to forage under the stars.' },
];

const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));
export const getCharacter = (id: string): CharacterDef | undefined => CHARACTER_BY_ID.get(id);

/** A character a student owns. `level` is the level whose egg it hatched from. */
export interface OwnedCharacter {
  id: string;
  level: number;
  at: number;
}

/** students/{uid}/rewards/collection — written only by Cloud Functions. */
export interface CharacterCollection {
  characters: OwnedCharacter[];
  updatedAt: number;
}

const ROBOT_ID = /^robot-[0-9a-f]{6}$/;
export const isRobotId = (id: string) => ROBOT_ID.test(id);
export const robotSeed = (id: string) => id.slice('robot-'.length);
export const rarityOf = (id: string): Rarity | undefined => (isRobotId(id) ? 'unique' : getCharacter(id)?.rarity);

// ---------------------------------------------------------------------------------------------
// Eggs: one per level from level 2. Every fifth level hatches a one-of-a-kind robot.

export const ROBOT_EVERY = 5;
export type EggKind = 'creature' | 'robot';

export function eggForLevel(level: number): EggKind | null {
  if (level < 2) return null;
  return level % ROBOT_EVERY === 0 ? 'robot' : 'creature';
}

/** Eggs earned but not opened yet, oldest first. */
export function pendingEggs(level: number, owned: readonly OwnedCharacter[]): { level: number; kind: EggKind }[] {
  const hatched = new Set(owned.map((o) => o.level));
  const out: { level: number; kind: EggKind }[] = [];
  for (let l = 2; l <= level; l++) if (!hatched.has(l)) out.push({ level: l, kind: eggForLevel(l)! });
  return out;
}

/** Rarity odds (percent) for a creature egg from a given level. Higher levels hatch rarer creatures. */
export function rarityOdds(level: number): Record<CreatureRarity, number> {
  if (level < 5) return { common: 85, rare: 15, epic: 0, legendary: 0 };
  if (level < 10) return { common: 60, rare: 32, epic: 8, legendary: 0 };
  if (level < 20) return { common: 40, rare: 35, epic: 20, legendary: 5 };
  return { common: 25, rare: 35, epic: 28, legendary: 12 };
}

/**
 * Picks a creature the student doesn't have yet. Rarities with nothing left drop out and the odds of
 * the rest scale up. Returns null once the whole crew has been collected (the caller hatches a robot).
 */
export function rollCreature(level: number, owned: readonly OwnedCharacter[], random: () => number): string | null {
  const have = new Set(owned.map((o) => o.id));
  const left = CHARACTERS.filter((c) => !have.has(c.id));
  if (!left.length) return null;
  const odds = rarityOdds(level);
  const tiers = (Object.keys(odds) as CreatureRarity[]).filter((r) => left.some((c) => c.rarity === r));
  // If only zero-odds tiers are left (e.g. a level 3 egg after every common and rare), give them equal odds.
  const weights = tiers.map((r) => odds[r]);
  const total = weights.reduce((a, b) => a + b, 0);
  let pick = random() * (total || tiers.length);
  let rarity = tiers[tiers.length - 1]!;
  for (let i = 0; i < tiers.length; i++) {
    pick -= total ? weights[i]! : 1;
    if (pick < 0) {
      rarity = tiers[i]!;
      break;
    }
  }
  const pool = left.filter((c) => c.rarity === rarity);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!.id;
}

// ---------------------------------------------------------------------------------------------
// Frames, colour themes and titles: unlocked by level (or by a badge).

export interface UnlockDef {
  id: string;
  name: string;
  /** Unlocked at this level… */
  level?: number;
  /** …or by earning this badge. */
  badge?: string;
}

export const FRAMES: readonly UnlockDef[] = [
  { id: 'bronze', name: 'Bronze', level: 3 },
  { id: 'silver', name: 'Silver', level: 6 },
  { id: 'gold', name: 'Gold', level: 10 },
  { id: 'greenstone', name: 'Greenstone', level: 14 },
  { id: 'ocean', name: 'Ocean', level: 18 },
  { id: 'rainbow', name: 'Rainbow', level: 22 },
  { id: 'lava', name: 'Lava', level: 28 },
  { id: 'galaxy', name: 'Galaxy', level: 35 },
  { id: 'fire', name: 'Streak fire', badge: 'streak-7' },
  { id: 'star', name: 'Ace star', badge: 'exam-80' },
];

export const PALETTES: readonly (UnlockDef & { swatch: string })[] = [
  { id: 'ocean', name: 'Ocean', level: 4, swatch: '#0ea5e9' },
  { id: 'forest', name: 'Forest', level: 8, swatch: '#22c55e' },
  { id: 'sunset', name: 'Sunset', level: 12, swatch: '#ec4899' },
  { id: 'lava', name: 'Lava', level: 16, swatch: '#f97316' },
  { id: 'galaxy', name: 'Galaxy', level: 20, swatch: '#8b5cf6' },
  { id: 'midnight', name: 'Midnight', level: 25, swatch: '#6366f1' },
  { id: 'aurora', name: 'Aurora', level: 30, swatch: '#d946ef' },
  { id: 'gold', name: 'Gold', level: 40, swatch: '#f59e0b' },
];

export const TITLES: readonly UnlockDef[] = [
  { id: 'rookie', name: 'Rookie', level: 1 },
  { id: 'problem-solver', name: 'Problem Solver', level: 3 },
  { id: 'number-ninja', name: 'Number Ninja', level: 5 },
  { id: 'pattern-spotter', name: 'Pattern Spotter', level: 7 },
  { id: 'fraction-fighter', name: 'Fraction Fighter', level: 9 },
  { id: 'equation-explorer', name: 'Equation Explorer', level: 11 },
  { id: 'data-detective', name: 'Data Detective', level: 13 },
  { id: 'geometry-guru', name: 'Geometry Guru', level: 15 },
  { id: 'brainstormer', name: 'Brainstormer', level: 18 },
  { id: 'equation-master', name: 'Equation Master', level: 21 },
  { id: 'mastermind', name: 'Mastermind', level: 25 },
  { id: 'professor', name: 'Professor', level: 30 },
  { id: 'legend', name: 'Legend', level: 40 },
  { id: 'grand-wizard', name: 'Grand Wizard', level: 50 },
  { id: 'streak-keeper', name: 'Streak Keeper', badge: 'streak-7' },
  { id: 'unstoppable', name: 'Unstoppable', badge: 'streak-30' },
  { id: 'sharpshooter', name: 'Sharpshooter', badge: 'run-10' },
  { id: 'memory-master', name: 'Memory Master', badge: 'flashcards-100' },
  { id: 'exam-ace', name: 'Exam Ace', badge: 'exam-80' },
  { id: 'top-of-the-class', name: 'Top of the Class', badge: 'topic-exceeding' },
];

export const isUnlocked = (def: UnlockDef, level: number, badges: readonly string[]) =>
  def.level !== undefined ? level >= def.level : !!def.badge && badges.includes(def.badge);

/** How to describe what unlocks something, e.g. "Level 6" or "the Week warrior badge". */
export const unlockHint = (def: UnlockDef, badgeTitle?: (id: string) => string | undefined) =>
  def.level !== undefined ? `Level ${def.level}` : `the ${badgeTitle?.(def.badge!) ?? def.badge} badge`;

export const getFrame = (id: string) => FRAMES.find((f) => f.id === id);
export const getPalette = (id: string) => PALETTES.find((p) => p.id === id);
export const getTitle = (id: string) => TITLES.find((t) => t.id === id);

export interface LevelUnlocks {
  level: number;
  egg: EggKind | null;
  frames: UnlockDef[];
  palettes: UnlockDef[];
  titles: UnlockDef[];
}

/** Everything that unlocks when a student reaches `level`. */
export function unlocksAtLevel(level: number): LevelUnlocks {
  return {
    level,
    egg: eggForLevel(level),
    frames: FRAMES.filter((f) => f.level === level),
    palettes: PALETTES.filter((p) => p.level === level),
    titles: TITLES.filter((t) => t.level === level && level > 1),
  };
}

/** A short list of what a level gives, e.g. ["a mystery egg", "the Silver frame"]. */
export function describeUnlocks(u: LevelUnlocks): string[] {
  return [
    ...(u.egg === 'robot' ? ['a robot egg'] : u.egg ? ['a mystery egg'] : []),
    ...u.frames.map((f) => `the ${f.name} frame`),
    ...u.palettes.map((p) => `the ${p.name} colour theme`),
    ...u.titles.map((t) => `the “${t.name}” title`),
  ];
}

// ---------------------------------------------------------------------------------------------
// Rewards a parent promises for reaching a level ("Level 10 = pick the movie").

export type LevelRewardStatus = 'active' | 'earned' | 'given';

/** students/{uid}/levelRewards/{id} — created by a linked parent; marked earned by Cloud Functions. */
export interface LevelReward {
  level: number;
  reward: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  status: LevelRewardStatus;
  earnedAt?: number;
  givenAt?: number;
}

export const LEVEL_REWARD_MAX_LEVEL = 200;
export const LEVEL_REWARD_MAX_LENGTH = 120;
