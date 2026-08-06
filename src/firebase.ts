import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { doc, getFirestore } from 'firebase/firestore'

/**
 * Vite only exposes env vars prefixed with VITE_ to the client.
 * Put these in `.env` or `.env.local` at the project root, then restart `npm run dev`.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function assertFirebaseConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase config: ${missing.join(', ')}. ` +
        'Copy .env.example to .env, fill in VITE_FIREBASE_* values from the Firebase console, ' +
        'and restart the Vite dev server.',
    )
  }
}

assertFirebaseConfig()

// initializeApp only once — HMR / multiple imports would otherwise throw
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Single Firestore instance shared by the app
export const db = getFirestore(app)

/** boards/<boardId> document reference */
export function boardDoc(boardId: string) {
  return doc(db, 'boards', boardId)
}
