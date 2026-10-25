import type { Curriculum } from '@study-helper/shared';
import { Star } from 'lucide-react';
import { useId } from 'react';
import { subjectLabel } from '../../lib/study';
import { Button } from '../ui';

/** Multi-select of curriculum topics, grouped by subject and strand, with select all/none per strand. */
export function TopicPicker({
  curricula,
  selected,
  onChange,
  starred,
  max,
  label = 'Topics',
}: {
  curricula: readonly Curriculum[];
  selected: readonly string[];
  onChange: (ids: string[]) => void;
  /** Topics the student's school teaches (shown with a star). */
  starred?: ReadonlySet<string>;
  max?: number;
  label?: string;
}) {
  const baseId = useId();
  const all = curricula.flatMap((c) => c.topics.map((t) => t.id));
  const sel = new Set(selected);
  const commit = (next: Set<string>) => onChange(all.filter((id) => next.has(id)));
  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(sel);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    commit(next);
  };
  const school = starred ? all.filter((id) => starred.has(id)) : [];
  const count = all.filter((id) => sel.has(id)).length;
  const over = max !== undefined && count > max;

  return (
    <div role="group" aria-labelledby={`${baseId}-label`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span id={`${baseId}-label`} className="text-sm font-semibold">
          {label}
        </span>
        <span className={over ? 'text-sm font-semibold text-bad' : 'text-sm text-muted'} aria-live="polite">
          {count} of {all.length} chosen{max !== undefined && ` (up to ${max})`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => commit(new Set(all))}>
          Select all
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => commit(new Set())}>
          Clear
        </Button>
        {school.length > 0 && (
          <Button type="button" size="sm" variant="secondary" icon={<Star className="size-4" />} onClick={() => commit(new Set(school))}>
            Just my school’s topics
          </Button>
        )}
      </div>

      {curricula.map((c) => (
        <div key={c.id} className="mt-4">
          {curricula.length > 1 && <h3 className="text-base font-bold">{subjectLabel(c.subject)}</h3>}
          {c.strands.map((strand) => {
            const topics = c.topics.filter((t) => t.strandId === strand.id);
            if (!topics.length) return null;
            const ids = topics.map((t) => t.id);
            const n = ids.filter((id) => sel.has(id)).length;
            const headingId = `${baseId}-${c.id}-${strand.id}`;
            return (
              <div key={strand.id} role="group" aria-labelledby={headingId} className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 id={headingId} className="text-sm font-semibold">
                    {strand.title} <span className="font-normal text-muted">({n}/{topics.length})</span>
                  </h4>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setMany(ids, true)} aria-label={`Select all ${strand.title} topics`}>
                      All
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setMany(ids, false)} aria-label={`Select no ${strand.title} topics`}>
                      None
                    </Button>
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {topics.map((t) => (
                    <label
                      key={t.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-950/60"
                    >
                      <input type="checkbox" className="size-5 shrink-0 accent-brand-700" checked={sel.has(t.id)} onChange={(e) => setMany([t.id], e.target.checked)} />
                      <span className="min-w-0 flex-1">{t.title}</span>
                      {starred?.has(t.id) && (
                        <>
                          <Star className="size-4 shrink-0 fill-current text-amber-500" aria-hidden />
                          <span className="sr-only">(school topic)</span>
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
