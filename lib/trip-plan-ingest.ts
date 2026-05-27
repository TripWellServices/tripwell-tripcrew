import type { ParsedDaySlot, ParsedTripPlan, IngestClassification } from '@/lib/trip-plan-types'

export function classifyIngestPlan(plan: ParsedTripPlan): IngestClassification {
  const explicit = plan.ingestType
  if (explicit) return explicit

  if (plan.eventAnchor?.name) return 'concert'
  if (plan.lodging?.title && plan.legs.length === 0 && plan.daySlots.length === 0) {
    return 'lodging'
  }
  if (plan.legs.length > 0 && !plan.lodging && !plan.eventAnchor) return 'travel'
  if ((plan.city || plan.whereFreeform) && !plan.lodging && plan.legs.length === 0) {
    return 'destination'
  }
  return 'mixed-confirmed-trip'
}

export function ingestClassificationLabel(kind: IngestClassification): string {
  switch (kind) {
    case 'concert':
      return 'Concert / festival'
    case 'lodging':
      return 'Hotel stay'
    case 'travel':
      return 'Travel logistics'
    case 'destination':
      return 'Destination'
    default:
      return 'Confirmed trip'
  }
}

type TripDayLike = { id: string; dayNumber: number; date: Date | string }

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  )
}

/** Resolve which trip day a parsed slot belongs on. */
export function resolveTripDayForSlot(
  tripDays: TripDayLike[],
  _tripStart: Date,
  slot: ParsedDaySlot
): TripDayLike | null {
  if (tripDays.length === 0) return null
  const sorted = [...tripDays].sort((a, b) => a.dayNumber - b.dayNumber)

  if (slot.slotDate) {
    const target = startOfUtcDay(new Date(`${slot.slotDate}T12:00:00.000Z`))
    const match = sorted.find((td) => {
      const tdDate = startOfUtcDay(new Date(td.date))
      return tdDate.getTime() === target.getTime()
    })
    if (match) return match
  }

  if (slot.dayNumber != null && slot.dayNumber >= 1) {
    const byNum = sorted.find((td) => td.dayNumber === slot.dayNumber)
    if (byNum) return byNum
  }

  return sorted[0] ?? null
}

export function resolveTripDayForEventDate(
  tripDays: TripDayLike[],
  eventDateYmd: string | null | undefined
): TripDayLike | null {
  if (!eventDateYmd) return tripDays.find((d) => d.dayNumber === 1) ?? tripDays[0] ?? null
  return resolveTripDayForSlot(tripDays, new Date(), {
    type: 'attraction',
    title: 'event',
    startTime: null,
    endTime: null,
    address: null,
    notes: null,
    foodType: null,
    costLevel: null,
    idealTime: null,
    reservationRequired: null,
    description: null,
    category: null,
    subItems: [],
    slotDate: eventDateYmd,
    dayNumber: null,
  })
}
