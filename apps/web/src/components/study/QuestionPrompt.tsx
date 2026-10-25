import { isTemplateQuestionId, questionFromTemplateId, toPublicQuestion, type PublicQuestion } from '@study-helper/shared';
import clsx from 'clsx';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { Figure, Markdown } from '../Markdown';

/** Read-only view of a question: stem, prompt, figure and (for choice questions) the options. */
export function QuestionPrompt({ question: q, className, showOptions = true }: { question: PublicQuestion; className?: string; showOptions?: boolean }) {
  // Cloze prompts contain [[id]] markers for the blanks; show them as gaps.
  const prompt = q.type === 'cloze' ? q.prompt.replace(/\[\[[a-z0-9]+\]\]/g, '\\_\\_\\_\\_') : q.prompt;
  return (
    <div className={clsx('min-w-0', className)}>
      {q.stem && <Markdown className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">{q.stem}</Markdown>}
      <div>
        {q.part && <span className="mr-1.5 font-bold">({q.part})</span>}
        <Markdown>{prompt}</Markdown>
      </div>
      {q.figure && <Figure {...q.figure} />}
      {showOptions && (q.type === 'mcq' || q.type === 'multi') && (
        <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted">
          {q.options.map((o) => (
            <li key={o.id} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-current" />
              <Markdown inline className="min-w-0">
                {o.text}
              </Markdown>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Answers built from option text (which may contain $maths$) are Markdown; typed answers are
// shown exactly as typed, so "2*x*y" isn't turned into italics.
const OPTION_ANSWERS = new Set(['mcq', 'multi', 'order', 'match']);

export function AnswerText({ text, type, clamp }: { text?: string; type?: string; clamp?: boolean }) {
  if (!text?.trim()) return <span className="text-muted italic">No answer given</span>;
  if (OPTION_ANSWERS.has(type ?? '')) {
    return (
      <div className={clsx('break-words', clamp && 'line-clamp-4')}>
        <Markdown inline>{text}</Markdown>
      </div>
    );
  }
  return (
    <div className={clsx('break-words whitespace-pre-wrap', clamp && 'line-clamp-4', (type === 'numeric' || type === 'expression') && 'font-mono')}>{text}</div>
  );
}

// ---- Looking up questions by id (templates rebuilt locally, bank and note questions read once) ----

const cache = new Map<string, Promise<PublicQuestion | null>>();

async function fetchQuestion(uid: string, id: string): Promise<PublicQuestion | null> {
  if (isTemplateQuestionId(id)) {
    try {
      const q = questionFromTemplateId(id);
      return q ? toPublicQuestion(q, { source: 'template' }) : null;
    } catch {
      return null; // the template has changed since this question was made
    }
  }
  try {
    if (id.startsWith('note:')) {
      // note:<setId>:<index> — a question generated from the student's own notes.
      const [, setId, index] = id.split(':');
      if (!setId || index === undefined) return null;
      const snap = await getDoc(doc(db, 'students', uid, 'noteSets', setId));
      const questions = snap.data()?.questions as PublicQuestion[] | undefined;
      return questions?.[Number(index)] ?? null;
    }
    const snap = await getDoc(doc(db, 'bank', id));
    return snap.exists() ? ({ ...(snap.data() as PublicQuestion), id } as PublicQuestion) : null;
  } catch {
    return null; // hidden (e.g. flagged) or offline
  }
}

export function lookupQuestion(uid: string, id: string): Promise<PublicQuestion | null> {
  const key = `${uid}|${id}`;
  let p = cache.get(key);
  if (!p) {
    p = fetchQuestion(uid, id).then((q) => {
      if (!q) cache.delete(key); // e.g. offline — try again next time
      return q;
    });
    cache.set(key, p);
  }
  return p;
}

/** Resolves question ids to public questions. Missing ids map to null once looked up. */
export function useQuestionLookup(uid: string, ids: readonly string[]): Map<string, PublicQuestion | null> {
  const [found, setFound] = useState<Map<string, PublicQuestion | null>>(() => new Map());
  const key = ids.join('|');
  useEffect(() => {
    let cancelled = false;
    const unique = [...new Set(ids)];
    void Promise.all(unique.map(async (id) => [id, await lookupQuestion(uid, id)] as const)).then((entries) => {
      if (!cancelled) setFound(new Map(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, key]);
  return found;
}
