// Validates all seed content. Usage: npm run validate:content [-- --topic s9.bio.cells] [-- --quiet]
import { allTopics, templatesForTopic } from '@study-helper/shared';
import { coverageBySubject, loadContent } from './content-lib';

const args = process.argv.slice(2);
const topicFilter = args.includes('--topic') ? args[args.indexOf('--topic') + 1] : undefined;
const quiet = args.includes('--quiet');

const report = loadContent();
const show = (msgs: string[]) => (topicFilter ? msgs.filter((m) => m.includes(topicFilter)) : msgs);

const errors = show(report.errors);
const warnings = show(report.warnings);

if (!quiet) {
  for (const subject of ['maths', 'science'] as const) {
    const cov = coverageBySubject(report, subject);
    console.log(`\n${subject.toUpperCase()}  (questions / templates / flashcards / lesson)`);
    for (const t of allTopics().filter((x) => x.subject === subject)) {
      if (topicFilter && t.id !== topicFilter) continue;
      const c = cov.get(t.id) ?? { questions: 0, flashcards: 0, lesson: false };
      const tpl = templatesForTopic(t.id).length;
      console.log(
        `  ${t.id.padEnd(28)} ${String(c.questions).padStart(4)} ${String(tpl).padStart(4)} ${String(c.flashcards).padStart(4)}   ${c.lesson ? 'yes' : '—'}`,
      );
    }
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);
console.log(
  `\n${report.questions.length} questions, ${report.flashcards.length} flashcards, ${report.lessons.length} lessons — ${errors.length} error(s), ${warnings.length} warning(s)`,
);
process.exit(errors.length ? 1 : 0);
