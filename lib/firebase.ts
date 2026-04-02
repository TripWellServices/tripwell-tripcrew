/**
 * Auth, Storage, Analytics — imports `firebaseClientApp` from `lib/firebaseClient.ts`
 * (IgniteBd-Next-combine pattern).
 */

'use client'

import type { Analytics } from 'firebase/analytics'
import { getAnalytics } from 'firebase/analytics'
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { firebaseClientApp } from '@/lib/firebaseClient'

export const app = firebaseClientApp

export const auth: Auth = getAuth(firebaseClientApp)

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to set auth persistence:', err)
})

const storage: FirebaseStorage = getStorage(firebaseClientApp)

let analytics: Analytics | undefined
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(firebaseClientApp)
  } catch {
    /* measurement optional */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.error?.message?.includes('IndexedDB')) {
      console.warn('⚠️ IndexedDB error detected, this is usually harmless:', event.error.message)
      event.preventDefault()
    }
  })
}

export const getFirebaseAuth = (): Auth => auth

export const getFirebaseAnalytics = (): Analytics | undefined => analytics

export const getFirebaseStorage = (): FirebaseStorage => storage
