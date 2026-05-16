import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'fake-domain',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Connect to emulator if running locally
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    // Only connect if we haven't already (prevents HMR crashes)
    if (!(db as any)._settingsFrozen) {
      connectFirestoreEmulator(db, 'localhost', 8089);
    }
  } catch (e) {
    console.error("Firestore emulator connection error", e);
  }
}

export { db };
