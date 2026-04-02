/**
 * Firebase app singleton — IgniteBd-Next-combine / gofast-appbuildmvp pattern:
 * minimal `initializeApp` only; auth/storage/analytics live in `lib/firebase.ts`.
 *
 * Client-only. Hardcoded TripWell Console config (no NEXT_PUBLIC_* required).
 */

'use client'

import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyBeYbEC-ZDdPCFV6aUgw0GhDSFqhGYQFH4',
  authDomain: 'tripwell-794c9.firebaseapp.com',
  projectId: 'tripwell-794c9',
  storageBucket: 'tripwell-794c9.firebasestorage.app',
  messagingSenderId: '841880382902',
  appId: '1:841880382902:web:72c9514c21d7d6c4dae517',
  measurementId: 'G-MMJEC80CNB',
}

export const firebaseClientApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
