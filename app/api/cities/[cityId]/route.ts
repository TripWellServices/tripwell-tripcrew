import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    const { cityId } = await params

    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        stuffToDoItems: { orderBy: [{ season: 'asc' }, { name: 'asc' }] },
      },
    })

    if (!city) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 })
    }

    return NextResponse.json(city)
  } catch (error) {
    console.error('City fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch city' },
      { status: 500 }
    )
  }
}
