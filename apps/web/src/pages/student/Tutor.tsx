import { formatDateKey, getTopic, nzDateKey } from '@study-helper/shared';
import clsx from 'clsx';
import { collection, doc, getDoc, limit, limitToLast, orderBy, query } from 'firebase/firestore';
import { BookOpen, Eye, MessageCircle, Plus, SendHorizontal, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AiErrorNotice, AiUnavailable, aiError, useAiStatus, type AiErrorView } from '../../components/assist/ai';
import { dismissTurn, sendTutor, TUTOR_MODES, useTutorTurns, type PendingTurn, type TutorMode } from '../../components/assist/tutorStream';
import { AttachmentThumbs } from '../../components/assist/uploads';
import { useServerDoc } from '../../components/assist/useServerDoc';
import { Markdown } from '../../components/Markdown';
import { Badge, Button, ButtonLink, EmptyState, Spinner } from '../../components/ui';
import { useUser } from '../../lib/auth';
import { db } from '../../lib/firebase';
import { useQuery, type LiveState } from '../../lib/hooks';

interface ChatDoc {
  title: string;
  mode: TutorMode;
  topicId: string | null;
  questionId: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
}

interface MessageDoc {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: string[];
}

type AiState = ReturnType<typeof useAiStatus>;

const CHAT_ID = /^[A-Za-z0-9_-]{1,40}$/;

// ---------------------------------------------------------------------------------------------
// Helpers

const timeFormat = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' });

function when(ts: number): string {
  const key = nzDateKey(ts);
  return key === nzDateKey() ? timeFormat.format(ts) : formatDateKey(key);
}

function contextLabel(c: Pick<ChatDoc, 'mode' | 'topicId'>): string {
  if (c.mode === 'question') return 'Practice question';
  if (c.mode === 'assignment') return 'Homework help';
  if (c.mode === 'notes') return 'My notes';
  return (c.topicId && getTopic(c.topicId)?.title) || 'General';
}

function starters(mode: TutorMode, topicTitle?: string): string[] {
  if (mode === 'question') {
    return ['Can you give me a hint to get started?', 'What is this question actually asking?', 'I got it wrong — can you help me see where I went wrong?', 'Can you explain the worked solution step by step?'];
  }
  if (mode === 'assignment') {
    return ['Help me understand what this task is asking', 'Can you check my working so far?', 'How could I structure my answer?'];
  }
  if (mode === 'notes') return ['Quiz me on my notes', 'Explain the main idea in simple words', 'What are the key terms I need to know?'];
  if (topicTitle) {
    return [`Explain “${topicTitle}” in simple words`, 'Give me a practice question to try', 'What mistakes do students often make with this?', 'Show me a real-life example from Aotearoa'];
  }
  return ['Help me understand fractions, decimals and percentages', 'How do plants make their own food?', 'Quiz me with a quick maths question', 'Help me plan my revision for an exam'];
}

