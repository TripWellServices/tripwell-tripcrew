import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SYSTEM_DINING = `You extract dining/restaurant info from pasted text (reviews, notes, messages, descriptions).

Return ONLY one JSON object with keys: title (string, required place name), category (string or null, e.g. italian, cafe, bar), description (string or null, concise summary for travelers).

Do not include markdown. Use null for unknown. Do not invent a place name if the text does not mention one.`

const SYSTEM_ATTRACTION = `You extract sight/attraction info from pasted text (reviews, notes, messages, descriptions).

Return ONLY one JSON object with keys: title (string, required place or attraction name), category (string or null, e.g. museum, park, tour), description (string or null, concise summary for travelers).

Do not include markdown. Use null for unknown. Do not invent a name if the text does not mention one.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const type = body.type === 'attraction' ? 'attraction' : body.type === 'dining' ? 'dining' : null

    if (!type) {
      return NextResponse.json({ error: 'type must be dining or attraction' }, { status: 400 })
    }
    if (text.length < 10) {
      return NextResponse.json({ error: 'Paste at least 10 characters' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured' },
        { status: 503 }
      )
    }

    const system = type === 'dining' ? SYSTEM_DINING : SYSTEM_ATTRACTION

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.slice(0, 12_000) },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('parse-paste OpenAI error:', res.status, err)
      return NextResponse.json({ error: 'AI parsing failed' }, { status: 502 })
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
      parsed = JSON.parse(content) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid AI JSON' }, { status: 502 })
    }

    const p = parsed as Record<string, unknown>
    const title = typeof p.title === 'string' ? p.title.trim() : ''
    if (!title) {
      return NextResponse.json(
        { error: 'Could not find a place name in that text' },
        { status: 422 }
      )
    }

    const category = typeof p.category === 'string' ? p.category.trim() || null : null
    const description = typeof p.description === 'string' ? p.description.trim() || null : null

    return NextResponse.json({ title, category, description })
  } catch (e) {
    console.error('parse-paste:', e)
    return NextResponse.json({ error: 'Failed to parse' }, { status: 500 })
  }
}
