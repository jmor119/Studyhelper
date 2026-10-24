import {
  getTopic,
  instantiateTemplate,
  isTemplateQuestionId,
  questionFromTemplateId,
  randomSeed,
  targetDifficulty,
  templatesForTopic,
  toPublicQuestion,
  type MasteryRecord,
  type PublicQuestion,
  type Question,
  type QuestionSource,
  type QuestionStatus,
} from '@study-helper/shared';
import { db } from './firebase';

export interface LoadedQuestion {
  question: Question;
  source: QuestionSource;
  status: QuestionStatus;
  /** For private (notes) questions, the owning student. */
  ownerUid?: string;
}

/** Fields stored on bank docs in addition to the public question. */
export interface BankMeta {
  status: QuestionStatus;
  source: QuestionSource;
  rand: number;
  createdAt: number;
  visibleTo?: string[];
  stats?: { attempts: number; correct: number; flags: number };
}

const NOTE_PREFIX = 'note:';

/** Loads a full, answer-bearing question by id (template, bank, or private note set). */
export async function loadQuestion(id: string): Promise<LoadedQuestion | null> {
  if (isTemplateQuestionId(id)) {
    const question = questionFromTemplateId(id);
    return question ? { question, source: 'template', status: 'verified' } : null;
  }
  if (id.startsWith(NOTE_PREFIX)) {
    // note:<setId>:<index> — private to the student who uploaded the notes (checked by callers).
    const [, setId, index] = id.split(':');
    if (!setId || !/^[0-9a-f]{16}$/.test(setId) || index === undefined) return null;
    const snap = await db.doc(`noteAnswers/${setId}`).get();
    const data = snap.data() as { ownerUid: string; questions: Question[] } | undefined;
    const question = data?.questions?.[Number(index)];
    if (!data || !question) return null;
    return { question, source: 'ai', status: 'verified', ownerUid: data.ownerUid };
  }
  const snap = await db.doc(`bankAnswers/${id}`).get();
  if (!snap.exists) return null;
  const data = snap.data() as { question: Question; source: QuestionSource; status: QuestionStatus };
  return { question: data.question, source: data.source, status: data.status };
}

export function bankDocToPublic(id: string, data: Record<string, unknown>): PublicQuestion {
  const { rand: _r, createdAt: _c, visibleTo: _v, stats: _s, ...rest } = data;
  return { ...(rest as unknown as PublicQuestion), id };
}

/** Writes a question to the shared bank (public part + answer key). */
export async function writeBankQuestion(
  question: Question,
  meta: { status: QuestionStatus; source: QuestionSource; createdBy?: string; visibleTo?: string[]; verification?: unknown },
): Promise<void> {
  const now = Date.now();
  const pub = toPublicQuestion(question, { status: meta.status, source: meta.source });
  const batch = db.batch();
  batch.set(db.doc(`bank/${question.id}`), {
    ...pub,
    status: meta.status,
    source: meta.source,
    rand: Math.random(),
    createdAt: now,
    stats: { attempts: 0, correct: 0, flags: 0 },
    ...(meta.visibleTo && { visibleTo: meta.visibleTo }),
  });
  batch.set(db.doc(`bankAnswers/${question.id}`), {
    question,
    status: meta.status,
    source: meta.source,
    createdAt: now,
    ...(meta.createdBy && { createdBy: meta.createdBy }),
    ...(meta.verification !== undefined && { verification: meta.verification }),
  });
  await batch.commit();
}

interface Candidate {
  kind: 'bank' | 'template';
  difficulty: number;
  bank?: PublicQuestion;
  templateId?: string;
}

