import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  parseConcertScheduleItems,
  type ConcertScheduleItemInput,
} from '@/lib/concert-event-window'

export const dynamic = 'force-dynamic'

async function getConcertOr404(id: string) {
  const concert = await prisma.concert.findUnique({ where: { id } })
  if (!concert) return null
  return concert
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const concert = await getConcertOr404(id)
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }
    const items = await prisma.concertScheduleItem.findMany({
      where: { concertId: id },
      orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }, { title: 'asc' }],
    })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Concert schedule list error:', error)
    return NextResponse.json(
      { error: 'Failed to list schedule items' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const concert = await getConcertOr404(id)
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const items = parseConcertScheduleItems(
      Array.isArray(body.items) ? body.items : [body as ConcertScheduleItemInput]
    )
    if (!items.length) {
      return NextResponse.json(
        { error: 'At least one schedule item with title is required' },
        { status: 400 }
      )
    }

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.concertScheduleItem.create({
          data: {
            concertId: id,
            title: item.title,
            artist: item.artist,
            stage: item.stage,
            location: item.location,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            notes: item.notes,
            sortOrder: item.sortOrder,
          },
        })
      )
    )

    return NextResponse.json({ items: created }, { status: 201 })
  } catch (error) {
    console.error('Concert schedule create error:', error)
    return NextResponse.json(
      { error: 'Failed to create schedule items' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const concert = await getConcertOr404(id)
    if (!concert) {
      return NextResponse.json({ error: 'Concert not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const items = parseConcertScheduleItems(body.items)
    if (!items.length) {
      return NextResponse.json(
        { error: 'items array with at least one titled row is required' },
        { status: 400 }
      )
    }

    const replaced = await prisma.$transaction(async (tx) => {
      await tx.concertScheduleItem.deleteMany({ where: { concertId: id } })
      return Promise.all(
        items.map((item) =>
          tx.concertScheduleItem.create({
            data: {
              concertId: id,
              title: item.title,
              artist: item.artist,
              stage: item.stage,
              location: item.location,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              notes: item.notes,
              sortOrder: item.sortOrder,
            },
          })
        )
      )
    })

    return NextResponse.json({ items: replaced })
  } catch (error) {
    console.error('Concert schedule replace error:', error)
    return NextResponse.json(
      { error: 'Failed to replace schedule items' },
      { status: 500 }
    )
  }
}
