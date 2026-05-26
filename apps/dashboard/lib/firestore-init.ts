import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let initialized = false;

export default function initDb() {
  if (initialized) return;

  if (process.env.NODE_ENV === 'development') {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8089';
  }

  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    });
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
  initialized = true;
}
