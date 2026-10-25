import { useSyncExternalStore } from 'react';
import { streamTutor } from '../../lib/api';
import { aiError, type AiErrorView } from './ai';

// Streaming tutor replies live here, outside React, so a reply keeps streaming while the app
// navigates from /tutor (or /help, /notes) to /tutor/:chatId — those are separate routes, so the
// page component remounts. The chat view merges these pending turns with the saved messages.

export type TutorMode = 'learn' | 'question' | 'assignment' | 'notes';
export const TUTOR_MODES: readonly TutorMode[] = ['learn', 'question', 'assignment', 'notes'];

export interface TutorRequest {
  chatId?: string;
  mode: TutorMode;
  topicId?: string;
  questionId?: string;
  message: string;
  attachments?: string[];
}

export interface PendingTurn {
  key: number;
  /** null until the server has created the conversation. */
  chatId: string | null;
  message: string;
  attachments: string[];
  reply: string;
  status: 'streaming' | 'done' | 'error';
  error?: AiErrorView;
  refused?: boolean;
  /** Saved messages in the conversation when this turn was sent (0 for a new chat). */
  baseCount: number;
}

let turns: PendingTurn[] = [];
let seq = 0;
let frame = 0;
const listeners = new Set<() => void>();

function emit() {
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  listeners.forEach((l) => l());
}

/** Token updates are batched to one render per frame. */
function emitSoon() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    listeners.forEach((l) => l());
  });
}

function patch(key: number, p: Partial<PendingTurn>, soon = false) {
  turns = turns.map((t) => (t.key === key ? { ...t, ...p } : t));
  if (soon) emitSoon();
  else emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => turns;

/**
 * Sends a message and streams the reply into the store. `onChatId` fires once, as soon as the
 * conversation id is known (use it to navigate to /tutor/:chatId).
 */
export function sendTutor(
  req: TutorRequest,
  opts: { baseCount: number; onChatId?: (chatId: string) => void },
): { key: number; done: Promise<{ chatId: string; reply: string; refused: boolean }> } {
  const key = ++seq;
  // Only one pending turn per conversation: drop finished or failed ones for the same chat.
  turns = [
    ...turns.filter((t) => !(req.chatId && t.chatId === req.chatId && t.status !== 'streaming')),
    { key, chatId: req.chatId ?? null, message: req.message, attachments: req.attachments ?? [], reply: '', status: 'streaming', baseCount: opts.baseCount },
  ];
  emit();

  let known = !!req.chatId;
  const learnId = (id: string) => {
    if (known || !id) return;
    known = true;
    patch(key, { chatId: id });
    opts.onChatId?.(id);
  };

  const done = (async () => {
    try {
      const res = await streamTutor(
        {
          mode: req.mode,
          message: req.message,
          ...(req.chatId && { chatId: req.chatId }),
          ...(req.topicId && { topicId: req.topicId }),
          ...(req.questionId && { questionId: req.questionId }),
          ...(req.attachments?.length && { attachments: req.attachments }),
        },
        (delta, chatId) => {
          learnId(chatId);
          const t = turns.find((x) => x.key === key);
          if (t) patch(key, { reply: t.reply + delta }, true);
        },
      );
      learnId(res.chatId);
      patch(key, { status: 'done', reply: res.reply, refused: res.refused, chatId: res.chatId });
      return res;
    } catch (e) {
      patch(key, { status: 'error', error: aiError(e) });
      throw e;
    }
  })();
  return { key, done };
}

export function dismissTurn(key: number) {
  turns = turns.filter((t) => t.key !== key);
  emit();
}

export function useTutorTurns(): PendingTurn[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
