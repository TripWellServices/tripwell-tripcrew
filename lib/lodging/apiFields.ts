import { Prisma, LodgingType } from '@prisma/client'

export const LODGING_TYPE_VALUES: LodgingType[] = [
  'HOTEL',
  'RESORT',
  'EXTENDED_STAY',
  'VACATION_RENTAL',
  'HOSTEL',
  'BED_AND_BREAKFAST',
  'OTHER',
]

export function isLodgingType(v: string): v is LodgingType {
  return LODGING_TYPE_VALUES.includes(v as LodgingType)
}

/** Parse amenities from JSON body: object map only (not arrays at top level). */
export function parseAmenitiesJson(
  v: unknown
): Prisma.InputJsonValue | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'object' && !Array.isArray(v)) {
    return v as Prisma.InputJsonValue
  }
  return undefined
}

export function parseNightlyRate(
  v: unknown
): Prisma.Decimal | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
    return new Prisma.Decimal(v)
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) return new Prisma.Decimal(v)
  }
  return undefined
}

export function parseLodgingType(
  v: unknown
): LodgingType | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'string' && isLodgingType(v)) return v
  return undefined
}
