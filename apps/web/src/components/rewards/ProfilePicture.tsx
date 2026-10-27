import { getCharacter, isRobotId, RARITY_LABELS, rarityOf, robotSeed, type Rarity } from '@study-helper/shared/rewards';
import clsx from 'clsx';
import { robotName, robotSvg } from './robot';

/** Image URL for a character: a file for the NZ crew, generated SVG for robots. */
export function characterSrc(id: string): string | null {
  if (isRobotId(id)) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(robotSvg(robotSeed(id)))}`;
  return getCharacter(id) ? `/characters/${id}.svg` : null;
}

export function characterName(id: string): string {
  return isRobotId(id) ? robotName(robotSeed(id)) : (getCharacter(id)?.name ?? 'Mystery character');
}

const SIZES = {
  xs: { box: 'size-8 text-sm', pad: 'p-0.5' },
  sm: { box: 'size-10 text-base', pad: 'p-[3px]' },
  md: { box: 'size-12 text-lg', pad: 'p-1' },
  lg: { box: 'size-16 text-2xl', pad: 'p-[5px]' },
  xl: { box: 'size-28 text-4xl', pad: 'p-2' },
  '2xl': { box: 'size-40 text-5xl', pad: 'p-2.5' },
} as const;
export type PictureSize = keyof typeof SIZES;

/** A character on its rarity-coloured circle. */
export function CharacterImage({ id, className, silhouette = false }: { id: string; className?: string; silhouette?: boolean }) {
  const src = characterSrc(id);
  return (
    <span className={clsx('flex items-center justify-center overflow-hidden rounded-full', `pf-rarity-${rarityOf(id) ?? 'common'}`, className)}>
      {src && <img src={src} alt="" draggable={false} className={clsx('size-full', silhouette && 'opacity-60 brightness-0 dark:invert')} />}
    </span>
  );
}

/**
 * Someone's profile picture: their chosen character (or their initial) in their chosen frame.
 * Decorative — always put the person's name next to it.
 */
export function ProfilePicture({
  name,
  avatar,
  frame,
  size = 'md',
  className,
}: {
  name: string;
  avatar?: string | null;
  frame?: string | null;
  size?: PictureSize;
  className?: string;
}) {
  const s = SIZES[size];
  const hasPicture = !!avatar && !!characterSrc(avatar);
  return (
    <span aria-hidden="true" className={clsx('inline-flex shrink-0 rounded-full', s.box, frame && [`pf-frame-${frame}`, s.pad], className)}>
      {hasPicture ? (
        <CharacterImage id={avatar} className="size-full" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
          {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
      )}
    </span>
  );
}

const RARITY_BADGE: Record<Rarity, string> = {
  common: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  rare: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  epic: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  legendary: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  unique: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', RARITY_BADGE[rarity], className)}
    >
      {RARITY_LABELS[rarity]}
    </span>
  );
}
