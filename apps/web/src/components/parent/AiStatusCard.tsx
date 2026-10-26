import { BookOpenCheck, Camera, MessageCircle, PenLine, Settings, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Badge, ButtonLink, Card, Notice, ProgressBar } from '../ui';
import { CardTitle } from './bits';

type AiStatus = Awaited<ReturnType<typeof api.getAiStatus>>;

const PROVIDERS: Record<string, string> = { anthropic: 'Anthropic (Claude)', openai: 'OpenAI' };
const usd = (n: number) => `US$${n.toFixed(2)}`;

const FEATURES = [
  { icon: <MessageCircle className="size-4" />, text: 'An AI tutor that coaches with questions and hints rather than handing over answers.' },
  { icon: <Camera className="size-4" />, text: 'Homework help from a photo or PDF — it explains the ideas but won’t do graded work for them.' },
  { icon: <PenLine className="size-4" />, text: 'Marking of written answers, with feedback on what to add.' },
  { icon: <BookOpenCheck className="size-4" />, text: 'Fresh practice questions when a topic runs low. They’re checked and shared with every family.' },
];

export function AiStatusCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getAiStatus({})
      .then(setStatus)
      .catch(() => setFailed(true));
  }, []);

  const ready = status?.available === true;
  return (
    <Card as="section">
      <CardTitle
        icon={<Sparkles className="size-5 text-xp" aria-hidden="true" />}
        action={status ? <Badge tone={ready ? 'good' : 'neutral'}>{ready ? 'Set up' : 'Not set up'}</Badge> : undefined}
      >
        AI features
      </CardTitle>

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          {failed ? (
            <p className="text-sm text-muted">We couldn’t check your AI set-up just now.</p>
          ) : !status ? (
            <p className="text-sm text-muted" role="status">
              Checking…
            </p>
          ) : status.available ? (
            <div className="grid grid-cols-1 gap-3">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted">Key</dt>
                <dd className="font-semibold">
                  {PROVIDERS[status.provider] ?? status.provider}
                  {!status.fromOwnName && <span className="font-normal text-muted"> · shared by {status.ownerName}</span>}
                </dd>
                <dt className="text-muted">Model</dt>
                <dd className="font-semibold break-all">{status.model}</dd>
              </dl>
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">This month’s spend</span>
                  <span className="text-muted">
                    {usd(status.spentUsd)} of {usd(status.limitUsd)}
                  </span>
                </div>
                <div aria-hidden="true">
                  <ProgressBar className="mt-1.5" value={status.spentUsd} max={status.limitUsd} />
                </div>
                <p className="mt-1 text-xs text-muted">Charged by the AI provider to your key, in US dollars. The limit stops spending once it’s reached.</p>
              </div>
              {!status.budgetLeft && (
                <Notice tone="warn" title="Monthly limit reached">
                  AI features are paused until next month, unless you raise the limit in Settings.
                </Notice>
              )}
            </div>
          ) : (
            <p className="text-sm">
              Add an Anthropic or OpenAI API key in Settings to switch these on. Your key is encrypted, only ever used on our server, and never shown in the
              browser. Your children use it through your account, within a monthly limit you set.
            </p>
          )}
          <ButtonLink to="/settings" variant={ready ? 'secondary' : 'primary'} size="sm" className="mt-4" icon={<Settings className="size-4" />}>
            {ready ? 'Manage AI in Settings' : 'Set up AI in Settings'}
          </ButtonLink>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">What AI adds</p>
          <ul className="mt-2 grid grid-cols-1 gap-2 text-sm">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="text-muted">{f.text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Everything else — lessons, practice, worked solutions, mock exams and flashcards — works without AI.</p>
        </div>
      </div>
    </Card>
  );
}
