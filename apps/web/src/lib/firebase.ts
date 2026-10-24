import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Public web config (not secret). Emulator mode uses a demo project that never touches production.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true' || (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false');

const prodConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'study-helper-11021.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'study-helper-11021',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'study-helper-11021.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const demoConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: 'demo-study-helper',
  storageBucket: 'demo-study-helper.appspot.com',
};

export const REGION = 'australia-southeast1';
export const app = initializeApp(useEmulators ? demoConfig : prodConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const functions = getFunctions(app, REGION);
export const storage = getStorage(app);

if (useEmulators) {
  const host = window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
}

export const usingEmulators = useEmulators;

/** Child accounts sign in with a username; this maps it to the auth email (see functions/lib/firebase.ts). */
export const CHILD_EMAIL_DOMAIN = 'kids.study-helper.invalid';
export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${CHILD_EMAIL_DOMAIN}`;
export const isUsernameEmail = (email: string | null | undefined) => !!email?.endsWith(`@${CHILD_EMAIL_DOMAIN}`);
