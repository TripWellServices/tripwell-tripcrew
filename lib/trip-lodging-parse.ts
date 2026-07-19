import { Prisma } from '@prisma/client'
import type { ParsedLodging } from '@/lib/trip-plan-types'
import { parseLodgingType } from '@/lib/lodging/apiFields'

export type NearbyAttractionDraft = {
  draftKey: string
  title: string
  category?: string | null
  rating?: number | null
  priceText?: string | null
  distanceText?: string | null
  source: 'expedia_nearby_stay'
  description?: string | null
}

export type LodgingFormRow = {
  title: string
  address: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  countryCode: string
  phone: string
  website: string
  chain: string
  lodgingType: string
  defaultCheckInTime: string
  defaultCheckOutTime: string
  confirmationNotes: string
  googlePlaceId: string
  bookingProvider: string
  confirmationNumber: string
  providerItineraryNumber: string
  nights: number | null
  adultCount: number | null
  childCount: number | null
  roomCount: number | null
  roomType: string
  breakfastIncluded: boolean | null
  nightlyRate: number | null
  totalCost: number | null
  currency: string
  bookingNotes: string
}

export type LodgingParseResult = {
  lodging: LodgingFormRow
  nearbyAttractionDrafts: NearbyAttractionDraft[]
}

export function emptyLodgingRow(): LodgingFormRow {
  return {
    title: '',
    address: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    countryCode: '',
    phone: '',
    website: '',
    chain: '',
    lodgingType: '',
    defaultCheckInTime: '',
    defaultCheckOutTime: '',
    confirmationNotes: '',
    googlePlaceId: '',
    bookingProvider: '',
    confirmationNumber: '',
    providerItineraryNumber: '',
    nights: null,
    adultCount: null,
    childCount: null,
    roomCount: null,
    roomType: '',
    breakfastIncluded: null,
    nightlyRate: null,
    totalCost: null,
    currency: 'USD',
    bookingNotes: '',
  }
}

export function lodgingRowHasData(row: LodgingFormRow): boolean {
  return Boolean(row.title.trim())
}

function optionalStr(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v.trim()
}

function optionalNullableStr(v: unknown): string | null {
  const t = optionalStr(v)
  return t || null
}

function optionalInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string') {
    const n = Number.parseInt(v.replace(/[^\d-]/g, ''), 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function optionalMoney(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.-]/g, '')
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function optionalBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (['true', 'yes', 'included', '1'].includes(t)) return true
    if (['false', 'no', 'not included', '0'].includes(t)) return false
  }
  return null
}

export function draftKeyFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function normalizeNearbyAttractionDraft(raw: unknown): NearbyAttractionDraft | null {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  if (!o) return null
  const title = optionalStr(o.title ?? o.name)
  if (!title) return null
  const draftKey = optionalStr(o.draftKey) || draftKeyFromTitle(title)
  if (!draftKey) return null
  const ratingRaw = o.rating
  const rating =
    typeof ratingRaw === 'number' && Number.isFinite(ratingRaw)
      ? ratingRaw
      : typeof ratingRaw === 'string'
        ? Number.parseFloat(ratingRaw.replace(/[^\d.]/g, '')) || null
        : null

  return {
    draftKey,
    title,
    category: optionalNullableStr(o.category),
    rating: rating != null && Number.isFinite(rating) ? rating : null,
    priceText: optionalNullableStr(o.priceText ?? o.price),
    distanceText: optionalNullableStr(o.distanceText ?? o.distance),
    source: 'expedia_nearby_stay',
    description: optionalNullableStr(o.description),
  }
}

export function dedupeNearbyDrafts(drafts: NearbyAttractionDraft[]): NearbyAttractionDraft[] {
  const seen = new Map<string, NearbyAttractionDraft>()
  for (const draft of drafts) {
    const key = draft.draftKey || draftKeyFromTitle(draft.title)
    if (!key) continue
    if (!seen.has(key)) {
      seen.set(key, { ...draft, draftKey: key })
    }
  }
  return Array.from(seen.values())
}

