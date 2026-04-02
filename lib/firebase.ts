'use client'

/**
 * Client Firebase — **hardcoded** from Firebase Console (“Add Firebase to your web app”).
 * No `NEXT_PUBLIC_FIREBASE_*` env vars required. Change this object if the Console config changes.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import type { Analytics } from 'firebase/analytics'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyBeYbEC-ZDdPCFV6aUgw0GhDSFqhGYQFH4',
  authDomain: 'tripwell-794c9.firebaseapp.com',
  projectId: 'tripwell-794c9',
  storageBucket: 'tripwell-794c9.firebasestorage.app',
  messagingSenderId: '841880382902',
  appId: '1:841880382902:web:72c9514c21d7d6c4dae517',
  measurementId: 'G-MMJEC80CNB',
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

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('IndexedDB')) {
      console.warn('⚠️ IndexedDB error detected, this is usually harmless:', event.error.message)
      event.preventDefault()
    }
  })
}

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. This should only be called on the client side.')
  }
  return auth
}

export { app, auth }

export const getFirebaseAnalytics = (): Analytics | undefined => analytics

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error(
      'Firebase Storage not initialized. Call only on the client after Firebase loads.'
    )
  }
  return storage
}
