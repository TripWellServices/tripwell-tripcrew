import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const item = await prisma.packItem.create({
      data: {
        tripId: params.tripId,
        title,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Pack item create error:', error)
    return NextResponse.json(
      { error: 'Failed to create pack item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { id, title, isPacked } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    const item = await prisma.packItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(isPacked !== undefined && { isPacked }),
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Pack item update error:', error)
    return NextResponse.json(
      { error: 'Failed to update pack item' },
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

    await prisma.packItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Pack item delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pack item' },
      { status: 500 }
    )
  }
}

