import { QuestionSchema, type Question } from '../questions/schema';

// Lessons are Markdown files with a small front-matter block. Each "## " heading starts a section
// (shown one at a time, Education Perfect style). A fenced ```check block holds a quick-check
// question as JSON; it's shown at the end of the section it appears in. A fenced ```figure block
// holds { "svg", "alt", "caption"? } and is drawn where it appears (rendered as an <img>, so it
// can't run scripts).

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
const FIGURE_BLOCK = /```figure\s*\n([\s\S]*?)\n```/g;

export interface LessonFigure {
  svg: string;
  alt: string;
  caption?: string;
}

/** Parses the JSON inside a ```figure block, or returns an error message. */
export function parseFigureBlock(json: string): LessonFigure | string {
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch (e) {
    return `not valid JSON: ${(e as Error).message}`;
  }
  const fig = v as Partial<LessonFigure>;
  if (typeof fig.svg !== 'string' || !fig.svg.trim().startsWith('<svg')) return '"svg" must be an <svg> string';
  if (fig.svg.length > 20000) return '"svg" is too big (20 000 characters max)';
  if (typeof fig.alt !== 'string' || !fig.alt.trim()) return '"alt" text is required';
  if (fig.caption !== undefined && typeof fig.caption !== 'string') return '"caption" must be text';
  return { svg: fig.svg, alt: fig.alt, ...(fig.caption && { caption: fig.caption }) };
}

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
    let figureIndex = 0;
    for (const m of content.matchAll(FIGURE_BLOCK)) {
      figureIndex++;
      const fig = parseFigureBlock(m[1]!);
      if (typeof fig === 'string') throw new LessonError(`Figure ${figureIndex} in "${title}" is invalid: ${fig}`);
    }
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