/** The prompt of a shared-bank question, for showing what a "question" chat is about. */
function useQuestionPrompt(questionId: string | null | undefined): string | null {
  const [prompt, setPrompt] = useState<string | null>(null);
  useEffect(() => {
    setPrompt(null);
    if (!questionId || questionId.startsWith('tpl:') || questionId.startsWith('note:') || questionId.includes('/')) return;
    let live = true;
    getDoc(doc(db, 'bank', questionId))
      .then((s) => live && s.exists() && setPrompt(String(s.data().prompt ?? '') || null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [questionId]);
  return prompt;
}

function useMounted() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

/** Keeps a scroll container pinned to the bottom while new content arrives, unless the reader scrolls up. */
function useStickToBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
  const onScroll = () => {
    const el = ref.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  return { ref, onScroll, pin: () => (stick.current = true) };
}

// ---------------------------------------------------------------------------------------------
// Page

export default function Tutor() {
  const { chatId } = useParams();
  const { user } = useUser();
  const ai = useAiStatus();
  const chats = useQuery<ChatDoc>(query(collection(db, 'students', user.uid, 'chats'), orderBy('updatedAt', 'desc'), limit(50)), `chats:${user.uid}`);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label="Your conversations">
        <div className="sticky top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1">
          <ChatList chats={chats} activeId={chatId} />
        </div>
      </aside>
      <div className="min-w-0">
        {chatId ? (
          CHAT_ID.test(chatId) ? (
            <ChatView key={chatId} uid={user.uid} chatId={chatId} ai={ai} />
          ) : (
            <MissingChat />
          )
        ) : (
          <>
            <NewChat ai={ai} />
            <section className="mt-6 lg:hidden" aria-label="Your conversations">
              <ChatList chats={chats} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function ChatList({ chats, activeId }: { chats: LiveState<Array<ChatDoc & { id: string }>>; activeId?: string }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">Your chats</h2>
        <ButtonLink to="/tutor" size="sm" variant="secondary" icon={<Plus className="size-4" />}>
          New chat
        </ButtonLink>
      </div>
      {chats.loading ? (
        <Spinner className="py-6" label="Loading your chats" />
      ) : chats.error ? (
        <p className="text-sm text-muted">Couldn’t load your chats. Check your connection.</p>
      ) : !chats.data.length ? (
        <p className="text-sm text-muted">No chats yet. Ask your first question and it’ll be saved here.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1">
          {chats.data.map((c) => {
            const active = c.id === activeId;
            return (
              <li key={c.id}>
                <Link
                  to={`/tutor/${c.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'block rounded-xl px-3 py-2 transition-colors',
                    active ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/60 dark:text-brand-100' : 'hover:bg-black/5 dark:hover:bg-white/5',
                  )}
                >
                  <span className="block truncate text-sm font-semibold">{c.title || 'Untitled chat'}</span>
                  <span className={clsx('block truncate text-xs', active ? 'text-brand-800 dark:text-brand-200' : 'text-muted')}>
                    {contextLabel(c)} · {when(c.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Shared chat chrome

function ChatPanel({ header, children, footer, fill }: { header: ReactNode; children: ReactNode; footer: ReactNode; fill?: boolean }) {
  return (
    <section
      className={clsx(
        'flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm',
        fill && 'h-[calc(100dvh-12rem)] min-h-[24rem] lg:h-[calc(100dvh-8rem)]',
      )}
    >
      <div className="border-b border-line px-4 py-3">{header}</div>
      {children}
      <div className="border-t border-line p-3">{footer}</div>
    </section>
  );
}

function PanelHeader({ title, chips, back }: { title: ReactNode; chips?: ReactNode; back?: boolean }) {
  return (
    <div>
      {back && (
        <Link to="/tutor" className="mb-1 inline-block text-sm font-medium text-muted hover:text-ink lg:hidden">
          ← All chats
        </Link>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 truncate text-lg font-bold">{title}</h1>
        {chips}
      </div>
      <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-4">
        <li className="flex items-center gap-1.5">
          <Eye className="size-3.5 shrink-0" aria-hidden /> Your parent can read your tutor chats.
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> The tutor helps you learn — it won’t do graded work for you.
        </li>
      </ul>
    </div>
  );
}

function ContextChips({ mode, topicId }: { mode: TutorMode; topicId?: string | null }) {
  const topic = topicId ? getTopic(topicId) : undefined;
  return (
    <>
      {mode !== 'learn' && <Badge tone="info">{contextLabel({ mode, topicId: null })}</Badge>}
      {topic && (
        <Link to={`/learn/${topic.id}`} className="inline-flex min-w-0 items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800 hover:underline dark:bg-brand-900/60 dark:text-brand-200">
          <BookOpen className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{topic.title}</span>
        </Link>
      )}
    </>
  );
}

function QuestionPreview({ questionId }: { questionId?: string | null }) {
  const prompt = useQuestionPrompt(questionId);
  if (!prompt) return null;
  return (
    <details className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold">The question</summary>
      <Markdown className="mt-1">{prompt}</Markdown>
    </details>
  );
}

function UserBubble({ content, attachments }: { content: string; attachments?: string[] }) {
  return (
    <li className="flex justify-end">
      <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-white dark:bg-brand-600">
        <span className="sr-only">You said: </span>
        {attachments && attachments.length > 0 && <AttachmentThumbs paths={attachments} className="mb-2" />}
        <p className="break-words whitespace-pre-wrap">{content}</p>
      </div>
    </li>
  );
}

function TutorBubble({ content, pending }: { content: string; pending?: boolean }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" aria-hidden>
        <Sparkles className="size-4" />
      </span>
      <div className="max-w-[85%] min-w-0 overflow-x-auto rounded-2xl rounded-tl-md border border-line bg-canvas px-4 py-2.5 break-words">
        <span className="sr-only">Kōtuku said: </span>
        {content ? (
          <Markdown>{content}</Markdown>
        ) : pending ? (
          <span className="flex items-center gap-1 py-2">
            <span className="sr-only">Kōtuku is thinking…</span>
            {[0, 150, 300].map((d) => (
              <span key={d} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} aria-hidden />
            ))}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  canSend,
  busy,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  canSend: boolean;
  busy?: boolean;
  placeholder: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const id = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend && value.trim()) onSend();
    }
  };
  const rows = Math.min(6, Math.max(1, value.split('\n').length));
  return (
    <div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend && value.trim()) onSend();
        }}
      >
        <label htmlFor={id} className="sr-only">
          Message the tutor
        </label>
        <textarea
          id={id}
          ref={inputRef}
          rows={rows}
          maxLength={4000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-describedby={`${id}-hint`}
          className="max-h-48 min-h-12 min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
        />
        <Button type="submit" size="lg" className="px-4" aria-label="Send message" disabled={!canSend || !value.trim()} loading={busy} icon={<SendHorizontal className="size-5" />} />
      </form>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}

function Starters({ items, onPick, disabled }: { items: string[]; onPick: (s: string) => void; disabled?: boolean }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onPick(s)}
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-950/40"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function LiveAnnouncer({ turn }: { turn?: PendingTurn }) {
  const text = !turn ? '' : turn.status === 'streaming' ? 'Kōtuku is writing a reply…' : turn.status === 'done' ? `Kōtuku replied: ${turn.reply}` : (turn.error?.message ?? '');
  return (
    <p className="sr-only" aria-live="polite">
      {text}
    </p>
  );
}

function MissingChat() {
  return (
    <EmptyState icon={<MessageCircle className="size-10" />} title="We couldn’t find that chat" action={<ButtonLink to="/tutor">Start a new chat</ButtonLink>}>
      It may have been deleted, or the link is wrong.
    </EmptyState>
  );
}

// ---------------------------------------------------------------------------------------------
// New chat (/tutor)

function NewChat({ ai }: { ai: AiState }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mounted = useMounted();
  const questionId = params.get('question') || undefined;
  const topic = getTopic(params.get('topic') ?? '');
  const modeParam = params.get('mode') as TutorMode | null;
  const mode: TutorMode = questionId ? 'question' : modeParam && TUTOR_MODES.includes(modeParam) ? modeParam : 'learn';

  const [draft, setDraft] = useState('');
  const [turnKey, setTurnKey] = useState<number | null>(null);
  const [error, setError] = useState<AiErrorView | null>(null);
  const turn = useTutorTurns().find((t) => t.key === turnKey);
  const busy = turn?.status === 'streaming';
  const canSend = !busy && !ai.loading && (ai.ready || ai.failed);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    const { key, done } = sendTutor(
      { mode, message, ...(topic && { topicId: topic.id }), ...(questionId && { questionId }) },
      { baseCount: 0, onChatId: (id) => mounted.current && navigate(`/tutor/${id}`, { replace: true }) },
    );
    setTurnKey(key);
    setDraft('');
    done.catch((e) => {
      // Before the chat exists we're still on this screen; afterwards the chat view shows the error.
      if (!mounted.current) return;
      setError(aiError(e));
      setDraft((d) => d || message);
      dismissTurn(key);
      setTurnKey(null);
    });
  };

  const unavailable = !!ai.status && !ai.ready;
  const header = (
    <>
      <PanelHeader title="Ask Kōtuku, your tutor" chips={<ContextChips mode={mode} topicId={topic?.id} />} />
      {questionId && <QuestionPreview questionId={questionId} />}
    </>
  );

  return (
    <ChatPanel
      header={header}
      footer={
        unavailable ? (
          <AiUnavailable status={ai.status} />
        ) : (
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={() => send(draft)}
            canSend={canSend}
            busy={busy}
            placeholder={mode === 'question' ? 'Ask about this question…' : topic ? `Ask about ${topic.title}…` : 'Ask a question about maths or science…'}
          />
        )
      }
    >
      <div className="px-4 py-5">
        {turn ? (
          <ol className="grid grid-cols-1 gap-4" aria-label="Messages">
            <UserBubble content={turn.message} />
            <TutorBubble content={turn.reply} pending />
          </ol>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200" aria-hidden>
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold">Kia ora! I’m Kōtuku.</p>
                <p className="mt-0.5 text-muted">
                  {mode === 'question'
                    ? 'Stuck on this question? I’ll help you work it out with hints and questions — you do the thinking.'
                    : topic
                      ? `Let’s work on ${topic.title}. Ask me anything, or pick a starter below.`
                      : 'I can explain ideas, quiz you, and help you work through practice questions in maths and science.'}
                </p>
              </div>
            </div>
            {!unavailable && <Starters items={starters(mode, topic?.title)} onPick={send} disabled={!canSend} />}
          </>
        )}
        {error && <AiErrorNotice error={error} className="mt-4" />}
        {ai.status?.available && ai.status.budgetLeft && !ai.status.fromOwnName && (
          <p className="mt-4 text-xs text-muted">Using {ai.status.ownerName}’s AI key.</p>
        )}
      </div>
      <LiveAnnouncer turn={turn} />
    </ChatPanel>
  );
}

// ---------------------------------------------------------------------------------------------
// Existing chat (/tutor/:chatId)

function ChatView({ uid, chatId, ai }: { uid: string; chatId: string; ai: AiState }) {
  const chat = useServerDoc<ChatDoc>(doc(db, 'students', uid, 'chats', chatId), `chat:${uid}:${chatId}`);
  const messages = useQuery<MessageDoc>(
    query(collection(db, 'students', uid, 'chats', chatId, 'messages'), orderBy('createdAt'), limitToLast(300)),
    `messages:${uid}:${chatId}`,
  );
  const turns = useTutorTurns();
  const turn = [...turns].reverse().find((t) => t.chatId === chatId);
  const count = messages.data.length;
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scroller = useStickToBottom(`${count}:${turn?.reply.length ?? 0}:${turn?.status ?? ''}`);

  const busy = turn?.status === 'streaming';
  const canSend = !busy && !messages.loading && !ai.loading && (ai.ready || ai.failed);
  const showPendingUser = !!turn && count < turn.baseCount + 1;
  const showPendingReply = !!turn && turn.status !== 'error' && count < turn.baseCount + 2;

  // Once the saved messages include this turn, drop the pending copy.
  useEffect(() => {
    if (turn?.status === 'done' && count >= turn.baseCount + 2) dismissTurn(turn.key);
  }, [turn, count]);

  // If sending failed before the message was saved, put it back in the box.
  const failedKey = turn?.status === 'error' ? turn.key : null;
  useEffect(() => {
    if (failedKey === null || !turn || count >= turn.baseCount + 1) return;
    setDraft((d) => d || turn.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failedKey]);

  // Arriving from a new chat mid-reply: put the cursor in the box on larger screens.
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) inputRef.current?.focus();
  }, []);

  if (!chat.loading && !chat.data && !turn && !messages.loading && count === 0) return <MissingChat />;

  const mode = chat.data?.mode ?? 'learn';
  const title = chat.data?.title || turn?.message.slice(0, 60) || 'Chat';
  const unavailable = !!ai.status && !ai.ready;

  const send = () => {
    const message = draft.trim();
    if (!message || !canSend) return;
    scroller.pin();
    setDraft('');
    sendTutor({ chatId, mode, message }, { baseCount: count }).done.catch(() => undefined); // errors show from the store
  };

  return (
    <ChatPanel
      fill
      header={
        <>
          <PanelHeader back title={title} chips={chat.data && <ContextChips mode={mode} topicId={chat.data.topicId} />} />
          {chat.data?.mode === 'question' && <QuestionPreview questionId={chat.data.questionId} />}
        </>
      }
      footer={
        unavailable ? (
          <AiUnavailable status={ai.status} />
        ) : (
          <Composer value={draft} onChange={setDraft} onSend={send} canSend={canSend} busy={busy} placeholder="Reply to Kōtuku…" inputRef={inputRef} />
        )
      }
    >
      <div ref={scroller.ref} onScroll={scroller.onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-5" tabIndex={0} role="region" aria-label="Messages">
        {messages.loading && !turn ? (
          <Spinner label="Loading messages" />
        ) : (
          <ol className="grid grid-cols-1 gap-4">
            {messages.data.map((m) =>
              m.role === 'user' ? <UserBubble key={m.id} content={m.content} attachments={m.attachments} /> : <TutorBubble key={m.id} content={m.content} />,
            )}
            {showPendingUser && <UserBubble content={turn.message} attachments={turn.attachments} />}
            {showPendingReply && <TutorBubble content={turn.reply} pending={turn.status === 'streaming'} />}
          </ol>
        )}
        {turn?.status === 'error' && turn.error && (
          <div className="mt-4">
            <AiErrorNotice error={turn.error} />
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => dismissTurn(turn.key)}>
              Dismiss
            </Button>
          </div>
        )}
        {messages.error && <p className="mt-4 text-sm text-muted">Couldn’t load this chat. Check your connection and try again.</p>}
      </div>
      <LiveAnnouncer turn={turn} />
    </ChatPanel>
  );
}
