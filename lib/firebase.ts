'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { TRIPWELL_FIREBASE_PROJECT_ID_DEFAULT } from '@/config/firebaseProjectDefaults'

// Firebase config for TripWell (separate project from GoFast).
// NEXT_PUBLIC_* env vars are optional; defaults match `config/firebaseProjectDefaults.ts` project id.
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

// Initialize Firebase with error handling (matching TripWell OG)
let app: FirebaseApp | undefined
let auth: Auth | undefined
let storage: FirebaseStorage | undefined

if (typeof window !== 'undefined') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    storage = getStorage(app)
    console.log('✅ Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
    // Fallback initialization
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

// Export typed auth for server-side usage (when available)
export { app, auth }

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error(
      'Firebase Storage not initialized. Call only on the client after Firebase loads.'
    )
  }
  return storage
}

