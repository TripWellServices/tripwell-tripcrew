import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFirebaseIdTokenFromBearer } from '@/lib/auth/verifyFirebaseIdToken'

export const dynamic = 'force-dynamic'

/** GET /api/traveler/me — resolve Firebase token to DB traveler id (welcome gate; same idea as GoFast GET /api/athlete/me) */
export async function GET(request: NextRequest) {
  const authResult = await verifyFirebaseIdTokenFromBearer(
    request.headers.get('authorization')
  )
  if ('error' in authResult) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    )
  }

  const traveler = await prisma.traveler.findUnique({
    where: { firebaseId: authResult.uid },
    select: { id: true },
  })
  if (!traveler) {
    return NextResponse.json(
      { success: false, error: 'Traveler not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, travelerId: traveler.id })
}