function normalizeLodgingFields(lodging: Record<string, unknown>): LodgingFormRow {
  const base = emptyLodgingRow()
  const typeRaw = optionalNullableStr(lodging.lodgingType)
  const parsedType = typeRaw ? parseLodgingType(typeRaw) : undefined

  return {
    title: optionalStr(lodging.title ?? lodging.name),
    address: optionalStr(lodging.address),
    streetAddress: optionalStr(lodging.streetAddress),
    city: optionalStr(lodging.city),
    state: optionalStr(lodging.state),
    postalCode: optionalStr(lodging.postalCode),
    countryCode: optionalStr(lodging.countryCode),
    phone: optionalStr(lodging.phone),
    website: optionalStr(lodging.website),
    chain: optionalStr(lodging.chain),
    lodgingType: parsedType ?? optionalStr(lodging.lodgingType),
    defaultCheckInTime: optionalStr(lodging.defaultCheckInTime),
    defaultCheckOutTime: optionalStr(lodging.defaultCheckOutTime),
    confirmationNotes: optionalStr(lodging.confirmationNotes ?? lodging.notes),
    googlePlaceId: optionalStr(lodging.googlePlaceId),
    bookingProvider: optionalStr(lodging.bookingProvider),
    confirmationNumber: optionalStr(lodging.confirmationNumber),
    providerItineraryNumber: optionalStr(
      lodging.providerItineraryNumber ?? lodging.expediaItineraryNumber
    ),
    nights: optionalInt(lodging.nights),
    adultCount: optionalInt(lodging.adultCount ?? lodging.adults),
    childCount: optionalInt(lodging.childCount ?? lodging.children),
    roomCount: optionalInt(lodging.roomCount ?? lodging.rooms),
    roomType: optionalStr(lodging.roomType),
    breakfastIncluded: optionalBool(lodging.breakfastIncluded),
    nightlyRate: optionalMoney(lodging.nightlyRate),
    totalCost: optionalMoney(lodging.totalCost ?? lodging.totalPrice),
    currency: optionalStr(lodging.currency) || base.currency,
    bookingNotes: optionalStr(lodging.bookingNotes ?? lodging.requests ?? lodging.rewardCredit),
  }
}

export function normalizeAiLodgingParse(raw: unknown): LodgingParseResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const lodgingObj =
    o.lodging && typeof o.lodging === 'object'
      ? (o.lodging as Record<string, unknown>)
      : o

  const draftsRaw = Array.isArray(o.nearbyAttractionDrafts)
    ? o.nearbyAttractionDrafts
    : Array.isArray(o.nearbyPoi)
      ? o.nearbyPoi
      : []

  const nearbyAttractionDrafts = dedupeNearbyDrafts(
    draftsRaw
      .map(normalizeNearbyAttractionDraft)
      .filter((d): d is NearbyAttractionDraft => d != null)
  )

  return {
    lodging: normalizeLodgingFields(lodgingObj),
    nearbyAttractionDrafts,
  }
}

