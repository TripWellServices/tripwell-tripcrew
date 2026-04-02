import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  isAllowedMemoryPhotoContentType,
  isHttpsPublicUrl,
  isValidMemoryStoragePath,
  MAX_TRIP_MEMORY_PHOTO_BYTES,
} from '@/lib/trip/memoryPhoto'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; memoryId: string }> }
) {
  try {
    const { tripId, memoryId } = await params
    const body = await request.json().catch(() => ({}))
    const {
      travelerId,
      storagePath,
      publicUrl,
      sortOrder,
      width,
      height,
      contentType,
      byteLength,
    } = body as {
      travelerId?: string
      storagePath?: string
      publicUrl?: string
      sortOrder?: number
      width?: number | null
      height?: number | null
      contentType?: string
      byteLength?: number
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    if (!storagePath?.trim() || !publicUrl?.trim()) {
      return NextResponse.json(
        { error: 'storagePath and publicUrl are required' },
        { status: 400 }
      )
    }

    const access = await getTripAccess(tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    if (!isHttpsPublicUrl(publicUrl)) {
      return NextResponse.json({ error: 'publicUrl must be https' }, { status: 400 })
    }

    if (!isValidMemoryStoragePath(tripId, memoryId, storagePath)) {
      return NextResponse.json(
        { error: 'storagePath must be under trip-memories/{tripId}/{memoryId}/' },
        { status: 400 }
      )
    }

    if (!contentType?.trim() || !isAllowedMemoryPhotoContentType(contentType)) {
      return NextResponse.json(
        { error: 'contentType required: image/jpeg, image/png, or image/webp' },
        { status: 400 }
      )
    }

    if (
      typeof byteLength === 'number' &&
      (byteLength < 1 || byteLength > MAX_TRIP_MEMORY_PHOTO_BYTES)
    ) {
      return NextResponse.json(
        { error: `Photo must be between 1 and ${MAX_TRIP_MEMORY_PHOTO_BYTES} bytes` },
        { status: 400 }
      )
    }

    const memory = await prisma.tripMemory.findFirst({
      where: { id: memoryId, tripId },
      include: { photos: { select: { sortOrder: true } } },
    })

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    if (memory.authorTravelerId !== travelerId) {
      return NextResponse.json(
        { error: 'Only the author can add photos to this memory' },
        { status: 403 }
      )
    }

    const maxOrder = memory.photos.reduce((m, p) => Math.max(m, p.sortOrder), -1)
    const nextOrder =
      typeof sortOrder === 'number' && Number.isFinite(sortOrder) ? sortOrder : maxOrder + 1

    const photo = await prisma.tripMemoryPhoto.create({
      data: {
        memoryId,
        storagePath: storagePath.trim(),
        publicUrl: publicUrl.trim(),
        sortOrder: nextOrder,
        width: typeof width === 'number' ? width : null,
        height: typeof height === 'number' ? height : null,
      },
    })

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Memory photo POST error:', error)
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 })
  }
}
