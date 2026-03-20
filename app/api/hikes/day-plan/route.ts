import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeDayPlanSteps } from '@/lib/hike-day-plan'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are a day-trip planner for hiking. Given a home starting address, a trail/hike with optional trailhead coordinates, a calendar date, and a departure time from home, produce a realistic same-day schedule.

Rules:
- Include: leave home, drive to trailhead (estimate drive time from typical routes; be explicit if uncertain), arrive trailhead, hiking block using stated distance and duration when provided, a lunch stop (restaurant or trail picnic) after or integrated with the hike as appropriate, drive home, arrive home.
- Use 12-hour times with am/pm in the "time" field (e.g. "8:00am", "12:30pm").
- Times must progress forward through the day.
- "type" must be one of: drive, hike, lunch, rest, return, arrive, other
- Return ONLY valid JSON: { "steps": [ { "time": "...", "label": "...", "notes": "optional", "type": "drive" } ] }
- Do not invent exact GPS; use trailhead coordinates only if provided for context.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      hikeId,
      date,
      departureTime,
      homeAddress: homeFromBody,
      travelerId,
    } = body as {
      hikeId?: string
      date?: string
      departureTime?: string
      homeAddress?: string
      travelerId?: string
    }

    if (!hikeId?.trim()) {
      return NextResponse.json({ error: 'hikeId is required' }, { status: 400 })
    }
    if (!date?.trim()) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }
    if (!departureTime?.trim()) {
      return NextResponse.json({ error: 'departureTime is required' }, { status: 400 })
    }

    let homeAddress = typeof homeFromBody === 'string' ? homeFromBody.trim() : ''
    if (!homeAddress && travelerId) {
      const t = await prisma.traveler.findUnique({
        where: { id: travelerId },
        select: { homeAddress: true },
      })
      homeAddress = t?.homeAddress?.trim() ?? ''
    }
    if (!homeAddress) {
      return NextResponse.json(
        { error: 'homeAddress is required (save it in profile settings or enter below).' },
        { status: 400 }
      )
    }

    const hike = await prisma.hike.findUnique({
      where: { id: hikeId.trim() },
      include: { city: true },
    })
    if (!hike) {
      return NextResponse.json({ error: 'Hike not found' }, { status: 404 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      )
    }

    const hikeContext = {
      name: hike.name,
      trailOrPlace: hike.trailOrPlace,
      difficulty: hike.difficulty,
      distanceMi: hike.distanceMi,
      durationMin: hike.durationMin,
      routeType: hike.routeType,
      trailheadLat: hike.trailheadLat,
      trailheadLng: hike.trailheadLng,
      nearestTown: hike.nearestTown,
      city: hike.city
        ? `${hike.city.name}${hike.city.state ? `, ${hike.city.state}` : ''}`
        : null,
      notes: hike.notes,
    }

    const userContent = [
      `Date: ${date.trim()}`,
      `Depart home at: ${departureTime.trim()}`,
      `Home / start address: ${homeAddress}`,
      `Hike JSON: ${JSON.stringify(hikeContext)}`,
    ].join('\n')

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
        temperature: 0.35,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI day-plan error:', res.status, err)
      return NextResponse.json({ error: 'AI day plan failed' }, { status: 502 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 })
    }

    const steps = normalizeDayPlanSteps(parsed)
    if (steps.length === 0) {
      return NextResponse.json({ error: 'AI returned no steps' }, { status: 502 })
    }

    return NextResponse.json({
      steps,
      hike: {
        id: hike.id,
        name: hike.name,
        trailOrPlace: hike.trailOrPlace,
        distanceMi: hike.distanceMi,
        durationMin: hike.durationMin,
      },
      date: date.trim(),
      departureTime: departureTime.trim(),
      homeAddress,
    })
  } catch (error) {
    console.error('Day plan error:', error)
    return NextResponse.json({ error: 'Failed to build day plan' }, { status: 500 })
  }
}
