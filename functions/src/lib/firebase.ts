import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/options';

export const REGION = 'australia-southeast1';

setGlobalOptions({ region: REGION, maxInstances: 20, memory: '512MiB', timeoutSeconds: 120 });

if (!getApps().length) initializeApp();

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = getAuth();
export const bucket = () => getStorage().bucket();
export { FieldValue, Timestamp };

/** Child accounts sign in with a username mapped to this never-deliverable domain (RFC 2606). */
export const CHILD_EMAIL_DOMAIN = 'kids.study-helper.invalid';

export const isEmulator = () => process.env.FUNCTIONS_EMULATOR === 'true';

/** Public base URL of the web app (invite links, OAuth redirects). */
export function appBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (isEmulator()) return 'http://localhost:5173';
  const project = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? 'study-helper-11021';
  return `https://${project}.web.app`;
}
