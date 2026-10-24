import {
  createRng,
  hashString,
  parseExpression,
  parseNumber,
  type PublicQuestion,
  type QuestionResponse,
} from '@study-helper/shared';
import clsx from 'clsx';
import katex from 'katex';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import { Children, cloneElement, isValidElement, useMemo, useRef, type ReactNode } from 'react';
import { Figure, Markdown } from '../Markdown';
import { Badge } from '../ui';

export interface QuestionResultView {
  correct: boolean;
  details?: Record<string, boolean>;
  /** Human-readable correct answer (used to highlight the right MCQ option). */
  expected?: string;
}

export function emptyResponse(q: PublicQuestion): QuestionResponse {
  switch (q.type) {
    case 'mcq':
      return { type: 'mcq', optionId: '' };
    case 'multi':
      return { type: 'multi', optionIds: [] };
    case 'cloze':
      return { type: 'cloze', values: {} };
    case 'order':
      return { type: 'order', order: q.items.map((i) => i.id) };
    case 'match':
      return { type: 'match', pairs: {} };
    default:
      return { type: q.type, value: '' } as QuestionResponse;
  }
}

export function isAnswered(q: PublicQuestion, r: QuestionResponse | null | undefined): boolean {
  if (!r) return false;
  switch (r.type) {
    case 'mcq':
      return !!r.optionId;
    case 'multi':
      return r.optionIds.length > 0;
    case 'cloze':
      return q.type === 'cloze' && q.blanks.every((b) => (r.values[b.id] ?? '').trim() !== '');
    case 'order':
      return true;
    case 'match':
      return q.type === 'match' && q.left.every((l) => !!r.pairs[l.id]);
    default:
      return r.value.trim() !== '';
  }
}

const difficultyLabel = ['', 'Warm-up', 'Core', 'Standard', 'Harder', 'Challenge'];

export function QuestionMeta({ q }: { q: PublicQuestion }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Badge tone="brand">{difficultyLabel[q.difficulty] ?? `Level ${q.difficulty}`}</Badge>
      <Badge>
        {q.marks} mark{q.marks === 1 ? '' : 's'}
      </Badge>
      {q.calculator === 'not-allowed' && <Badge tone="warn">No calculator</Badge>}
      {q.calculator === 'allowed' && <Badge tone="info">Calculator allowed</Badge>}
      {q.status === 'unverified' && <Badge tone="warn">New question</Badge>}
      {q.status === 'pending' && <Badge tone="warn">Family question (unreviewed)</Badge>}
    </div>
  );
}

function useShuffled<T extends { id: string }>(items: T[], key: string, shuffle: boolean): T[] {
  return useMemo(() => (shuffle ? createRng(hashString(key)).shuffle(items) : items), [items, key, shuffle]);
}

/** Converts what the student typed into LaTeX for a live preview. */
function previewTex(q: PublicQuestion, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    if (q.type === 'expression') return parseExpression(v, q.variables).node.toTex({ implicit: 'hide', parenthesis: 'auto' });
    if (q.type === 'numeric') {
      const p = parseNumber(v);
      if (!p.ok) return null;
      if (p.fraction) {
        const f = `\\frac{${p.fraction.num}}{${p.fraction.den}}`;
        return `${p.fraction.negative ? '-' : ''}${p.fraction.whole ? p.fraction.whole : ''}${f}`;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

function Tex({ tex }: { tex: string }) {
  return <span dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false, trust: false }) }} />;
}

const SYMBOLS: Record<'numeric' | 'expression', string[]> = {
  numeric: ['−', '/', '.', '%'],
  expression: ['^', '²', '(', ')', '/', '√(', '−'],
};

