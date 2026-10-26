import { BADGES, type MarkResult } from '@study-helper/shared';
import clsx from 'clsx';
import { CheckCircle2, Flag, MessageCircle, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, type ProgressResult } from '../../lib/api';
import { Markdown } from '../Markdown';
import { Button, Modal, Select, Textarea, useToast } from '../ui';

export function badgeTitle(id: string) {
  const b = BADGES.find((x) => x.id === id);
  return b ? `${b.icon} ${b.title}` : id;
}

/** Shown after an answer is marked. */
export function Feedback({
  mark,
  solution,
  progress,
  questionId,
  tutorLink,
}: {
  mark: MarkResult;
  solution: string;
  progress?: Partial<ProgressResult>;
  questionId: string;
  tutorLink?: string;
}) {
  const partial = !mark.correct && mark.score > 0;
  return (
    <div
      className={clsx(
        'mt-5 rounded-2xl border-2 p-4',
        mark.correct ? 'border-good/40 bg-emerald-50 dark:bg-emerald-950/40' : partial ? 'border-xp/40 bg-amber-50 dark:bg-amber-950/30' : 'border-bad/40 bg-rose-50 dark:bg-rose-950/30',
      )}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        {mark.correct ? <CheckCircle2 className="size-6 text-good" /> : <XCircle className={clsx('size-6', partial ? 'text-xp' : 'text-bad')} />}
        <p className="text-lg font-bold">{mark.correct ? 'Correct!' : partial ? `Partly right — ${mark.marksAwarded}/${mark.marksAvailable}` : 'Not quite'}</p>
        {progress?.xpGained ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
            <Sparkles className="size-4" />+{progress.xpGained} XP
          </span>
        ) : null}
      </div>
      {mark.feedback && <p className="mt-2 font-medium">{mark.feedback}</p>}
      {!mark.correct && mark.expected && (
        <div className="mt-2">
          <span className="font-semibold">Answer: </span>
          <Markdown inline>{mark.expected}</Markdown>
        </div>
      )}
      <details className="mt-3" open={!mark.correct}>
        <summary className="cursor-pointer font-semibold text-brand-800 dark:text-brand-300">Worked solution</summary>
        <Markdown className="mt-2">{solution}</Markdown>
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        {tutorLink && (
          <Link to={tutorLink} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-black/5 dark:text-brand-300">
            <MessageCircle className="size-4" /> Ask the tutor about this
          </Link>
        )}
        <FlagButton questionId={questionId} />
      </div>
      {progress?.newBadges?.length ? <p className="mt-3 font-semibold">New badge: {progress.newBadges.map(badgeTitle).join(', ')} 🎉</p> : null}
      {progress?.goalsAchieved?.length ? <p className="mt-1 font-semibold">Goal achieved: {progress.goalsAchieved.join(', ')} 🏆</p> : null}
    </div>
  );
}

export function FlagButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('wrong-answer');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-black/5">
        <Flag className="size-4" /> Report a problem
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report a problem"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={sending}
              onClick={async () => {
                setSending(true);
                try {
                  await api.flagQuestion({ questionId, reason, ...(comment.trim() && { comment: comment.trim() }) });
                  toast('Thanks — we’ll check that question.', 'good');
                  setOpen(false);
                } catch {
                  toast('Couldn’t send the report. Try again later.', 'bad');
                } finally {
                  setSending(false);
                }
              }}
            >
              Send report
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
            <option value="wrong-answer">The answer is wrong</option>
            <option value="unclear">The question is unclear</option>
            <option value="typo">There’s a typo</option>
            <option value="too-hard">It’s not right for my year level</option>
            <option value="inappropriate">It’s inappropriate</option>
            <option value="other">Something else</option>
          </Select>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What’s wrong? (optional)" maxLength={500} />
        </div>
      </Modal>
    </>
  );
}

/** Self-marking against a rubric for written answers. */
export function SelfMark({
  modelAnswer,
  rubric,
  onSubmit,
  onAiMark,
  aiAvailable,
  busy,
}: {
  modelAnswer?: string;
  rubric: { criterion: string; marks: number }[];
  onSubmit: (marks: number) => void;
  onAiMark?: () => void;
  aiAvailable?: boolean;
  busy?: boolean;
}) {
  const [met, setMet] = useState<boolean[]>(rubric.map(() => false));
  const total = rubric.reduce((s, r, i) => s + (met[i] ? r.marks : 0), 0);
  const max = rubric.reduce((s, r) => s + r.marks, 0);
  return (
    <div className="mt-5 rounded-2xl border-2 border-brand-300/60 bg-brand-50 p-4 dark:bg-brand-950/40">
      <p className="text-lg font-bold">Mark your answer</p>
      <p className="text-sm text-muted">Compare your answer with the model answer and tick each point you made. Be honest — this is how you learn!</p>
      {modelAnswer && (
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="mb-1 text-sm font-semibold text-muted">Model answer</p>
          <Markdown>{modelAnswer}</Markdown>
        </div>
      )}
      <ul className="mt-3 grid grid-cols-1 gap-2">
        {rubric.map((r, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3">
              <input type="checkbox" className="mt-1 size-5 accent-brand-700" checked={met[i]} onChange={(e) => setMet((m) => m.map((x, j) => (j === i ? e.target.checked : x)))} />
              <span className="flex-1">{r.criterion}</span>
              <span className="text-sm font-semibold text-muted">{r.marks}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => onSubmit(total)} loading={busy}>
          Give myself {total}/{max}
        </Button>
        {onAiMark && aiAvailable && (
          <Button variant="secondary" onClick={onAiMark} loading={busy} icon={<Sparkles className="size-4" />}>
            Mark it with AI instead
          </Button>
        )}
      </div>
    </div>
  );
}
