import { Camera, CheckCircle2, Lightbulb } from 'lucide-react';
import { useRef, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { uploadStudentFile } from '../../lib/upload';
import { Button, Notice } from '../ui';

type WorkingFeedback = Awaited<ReturnType<typeof api.markWorking>>;

/** "Check my working": photograph handwritten working and get AI feedback on the method. */
export function WorkingCheck({ uid, questionId }: { uid: string; questionId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<WorkingFeedback | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setFeedback(null);
    try {
      const path = await uploadStudentFile(uid, file, 'working');
      setFeedback(await api.markWorking({ questionId, path }));
    } catch (e) {
      setError(e instanceof Error && !('code' in e) ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Check my working</p>
          <p className="text-sm text-muted">Take a photo of your working on paper and get feedback on your method.</p>
        </div>
        <Button variant="secondary" icon={<Camera className="size-4" />} loading={busy} onClick={() => input.current?.click()}>
          {busy ? 'Checking…' : 'Add a photo'}
        </Button>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {error && (
        <Notice tone="bad" className="mt-3">
          {error}
        </Notice>
      )}
      {feedback && (
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          {!feedback.readable ? (
            <Notice tone="warn">I couldn’t read that photo clearly. Try again closer up, in good light.</Notice>
          ) : (
            <>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
                <span>
                  <b>{feedback.methodCorrect ? 'Your method works.' : 'Good start.'}</b> {feedback.whatWentWell}
                </span>
              </p>
              {feedback.firstError && (
                <p className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/40">
                  <b>Where it went wrong:</b> {feedback.firstError}
                </p>
              )}
              <p className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-xp" />
                <span>{feedback.nextStep}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
