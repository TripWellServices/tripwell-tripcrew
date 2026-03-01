import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Stub: AI region recommendation based on "where", region, something, who's going, vibes.
 * Returns suggested cities/regions. Replace with real AI (e.g. OpenAI) when ready.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      whereText = '',
      region = '',
      something = '',
      whoGoing = '',
      vibes = '',
    } = body

    // Stub: return a few sample recommendations. In production, call LLM with context.
    const suggestions: Array<{ name: string; state?: string; country: string }> = []

    const lowerWhere = (whereText as string).toLowerCase()
    const lowerRegion = (region as string).toLowerCase()
    const lowerVibes = (vibes as string).toLowerCase()

    if (lowerWhere.includes('beach') || lowerRegion.includes('southeast') || lowerVibes.includes('relax')) {
      suggestions.push({ name: 'Virginia Beach', state: 'VA', country: 'USA' })
      suggestions.push({ name: 'Miami Beach', state: 'FL', country: 'USA' })
    }
    if (lowerWhere.includes('concert') || lowerWhere.includes('dc') || lowerRegion.includes('mid-atlantic')) {
      suggestions.push({ name: 'Washington', state: 'DC', country: 'USA' })
    }
    if (lowerWhere.includes('nyc') || lowerWhere.includes('new york') || lowerRegion.includes('northeast')) {
      suggestions.push({ name: 'New York', state: 'NY', country: 'USA' })
    }
    if (lowerWhere.includes('europe') || lowerRegion.includes('europe')) {
      suggestions.push({ name: 'Paris', country: 'France' })
      suggestions.push({ name: 'Barcelona', country: 'Spain' })
    }

    // If nothing matched, return defaults
    if (suggestions.length === 0) {
      suggestions.push(
        { name: 'Washington', state: 'DC', country: 'USA' },
        { name: 'Virginia Beach', state: 'VA', country: 'USA' },
        { name: 'New York', state: 'NY', country: 'USA' }
      )
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Plan recommend error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}
