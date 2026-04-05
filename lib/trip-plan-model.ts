import { TransportMode, WhoWith } from '@prisma/client'
import { isLodgingType } from '@/lib/lodging/apiFields'

export type ParsedLegKind = 'flight' | 'train' | 'drive' | 'other'

export interface ParsedTripLeg {
  kind: ParsedLegKind
  summary?: string | null
  depart?: string | null
  arrive?: string | null
  origin?: string | null
  destination?: string | null
  carrier?: string | null
  flightNumber?: string | null
  recordLocator?: string | null
}

export interface ParsedLodging {
  title?: string | null
  address?: string | null
  chain?: string | null
  lodgingType?: string | null
  defaultCheckInTime?: string | null
  defaultCheckOutTime?: string | null
  notes?: string | null
}

/** Boston-style catalogue / POI block parsed from paste (see trip-plan-parse prompt). */
export interface ParsedExperienceCost {
  adult_usd: number | null
  child_usd: number | null
  family_estimate_usd: number | null
}

export interface ParsedExperienceLocation {
  name: string | null
  address: string | null
  lat: number | null
  lng: number | null
}

export interface ParsedExperienceLogistics {
  arrival_buffer_minutes: number | null
  booking_required: boolean | null
  indoor_outdoor: string | null
  walking_required: boolean | null
}

export interface ParsedJumpOff {
  name: string | null
  type: string | null
  distance_minutes_walk: number | null
  distance_minutes_drive: number | null
  description: string | null
}

export interface ParsedTripwellFit {
  effort_level: string | null
  kid_friendly: boolean | null
  parent_friendly: boolean | null
  time_block: string | null
}

export interface ParsedExperienceSpec {
  name: string
  entity_ref: string | null
  experience_type: string | null
  description: string | null
  duration_minutes: number | null
  location: ParsedExperienceLocation | null
  cost: ParsedExperienceCost | null
  logistics: ParsedExperienceLogistics | null
  jump_off_next_to: ParsedJumpOff[]
  tripwell_fit: ParsedTripwellFit | null
}

/** Timed day itinerary slot (paste/parse → ingest → TripDayExperience). */
export type ParsedDaySlotType = 'dining' | 'attraction' | 'logistic'

export interface ParsedDaySlot {
  type: ParsedDaySlotType
  title: string
  startTime: string | null
  endTime: string | null
  address: string | null
  notes: string | null
  foodType: string | null
  costLevel: number | null
  idealTime: string | null
  reservationRequired: boolean | null
  description: string | null
  category: string | null
  subItems: string[]
}

export interface ParsedTripPlan {
  tripName: string | null
  startDate: string | null
  endDate: string | null
  city: string | null
  state: string | null
  country: string | null
  whereFreeform: string | null
  whoWith: WhoWith | null
  transportMode: TransportMode | null
  lodging: ParsedLodging | null
  legs: ParsedTripLeg[]
  notes: string | null
  experiences: ParsedExperienceSpec[]
  daySlots: ParsedDaySlot[]
}

const WHO_WITH: WhoWith[] = ['SOLO', 'SPOUSE', 'FRIENDS', 'FAMILY', 'OTHER']
const TRANSPORT: TransportMode[] = ['CAR', 'BOAT', 'PLANE']
const LEG_KINDS: ParsedLegKind[] = ['flight', 'train', 'drive', 'other']

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

