import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/traveler/profile?travelerId=...
 * Returns home location fields for prefilling trip forms (no auth — matches other traveler-id flows).
 */
export async function GET(request: NextRequest) {
  try {
    const travelerId = new URL(request.url).searchParams.get('travelerId')?.trim()
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const traveler = await prisma.traveler.findUnique({
      where: { id: travelerId },
      select: {
        hometownCity: true,
        homeState: true,
        homeAddress: true,
      },
    })

    if (!traveler) {
      return NextResponse.json({ error: 'Traveler not found' }, { status: 404 })
    }

    return NextResponse.json({
      hometownCity: traveler.hometownCity,
      homeState: traveler.homeState,
      homeAddress: traveler.homeAddress,
    })
  } catch (error) {
    console.error('PROFILE GET error:', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

/**
 * PUT /api/traveler/profile
 * 
 * Upsert Traveler profile information by firebaseId
 * Uses firebaseId from request body (sent from client localStorage)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firebaseId, // Required - from localStorage
      firstName,
      lastName,
      email,
      hometownCity,
      state,
      homeAddress,
      persona,
      planningStyle,
      dreamDestination,
    } = body

    // Require firebaseId to identify traveler
    if (!firebaseId) {
      return NextResponse.json(
        { error: 'firebaseId is required' },
        { status: 400 }
      )
    }

    console.log('📝 PROFILE UPDATE: Upserting traveler profile for firebaseId:', firebaseId)

    // Upsert traveler by firebaseId (find or create)
    // This ensures the traveler exists and updates all profile fields
    const updatedTraveler = await prisma.traveler.upsert({
      where: { firebaseId },
      update: {
        // Update all profile fields
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        hometownCity: hometownCity || undefined,
        homeState: state || undefined,
        homeAddress:
          homeAddress !== undefined
            ? typeof homeAddress === 'string'
              ? homeAddress.trim() || null
              : null
            : undefined,
        persona: persona || undefined,
        planningStyle: planningStyle || undefined,
        dreamDestination: dreamDestination || undefined,
      },
      create: {
        // Create if doesn't exist (shouldn't happen, but safe fallback)
        firebaseId,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        hometownCity: hometownCity || null,
        homeState: state || null,
        homeAddress:
          typeof homeAddress === 'string' ? homeAddress.trim() || null : null,
        persona: persona || null,
        planningStyle: planningStyle || null,
        dreamDestination: dreamDestination || null,
      },
    })

    console.log('✅ PROFILE UPDATE: Traveler profile updated:', updatedTraveler.id)

    return NextResponse.json({
      success: true,
      traveler: updatedTraveler,
    })
  } catch (error: any) {
    console.error('❌ PROFILE UPDATE: Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

