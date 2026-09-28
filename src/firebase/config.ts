import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import localConfig from '../../firebase-applet-config.json';

// Support both Vercel / GitHub environment variables (VITE_FIREBASE_*)
// and the bundled local firebase-applet-config.json fallback
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || localConfig.appId,
};

const databaseId = env.VITE_FIREBASE_DATABASE_ID || localConfig.firestoreDatabaseId || '(default)';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, databaseId);
export const storage = getStorage(app);

