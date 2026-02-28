import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; destinationId: string }> }
) {
  try {
    const { tripId, destinationId } = await params

    const destination = await prisma.destination.findFirst({
      where: { id: destinationId, tripId },
      include: { city: true },
    })
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(destination)
  } catch (error) {
    console.error('Destination fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch destination' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; destinationId: string }> }
) {
  try {
    const { tripId, destinationId } = await params
    const body = await request.json()
    const { name, state, country, order } = body

    const destination = await prisma.destination.findFirst({
      where: { id: destinationId, tripId },
    })
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.destination.update({
      where: { id: destinationId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(state !== undefined && { state: state?.trim() || null }),
        ...(country !== undefined && { country: country?.trim() || null }),
        ...(typeof order === 'number' && { order }),
      },
      include: { city: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Destination update error:', error)
    return NextResponse.json(
      { error: 'Failed to update destination' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; destinationId: string }> }
) {
  try {
    const { tripId, destinationId } = await params

    const destination = await prisma.destination.findFirst({
      where: { id: destinationId, tripId },
    })
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    await prisma.destination.delete({
      where: { id: destinationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Destination delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete destination' },
      { status: 500 }
    )
  }
}
