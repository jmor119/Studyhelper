import { KeyRound, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { ButtonLink, Notice } from '../ui';

// Shared AI helpers for the tutor, homework help and notes pages.

export type AiStatus = Awaited<ReturnType<typeof api.getAiStatus>>;

/** The current user's AI availability. `status` is null while loading or if the check failed. */
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api
      .getAiStatus({})
      .then((s) => {
        setStatus(s);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const ready = !!status?.available && status.budgetLeft;
  return { status, loading, failed, ready, reload: load };
}

/** Explains why AI features can't be used right now (no key, or the monthly budget is spent). */
export function AiUnavailable({ status, feature = 'The AI tutor' }: { status: AiStatus | null; feature?: string }) {
  if (!status) return null;
  if (!status.available) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-100 p-2.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">AI isn’t set up yet</h2>
            <p className="mt-1 text-muted">
              {feature} needs an AI key. Ask a parent to add one in <b className="text-ink">Settings → AI</b> — once it’s there, you can use it straight away.
              If you have your own key, you can add it there too.
            </p>
            <ButtonLink to="/settings#ai" variant="secondary" size="sm" className="mt-3">
              Open Settings
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }
  if (!status.budgetLeft) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-rose-100 p-2.5 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
            <WalletCards className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">This month’s AI budget is used up</h2>
            <p className="mt-1 text-muted">
              {status.fromOwnName
                ? `You’ve spent US$${status.spentUsd.toFixed(2)} of your US$${status.limitUsd.toFixed(2)} monthly limit. You can raise it in Settings → AI.`
                : `${status.ownerName}’s monthly limit of US$${status.limitUsd.toFixed(2)} has been reached. Ask them to raise it in Settings → AI, or wait until next month.`}
            </p>
            {status.fromOwnName && (
              <ButtonLink to="/settings#ai" variant="secondary" size="sm" className="mt-3">
                Open Settings
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export interface AiErrorView {
  title: string;
  message: string;
  tone: 'bad' | 'warn';
}

/** Turns a callable error into a clear title + message (budget, limits, missing key). */
export function aiError(e: unknown): AiErrorView {
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  const message = errorMessage(e);
  if (code.endsWith('resource-exhausted')) {
    return /budget/i.test(message)
      ? { title: 'Monthly AI budget used up', message, tone: 'warn' }
      : { title: 'Time for a short break', message, tone: 'warn' };
  }
  if (code.endsWith('failed-precondition') && /key/i.test(message)) return { title: 'AI isn’t set up yet', message, tone: 'warn' };
  if (code.endsWith('deadline-exceeded')) return { title: 'That took too long', message: 'The AI didn’t answer in time. Please try again.', tone: 'bad' };
  if (code.endsWith('unavailable') || code.endsWith('internal')) {
    return { title: 'Something went wrong', message: 'We couldn’t reach the AI just now. Check your internet connection and try again.', tone: 'bad' };
  }
  return { title: 'Something went wrong', message, tone: 'bad' };
}

export function AiErrorNotice({ error, className }: { error: AiErrorView; className?: string }) {
  return (
    <Notice tone={error.tone} title={error.title} className={className}>
      {error.message}
    </Notice>
  );
}

/** "claude-opus-5-5" → "Claude Opus 5.5", "gpt-5.1-mini" → "GPT-5.1 mini". */
export function modelLabel(id: string): string {
  const claude = id.match(/^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-(\d{8}|latest))?$/);
  if (claude) {
    const [, family, major, minor] = claude;
    return `Claude ${family![0]!.toUpperCase()}${family!.slice(1)} ${major}${minor ? `.${minor}` : ''}`;
  }
  if (id.startsWith('gpt-')) return `GPT-${id.slice(4).replace(/-/g, ' ')}`;
  return id;
}
