import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

