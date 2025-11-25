'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

// Firebase config from TripWell OG frontend
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCjpoH763y2GH4VDc181IUBaZHqE_ryZ1c',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gofast-a5f94.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gofast-a5f94',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'gofast-a5f94.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '500941094498',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:500941094498:web:eee09da6918f9e53889b3b',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-L0NGHRBSDE',
}

// Initialize Firebase with error handling (matching TripWell OG)
let app: FirebaseApp | undefined
let auth: Auth | undefined

if (typeof window !== 'undefined') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    console.log('✅ Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Firebase initialization error:', error)
    // Fallback initialization
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
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

