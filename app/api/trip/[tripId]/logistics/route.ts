import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { title, detail } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const item = await prisma.logisticItem.create({
      data: {
        tripId: params.tripId,
        title,
        detail,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Logistics create error:', error)
    return NextResponse.json(
      { error: 'Failed to create logistics item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { id, title, detail, isComplete } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const item = await prisma.logisticItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(detail !== undefined && { detail }),
        ...(isComplete !== undefined && { isComplete }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Logistics update error:', error)
    return NextResponse.json(
      { error: 'Failed to update logistics item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    await prisma.logisticItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logistics delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete logistics item' },
      { status: 500 }
    )
  }
}