function optionalStr(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

/** YYYY-MM-DD or null */
function isoDateOnly(v: unknown): string | null {
  const s = optionalStr(v)
  if (!s) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : `${m[1]}-${m[2]}-${m[3]}`
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function normLegKind(v: unknown): ParsedLegKind {
  const s = optionalStr(v)?.toLowerCase()
  if (s && LEG_KINDS.includes(s as ParsedLegKind)) return s as ParsedLegKind
  return 'other'
}

function normLodging(raw: unknown): ParsedLodging | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = optionalStr(o.title ?? o.name)
  if (!title && !optionalStr(o.address) && !optionalStr(o.notes)) return null
  const ltRaw = optionalStr(o.lodgingType)?.toUpperCase().replace(/\s+/g, '_')
  const lodgingType =
    ltRaw && isLodgingType(ltRaw) ? ltRaw : null
  return {
    title,
    address: optionalStr(o.address),
    chain: optionalStr(o.chain),
    lodgingType,
    defaultCheckInTime: optionalStr(o.defaultCheckInTime ?? o.checkIn),
    defaultCheckOutTime: optionalStr(o.defaultCheckOutTime ?? o.checkOut),
    notes: optionalStr(o.notes),
  }
}

function normLeg(raw: unknown): ParsedTripLeg | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = normLegKind(o.kind ?? o.type)
  const hasAny =
    optionalStr(o.summary) ||
    optionalStr(o.origin) ||
    optionalStr(o.destination) ||
    optionalStr(o.carrier) ||
    optionalStr(o.flightNumber) ||
    optionalStr(o.recordLocator) ||
    optionalStr(o.depart) ||
    optionalStr(o.arrive)
  if (!hasAny) return null
  return {
    kind,
    summary: optionalStr(o.summary),
    depart: optionalStr(o.depart ?? o.departure ?? o.departs),
    arrive: optionalStr(o.arrive ?? o.arrival ?? o.arrives),
    origin: optionalStr(o.origin ?? o.from ?? o.departureAirport),
    destination: optionalStr(o.destination ?? o.to ?? o.arrivalAirport),
    carrier: optionalStr(o.carrier ?? o.airline),
    flightNumber: optionalStr(o.flightNumber ?? o.flight ?? o.number),
    recordLocator: optionalStr(o.recordLocator ?? o.confirmation ?? o.pnr),
  }
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function boolOrNull(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (v === 'true' || v === 'yes' || v === 1) return true
  if (v === 'false' || v === 'no' || v === 0) return false
  return null
}

function normJumpOff(raw: unknown): ParsedJumpOff | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = optionalStr(o.name ?? o.title)
  if (!name && !optionalStr(o.description)) return null
  return {
    name: optionalStr(o.name ?? o.title),
    type: optionalStr(o.type),
    distance_minutes_walk: numOrNull(o.distance_minutes_walk ?? o.walk_minutes),
    distance_minutes_drive: numOrNull(o.distance_minutes_drive ?? o.drive_minutes),
    description: optionalStr(o.description),
  }
}

function normExperience(raw: unknown): ParsedExperienceSpec | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name =
    optionalStr(o.name ?? o.title) ?? optionalStr(o.entity_ref)
  if (!name) return null

  const locRaw = o.location ?? o.place ?? o.address_block
  let location: ParsedExperienceLocation | null = null
  if (locRaw && typeof locRaw === 'object') {
    const L = locRaw as Record<string, unknown>
    const addr = optionalStr(L.address ?? L.formatted_address ?? L.street)
    const latN = numOrNull(L.lat ?? L.latitude)
    const lngN = numOrNull(L.lng ?? L.longitude ?? L.lon)
    const locName = optionalStr(L.name)
    if (locName || addr || latN != null || lngN != null) {
      location = {
        name: locName,
        address: addr,
        lat: latN,
        lng: lngN,
      }
    }
  }

  const costRaw = o.cost ?? o.pricing
  let cost: ParsedExperienceCost | null = null
  if (costRaw && typeof costRaw === 'object') {
    const c = costRaw as Record<string, unknown>
    cost = {
      adult_usd: numOrNull(c.adult_usd ?? c.adult ?? c.adultUSD),
      child_usd: numOrNull(c.child_usd ?? c.child),
      family_estimate_usd: numOrNull(
        c.family_estimate_usd ?? c.family ?? c.family_total
      ),
    }
    if (
      cost.adult_usd == null &&
      cost.child_usd == null &&
      cost.family_estimate_usd == null
    ) {
      cost = null
    }
  }

  const logRaw = o.logistics
  let logistics: ParsedExperienceLogistics | null = null
  if (logRaw && typeof logRaw === 'object') {
    const g = logRaw as Record<string, unknown>
    logistics = {
      arrival_buffer_minutes: numOrNull(
        g.arrival_buffer_minutes ?? g.buffer_minutes
      ),
      booking_required: boolOrNull(g.booking_required ?? g.bookingRequired),
      indoor_outdoor: optionalStr(g.indoor_outdoor ?? g.indoorOutdoor),
      walking_required: boolOrNull(g.walking_required ?? g.walkingRequired),
    }
    if (
      logistics.arrival_buffer_minutes == null &&
      logistics.booking_required == null &&
      !logistics.indoor_outdoor &&
      logistics.walking_required == null
    ) {
      logistics = null
    }
  }

  const jumpRaw = o.jump_off_next_to ?? o.jumpOffNextTo ?? o.nearby
  const jump_off_next_to: ParsedJumpOff[] = []
  if (Array.isArray(jumpRaw)) {
    for (const j of jumpRaw) {
      const jo = normJumpOff(j)
      if (jo) jump_off_next_to.push(jo)
    }
  }

  const fitRaw = o.tripwell_fit ?? o.tripWellFit ?? o.fit
  let tripwell_fit: ParsedTripwellFit | null = null
  if (fitRaw && typeof fitRaw === 'object') {
    const f = fitRaw as Record<string, unknown>
    tripwell_fit = {
      effort_level: optionalStr(f.effort_level ?? f.effortLevel),
      kid_friendly: boolOrNull(f.kid_friendly ?? f.kidFriendly),
      parent_friendly: boolOrNull(f.parent_friendly ?? f.parentFriendly),
      time_block: optionalStr(f.time_block ?? f.timeBlock),
    }
    if (
      !tripwell_fit.effort_level &&
      tripwell_fit.kid_friendly == null &&
      tripwell_fit.parent_friendly == null &&
      !tripwell_fit.time_block
    ) {
      tripwell_fit = null
    }
  }

  return {
    name: name.trim(),
    entity_ref: optionalStr(o.entity_ref ?? o.entityRef),
    experience_type: optionalStr(
      o.experience_type ?? o.experienceType ?? o.type ?? o.category
    ),
    description: optionalStr(o.description ?? o.summary ?? o.details),
    duration_minutes: numOrNull(o.duration_minutes ?? o.durationMinutes ?? o.duration),
    location,
    cost,
    logistics,
    jump_off_next_to,
    tripwell_fit,
  }
}

