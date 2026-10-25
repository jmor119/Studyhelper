import { addDays, formatDateKey, nzDateKey, weekday, type AttemptRecord } from '@study-helper/shared';
import { useId, useMemo, type ReactElement } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type BarShapeProps, type TooltipContentProps } from 'recharts';
import { percent, plural } from './format';

// 14-day activity: one stacked column per NZ day. Total height = questions answered;
// the lower segment is the correct answers. Colours (validated with the dataviz palette checker,
// light surface #ffffff and dark surface #0f172a — all checks pass):
//   correct     #0d9488 (light and dark)
//   not correct #6250d6 light / #9085e9 dark

export interface DayActivity {
  date: string;
  label: string;
  answered: number;
  correct: number;
  other: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildDays(attempts: Pick<AttemptRecord, 'createdAt' | 'correct'>[], today: string, count = 14): DayActivity[] {
  const days: DayActivity[] = [];
  const index = new Map<string, DayActivity>();
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const d: DayActivity = { date, label: `${WEEKDAYS[weekday(date)]} ${Number(date.slice(8))}`, answered: 0, correct: 0, other: 0 };
    days.push(d);
    index.set(date, d);
  }
  for (const a of attempts) {
    const d = index.get(nzDateKey(a.createdAt));
    if (!d) continue;
    d.answered++;
    if (a.correct) d.correct++;
    else d.other++;
  }
  return days;
}

/** Path for a rectangle with rounded top corners (data end) and a square base. */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
}

const GAP = 2; // surface gap between stacked segments

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const d = payload?.[0]?.payload as DayActivity | undefined;
  if (!active || !d) return null;
  const acc = percent(d.correct, d.answered);
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg">
      <p className="text-xs font-semibold text-muted">{formatDateKey(d.date)}</p>
      <p className="mt-0.5">
        <strong className="text-base">{d.answered}</strong> <span className="text-muted">answered</span>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full bg-(--viz-correct)" aria-hidden="true" />
        <strong>{d.correct}</strong> <span className="text-muted">correct</span>
      </p>
      <p className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full bg-(--viz-other)" aria-hidden="true" />
        <strong>{d.other}</strong> <span className="text-muted">not correct</span>
      </p>
      {acc !== null && <p className="mt-0.5 text-xs text-muted">{acc}% correct</p>}
    </div>
  );
}

export function ActivityChart({ days }: { days: DayActivity[] }) {
  const titleId = useId();
  const totals = useMemo(() => {
    const answered = days.reduce((s, d) => s + d.answered, 0);
    const correct = days.reduce((s, d) => s + d.correct, 0);
    const activeDays = days.filter((d) => d.answered > 0).length;
    const peak = days.reduce<DayActivity | null>((best, d) => (d.answered > (best?.answered ?? 0) ? d : best), null);
    return { answered, correct, activeDays, peak };
  }, [days]);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Custom segment shape: 4px rounded data end on whichever segment is on top, square base,
  // and a 2px surface gap between the two segments. The busiest day gets its total on the cap.
  const segment =
    (kind: 'correct' | 'other') =>
    (props: BarShapeProps): ReactElement => {
      const { x, y, width, height } = props;
      const d = props.payload as DayActivity | undefined;
      if (!d || !height || height <= 0) return <g />;
      const isTop = kind === 'other' || d.other === 0;
      const gap = kind === 'other' && d.correct > 0 ? GAP : 0;
      const h = Math.max(0, height - gap);
      const r = isTop ? Math.min(4, h, width / 2) : 0;
      const labelHere = isTop && totals.peak?.date === d.date;
      return (
        <g>
          <path d={topRoundedRect(x, y, width, h, r)} fill={kind === 'correct' ? 'var(--viz-correct)' : 'var(--viz-other)'} />
          {labelHere && (
            <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-ink)">
              {d.answered}
            </text>
          )}
        </g>
      );
    };

  const accuracy = percent(totals.correct, totals.answered);
  return (
    <figure aria-labelledby={titleId} className="[--viz-correct:#0d9488] [--viz-other:#6250d6] dark:[--viz-other:#9085e9]">
      <figcaption id={titleId} className="text-sm text-muted">
        {totals.answered
          ? `${plural(totals.answered, 'question')} answered, ${totals.correct} correct${accuracy !== null ? ` (${accuracy}%)` : ''}, on ${plural(totals.activeDays, 'day')} out of ${days.length}.`
          : `No questions answered in the last ${days.length} days.`}
      </figcaption>

      {totals.answered > 0 && (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legend">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-(--viz-correct)" aria-hidden="true" /> Correct
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-(--viz-other)" aria-hidden="true" /> Not correct (incl. partly right)
            </li>
          </ul>

          <div className="mt-2 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 20, right: 4, bottom: 0, left: -12 }} barCategoryGap="20%" accessibilityLayer title="Questions answered per day">
                <CartesianGrid vertical={false} stroke="var(--color-line)" strokeWidth={1} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-line)' }}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={6}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} width={40} />
                <Tooltip
                  content={(p) => <ChartTooltip {...p} />}
                  cursor={{ fill: 'var(--color-ink)', fillOpacity: 0.06 }}
                  isAnimationActive={false}
                />
                <Bar dataKey="correct" name="Correct" stackId="day" maxBarSize={24} shape={segment('correct')} isAnimationActive={!reduceMotion} />
                <Bar dataKey="other" name="Not correct" stackId="day" maxBarSize={24} shape={segment('other')} isAnimationActive={!reduceMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="mt-2 text-sm">
            <summary className="cursor-pointer font-semibold text-brand-700 dark:text-brand-300">Show as a table</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[18rem] text-left tabular-nums">
                <caption className="sr-only">Questions answered and correct per day, last {days.length} days</caption>
                <thead className="text-muted">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-1.5 pr-3 font-semibold">
                      Day
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                      Answered
                    </th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                      Correct
                    </th>
                    <th scope="col" className="py-1.5 text-right font-semibold">
                      Accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => {
                    const acc = percent(d.correct, d.answered);
                    return (
                      <tr key={d.date} className="border-b border-line last:border-0">
                        <th scope="row" className="py-1.5 pr-3 font-normal">
                          {formatDateKey(d.date)}
                        </th>
                        <td className="py-1.5 pr-3 text-right">{d.answered}</td>
                        <td className="py-1.5 pr-3 text-right">{d.correct}</td>
                        <td className="py-1.5 text-right">{acc === null ? '–' : `${acc}%`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </figure>
  );
}
