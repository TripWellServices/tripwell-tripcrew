/** Prisma-free plan types for parsing, ingest helpers, and unit tests. */

export type IngestClassification =
  | 'mixed-confirmed-trip'
  | 'concert'
  | 'lodging'
  | 'travel'
  | 'destination'

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
  googlePlaceId?: string | null
  phone?: string | null
  website?: string | null
  imageUrl?: string | null
  rating?: number | null
  lat?: number | null
  lng?: number | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
}

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
  slotDate: string | null
  dayNumber: number | null
}

export type ParsedEventAnchorKind = 'concert' | 'festival' | 'event'

export interface ParsedEventAnchor {
  name: string
  kind: ParsedEventAnchorKind
  artist: string | null
  venue: string | null
  eventDate: string | null
  ticketStatus: string | null
  confirmationNotes: string | null
}

export type ParsedWhoWith = 'SOLO' | 'SPOUSE' | 'FRIENDS' | 'FAMILY' | 'OTHER'
export type ParsedTransportMode = 'CAR' | 'BOAT' | 'PLANE'

export interface ParsedTripPlan {
  tripName: string | null
  startDate: string | null
  endDate: string | null
  city: string | null
  state: string | null
  country: string | null
  whereFreeform: string | null
  whoWith: ParsedWhoWith | null
  transportMode: ParsedTransportMode | null
  lodging: ParsedLodging | null
  legs: ParsedTripLeg[]
  notes: string | null
  experiences: ParsedExperienceSpec[]
  daySlots: ParsedDaySlot[]
  eventAnchor: ParsedEventAnchor | null
  ingestType: IngestClassification | null
}
