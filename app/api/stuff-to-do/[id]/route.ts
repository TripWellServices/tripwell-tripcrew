import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StuffToDoType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const item = await prisma.stuffToDoItem.findUnique({
      where: { id },
      include: { city: true },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Stuff to do item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Stuff-to-do fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stuff to do item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { season, type, name, description } = body

    const existing = await prisma.stuffToDoItem.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Stuff to do item not found' },
        { status: 404 }
      )
    }

    const data: Record<string, unknown> = {}
    if (season !== undefined) data.season = season?.trim() || 'any'
    if (type !== undefined && Object.values(StuffToDoType).includes(type))
      data.type = type
    if (name !== undefined) data.name = name?.trim() ?? existing.name
    if (description !== undefined)
      data.description = description?.trim() || null

    const updated = await prisma.stuffToDoItem.update({
      where: { id },
      data,
      include: { city: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Stuff-to-do update error:', error)
    return NextResponse.json(
      { error: 'Failed to update stuff to do item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.stuffToDoItem.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Stuff to do item not found' },
        { status: 404 }
      )
    }

    await prisma.stuffToDoItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Stuff-to-do delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete stuff to do item' },
      { status: 500 }
    )
  }
}
