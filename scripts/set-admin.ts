// Grants (or revokes) the admin custom claim, which unlocks question-bank moderation.
//
//   npm run set-admin -- --email you@example.com --emulator
//   npm run set-admin -- --email you@example.com --project study-helper-11021 --credentials <service-account.json>
//   add --revoke to remove admin.
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const emulator = args.includes('--emulator');
const email = opt('email');
if (!email) {
  console.error('Pass --email <address>.');
  process.exit(1);
}
if (emulator) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  initializeApp({ projectId: 'demo-study-helper' });
} else {
  const projectId = opt('project');
  const credPath = opt('credentials') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!projectId || !credPath) {
    console.error('Pass --project <id> and --credentials <service-account.json> (or --emulator).');
    process.exit(1);
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(credPath, 'utf8'))), projectId });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const revoke = args.includes('--revoke');
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: !revoke });
await auth.revokeRefreshTokens(user.uid);
console.log(`${revoke ? 'Revoked' : 'Granted'} admin for ${email} (${user.uid}). They need to sign in again.`);
process.exit(0);
