import clsx from 'clsx';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, Bot, Eye, MessageCircle, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { db } from '../../lib/firebase';
import { useQuery } from '../../lib/hooks';
import { Markdown } from '../Markdown';
import { Badge, Button, EmptyState, Notice, Spinner } from '../ui';
import { formatDateTime, plural, topicTitle } from './format';

interface ChatDoc {
  title: string;
  mode: 'learn' | 'question' | 'assignment' | 'notes';
  topicId: string | null;
  questionId: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

interface MessageDoc {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: string[];
}

const MODE_LABELS: Record<string, string> = {
  learn: 'Learning',
  question: 'Practice question',
  assignment: 'Homework help',
  notes: 'Their notes',
};

function Conversation({ uid, chat, name, onBack }: { uid: string; chat: ChatDoc & { id: string }; name: string; onBack: () => void }) {
  const messages = useQuery<MessageDoc>(
    query(collection(db, 'students', uid, 'chats', chat.id, 'messages'), orderBy('createdAt'), limit(500)),
    `chat-messages:${uid}:${chat.id}`,
  );
  return (
    <section aria-labelledby="chat-title" className="min-w-0 rounded-2xl border border-line bg-surface">
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <Button variant="ghost" size="sm" className="-ml-2 lg:hidden" onClick={onBack} icon={<ArrowLeft className="size-4" />} aria-label="Back to all chats" />
        <div className="min-w-0 flex-1">
          <h2 id="chat-title" className="font-bold break-words">
            {chat.title || 'Untitled chat'}
          </h2>
          <p className="text-xs text-muted">
            {MODE_LABELS[chat.mode] ?? chat.mode}
            {chat.topicId && <> · {topicTitle(chat.topicId)}</>} · started {formatDateTime(chat.createdAt)}
          </p>
        </div>
        <Badge>
          <Eye className="size-3" aria-hidden="true" /> Read-only
        </Badge>
      </header>
      <div className="px-4 py-4">
        {messages.loading ? (
          <Spinner label="Loading messages" />
        ) : messages.error ? (
          <Notice tone="bad">We couldn’t load this conversation.</Notice>
        ) : !messages.data.length ? (
          <p className="text-sm text-muted">No messages in this chat.</p>
        ) : (
          <ol className="grid grid-cols-1 gap-3">
            {messages.data.map((m) => {
              const mine = m.role === 'user';
              return (
                <li key={m.id} className={clsx('flex min-w-0', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={clsx(
                      'min-w-0 max-w-[90%] rounded-2xl px-4 py-2.5 sm:max-w-[80%]',
                      mine ? 'rounded-br-md bg-brand-100 text-brand-900 dark:bg-brand-900/60 dark:text-brand-50' : 'rounded-bl-md border border-line bg-canvas',
                    )}
                  >
                    <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-muted">
                      {mine ? name : (
                        <>
                          <Bot className="size-3.5" aria-hidden="true" /> Tutor
                        </>
                      )}
                      <span className="font-normal">· {formatDateTime(m.createdAt)}</span>
                    </p>
                    {mine ? <p className="break-words whitespace-pre-wrap">{m.content}</p> : <Markdown className="break-words">{m.content}</Markdown>}
                    {!!m.attachments?.length && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <Paperclip className="size-3.5" aria-hidden="true" /> {plural(m.attachments.length, 'attachment')}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export function ChatsTab({ uid, name }: { uid: string; name: string }) {
  const chats = useQuery<ChatDoc>(query(collection(db, 'students', uid, 'chats'), orderBy('updatedAt', 'desc'), limit(50)), `chats:${uid}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = chats.data.find((c) => c.id === selectedId) ?? null;
  // On wide screens, show the latest chat straight away.
  const shown = selected ?? (chats.data[0] && typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches ? chats.data[0] : null);

  const note = (
    <Notice tone="info" className="mb-4">
      {name} is told that linked parents can read their tutor chats. You can read them here, but not reply or change them.
    </Notice>
  );

  if (chats.loading) return <Spinner label="Loading chats" />;
  if (chats.error) return <Notice tone="bad">We couldn’t load {name}’s tutor chats.</Notice>;
  if (!chats.data.length)
    return (
      <>
        {note}
        <EmptyState icon={<MessageCircle className="size-8" />} title="No tutor chats yet">
          When {name} asks the AI tutor or homework help for help, the conversations appear here.
        </EmptyState>
      </>
    );

  return (
    <div>
      {note}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav aria-label="Tutor chats" className={clsx('min-w-0', selected && 'hidden lg:block')}>
          <ul className="grid grid-cols-1 gap-2">
            {chats.data.map((c) => {
              const current = shown?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-current={current ? 'true' : undefined}
                    className={clsx(
                      'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                      current ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40' : 'border-line bg-surface hover:bg-black/5 dark:hover:bg-white/5',
                    )}
                  >
                    <span className="line-clamp-2 block font-semibold break-words">{c.title || 'Untitled chat'}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {MODE_LABELS[c.mode] ?? c.mode} · {plural(c.messageCount ?? 0, 'message')} · {formatDateTime(c.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {shown ? (
          <div className={clsx('min-w-0', !selected && 'hidden lg:block')}>
            <Conversation uid={uid} chat={shown} name={name} onBack={() => setSelectedId(null)} />
          </div>
        ) : (
          <p className="hidden text-sm text-muted lg:block">Choose a chat to read it.</p>
        )}
      </div>
    </div>
  );
}
