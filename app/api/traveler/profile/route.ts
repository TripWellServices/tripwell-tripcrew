import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/traveler/profile
 * 
 * Update Traveler profile information
 * Requires Firebase authentication
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      hometownCity,
      state,
      persona,
      planningStyle,
      dreamDestination,
    } = body

    // TODO: Add Firebase token verification
    // For now, we'll use email to find traveler
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find traveler by email
    const traveler = await prisma.traveler.findUnique({
      where: { email },
    })

    if (!traveler) {
      return NextResponse.json(
        { error: 'Traveler not found' },
        { status: 404 }
      )
    }

        // Update traveler profile with all fields
        const updatedTraveler = await prisma.traveler.update({
          where: { id: traveler.id },
          data: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            hometownCity: hometownCity || undefined,
            homeState: state || undefined,
            persona: persona || undefined,
            planningStyle: planningStyle || undefined,
            dreamDestination: dreamDestination || undefined,
          },
        })

    return NextResponse.json({
      success: true,
      traveler: updatedTraveler,
    })
  } catch (error: any) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}

