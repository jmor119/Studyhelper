import { Check, Eye, GraduationCap, Lightbulb, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { AiErrorNotice, AiUnavailable, aiError, useAiStatus, type AiErrorView } from '../../components/assist/ai';
import { sendTutor } from '../../components/assist/tutorStream';
import { UploadPicker, uploadPrepared, useUploadItems } from '../../components/assist/uploads';
import { Button, Card, Field, PageHeader, Spinner, Textarea } from '../../components/ui';
import { useUser } from '../../lib/auth';

const MAX_FILES = 3;

const helps = [
  'Explain what the task is asking, in plain words',
  'Break it into smaller steps you can tackle',
  'Give you hints and ask questions that point you the right way',
  'Check your working and show you where it went wrong',
  'Explain the ideas using a similar example',
];
const wonts = ['Give you the final answers', 'Write any part of your assignment for you', 'Do tests or graded work on your behalf'];

export default function HomeworkHelp() {
  const { user } = useUser();
  const navigate = useNavigate();
  const ai = useAiStatus();
  const files = useUploadItems();
  const [message, setMessage] = useState('');
  const [stage, setStage] = useState<'idle' | 'uploading' | 'starting'>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<AiErrorView | null>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const busy = stage !== 'idle';
  const canSubmit = files.items.length > 0 && message.trim().length > 0 && !busy && (ai.ready || ai.failed);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setStage('uploading');
    let paths: string[];
    try {
      paths = await uploadPrepared(user.uid, files.items, (done, total) => setProgress({ done, total }));
    } catch {
      setError({ title: 'Upload failed', message: 'We couldn’t upload your files. Check your internet connection and try again.', tone: 'bad' });
      setStage('idle');
      return;
    }
    setStage('starting');
    const { done } = sendTutor(
      { mode: 'assignment', message: message.trim(), attachments: paths },
      { baseCount: 0, onChatId: (id) => mounted.current && navigate(`/tutor/${id}`) },
    );
    done.catch((err) => {
      if (!mounted.current) return;
      setError(aiError(err));
      setStage('idle');
    });
  };

  return (
    <div>
      <PageHeader title="Homework help" subtitle="Stuck on an assignment? Share it and the tutor will help you work it out yourself." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {ai.loading ? (
            <Spinner />
          ) : ai.status && !ai.ready ? (
            <AiUnavailable status={ai.status} feature="Homework help" />
          ) : (
            <Card as="section">
              <form onSubmit={submit} className="grid grid-cols-1 gap-5">
                <div>
                  <h2 className="mb-2 font-bold">1. Add your assignment</h2>
                  <UploadPicker state={files} max={MAX_FILES} disabled={busy} label="Photos or PDFs of the task (and your working, if you have some)" />
                </div>
                <div>
                  <h2 className="mb-2 font-bold">2. Tell the tutor what you need</h2>
                  <Field label="What do you need help with?" hint="e.g. “I don’t get what question 3 is asking” or “Can you check my working for part (b)?”">
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} disabled={busy} required />
                  </Field>
                </div>
                {error && <AiErrorNotice error={error} />}
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" size="lg" loading={busy} disabled={!canSubmit} icon={<GraduationCap className="size-5" />}>
                    Get help
                  </Button>
                  <p className="text-sm text-muted" role="status">
                    {stage === 'uploading'
                      ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                      : stage === 'starting'
                        ? 'Opening your chat with the tutor…'
                        : files.items.length === 0
                          ? 'Add at least one photo or PDF.'
                          : ''}
                  </p>
                </div>
              </form>
            </Card>
          )}
        </div>

        <aside className="grid min-w-0 content-start grid-cols-1 gap-5">
          <Card>
            <h2 className="flex items-center gap-2 font-bold">
              <Lightbulb className="size-5 text-xp" aria-hidden /> How homework help works
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your assignment is your chance to show what <i>you</i> know, so the tutor works like a good teacher: it helps you think, but the answers are yours.
            </p>
            <h3 className="mt-4 text-sm font-bold">The tutor will</h3>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 text-sm">
              {helps.map((h) => (
                <li key={h} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-bold">The tutor won’t</h3>
            <ul className="mt-1.5 grid grid-cols-1 gap-1.5 text-sm">
              {wonts.map((h) => (
                <li key={h} className="flex gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">Check your school’s rules too — some teachers want you to say when you’ve had help.</p>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 font-bold">
              <Eye className="size-5 text-brand-700 dark:text-brand-300" aria-hidden /> Who can see this
            </h2>
            <p className="mt-1 text-sm text-muted">
              Your parent can see your uploads and read your tutor chats. Don’t include anything personal in photos, like your address or other people’s faces.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
