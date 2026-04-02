import { adminAuth } from '@/lib/firebaseAdmin'

/**
 * Verifies `Authorization: Bearer <Firebase ID token>` and returns the Firebase uid.
 * Same trust model as GoFast `requireAthleteFromBearer` (identity from JWT, not request body).
 */
export async function verifyFirebaseIdTokenFromBearer(
  authHeader: string | null
): Promise<{ uid: string } | { error: string; status: number }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }

  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
    return { uid: decoded.uid }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (
      msg.includes('Firebase Admin not configured') ||
      msg.includes('Firebase Admin env vars missing') ||
      msg.includes('Firebase Admin initialization failed') ||
      msg.includes('FIREBASE_SERVICE_ACCOUNT')
    ) {
      return { error: 'Server auth not configured', status: 503 }
    }
    return { error: 'Invalid or expired token', status: 401 }
  }
}
