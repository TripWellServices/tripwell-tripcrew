import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  isAllowedMemoryPhotoContentType,
  isHttpsPublicUrl,
  isValidMemoryStoragePath,
  MAX_TRIP_MEMORY_PHOTO_BYTES,
} from '@/lib/trip/memoryPhoto'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  try {
    const { memoryId } = await params
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

    if (!isHttpsPublicUrl(publicUrl)) {
      return NextResponse.json({ error: 'publicUrl must be https' }, { status: 400 })
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
      where: { id: memoryId, authorTravelerId: travelerId },
      include: { photos: { select: { sortOrder: true } } },
    })

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    if (!isValidMemoryStoragePath(memoryId, storagePath, memory.tripId)) {
      return NextResponse.json(
        { error: 'storagePath must be under memories/{memoryId}/ (or legacy trip path)' },
        { status: 400 }
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
    console.error('Traveler memory photo POST error:', error)
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 })
  }
}
