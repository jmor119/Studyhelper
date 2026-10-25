import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, useToast } from '../ui';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure contexts: fall back to a hidden textarea.
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

/** Copies text to the clipboard, with a brief "Copied" confirmation. */
export function CopyButton({ text, label = 'Copy', what, size = 'sm', variant = 'secondary' }: { text: string; label?: string; what?: string; size?: 'sm' | 'md'; variant?: 'secondary' | 'primary' | 'ghost' }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      aria-label={what ? `Copy ${what}` : undefined}
      onClick={async () => {
        if (await copyText(text)) setCopied(true);
        else toast('Couldn’t copy — select the text and copy it yourself.', 'warn');
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}

/** A read-only, selectable code value with a copy button. */
export function CopyField({ value, what, mono = true }: { value: string; what: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <code
        className={`min-w-0 flex-1 overflow-x-auto rounded-xl border border-line bg-canvas px-3 py-2 text-sm whitespace-nowrap ${mono ? 'font-mono' : ''}`}
        aria-label={what}
      >
        {value}
      </code>
      <CopyButton text={value} what={what} />
    </div>
  );
}
