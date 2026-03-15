import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type DiscoverType = 'concert' | 'hike' | 'dining' | 'attraction'

interface Suggestion {
  name: string
  subtitle?: string   // artist, trail name, category, etc.
  detail?: string     // venue, difficulty, address, etc.
  url?: string
  notes?: string
}

/**
 * POST /api/discover
 * Body: { city: string, state?: string, type: DiscoverType }
 *
 * Returns AI-generated suggestions for things to do in the given city.
 * Stub implementation — replace the suggestion logic with a real OpenAI call
 * when ready (see "TODO: OpenAI" comment below).
 *
 * Also used to SAVE a suggestion to the global city catalogue:
 * POST /api/discover/save  (separate route, same file via Next.js segment)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { city = '', state = '', type } = body as { city: string; state?: string; type: DiscoverType }

    if (!city.trim()) {
      return NextResponse.json({ error: 'city is required' }, { status: 400 })
    }
    if (!type || !['concert', 'hike', 'dining', 'attraction'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be concert, hike, dining, or attraction' },
        { status: 400 }
      )
    }

    // TODO: OpenAI — replace stub below with:
    //   const completion = await openai.chat.completions.create({
    //     model: 'gpt-4o',
    //     messages: [{ role: 'user', content: buildPrompt(city, state, type) }],
    //     response_format: { type: 'json_object' },
    //   })
    //   const suggestions = JSON.parse(completion.choices[0].message.content).suggestions

    const suggestions = getStubSuggestions(city, state, type)

    return NextResponse.json({ city, state, type, suggestions })
  } catch (error) {
    console.error('Discover POST error:', error)
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
  }
}

function getStubSuggestions(city: string, _state: string, type: DiscoverType): Suggestion[] {
  const cityLower = city.toLowerCase()

  if (type === 'concert') {
    if (cityLower.includes('nashville')) {
      return [
        { name: 'Live at the Ryman', subtitle: 'Various Artists', detail: 'Ryman Auditorium', url: 'https://ryman.com' },
        { name: 'Bridgestone Arena Show', subtitle: 'Check listing', detail: 'Bridgestone Arena' },
        { name: 'Bluebird Cafe Open Mic', subtitle: 'Songwriters in the round', detail: 'Bluebird Cafe' },
      ]
    }
    if (cityLower.includes('new york') || cityLower.includes('nyc')) {
      return [
        { name: 'Madison Square Garden', subtitle: 'Check current shows', detail: 'MSG, Midtown Manhattan' },
        { name: 'Brooklyn Steel', subtitle: 'Indie & alternative', detail: 'Brooklyn' },
        { name: 'Radio City Music Hall', subtitle: 'Iconic NYC venue', detail: 'Midtown' },
      ]
    }
    return [
      { name: `${city} Summer Music Festival`, subtitle: 'Local artists', detail: 'City Amphitheater' },
      { name: `Live at the ${city} Arena`, subtitle: 'Check listing', detail: 'Main Arena' },
    ]
  }

  if (type === 'hike') {
    if (cityLower.includes('los angeles') || cityLower.includes('la')) {
      return [
        { name: 'Griffith Park Loop', subtitle: 'Griffith Park', detail: 'Moderate · 6.5 mi', notes: 'Great views of the Hollywood Sign' },
        { name: 'Runyon Canyon', subtitle: 'Runyon Canyon Park', detail: 'Easy · 3.3 mi' },
        { name: 'Eagle Rock Loop', subtitle: 'Topanga State Park', detail: 'Hard · 8 mi' },
      ]
    }
    if (cityLower.includes('denver') || cityLower.includes('boulder')) {
      return [
        { name: 'Chautauqua Trail', subtitle: 'Chautauqua Park', detail: 'Moderate · 3.9 mi' },
        { name: 'Royal Arch Trail', subtitle: 'Boulder Open Space', detail: 'Hard · 3.4 mi' },
        { name: 'South Boulder Peak', subtitle: 'OSMP', detail: 'Hard · 9 mi' },
      ]
    }
    return [
      { name: `${city} Nature Trail`, subtitle: 'Local park', detail: 'Easy · 2 mi' },
      { name: `${city} Ridge Loop`, subtitle: 'State park', detail: 'Moderate · 5 mi' },
    ]
  }

  if (type === 'dining') {
    if (cityLower.includes('nashville')) {
      return [
        { name: 'Prince\'s Hot Chicken', subtitle: 'Hot Chicken', detail: '123 Ewing Dr', notes: 'The OG Nashville hot chicken' },
        { name: 'The Catbird Seat', subtitle: 'Fine Dining', detail: '1711 Division St' },
        { name: 'Biscuit Love', subtitle: 'Brunch', detail: 'The Gulch' },
      ]
    }
    return [
      { name: `${city} Public Market`, subtitle: 'Local food hall', detail: 'Downtown' },
      { name: `The ${city} Kitchen`, subtitle: 'American', detail: 'Main Street' },
    ]
  }

  if (type === 'attraction') {
    if (cityLower.includes('nashville')) {
      return [
        { name: 'Country Music Hall of Fame', subtitle: 'Museum', detail: '222 Rep. John Lewis Way S' },
        { name: 'The Parthenon', subtitle: 'Landmark', detail: 'Centennial Park' },
        { name: 'Broadway Honky Tonks', subtitle: 'Entertainment District', detail: 'Lower Broadway' },
      ]
    }
    if (cityLower.includes('new york') || cityLower.includes('nyc')) {
      return [
        { name: 'Central Park', subtitle: 'Park', detail: 'Midtown Manhattan' },
        { name: 'The High Line', subtitle: 'Urban park', detail: 'Chelsea' },
        { name: 'Brooklyn Bridge Walk', subtitle: 'Landmark', detail: 'DUMBO, Brooklyn' },
      ]
    }
    return [
      { name: `${city} Art Museum`, subtitle: 'Museum', detail: 'Downtown' },
      { name: `${city} Historic District`, subtitle: 'Landmark', detail: 'Old Town' },
    ]
  }

  return []
}

/**
 * PUT /api/discover — Save a suggestion to the global city catalogue.
 * Creates City (upsert) + the first-class record.
 * Body: { city, state, country, type, suggestion: Suggestion }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      city: cityName,
      state,
      country = 'USA',
      type,
      suggestion,
    } = body as {
      city: string
      state?: string
      country?: string
      type: DiscoverType
      suggestion: Suggestion
    }

    if (!cityName?.trim() || !type || !suggestion?.name) {
      return NextResponse.json({ error: 'city, type, and suggestion.name are required' }, { status: 400 })
    }

    // Upsert City so catalogue saves always resolve to a real City row
    // Note: Prisma's generated TypeScript types for compound unique constraints with nullable
    // fields don't properly handle null, but the runtime accepts it. Using type assertion.
    const city = await prisma.city.upsert({
      where: {
        name_state_country: {
          name: cityName.trim(),
          state: state?.trim() ?? null,
          country: country.trim(),
        } as any,
      },
      update: {},
      create: {
        name: cityName.trim(),
        state: state?.trim() || null,
        country: country.trim(),
      },
    })

    let saved: unknown

    if (type === 'concert') {
      saved = await prisma.concert.create({
        data: {
          name: suggestion.name,
          artist: suggestion.subtitle ?? null,
          venue: suggestion.detail ?? null,
          url: suggestion.url ?? null,
          description: suggestion.notes ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'hike') {
      saved = await prisma.hike.create({
        data: {
          name: suggestion.name,
          trailOrPlace: suggestion.subtitle ?? null,
          difficulty: suggestion.detail?.split('·')[0]?.trim() ?? null,
          notes: suggestion.notes ?? null,
          url: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'dining') {
      saved = await prisma.dining.create({
        data: {
          title: suggestion.name,
          category: suggestion.subtitle ?? null,
          address: suggestion.detail ?? null,
          website: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else if (type === 'attraction') {
      saved = await prisma.attraction.create({
        data: {
          title: suggestion.name,
          category: suggestion.subtitle ?? null,
          address: suggestion.detail ?? null,
          website: suggestion.url ?? null,
          cityId: city.id,
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ city, type, saved }, { status: 201 })
  } catch (error) {
    console.error('Discover PUT error:', error)
    return NextResponse.json({ error: 'Failed to save to catalogue' }, { status: 500 })
  }
}