function MathInput({ q, value, onChange, disabled, onSubmit, units }: { q: PublicQuestion; value: string; onChange: (v: string) => void; disabled?: boolean; onSubmit?: () => void; units?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = (sym: string) => {
    const el = ref.current;
    const text = sym === '−' ? '-' : sym;
    if (!el) return onChange(value + text);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };
  const tex = previewTex(q, value);
  const kind = q.type === 'expression' ? 'expression' : 'numeric';
  return (
    <div>
      <div className="flex items-center gap-2">
        {units === '$' && <span className="text-lg font-semibold text-muted">$</span>}
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
          inputMode={kind === 'numeric' ? 'decimal' : 'text'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={kind === 'numeric' ? 'Your answer, e.g. 12.5 or 3/4' : 'e.g. 3x + 6'}
          aria-label="Your answer"
          className="w-full max-w-sm rounded-xl border border-line bg-surface px-3 py-3 font-mono text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        {units && units !== '$' && <span className="text-lg font-semibold text-muted">{units}</span>}
      </div>
      {!disabled && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Maths symbols">
          {SYMBOLS[kind].map((s) => (
            <button key={s} type="button" onClick={() => insert(s)} className="h-9 min-w-10 rounded-lg border border-line bg-surface px-2 font-mono text-sm hover:bg-black/5 dark:hover:bg-white/10">
              {s}
            </button>
          ))}
        </div>
      )}
      {tex && (
        <p className="mt-2 text-sm text-muted">
          Reads as: <Tex tex={tex} />
        </p>
      )}
      {q.type === 'numeric' && q.decimals !== undefined && <p className="mt-1 text-xs text-muted">Round to {q.decimals} decimal place{q.decimals === 1 ? '' : 's'}.</p>}
      {q.type === 'expression' && q.form !== 'any' && <p className="mt-1 text-xs text-muted">Give your answer in {q.form} form.</p>}
    </div>
  );
}

/** Replaces [[id]] markers in rendered markdown with inputs (cloze questions). */
function injectBlanks(node: ReactNode, render: (id: string) => ReactNode): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === 'string') {
      const parts = child.split(/(\[\[[a-z0-9]+\]\])/g);
      if (parts.length === 1) return child;
      return parts.map((p, i) => {
        const m = p.match(/^\[\[([a-z0-9]+)\]\]$/);
        return m ? <span key={i}>{render(m[1]!)}</span> : p;
      });
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(child, undefined, injectBlanks(child.props.children, render));
    }
    return child;
  });
}

export interface QuestionViewProps {
  question: PublicQuestion;
  value: QuestionResponse;
  onChange: (r: QuestionResponse) => void;
  disabled?: boolean;
  result?: QuestionResultView | null;
  onSubmit?: () => void;
  hideMeta?: boolean;
}

