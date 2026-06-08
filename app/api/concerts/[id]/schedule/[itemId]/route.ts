import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseConcertScheduleItems } from '@/lib/concert-event-window'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const existing = await prisma.concertScheduleItem.findFirst({
      where: { id: itemId, concertId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = parseConcertScheduleItems([{ ...existing, ...body }])[0]
    if (!parsed) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const updated = await prisma.concertScheduleItem.update({
      where: { id: itemId },
      data: {
        title: parsed.title,
        artist: parsed.artist,
        stage: parsed.stage,
        location: parsed.location,
        date: parsed.date,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        notes: parsed.notes,
        sortOrder: parsed.sortOrder,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Concert schedule item update error:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
    const existing = await prisma.concertScheduleItem.findFirst({
      where: { id: itemId, concertId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Schedule item not found' }, { status: 404 })
    }

    await prisma.concertScheduleItem.delete({ where: { id: itemId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Concert schedule item delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule item' },
      { status: 500 }
    )
  }
}
