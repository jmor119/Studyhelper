import { isTemplateQuestionId, questionFromTemplateId, type PublicQuestion } from '@study-helper/shared';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

// Question text for attempts. Bank questions come from bank/{id}; template questions are rebuilt
// from their id (deterministic); questions made from a student's notes live on their noteSet.

export interface PromptInfo {
  prompt: string;
  stem?: string;
  hasFigure: boolean;
}

const cache = new Map<string, Promise<PromptInfo | null>>();

async function fetchPrompt(studentUid: string, id: string): Promise<PromptInfo | null> {
  if (isTemplateQuestionId(id)) {
    const q = questionFromTemplateId(id);
    return q ? { prompt: q.prompt, ...(q.stem && { stem: q.stem }), hasFigure: !!q.figure } : null;
  }
  if (id.startsWith('note:')) {
    const [, setId, index] = id.split(':');
    if (!setId || index === undefined) return null;
    const snap = await getDoc(doc(db, 'students', studentUid, 'noteSets', setId));
    const q = (snap.data()?.questions as PublicQuestion[] | undefined)?.[Number(index)];
    return q ? { prompt: q.prompt, ...(q.stem && { stem: q.stem }), hasFigure: !!q.figure } : null;
  }
  const snap = await getDoc(doc(db, 'bank', id));
  if (!snap.exists()) return null;
  const q = snap.data() as PublicQuestion;
  return { prompt: q.prompt, ...(q.stem && { stem: q.stem }), hasFigure: !!q.figure };
}

function loadPrompt(studentUid: string, id: string): Promise<PromptInfo | null> {
  const key = id.startsWith('note:') ? `${studentUid}|${id}` : id;
  let p = cache.get(key);
  if (!p) {
    // A question can be unreadable (e.g. retired from the bank); show it as unavailable.
    p = fetchPrompt(studentUid, id).catch(() => null);
    cache.set(key, p);
  }
  return p;
}

/**
 * Prompts for a list of question ids. Missing entries are still loading; `null` means the question
 * text isn't available any more.
 */
export function useQuestionPrompts(studentUid: string, ids: string[]): Map<string, PromptInfo | null> {
  const [prompts, setPrompts] = useState<Map<string, PromptInfo | null>>(() => new Map());
  const key = [...new Set(ids)].sort().join('\n');
  useEffect(() => {
    let cancelled = false;
    const unique = key ? key.split('\n') : [];
    for (const id of unique) {
      void loadPrompt(studentUid, id).then((info) => {
        if (cancelled) return;
        setPrompts((prev) => {
          if (prev.has(id) && prev.get(id) === info) return prev;
          const next = new Map(prev);
          next.set(id, info);
          return next;
        });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [studentUid, key]);
  return prompts;
}
