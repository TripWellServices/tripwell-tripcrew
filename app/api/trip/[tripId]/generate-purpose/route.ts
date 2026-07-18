import { NextRequest, NextResponse } from 'next/server'
import { getTripAccess } from '@/lib/trip/assertTripAccess'

export const dynamic = 'force-dynamic'

const PURPOSE_SYSTEM = `You write concise trip purpose text for a travel planning app.

Return ONLY valid JSON:
{
  "title": string | null,
  "purpose": string
}

Rules:
- purpose: 1-2 sentences explaining why the traveler is going — friendly and specific.
- title: optional improved trip title if the current one is weak or empty.
- Use provided destination, dates, event, lodging, and flight hints when available.
- Do not invent facts not supported by the context.`

export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { travelerId, context } = body as {
      travelerId?: string
      context?: Record<string, unknown>
    }

    if (!travelerId?.trim()) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId.trim())
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI generation is not configured (missing OPENAI_API_KEY).' },
        { status: 503 }
      )
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: PURPOSE_SYSTEM },
          {
            role: 'user',
            content: `Generate trip title/purpose from this context:\n${JSON.stringify(context ?? {}, null, 2)}`,
          },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      console.error('generate-purpose OpenAI error:', res.status, await res.text())
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const parsed = JSON.parse(content) as { title?: string | null; purpose?: string }
    return NextResponse.json({
      title: typeof parsed.title === 'string' ? parsed.title.trim() : null,
      purpose: typeof parsed.purpose === 'string' ? parsed.purpose.trim() : '',
    })
  } catch (error) {
    console.error('generate-purpose error:', error)
    return NextResponse.json({ error: 'Failed to generate purpose' }, { status: 500 })
  }
}
