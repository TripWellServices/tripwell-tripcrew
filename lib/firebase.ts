'use client'

/**
 * Client Firebase — values match Firebase Console “Add Firebase to your web app” (SDK snippet).
 * Optional env: NEXT_PUBLIC_FIREBASE_* overrides; see `config/firebaseProjectDefaults.ts` for project id default.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import type { Analytics } from 'firebase/analytics'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT } from '@/config/firebaseProjectDefaults'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBeYbEC-ZDdPCFV6aUgw0GhDSFqhGYQFH4',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT}.firebaseapp.com`,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '841880382902',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:841880382902:web:72c9514c21d7d6c4dae517',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-MMJEC80CNB',
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let storage: FirebaseStorage | undefined
let analytics: Analytics | undefined

if (typeof window !== 'undefined') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    storage = getStorage(app)
    if (firebaseConfig.measurementId) {
      void isSupported().then((ok) => {
        if (ok && app) {
          try {
            analytics = getAnalytics(app)
          } catch {
            /* Analytics unavailable (e.g. blocked) */
          }
        }
      })
    }
    console.log('✅ Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    storage = getStorage(app)
  }
}

// Handle IndexedDB errors globally (matching TripWell OG)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('IndexedDB')) {
      console.warn('⚠️ IndexedDB error detected, this is usually harmless:', event.error.message)
      // Prevent the error from breaking the app
      event.preventDefault()
    }
  })
}

// Export auth with type assertion for client-side usage
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. This should only be called on the client side.')
  }
  return auth
}

export { app, auth }

/** Analytics when supported in this browser; may be undefined until `isSupported` resolves. */
export const getFirebaseAnalytics = (): Analytics | undefined => analytics

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error(
      'Firebase Storage not initialized. Call only on the client after Firebase loads.'
    )
  }
  return storage
}