/** Regex hints for compact Expedia headers — supplements AI output in tests and offline paths. */
export function applyExpediaHeuristics(text: string, row: LodgingFormRow): LodgingFormRow {
  const next = { ...row }

  if (!next.title.trim()) {
    const titleMatch = text.match(/^([^\n]+?)(?:\n|\d+\s+nights)/im)
    if (titleMatch?.[1]) next.title = titleMatch[1].trim()
  }

  const nightsMatch = text.match(/(\d+)\s+nights?/i)
  if (next.nights == null && nightsMatch) next.nights = Number.parseInt(nightsMatch[1], 10)

  const guestsMatch = text.match(/(\d+)\s+adults?(?:,\s*|\s*·\s*|\s+)(\d+)\s+child(?:ren)?/i)
  if (guestsMatch) {
    if (next.adultCount == null) next.adultCount = Number.parseInt(guestsMatch[1], 10)
    if (next.childCount == null) next.childCount = Number.parseInt(guestsMatch[2], 10)
  } else {
    const adultsOnly = text.match(/(\d+)\s+adults?/i)
    if (next.adultCount == null && adultsOnly) {
      next.adultCount = Number.parseInt(adultsOnly[1], 10)
    }
  }

  const roomsMatch = text.match(/(\d+)\s+rooms?/i)
  if (next.roomCount == null && roomsMatch) next.roomCount = Number.parseInt(roomsMatch[1], 10)

  const confirmMatch = text.match(/confirmation\s*(?:number|#)?\s*([A-Z0-9]+)/i)
  if (!next.confirmationNumber && confirmMatch) next.confirmationNumber = confirmMatch[1]

  const itineraryMatch = text.match(/expedia\s+itinerary\s*(\d+)/i)
  if (!next.providerItineraryNumber && itineraryMatch) {
    next.providerItineraryNumber = itineraryMatch[1]
  }
  if (!next.bookingProvider && /expedia/i.test(text)) next.bookingProvider = 'Expedia'

  const totalMatch = text.match(/(?:total|paid)[^\$]*\$([\d,]+\.\d{2})/i)
  if (next.totalCost == null && totalMatch) {
    next.totalCost = Number.parseFloat(totalMatch[1].replace(/,/g, ''))
    next.currency = 'USD'
  }

  const roomTypeMatch = text.match(/room type[:\s]+([^\n]+)/i)
  if (!next.roomType && roomTypeMatch) next.roomType = roomTypeMatch[1].trim()

  if (next.breakfastIncluded == null && /breakfast\s+included/i.test(text)) {
    next.breakfastIncluded = true
  }

  if (!next.bookingNotes && /nonsmoking/i.test(text)) {
    next.bookingNotes = 'Nonsmoking'
  }

  return next
}

export function extractNearbyDraftsHeuristic(text: string): NearbyAttractionDraft[] {
  const sectionMatch = text.match(
    /things to do near your stay([\s\S]*?)(?:\n\s*\n|$)/i
  )
  if (!sectionMatch?.[1]) return []

  const section = sectionMatch[1]
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean)
  const drafts: NearbyAttractionDraft[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\d(\.\d)?\s*(out of|\/)\s*5$/i.test(line)) continue
    if (/^see all activities$/i.test(line)) continue
    if (line.length < 8) continue

    const ratingLine = lines[i + 1]
    let rating: number | null = null
    if (ratingLine && /(\d(\.\d)?)\s*(out of|\/)\s*5/i.test(ratingLine)) {
      const m = ratingLine.match(/(\d(\.\d)?)/)
      rating = m ? Number.parseFloat(m[1]) : null
    }

    drafts.push({
      draftKey: draftKeyFromTitle(line),
      title: line,
      rating,
      source: 'expedia_nearby_stay',
      category: 'activity',
    })
  }

  return dedupeNearbyDrafts(drafts)
}

export function lodgingFormRowFromParsed(parsed: ParsedLodging): LodgingFormRow {
  return {
    title: optionalStr(parsed.title),
    address: optionalStr(parsed.address),
    streetAddress: optionalStr(parsed.streetAddress),
    city: optionalStr(parsed.city),
    state: optionalStr(parsed.state),
    postalCode: optionalStr(parsed.postalCode),
    countryCode: optionalStr(parsed.countryCode),
    phone: optionalStr(parsed.phone),
    website: optionalStr(parsed.website),
    chain: optionalStr(parsed.chain),
    lodgingType: optionalStr(parsed.lodgingType),
    defaultCheckInTime: optionalStr(parsed.defaultCheckInTime),
    defaultCheckOutTime: optionalStr(parsed.defaultCheckOutTime),
    confirmationNotes: optionalStr(parsed.notes),
    googlePlaceId: optionalStr(parsed.googlePlaceId),
    bookingProvider: '',
    confirmationNumber: '',
    providerItineraryNumber: '',
    nights: null,
    adultCount: null,
    childCount: null,
    roomCount: null,
    roomType: '',
    breakfastIncluded: null,
    nightlyRate: null,
    totalCost: null,
    currency: 'USD',
    bookingNotes: '',
  }
}

