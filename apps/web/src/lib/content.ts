import { getTopic, parseLesson, type Flashcard, type Lesson } from '@study-helper/shared';

// Lessons and flashcards ship with the app (static, cacheable, work offline). Questions live in
// Firestore so the bank can grow.

const lessonFiles = import.meta.glob('../../../../content/lessons/**/*.md', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>;
const flashcardFiles = import.meta.glob('../../../../content/flashcards/**/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<Omit<Flashcard, 'topicId'>[]>
>;

const fileTopic = (path: string) => path.split('/').pop()!.replace(/\.(md|json)$/, '');

const lessonIndex = new Map(Object.entries(lessonFiles).map(([p, load]) => [fileTopic(p), load]));
const flashcardIndex = new Map(Object.entries(flashcardFiles).map(([p, load]) => [fileTopic(p), load]));

export const hasLesson = (topicId: string) => lessonIndex.has(topicId);
export const hasFlashcards = (topicId: string) => flashcardIndex.has(topicId);

const lessonCache = new Map<string, Lesson>();

export async function loadLesson(topicId: string): Promise<Lesson | null> {
  if (lessonCache.has(topicId)) return lessonCache.get(topicId)!;
  const load = lessonIndex.get(topicId);
  const topic = getTopic(topicId);
  if (!load || !topic) return null;
  const lesson = parseLesson(await load(), { subject: topic.subject, yearLevel: topic.yearLevel });
  lessonCache.set(topicId, lesson);
  return lesson;
}

export async function loadFlashcards(topicIds: string[]): Promise<Flashcard[]> {
  const sets = await Promise.all(
    topicIds.map(async (topicId) => {
      const load = flashcardIndex.get(topicId);
      if (!load) return [];
      return (await load()).map((c) => ({ ...c, topicId }));
    }),
  );
  return sets.flat();
}
