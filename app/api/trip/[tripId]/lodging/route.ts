import { NextRequest, NextResponse } from 'next/server'
import { resolveTripWellEnterpriseId } from '@/config/tripWellEnterpriseConfig'
import { prisma } from '@/lib/prisma'
import { getTripAccess } from '@/lib/trip/assertTripAccess'
import {
  emptyLodgingRow,
  lodgingRowHasData,
  lodgingRowToDbData,
  nearbyDraftsFromJson,
  type LodgingFormRow,
  type NearbyAttractionDraft,
} from '@/lib/trip-lodging-parse'

export const dynamic = 'force-dynamic'

function optionalInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function optionalMoney(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number.parseFloat(v.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function optionalBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

function rowFromBody(raw: unknown): LodgingFormRow {
  const base = emptyLodgingRow()
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    title: typeof o.title === 'string' ? o.title : base.title,
    address: typeof o.address === 'string' ? o.address : base.address,
    streetAddress: typeof o.streetAddress === 'string' ? o.streetAddress : base.streetAddress,
    city: typeof o.city === 'string' ? o.city : base.city,
    state: typeof o.state === 'string' ? o.state : base.state,
    postalCode: typeof o.postalCode === 'string' ? o.postalCode : base.postalCode,
    countryCode: typeof o.countryCode === 'string' ? o.countryCode : base.countryCode,
    phone: typeof o.phone === 'string' ? o.phone : base.phone,
    website: typeof o.website === 'string' ? o.website : base.website,
    chain: typeof o.chain === 'string' ? o.chain : base.chain,
    lodgingType: typeof o.lodgingType === 'string' ? o.lodgingType : base.lodgingType,
    defaultCheckInTime:
      typeof o.defaultCheckInTime === 'string' ? o.defaultCheckInTime : base.defaultCheckInTime,
    defaultCheckOutTime:
      typeof o.defaultCheckOutTime === 'string' ? o.defaultCheckOutTime : base.defaultCheckOutTime,
    confirmationNotes:
      typeof o.confirmationNotes === 'string' ? o.confirmationNotes : base.confirmationNotes,
    googlePlaceId: typeof o.googlePlaceId === 'string' ? o.googlePlaceId : base.googlePlaceId,
    bookingProvider: typeof o.bookingProvider === 'string' ? o.bookingProvider : base.bookingProvider,
    confirmationNumber:
      typeof o.confirmationNumber === 'string' ? o.confirmationNumber : base.confirmationNumber,
    providerItineraryNumber:
      typeof o.providerItineraryNumber === 'string'
        ? o.providerItineraryNumber
        : base.providerItineraryNumber,
    nights: optionalInt(o.nights),
    adultCount: optionalInt(o.adultCount),
    childCount: optionalInt(o.childCount),
    roomCount: optionalInt(o.roomCount),
    roomType: typeof o.roomType === 'string' ? o.roomType : base.roomType,
    breakfastIncluded: optionalBool(o.breakfastIncluded),
    nightlyRate: optionalMoney(o.nightlyRate),
    totalCost: optionalMoney(o.totalCost),
    currency: typeof o.currency === 'string' ? o.currency : base.currency,
    bookingNotes: typeof o.bookingNotes === 'string' ? o.bookingNotes : base.bookingNotes,
  }
}

function draftsFromBody(raw: unknown): NearbyAttractionDraft[] | undefined {
  if (raw === undefined) return undefined
  return nearbyDraftsFromJson(raw)
}

/**
 * PUT /api/trip/[tripId]/lodging
 * Body: { travelerId, lodging: LodgingFormRow, nearbyAttractionDrafts?: NearbyAttractionDraft[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const travelerId = typeof body.travelerId === 'string' ? body.travelerId.trim() : ''
    if (!travelerId) {
      return NextResponse.json({ error: 'travelerId is required' }, { status: 400 })
    }

    const access = await getTripAccess(params.tripId, travelerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status })
    }

    const row = rowFromBody(body.lodging)
    if (!lodgingRowHasData(row)) {
      return NextResponse.json({ error: 'lodging.title is required' }, { status: 400 })
    }

    const data = lodgingRowToDbData(row)
    const enterpriseId = resolveTripWellEnterpriseId(undefined)
    const nearbyDrafts = draftsFromBody(body.nearbyAttractionDrafts)

    const saved = await prisma.lodging.upsert({
      where: { tripId: params.tripId },
      update: {
        tripWellEnterpriseId: enterpriseId,
        ...data,
        ...(nearbyDrafts !== undefined
          ? { nearbyAttractionDrafts: nearbyDrafts as unknown as object[] }
          : {}),
      },
      create: {
        tripId: params.tripId,
        tripWellEnterpriseId: enterpriseId,
        ...data,
        nearbyAttractionDrafts:
          nearbyDrafts !== undefined ? (nearbyDrafts as unknown as object[]) : undefined,
      },
    })

    return NextResponse.json({
      lodging: saved,
      nearbyAttractionDrafts: nearbyDraftsFromJson(saved.nearbyAttractionDrafts),
    })
  } catch (error) {
    console.error('Trip lodging save error:', error)
    return NextResponse.json({ error: 'Failed to save lodging' }, { status: 500 })
  }
}
