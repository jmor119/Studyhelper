import clsx from 'clsx';
import type { ReactNode } from 'react';

// Chip-style radio and checkbox groups built on native inputs, so arrow keys, Space and
// screen readers behave as expected. Each chip is at least 44px tall for tablets.

const chip = (checked: boolean) =>
  clsx(
    'relative inline-flex min-h-11 cursor-pointer select-none items-center justify-center rounded-xl border-2 px-4 text-sm font-semibold transition-colors',
    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface',
    checked
      ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200'
      : 'border-line bg-surface text-ink hover:border-brand-300',
  );

export function ChoiceGroup<T extends string | number>({
  name,
  label,
  hint,
  value,
  onChange,
  options,
  className,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className={chip(o.value === value)}>
            <input type="radio" name={name} className="sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

export function ToggleChips<T extends string | number>({
  label,
  hint,
  values,
  onChange,
  options,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  values: readonly T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: ReactNode; ariaLabel?: string }[];
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = values.includes(o.value);
          return (
            <label key={String(o.value)} className={clsx(chip(checked), 'min-w-11 px-3')}>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                aria-label={o.ariaLabel}
                onChange={() => onChange(checked ? values.filter((v) => v !== o.value) : [...values, o.value])}
              />
              {o.label}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}
