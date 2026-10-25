import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../ui';

/** A headline number: label, value, optional supporting line. */
export function StatTile({ icon, label, value, sub, className }: { icon?: ReactNode; label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm', className)}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure contexts.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', size = 'sm', variant = 'secondary' }: { text: string; label?: string; copiedLabel?: string; size?: 'sm' | 'md'; variant?: 'secondary' | 'primary' | 'ghost' }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        icon={state === 'copied' ? <Check className="size-4" /> : <Copy className="size-4" />}
        onClick={async () => setState((await copyText(text)) ? 'copied' : 'failed')}
      >
        {state === 'copied' ? copiedLabel : state === 'failed' ? 'Couldn’t copy' : label}
      </Button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to the clipboard' : ''}
      </span>
    </>
  );
}

/** A small section heading used inside cards. */
export function CardTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 font-bold">
        {icon}
        <span className="min-w-0">{children}</span>
      </h2>
      {action}
    </div>
  );
}

/** Text-styled button for "See all" style links that switch tabs. */
export function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
      {children}
    </button>
  );
}
