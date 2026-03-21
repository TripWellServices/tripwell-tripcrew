import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SYSTEM = `You suggest 3–5 cities or towns for a trip. Prefer real places; include US and international when appropriate.
Return ONLY valid JSON:
{ "suggestions": [ { "name": "City or town name", "state": "US state code or null", "country": "Country name" } ] }
Rules:
- "state" is null for non-US places or DC (use state "DC" for Washington DC).
- At least 3 suggestions unless the user asked for one specific place (then you may return 1–2 close alternates).
- Do not include markdown or prose outside the JSON.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      whereText = '',
      region = '',
      something = '',
      whoGoing = '',
      vibes = '',
      experienceName,
      experienceCity,
    } = body as Record<string, string | undefined>

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      )
    }

    const userLines = [
      `Trip idea / where: ${whereText || '(not specified)'}`,
      region && `Region preference: ${region}`,
      something && `Activity / focus: ${something}`,
      whoGoing && `Who's going: ${whoGoing}`,
      vibes && `Vibe: ${vibes}`,
      experienceName &&
        `Anchored experience: ${experienceName}${experienceCity ? ` (near ${experienceCity})` : ''}`,
    ].filter(Boolean)

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
          { role: 'user', content: userLines.join('\n') },
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('OpenAI plan recommend error:', res.status, err)
      return NextResponse.json(
        { error: 'AI recommendations failed' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    let parsed: { suggestions?: Array<{ name?: string; state?: string | null; country?: string }> }
    try {
      parsed = JSON.parse(content) as typeof parsed
    } catch {
      return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 })
    }

    const raw = parsed.suggestions ?? []
    const suggestions = raw
      .filter((s) => s?.name && typeof s.name === 'string')
      .map((s) => ({
        name: String(s.name).trim(),
        state:
          s.state != null && String(s.state).trim()
            ? String(s.state).trim()
            : undefined,
        country: s.country?.trim() || 'USA',
      }))
      .filter((s) => s.name.length > 0)

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No valid suggestions from AI' },
        { status: 502 }
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
