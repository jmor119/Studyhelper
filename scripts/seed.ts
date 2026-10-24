// Loads content/questions into the shared bank (bank + bankAnswers) as verified seed questions.
//
//   npm run seed -- --emulator            # local emulators (demo-study-helper)
//   npm run seed -- --project study-helper-11021 --credentials <path-to-service-account.json>
//
// Existing seed questions are overwritten with the current content; questions from other sources
// (AI, contributions) are never touched. Use --prune to retire seed questions that were removed.
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { toPublicQuestion } from '@study-helper/shared';
import { loadContent } from './content-lib';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

const emulator = flag('emulator');
const projectId = opt('project') ?? (emulator ? 'demo-study-helper' : undefined);
if (!projectId) {
  console.error('Pass --emulator or --project <id> (with --credentials <service-account.json>).');
  process.exit(1);
}
if (emulator) process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
else if (!emulator && !process.env.FIRESTORE_EMULATOR_HOST) {
  const credPath = opt('credentials') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('Production seeding needs --credentials <service-account.json> (keep that file outside the repo).');
    process.exit(1);
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))), projectId });
}
if (emulator) initializeApp({ projectId });

const db = getFirestore();
const report = loadContent();
if (report.errors.length) {
  console.error(`Content has ${report.errors.length} error(s). Run npm run validate:content to see them.`);
  if (!flag('allow-errors')) process.exit(1);
  console.error('--allow-errors: seeding the valid questions only.');
}

const now = Date.now();
let written = 0;
let batch = db.batch();
let ops = 0;
const flush = async () => {
  if (ops) await batch.commit();
  batch = db.batch();
  ops = 0;
};

for (const q of report.questions) {
  const pub = toPublicQuestion(q, { status: 'verified', source: 'seed' });
  const bankRef = db.doc(`bank/${q.id}`);
  const existing = await bankRef.get();
  const stats = existing.exists ? existing.data()!.stats : { attempts: 0, correct: 0, flags: 0 };
  const status = existing.exists && existing.data()!.status === 'retired' ? 'retired' : 'verified';
  batch.set(bankRef, { ...pub, status, source: 'seed', rand: existing.data()?.rand ?? Math.random(), createdAt: existing.data()?.createdAt ?? now, stats });
  batch.set(db.doc(`bankAnswers/${q.id}`), { question: q, status, source: 'seed', createdAt: now });
  ops += 2;
  written++;
  if (ops >= 400) await flush();
}
await flush();

if (flag('prune')) {
  const ids = new Set(report.questions.map((q) => q.id));
  const seeds = await db.collection('bankAnswers').where('source', '==', 'seed').get();
  let retired = 0;
  for (const d of seeds.docs) {
    if (ids.has(d.id)) continue;
    batch.update(d.ref, { status: 'retired' });
    batch.update(db.doc(`bank/${d.id}`), { status: 'retired' });
    ops += 2;
    retired++;
    if (ops >= 400) await flush();
  }
  await flush();
  console.log(`Retired ${retired} removed seed question(s).`);
}

console.log(`Seeded ${written} questions into ${emulator ? 'the emulator' : projectId}.`);
process.exit(0);
