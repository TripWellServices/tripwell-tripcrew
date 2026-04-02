import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebaseAdmin'
import { TravelerFindOrCreateService } from '@/lib/services/TravelerFindOrCreateService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/traveler/create
 *
 * Same trust model as GoFast POST `/api/athlete/create`: `Authorization: Bearer` only;
 * `firebaseId` and profile fields come from the verified ID token (optional body overrides).
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {}
    try {
      const raw = await request.json()
      if (raw && typeof raw === 'object') body = raw as Record<string, unknown>
    } catch {
      body = {}
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let decoded: {
      uid: string
      email?: string
      name?: string
      picture?: string
    }
    try {
      decoded = await adminAuth.verifyIdToken(authHeader.substring(7))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (
        msg.includes('Firebase Admin env vars missing') ||
        msg.includes('Firebase Admin initialization failed')
      ) {
        return NextResponse.json(
          { success: false, error: 'Server auth not configured' },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const firebaseId = decoded.uid
    const email =
      (typeof body.email === 'string' ? body.email : undefined) ??
      decoded.email ??
      undefined
    const displayName =
      (typeof body.name === 'string' ? body.name : undefined) ??
      decoded.name ??
      undefined
    const picture =
      (typeof body.picture === 'string' ? body.picture : undefined) ??
      decoded.picture ??
      undefined

    const traveler = await TravelerFindOrCreateService.findOrCreate({
      firebaseId,
      email,
      displayName,
      picture,
    })

    return NextResponse.json({
      success: true,
      travelerId: traveler.id,
      traveler,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create or find traveler'
    console.error('TRAVELER CREATE error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