/** Structured fields for Attraction.metadata (excludes columns stored on Attraction). */
export function experienceSpecToMetadata(
  exp: ParsedExperienceSpec
): Record<string, unknown> {
  const jump =
    exp.jump_off_next_to.length > 0 ? exp.jump_off_next_to : null
  return {
    entity_ref: exp.entity_ref,
    duration_minutes: exp.duration_minutes,
    cost: exp.cost,
    logistics: exp.logistics,
    jump_off_next_to: jump,
    tripwell_fit: exp.tripwell_fit,
    location_name: exp.location?.name ?? null,
  }
}

export function planNoteFromExperienceSpec(
  exp: ParsedExperienceSpec
): string | null {
  const parts: string[] = []
  const tb = exp.tripwell_fit?.time_block?.trim()
  if (tb) parts.push(tb)
  else if (exp.duration_minutes != null && Number.isFinite(exp.duration_minutes)) {
    parts.push(`~${Math.round(exp.duration_minutes)} min`)
  }
  const s = parts.join(' · ').trim()
  return s || null
}

const DAY_SLOT_TYPES: ParsedDaySlotType[] = ['dining', 'attraction', 'logistic']

function normDaySlotType(v: unknown): ParsedDaySlotType | null {
  const s = optionalStr(v)?.toLowerCase()
  if (!s) return null
  if (DAY_SLOT_TYPES.includes(s as ParsedDaySlotType)) return s as ParsedDaySlotType
  if (s === 'food' || s === 'meal' || s === 'restaurant' || s === 'cafe') {
    return 'dining'
  }
  if (
    s === 'travel' ||
    s === 'transport' ||
    s === 'drive' ||
    s === 'parking'
  ) {
    return 'logistic'
  }
  if (
    s === 'sight' ||
    s === 'poi' ||
    s === 'activity' ||
    s === 'shopping' ||
    s === 'park'
  ) {
    return 'attraction'
  }
  return null
}

function normSubItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const t = optionalStr(item)
    if (t) out.push(t)
  }
  return out
}

function normCostLevelOneToFive(v: unknown): number | null {
  const n = numOrNull(v)
  if (n == null || !Number.isFinite(n)) return null
  const r = Math.round(n)
  if (r < 1 || r > 5) return null
  return r
}

function normDaySlot(raw: unknown): ParsedDaySlot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const type = normDaySlotType(o.type ?? o.slot_type)
  const title = optionalStr(o.title ?? o.name ?? o.label)
  if (!type || !title) return null
  const idealRaw = optionalStr(o.idealTime ?? o.ideal_time)
  const idealTime = idealRaw
    ? idealRaw.toLowerCase().replace(/\s+/g, '_')
    : null
  return {
    type,
    title: title.trim(),
    startTime: optionalStr(o.startTime ?? o.start ?? o.begin),
    endTime: optionalStr(o.endTime ?? o.end),
    address: optionalStr(o.address ?? o.location),
    notes: optionalStr(o.notes ?? o.details),
    foodType: optionalStr(o.foodType ?? o.food_type ?? o.cuisine),
    costLevel: normCostLevelOneToFive(o.costLevel ?? o.cost_level),
    idealTime,
    reservationRequired: boolOrNull(
      o.reservationRequired ?? o.reservation_required
    ),
    description: optionalStr(o.description ?? o.summary),
    category: optionalStr(o.category ?? o.kind),
    subItems: normSubItems(o.subItems ?? o.sub_items ?? o.stores ?? o.stops),
  }
}

export function daySlotDiningMetadata(
  slot: ParsedDaySlot
): Record<string, unknown> {
  return {
    food_type: slot.foodType,
    cost_level: slot.costLevel,
    ideal_time: slot.idealTime,
    reservation_required: slot.reservationRequired,
  }
}