const LODGING_PARSE_SYSTEM = `You extract structured hotel/lodging confirmation data from pasted email text, Expedia/Booking/Airbnb confirmations, or screenshots.

Return ONLY valid JSON:
{
  "lodging": {
    "title": string | null,
    "address": string | null,
    "streetAddress": string | null,
    "city": string | null,
    "state": string | null,
    "postalCode": string | null,
    "countryCode": string | null,
    "phone": string | null,
    "website": string | null,
    "chain": string | null,
    "lodgingType": "HOTEL" | "RESORT" | "EXTENDED_STAY" | "VACATION_RENTAL" | "HOSTEL" | "BED_AND_BREAKFAST" | "OTHER" | null,
    "defaultCheckInTime": string | null,
    "defaultCheckOutTime": string | null,
    "confirmationNotes": string | null,
    "bookingProvider": string | null,
    "confirmationNumber": string | null,
    "providerItineraryNumber": string | null,
    "nights": number | null,
    "adultCount": number | null,
    "childCount": number | null,
    "roomCount": number | null,
    "roomType": string | null,
    "breakfastIncluded": boolean | null,
    "nightlyRate": number | null,
    "totalCost": number | null,
    "currency": string | null,
    "bookingNotes": string | null
  },
  "nearbyAttractionDrafts": [
    {
      "title": string,
      "category": string | null,
      "rating": number | null,
      "priceText": string | null,
      "distanceText": string | null,
      "description": string | null
    }
  ]
}

Rules:
- title is the property/hotel name as shown on the confirmation.
- bookingProvider is Expedia, Hyatt, Airbnb, etc. when visible.
- confirmationNumber and providerItineraryNumber are separate fields when visible (Expedia often shows both).
- nights, adultCount, childCount, roomCount are integers when visible.
- breakfastIncluded only true/false when explicitly stated; otherwise null.
- totalCost and nightlyRate are numeric amounts without currency symbols; currency as ISO code when visible.
- bookingNotes holds nonsmoking requests, reward credits (e.g. OneKeyCash), or other booking metadata.
- For Expedia "Things to do near your stay" sections, populate nearbyAttractionDrafts with one row per unique activity title; include rating when shown (e.g. 4 out of 5).
- Do not invent address, cost, breakfast, or activities not present in the source.`

async function callOpenAiLodgingParse(messages: unknown[]): Promise<LodgingParseResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('lodging parse OpenAI error:', res.status, err)
    throw new Error('AI parsing failed')
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty AI response')

  try {
    return normalizeAiLodgingParse(JSON.parse(content))
  } catch {
    throw new Error('AI did not return valid JSON')
  }
}

function mergeParseWithHeuristics(text: string, parsed: LodgingParseResult): LodgingParseResult {
  const lodging = applyExpediaHeuristics(text, parsed.lodging)
  const heuristicDrafts = extractNearbyDraftsHeuristic(text)
  const nearbyAttractionDrafts = dedupeNearbyDrafts([
    ...parsed.nearbyAttractionDrafts,
    ...heuristicDrafts,
  ])
  return { lodging, nearbyAttractionDrafts }
}

export async function parseLodgingConfirmationText(text: string): Promise<LodgingParseResult> {
  const trimmed = text.trim()
  if (trimmed.length < 10) {
    throw new Error('Paste at least 10 characters of confirmation text')
  }

  const aiParsed = await callOpenAiLodgingParse([
    { role: 'system', content: LODGING_PARSE_SYSTEM },
    {
      role: 'user',
      content: `Parse hotel/lodging confirmation text:\n\n${trimmed.slice(0, 20_000)}`,
    },
  ])

  return mergeParseWithHeuristics(trimmed, aiParsed)
}

export async function parseLodgingConfirmationImage(
  imageBase64: string,
  mimeType: string,
  optionalText?: string | null
): Promise<LodgingParseResult> {
  if (!imageBase64.trim()) {
    throw new Error('Image data is required')
  }

  const userContent: unknown[] = [
    {
      type: 'text',
      text:
        optionalText?.trim()
          ? `Parse lodging from this confirmation screenshot. Additional text:\n${optionalText.trim()}`
          : 'Parse hotel/lodging from this confirmation screenshot (Expedia, Marriott, Airbnb, etc.).',
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
      },
    },
  ]

  const aiParsed = await callOpenAiLodgingParse([
    { role: 'system', content: LODGING_PARSE_SYSTEM },
    { role: 'user', content: userContent },
  ])

  const hintText = optionalText?.trim() ?? ''
  return hintText ? mergeParseWithHeuristics(hintText, aiParsed) : aiParsed
}

