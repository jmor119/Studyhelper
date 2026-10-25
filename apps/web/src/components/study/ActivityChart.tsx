import { formatDateKey } from '@study-helper/shared';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { plural } from './format';

// Questions answered per NZ day — one series, so no legend box: the card title names it.
// Colour: brand-600 (#0d9488), validated with the dataviz palette checker against both the light
// (#ffffff) and dark (#0f172a) surfaces. Gridlines/axes use the recessive line/muted tokens, so
// light and dark mode follow the app theme. Every value is also in the table view.

export interface ActivityDay {
  /** NZ date key, YYYY-MM-DD */
  date: string;
  answered: number;
  correct: number;
}

const SERIES = 'var(--color-brand-600)';
const SERIES_HOVER = 'var(--color-brand-500)';

const shortFmt = new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', day: 'numeric', month: 'short' });
function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return shortFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

function ActivityTooltip({ active, payload }: TooltipContentProps) {
  const day = payload?.[0]?.payload as ActivityDay | undefined;
  if (!active || !day) return null;
  const pct = day.answered ? Math.round((day.correct / day.answered) * 100) : 0;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded-full" style={{ background: SERIES }} aria-hidden />
        <span className="font-bold">{plural(day.answered, 'question')}</span>
      </div>
      {day.answered > 0 && (
        <p className="text-muted">
          {day.correct} correct ({pct}%)
        </p>
      )}
      <p className="text-xs text-muted">{formatDateKey(day.date)}</p>
    </div>
  );
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function ActivityChart({ days, label }: { days: ActivityDay[]; label: string }) {
  // Direct-label only the busiest day; the axis, tooltip and table carry the rest.
  const peak = days.reduce((best, d, i) => (d.answered > (days[best]?.answered ?? -1) ? i : best), 0);
  const peakValue = days[peak]?.answered ?? 0;
  return (
    // Fixed height includes the x-axis band, so the card never gets a nested scroll.
    <div className="h-64 w-full" role="figure" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 22, right: 4, bottom: 0, left: 0 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-line)' }}
            tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} width={32} />
          <Tooltip cursor={{ fill: 'var(--color-line)', fillOpacity: 0.6 }} content={ActivityTooltip} isAnimationActive={false} />
          <Bar
            dataKey="answered"
            name="Questions answered"
            fill={SERIES}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            activeBar={{ fill: SERIES_HOVER }}
            isAnimationActive={!prefersReducedMotion()}
          >
            {peakValue > 0 && (
              <LabelList position="top" valueAccessor={(_entry: unknown, i: number) => (i === peak ? peakValue : '')} fill="var(--color-ink)" fontSize={12} fontWeight={600} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActivityTable({ days }: { days: ActivityDay[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Questions answered each day, newest first</caption>
        <thead>
          <tr className="text-left text-muted">
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
          {[...days].reverse().map((d) => (
            <tr key={d.date} className="border-t border-line">
              <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                {formatDateKey(d.date)}
              </th>
              <td className="py-1.5 pr-3 text-right">{d.answered}</td>
              <td className="py-1.5 pr-3 text-right">{d.correct}</td>
              <td className="py-1.5 text-right text-muted">{d.answered ? `${Math.round((d.correct / d.answered) * 100)}%` : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
