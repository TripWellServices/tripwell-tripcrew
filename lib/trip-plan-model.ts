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
