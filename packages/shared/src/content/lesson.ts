import { QuestionSchema, type Question } from '../questions/schema';

// Lessons are Markdown files with a small front-matter block. Each "## " heading starts a section
// (shown one at a time, Education Perfect style). A fenced ```check block holds a quick-check
// question as JSON; it's shown at the end of the section it appears in.

export interface LessonMeta {
  topicId: string;
  title: string;
  minutes: number;
}

export interface LessonSection {
  title: string;
  /** Markdown with check blocks removed. */
  body: string;
  checks: Question[];
}

export interface Lesson {
  meta: LessonMeta;
  intro: string;
  sections: LessonSection[];
}

export class LessonError extends Error {}

export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const text = raw.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data: Record<string, string> = {};
  for (const line of m[1]!.split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) data[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, '').trim();
  }
  return { data, body: m[2]! };
}

const CHECK_BLOCK = /```check\s*\n([\s\S]*?)\n```/g;

export function parseLesson(raw: string, opts: { subject: Question['subject']; yearLevel: number }): Lesson {
  const { data, body } = parseFrontmatter(raw);
  if (!data.topicId || !data.title) throw new LessonError('Lesson front matter needs topicId and title.');
  const meta: LessonMeta = {
    topicId: data.topicId,
    title: data.title,
    minutes: Number(data.minutes ?? 10) || 10,
  };

  const parts = body.split(/^## +/m);
  const intro = parts.shift()!.trim();
  let checkIndex = 0;
  const sections = parts.map((part) => {
    const nl = part.indexOf('\n');
    const title = (nl === -1 ? part : part.slice(0, nl)).trim();
    let content = nl === -1 ? '' : part.slice(nl + 1);
    const checks: Question[] = [];
    content = content.replace(CHECK_BLOCK, (_m, json: string) => {
      checkIndex++;
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch (e) {
        throw new LessonError(`Check ${checkIndex} in "${title}" is not valid JSON: ${(e as Error).message}`);
      }
      const result = QuestionSchema.safeParse({
        id: `${meta.topicId}.lesson.${checkIndex}`,
        subject: opts.subject,
        yearLevel: opts.yearLevel,
        topicId: meta.topicId,
        difficulty: 1,
        ...(parsed as object),
      });
      if (!result.success) {
        throw new LessonError(`Check ${checkIndex} in "${title}" is invalid: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      checks.push(result.data);
      return '';
    });
    return { title, body: content.trim(), checks };
  });
  return { meta, intro, sections };
}
