import { getApps, initializeApp, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App | null = null

export function getFirebaseAdmin() {
  if (adminApp) {
    return adminApp
  }

  if (getApps().length === 0) {
    // For now, we'll use the client SDK approach
    // In production, you'd use service account credentials
    // For MVP, we can verify tokens client-side or use a different approach
    throw new Error('Firebase Admin not configured. Use client-side auth verification for MVP.')
  }

  adminApp = getApps()[0]
  return adminApp
}

// For MVP, we'll verify tokens client-side
// This is a placeholder - in production use service account
export function verifyIdToken(token: string) {
  // This would use Firebase Admin SDK in production
  // For MVP, we'll handle this differently
  return Promise.resolve(null)
}

