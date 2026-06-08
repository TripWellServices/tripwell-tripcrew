import { prisma } from '@/lib/prisma'
import { upsertCityByName } from '@/lib/city-upsert'

/**
 * Resolve concert city FK server-side (GoFast race pattern).
 * Accepts explicit cityId or city/state/country text; never requires client to own cityId.
 */
export async function resolveConcertCityId(params: {
  cityId?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}): Promise<string | null> {
  const explicit = params.cityId?.trim()
  if (explicit) {
    const row = await prisma.city.findUnique({ where: { id: explicit } })
    if (!row) return null
    return row.id
  }

  const cityName = params.city?.trim()
  if (!cityName) return null

  const row = await upsertCityByName({
    name: cityName,
    state: params.state?.trim() || null,
    country: params.country?.trim() || 'USA',
  })
  return row.id
}
