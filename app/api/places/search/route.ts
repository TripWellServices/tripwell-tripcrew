import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_RESULTS = 8

export type TextSearchCandidate = {
  place_id: string
  name: string
  formatted_address?: string
  rating?: number
  geometry?: { lat: number; lng: number }
}

/**
 * POST /api/places/search
 * Body: { query: string, locationBias?: { lat: number, lng: number, radiusMeters?: number } }
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }

    const params = new URLSearchParams({
      query,
      key: apiKey,
    })

    const bias = body.locationBias
    if (
      bias &&
      typeof bias === 'object' &&
      typeof bias.lat === 'number' &&
      typeof bias.lng === 'number' &&
      Number.isFinite(bias.lat) &&
      Number.isFinite(bias.lng)
    ) {
      const r =
        typeof bias.radiusMeters === 'number' && Number.isFinite(bias.radiusMeters)
          ? Math.min(50_000, Math.max(1_000, Math.round(bias.radiusMeters)))
          : 30_000
      params.set('location', `${bias.lat},${bias.lng}`)
      params.set('radius', String(r))
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error('Google Places Text Search failed')
    }

    const data = await res.json()
    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ results: [] satisfies TextSearchCandidate[] })
    }
    if (data.status !== 'OK' && data.status !== 'OK_WITH_WARNING') {
      return NextResponse.json(
        { error: data.status === 'INVALID_REQUEST' ? 'Invalid search' : 'Search failed' },
        { status: 400 }
      )
    }

    const raw = Array.isArray(data.results) ? data.results : []
    const results: TextSearchCandidate[] = raw.slice(0, MAX_RESULTS).map((r: Record<string, unknown>) => {
      const loc = r.geometry as { location?: { lat?: number; lng?: number } } | undefined
      const lat = loc?.location?.lat
      const lng = loc?.location?.lng
      const out: TextSearchCandidate = {
        place_id: String(r.place_id ?? ''),
        name: String(r.name ?? ''),
      }
      if (typeof r.formatted_address === 'string') {
        out.formatted_address = r.formatted_address
      }
      if (typeof r.rating === 'number' && Number.isFinite(r.rating)) {
        out.rating = r.rating
      }
      if (typeof lat === 'number' && typeof lng === 'number') {
        out.geometry = { lat, lng }
      }
      return out
    })

    return NextResponse.json({ results: results.filter((x) => x.place_id && x.name) })
  } catch (e) {
    console.error('places/search:', e)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