export function daySlotAttractionMetadata(
  slot: ParsedDaySlot
): Record<string, unknown> {
  return {
    sub_items: slot.subItems.length > 0 ? slot.subItems : null,
    source: 'day_slot',
  }
}

export function normalizeParsedTripPlan(parsed: unknown): ParsedTripPlan {
  const root =
    parsed && typeof parsed === 'object' && 'parsed' in (parsed as object)
      ? (parsed as { parsed: unknown }).parsed
      : parsed
  if (!root || typeof root !== 'object') {
    return emptyPlan()
  }
  const o = root as Record<string, unknown>

  let whoWith: WhoWith | null = null
  const ww = optionalStr(o.whoWith)?.toUpperCase()
  if (ww && WHO_WITH.includes(ww as WhoWith)) whoWith = ww as WhoWith

  let transportMode: TransportMode | null = null
  const tm = optionalStr(o.transportMode)?.toUpperCase()
  if (tm && TRANSPORT.includes(tm as TransportMode)) {
    transportMode = tm as TransportMode
  }

  const legsRaw = o.legs ?? o.transportLegs ?? o.flights
  const legs: ParsedTripLeg[] = []
  if (Array.isArray(legsRaw)) {
    for (const item of legsRaw) {
      const leg = normLeg(item)
      if (leg) legs.push(leg)
    }
  }

  const lodging = normLodging(o.lodging ?? o.hotel ?? o.accommodation)

  const experiencesRaw =
    o.experiences ?? o.pois ?? o.catalog_experiences ?? o.places_to_visit
  const experiences: ParsedExperienceSpec[] = []
  if (Array.isArray(experiencesRaw)) {
    for (const item of experiencesRaw) {
      const ex = normExperience(item)
      if (ex) experiences.push(ex)
    }
  }

  const daySlotsRaw =
    o.daySlots ?? o.day_slots ?? o.itinerary_slots ?? o.timed_slots
  const daySlots: ParsedDaySlot[] = []
  if (Array.isArray(daySlotsRaw)) {
    for (const item of daySlotsRaw) {
      const s = normDaySlot(item)
      if (s) daySlots.push(s)
    }
  }

  return {
    tripName: str(o.tripName ?? o.name ?? o.title),
    startDate: isoDateOnly(o.startDate ?? o.start),
    endDate: isoDateOnly(o.endDate ?? o.end),
    city: str(o.city),
    state: str(o.state ?? o.region),
    country: str(o.country),
    whereFreeform: str(o.where ?? o.whereFreeform ?? o.destinationText),
    whoWith,
    transportMode,
    lodging,
    legs,
    notes: optionalStr(o.notes ?? o.rawNotes),
    experiences,
    daySlots,
  }
}

function emptyPlan(): ParsedTripPlan {
  return {
    tripName: null,
    startDate: null,
    endDate: null,
    city: null,
    state: null,
    country: null,
    whereFreeform: null,
    whoWith: null,
    transportMode: null,
    lodging: null,
    legs: [],
    notes: null,
    experiences: [],
    daySlots: [],
  }
}

function legKindLabel(kind: ParsedLegKind): string {
  switch (kind) {
    case 'flight':
      return 'Flight'
    case 'train':
      return 'Train'
    case 'drive':
      return 'Drive'
    default:
      return 'Travel'
  }
}

/** One LogisticItem row per leg — title short, detail has the rest. */
export function legToLogisticItem(leg: ParsedTripLeg): {
  title: string
  detail: string
} {
  const parts: string[] = []
  if (leg.carrier) parts.push(`Carrier: ${leg.carrier}`)
  if (leg.flightNumber) parts.push(`Flight: ${leg.flightNumber}`)
  if (leg.recordLocator) parts.push(`Confirmation: ${leg.recordLocator}`)
  if (leg.depart) parts.push(`Depart: ${leg.depart}`)
  if (leg.arrive) parts.push(`Arrive: ${leg.arrive}`)
  if (leg.origin || leg.destination) {
    parts.push(
      [leg.origin || '—', leg.destination || '—'].filter(Boolean).join(' → ')
    )
  }
  if (leg.summary) parts.push(leg.summary)

  const detail = parts.join('\n').trim() || '(no details)'

  const num = leg.flightNumber
  const route =
    leg.origin && leg.destination
      ? `${leg.origin} → ${leg.destination}`
      : leg.summary || leg.destination || leg.origin || legKindLabel(leg.kind)

  const title = num ? `${legKindLabel(leg.kind)} ${num} · ${route}` : `${legKindLabel(leg.kind)} · ${route}`

  return { title: title.slice(0, 200), detail }
}
