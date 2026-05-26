import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'fake-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'fake-domain',
};

let _db: ReturnType<typeof getFirestore> | null = null;
let _emulatorConnected = false;

function getDb() {
  if (_db) return _db;

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  _db = getFirestore(app);

  // Connect to emulator in dev — must happen before any reads/writes
  if (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    !_emulatorConnected
  ) {
    try {
      connectFirestoreEmulator(_db, 'localhost', 8089);
      _emulatorConnected = true;
      console.log('[firebase-client] Connected to Firestore emulator on localhost:8089');
    } catch (e) {
      // Already connected (HMR reload) — this is fine
      _emulatorConnected = true;
    }
  }

  return _db;
}

// Initialize eagerly so the connection happens on import
const db = getDb();

export { db };