/** Bank questions for a topic that a student may see (verified/unverified + their family's pending). */
export async function bankCandidates(topicId: string, limit = 60): Promise<PublicQuestion[]> {
  const r = Math.random();
  const base = db.collection('bank').where('topicId', '==', topicId).where('status', 'in', ['verified', 'unverified']);
  const first = await base.orderBy('rand').startAt(r).limit(limit).get();
  let docs = first.docs;
  if (docs.length < limit) {
    const wrap = await base.orderBy('rand').endBefore(r).limit(limit - docs.length).get();
    docs = [...docs, ...wrap.docs];
  }
  return docs.map((d) => bankDocToPublic(d.id, d.data()));
}

export interface PracticeOptions {
  count: number;
  /** Force a difficulty instead of adapting to mastery. */
  difficulty?: number;
  /** Ids recently seen by this student (avoided where possible). */
  seen: Set<string>;
  mastery?: MasteryRecord;
}

/**
 * Builds an adaptive practice set: mostly at the student's stretch difficulty, a few easier and harder,
 * preferring unseen bank questions and filling with freshly seeded template questions.
 */
export async function buildPracticeSet(topicId: string, opts: PracticeOptions): Promise<{ questions: PublicQuestion[]; lowOnQuestions: boolean }> {
  const topic = getTopic(topicId);
  if (!topic) return { questions: [], lowOnQuestions: false };
  const templates = templatesForTopic(topicId);
  const bank = await bankCandidates(topicId);
  const unseenBank = bank.filter((q) => !opts.seen.has(q.id));

  const available = new Set<number>([...templates.flatMap((t) => t.difficulties), ...bank.map((q) => q.difficulty)]);
  if (!available.size) return { questions: [], lowOnQuestions: true };
  const target = opts.difficulty ?? targetDifficulty(opts.mastery?.ability, [...available]);

  const wanted: number[] = [];
  for (let i = 0; i < opts.count; i++) {
    const roll = Math.random();
    const d = roll < 0.15 ? target - 1 : roll > 0.85 ? target + 1 : target;
    wanted.push(Math.max(1, Math.min(5, d)));
  }

  const used = new Set<string>();
  const out: PublicQuestion[] = [];
  for (const d of wanted) {
    const near = (q: PublicQuestion) => Math.abs(q.difficulty - d);
    const bankPick = [...unseenBank].filter((q) => !used.has(q.id)).sort((a, b) => near(a) - near(b) || Math.random() - 0.5)[0];
    const templatePool = templates.filter((t) => t.difficulties.includes(d));
    const closestTemplates = templatePool.length
      ? templatePool
      : templates.filter((t) => t.difficulties.some((x) => Math.abs(x - d) <= 1));
    // Alternate sources so practice mixes styles; prefer an exact-difficulty bank question.
    const preferBank = bankPick && (near(bankPick) === 0 || !closestTemplates.length) && (out.length % 2 === 0 || !closestTemplates.length);
    let candidate: Candidate | undefined;
    if (preferBank && bankPick) candidate = { kind: 'bank', difficulty: bankPick.difficulty, bank: bankPick };
    else if (closestTemplates.length) {
      const t = closestTemplates[Math.floor(Math.random() * closestTemplates.length)]!;
      const td = t.difficulties.includes(d) ? d : t.difficulties.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a));
      candidate = { kind: 'template', difficulty: td, templateId: t.id };
    } else if (bankPick) candidate = { kind: 'bank', difficulty: bankPick.difficulty, bank: bankPick };
    if (!candidate) continue;
    if (candidate.kind === 'bank') {
      used.add(candidate.bank!.id);
      out.push(candidate.bank!);
    } else {
      const t = templates.find((x) => x.id === candidate.templateId)!;
      out.push(toPublicQuestion(instantiateTemplate(t, candidate.difficulty, randomSeed()), { source: 'template', status: 'verified' }));
    }
  }

  // Fall back to seen bank questions if nothing else is available (better than an empty set).
  if (!out.length && bank.length) out.push(...bank.slice(0, opts.count));
  const lowOnQuestions = !templates.length && unseenBank.length < opts.count;
  return { questions: out, lowOnQuestions };
}
