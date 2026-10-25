import clsx from 'clsx';
import type { ReactNode } from 'react';

// A thin ratio-against-a-limit bar (e.g. marks per topic, mastery). One validated hue
// (brand-600 passes contrast on both the light and dark surfaces); the track is a lighter
// step of the same ramp. Square at the baseline, 4px rounded at the data end.

export function Meter({ value, max = 100, label, valueText, className }: { value: number; max?: number; label: string; valueText?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className={clsx('h-2.5 w-full overflow-hidden rounded-[2px] bg-brand-100 dark:bg-brand-900/50', className)}
    >
      <div className="h-full rounded-r-[4px] bg-brand-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A labelled meter row: label on the left, value text on the right, bar underneath. */
export function MeterRow({ label, ariaLabel, value, max = 100, valueText, extra }: { label: ReactNode; ariaLabel: string; value: number; max?: number; valueText: string; extra?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
      <div className="min-w-0 text-sm font-semibold">{label}</div>
      <div className="flex items-center gap-2 text-sm text-muted tabular-nums">
        {extra}
        <span>{valueText}</span>
      </div>
      <Meter className="col-span-2" value={value} max={max} label={ariaLabel} valueText={valueText} />
    </div>
  );
}
