import { prisma } from '@/lib/prisma'
import { adminAuth } from '@/lib/firebaseAdmin'
import { TRAVELER_ID_HEADER } from '@/lib/tripwell-request-headers'

/**
 * Resolve the signed-in traveler: Firebase JWT proves identity; `x-traveler-id` is PK lookup
 * (no firebaseId table scan). Mirrors `requireAthleteFromBearer` in gofastapp-mvp.
 */
export async function requireTravelerFromBearer(request: Request) {
  const travelerId = request.headers.get(TRAVELER_ID_HEADER)?.trim()
  if (!travelerId) {
    return {
      error: 'Missing traveler session header' as const,
      status: 400 as const,
    }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized' as const, status: 401 as const }
  }

  let decoded: { uid: string }
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.substring(7))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (
      msg.includes('Firebase Admin not configured') ||
      msg.includes('Firebase Admin env vars missing') ||
      msg.includes('Firebase Admin initialization failed') ||
      msg.includes('FIREBASE_SERVICE_ACCOUNT_JSON')
    ) {
      return { error: 'Server auth not configured' as const, status: 503 as const }
    }
    return { error: 'Invalid token' as const, status: 401 as const }
  }

  const traveler = await prisma.traveler.findUnique({
    where: { id: travelerId },
    select: { id: true, firebaseId: true },
  })
  if (!traveler) {
    return { error: 'Traveler not found' as const, status: 404 as const }
  }
  if (traveler.firebaseId !== decoded.uid) {
    return { error: 'Forbidden' as const, status: 403 as const }
  }

  return { traveler }
}