export function QuestionView({ question: q, value, onChange, disabled, result, onSubmit, hideMeta }: QuestionViewProps) {
  const opts = 'options' in q ? q.options : [];
  const shuffledOptions = useShuffled(opts, q.id, 'shuffle' in q ? q.shuffle : false);
  const details = result?.details;

  const blankInput = (id: string) => {
    if (q.type !== 'cloze' || value.type !== 'cloze') return null;
    const blank = q.blanks.find((b) => b.id === id);
    const v = value.values[id] ?? '';
    const state = details?.[id];
    const cls = clsx(
      'mx-1 inline-block rounded-lg border px-2 py-1 align-baseline text-base',
      state === true && 'border-good bg-emerald-50 dark:bg-emerald-950',
      state === false && 'border-bad bg-rose-50 dark:bg-rose-950',
      state === undefined && 'border-line bg-surface',
    );
    const set = (nv: string) => onChange({ type: 'cloze', values: { ...value.values, [id]: nv } });
    if (blank?.options) {
      return (
        <select aria-label={`Blank ${id}`} className={cls} value={v} disabled={disabled} onChange={(e) => set(e.target.value)}>
          <option value="">…</option>
          {blank.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return <input aria-label={`Blank ${id}`} className={clsx(cls, 'w-36')} value={v} disabled={disabled} onChange={(e) => set(e.target.value)} />;
  };

  return (
    <div>
      {!hideMeta && <QuestionMeta q={q} />}
      {q.stem && <Markdown className="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">{q.stem}</Markdown>}
      <div className="text-lg">
        {q.part && <span className="mr-2 font-bold">({q.part})</span>}
        {q.type === 'cloze' ? (
          <Markdown
            components={{
              p: ({ children }) => <p>{injectBlanks(children, blankInput)}</p>,
              li: ({ children }) => <li>{injectBlanks(children, blankInput)}</li>,
              td: ({ children }) => <td>{injectBlanks(children, blankInput)}</td>,
            }}
          >
            {q.prompt}
          </Markdown>
        ) : (
          <Markdown>{q.prompt}</Markdown>
        )}
      </div>
      {q.figure && <Figure {...q.figure} />}

      <div className="mt-4">
        {q.type === 'mcq' && value.type === 'mcq' && (
          <div className="grid gap-2" role="radiogroup">
            {shuffledOptions.map((o) => {
              const selected = value.optionId === o.id;
              const isRight = result && result.expected !== undefined && o.text === result.expected;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() => onChange({ type: 'mcq', optionId: o.id })}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors',
                    !result && selected && 'border-brand-600 bg-brand-50 dark:bg-brand-950',
                    !result && !selected && 'border-line bg-surface hover:border-brand-300',
                    result && isRight && 'border-good bg-emerald-50 dark:bg-emerald-950',
                    result && selected && !isRight && 'border-bad bg-rose-50 dark:bg-rose-950',
                    result && !selected && !isRight && 'border-line opacity-70',
                  )}
                >
                  <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-line')}>
                    {result && isRight ? <Check className="size-4" /> : result && selected ? <X className="size-4" /> : null}
                  </span>
                  <Markdown inline className="min-w-0 flex-1">
                    {o.text}
                  </Markdown>
                </button>
              );
            })}
          </div>
        )}

        {q.type === 'multi' && value.type === 'multi' && (
          <div className="grid gap-2">
            <p className="text-sm font-medium text-muted">Select {q.selectCount === 1 ? 'one answer' : `${q.selectCount} answers`}.</p>
            {shuffledOptions.map((o) => {
              const selected = value.optionIds.includes(o.id);
              const state = details?.[o.id];
              return (
                <button
                  key={o.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  disabled={disabled}
                  onClick={() =>
                    onChange({ type: 'multi', optionIds: selected ? value.optionIds.filter((x) => x !== o.id) : [...value.optionIds, o.id] })
                  }
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left',
                    state === true && 'border-good bg-emerald-50 dark:bg-emerald-950',
                    state === false && 'border-bad bg-rose-50 dark:bg-rose-950',
                    state === undefined && selected && 'border-brand-600 bg-brand-50 dark:bg-brand-950',
                    state === undefined && !selected && 'border-line bg-surface hover:border-brand-300',
                  )}
                >
                  <span className={clsx('flex size-6 shrink-0 items-center justify-center rounded-md border-2', selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-line')}>
                    {selected && <Check className="size-4" />}
                  </span>
                  <Markdown inline className="min-w-0 flex-1">
                    {o.text}
                  </Markdown>
                </button>
              );
            })}
          </div>
        )}

        {(q.type === 'numeric' || q.type === 'expression') && (value.type === 'numeric' || value.type === 'expression') && (
          <MathInput q={q} value={value.value} disabled={disabled} onSubmit={onSubmit} units={q.type === 'numeric' ? q.units : undefined} onChange={(v) => onChange({ type: q.type, value: v } as QuestionResponse)} />
        )}

        {q.type === 'text' && value.type === 'text' && (
          <input
            value={value.value}
            disabled={disabled}
            onChange={(e) => onChange({ type: 'text', value: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            placeholder="Your answer"
            aria-label="Your answer"
            className="w-full max-w-md rounded-xl border border-line bg-surface px-3 py-3 text-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        )}

        {q.type === 'order' && value.type === 'order' && (
          <ol className="grid gap-2">
            {value.order.map((id, i) => {
              const item = q.items.find((x) => x.id === id);
              const state = details?.[q.items.find((x) => x.id === id)?.id ?? ''];
              const move = (dir: -1 | 1) => {
                const next = [...value.order];
                const j = i + dir;
                if (j < 0 || j >= next.length) return;
                [next[i], next[j]] = [next[j]!, next[i]!];
                onChange({ type: 'order', order: next });
              };
              return (
                <li key={id} className={clsx('flex items-center gap-2 rounded-xl border-2 bg-surface px-3 py-2', state === true ? 'border-good' : state === false ? 'border-bad' : 'border-line')}>
                  <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                  <Markdown inline className="min-w-0 flex-1">
                    {item?.text ?? id}
                  </Markdown>
                  {!disabled && (
                    <span className="flex gap-1">
                      <button type="button" aria-label="Move up" onClick={() => move(-1)} disabled={i === 0} className="rounded-lg border border-line p-1.5 disabled:opacity-30">
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" aria-label="Move down" onClick={() => move(1)} disabled={i === value.order.length - 1} className="rounded-lg border border-line p-1.5 disabled:opacity-30">
                        <ArrowDown className="size-4" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {q.type === 'match' && value.type === 'match' && (
          <div className="grid gap-2">
            {q.left.map((l) => {
              const state = details?.[l.id];
              return (
                <div key={l.id} className={clsx('grid items-center gap-2 rounded-xl border-2 bg-surface p-3 sm:grid-cols-2', state === true ? 'border-good' : state === false ? 'border-bad' : 'border-line')}>
                  <Markdown inline className="font-semibold">
                    {l.text}
                  </Markdown>
                  <select
                    aria-label={`Match for ${l.text}`}
                    value={value.pairs[l.id] ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange({ type: 'match', pairs: { ...value.pairs, [l.id]: e.target.value } })}
                    className="w-full rounded-lg border border-line bg-surface px-2 py-2"
                  >
                    <option value="">Choose…</option>
                    {q.right.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.text.replace(/\$/g, '')}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'extended' && value.type === 'extended' && (
          <div>
            <textarea
              value={value.value}
              disabled={disabled}
              onChange={(e) => onChange({ type: 'extended', value: e.target.value })}
              placeholder="Write your answer in full sentences."
              aria-label="Your answer"
              className="min-h-40 w-full rounded-xl border border-line bg-surface px-3 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="mt-1 text-xs text-muted">{value.value.trim() ? value.value.trim().split(/\s+/).length : 0} words</p>
          </div>
        )}
      </div>
    </div>
  );
}
