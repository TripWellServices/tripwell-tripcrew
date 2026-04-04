import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'

const SYSTEM = `You are a concise travel editor. Given a city (and optional region/country), return ONLY valid JSON with this shape:
{
  "tagline": "one short hook line",
  "description": "2-4 sentences on what to do and why visit",
  "bestTimeToVisit": "when to go (seasons or months, one short phrase)",
  "attractionNames": ["5-12 short names of things to see/do — no long sentences"],
  "country": "full country name for this exact city (e.g. Italy, United States) — required when the user did not specify a country; disambiguate famous duplicates (Naples → Italy vs Naples, Florida)"
}
Rules: real places only; attractionNames are labels the user might save as catalogue items later. No markdown outside JSON.`

/**
 * Ensures a City row exists and fills guide fields via OpenAI when still empty.
 * Does not create citySlug or touch published guides — only catalogue enrichment.
 */
export async function enrichCityCatalogIfNeeded(input: {
  cityName: string
  state?: string | null
  country?: string | null
}): Promise<void> {
  const cityName = input.cityName?.trim()
  if (!cityName) return

  const stateVal =
    typeof input.state === 'string' && input.state.trim() ? input.state.trim() : null
  const countryFromUser =
    typeof input.country === 'string' && input.country.trim()
      ? input.country.trim()
      : null

  const cityRow = await upsertCityByName({
    name: cityName,
    state: stateVal,
    country: countryFromUser ?? 'USA',
  })

  const existing = await prisma.city.findUnique({
    where: { id: cityRow.id },
    select: {
      description: true,
      tagline: true,
      attractionNames: true,
    },
  })
  if (!existing) return

  const hasContent =
    (existing.description?.trim() ?? '').length > 0 ||
    (existing.tagline?.trim() ?? '').length > 0 ||
    (existing.attractionNames?.length ?? 0) > 0
  if (hasContent) return

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('enrichCityCatalogIfNeeded: OPENAI_API_KEY not set')
    return
  }

  const placeLabel = countryFromUser
    ? `${cityName}${stateVal ? `, ${stateVal}` : ''}, ${countryFromUser}`
    : `${cityName}${stateVal ? `, ${stateVal}` : ''}`

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
        {
          role: 'user',
          content: countryFromUser
            ? `Destination: ${placeLabel}`
            : `Destination: ${placeLabel}. The user did not specify a country — infer the correct country for this place and set the "country" field. Disambiguate cities with the same name (e.g. Naples vs Naples, Florida).`,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    console.error('enrichCityCatalogIfNeeded OpenAI error:', res.status, await res.text())
    return
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) return

  let parsed: {
    tagline?: string
    description?: string
    bestTimeToVisit?: string
    attractionNames?: string[]
    country?: string
  }
  try {
    parsed = JSON.parse(content) as typeof parsed
  } catch {
    return
  }

  const tagline = typeof parsed.tagline === 'string' ? parsed.tagline.trim() : ''
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
  const bestTimeToVisit =
    typeof parsed.bestTimeToVisit === 'string' ? parsed.bestTimeToVisit.trim() : ''
  const attractionNames = Array.isArray(parsed.attractionNames)
    ? parsed.attractionNames
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const inferredCountry =
    typeof parsed.country === 'string' && parsed.country.trim()
      ? parsed.country.trim()
      : null
  const countryForDb = countryFromUser ?? inferredCountry ?? cityRow.country ?? 'USA'

  if (!description && attractionNames.length === 0) return

  await prisma.city.update({
    where: { id: cityRow.id },
    data: {
      country: countryForDb,
      tagline: tagline || null,
      description: description || null,
      bestTimeToVisit: bestTimeToVisit || null,
      attractionNames,
    },
  })
}