export function lodgingRowToDbData(row: LodgingFormRow) {
  const lodgingType = row.lodgingType ? parseLodgingType(row.lodgingType) : undefined
  return {
    title: row.title.trim(),
    address: row.address.trim() || null,
    streetAddress: row.streetAddress.trim() || null,
    city: row.city.trim() || null,
    state: row.state.trim() || null,
    postalCode: row.postalCode.trim() || null,
    countryCode: row.countryCode.trim().toUpperCase() || null,
    phone: row.phone.trim() || null,
    website: row.website.trim() || null,
    chain: row.chain.trim() || null,
    lodgingType: lodgingType ?? null,
    defaultCheckInTime: row.defaultCheckInTime.trim() || null,
    defaultCheckOutTime: row.defaultCheckOutTime.trim() || null,
    googlePlaceId: row.googlePlaceId.trim() || null,
    bookingProvider: row.bookingProvider.trim() || null,
    confirmationNumber: row.confirmationNumber.trim() || null,
    providerItineraryNumber: row.providerItineraryNumber.trim() || null,
    nights: row.nights,
    adultCount: row.adultCount,
    childCount: row.childCount,
    roomCount: row.roomCount,
    roomType: row.roomType.trim() || null,
    breakfastIncluded: row.breakfastIncluded,
    nightlyRate:
      row.nightlyRate != null ? new Prisma.Decimal(row.nightlyRate) : null,
    totalCost: row.totalCost != null ? new Prisma.Decimal(row.totalCost) : null,
    currency: row.currency.trim().toUpperCase() || null,
    bookingNotes: row.bookingNotes.trim() || null,
  }
}

export function nearbyDraftsFromJson(raw: unknown): NearbyAttractionDraft[] {
  if (!Array.isArray(raw)) return []
  return dedupeNearbyDrafts(
    raw.map(normalizeNearbyAttractionDraft).filter((d): d is NearbyAttractionDraft => d != null)
  )
}

export function lodgingFormRowFromDb(lodging: {
  title: string
  address?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
  phone?: string | null
  website?: string | null
  chain?: string | null
  lodgingType?: string | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
  googlePlaceId?: string | null
  bookingProvider?: string | null
  confirmationNumber?: string | null
  providerItineraryNumber?: string | null
  nights?: number | null
  adultCount?: number | null
  childCount?: number | null
  roomCount?: number | null
  roomType?: string | null
  breakfastIncluded?: boolean | null
  nightlyRate?: Prisma.Decimal | number | string | null
  totalCost?: Prisma.Decimal | number | string | null
  currency?: string | null
  bookingNotes?: string | null
}): LodgingFormRow {
  const toNum = (v: Prisma.Decimal | number | string | null | undefined): number | null => {
    if (v == null || v === '') return null
    if (typeof v === 'object' && v !== null && 'toNumber' in v) {
      return (v as Prisma.Decimal).toNumber()
    }
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
    return Number.isFinite(n) ? n : null
  }

  return {
    title: lodging.title ?? '',
    address: lodging.address ?? '',
    streetAddress: lodging.streetAddress ?? '',
    city: lodging.city ?? '',
    state: lodging.state ?? '',
    postalCode: lodging.postalCode ?? '',
    countryCode: lodging.countryCode ?? '',
    phone: lodging.phone ?? '',
    website: lodging.website ?? '',
    chain: lodging.chain ?? '',
    lodgingType: lodging.lodgingType ?? '',
    defaultCheckInTime: lodging.defaultCheckInTime ?? '',
    defaultCheckOutTime: lodging.defaultCheckOutTime ?? '',
    confirmationNotes: '',
    googlePlaceId: lodging.googlePlaceId ?? '',
    bookingProvider: lodging.bookingProvider ?? '',
    confirmationNumber: lodging.confirmationNumber ?? '',
    providerItineraryNumber: lodging.providerItineraryNumber ?? '',
    nights: lodging.nights ?? null,
    adultCount: lodging.adultCount ?? null,
    childCount: lodging.childCount ?? null,
    roomCount: lodging.roomCount ?? null,
    roomType: lodging.roomType ?? '',
    breakfastIncluded: lodging.breakfastIncluded ?? null,
    nightlyRate: toNum(lodging.nightlyRate),
    totalCost: toNum(lodging.totalCost),
    currency: lodging.currency ?? 'USD',
    bookingNotes: lodging.bookingNotes ?? '',
  }
}

export function lodgingFormRowFromCard(lodging: {
  title: string
  address?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
  phone?: string | null
  website?: string | null
  chain?: string | null
  lodgingType?: string | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
  googlePlaceId?: string | null
  bookingProvider?: string | null
  confirmationNumber?: string | null
  providerItineraryNumber?: string | null
  nights?: number | null
  adultCount?: number | null
  childCount?: number | null
  roomCount?: number | null
  roomType?: string | null
  breakfastIncluded?: boolean | null
  nightlyRate?: Prisma.Decimal | number | string | null
  totalCost?: Prisma.Decimal | number | string | null
  currency?: string | null
  bookingNotes?: string | null
}): LodgingFormRow {
  return lodgingFormRowFromDb(lodging)
}
