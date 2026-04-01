/** Google Places Details `address_components` entry. */
export type GoogleAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

/** Best-effort structured address from Google `address_components`. */
export function parseStructuredAddressFromGoogle(
  components: GoogleAddressComponent[] | undefined
): {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string | null
} {
  if (!components?.length) {
    return {
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
      countryCode: null,
    }
  }

  const findLong = (...types: string[]) => {
    const c = components.find((x) => types.some((t) => x.types.includes(t)))
    return c?.long_name ?? null
  }

  const findShort = (...types: string[]) => {
    const c = components.find((x) => types.some((t) => x.types.includes(t)))
    return c?.short_name ?? null
  }

  const streetNumber = findLong('street_number')
  const route = findLong('route')
  const streetParts = [streetNumber, route].filter(Boolean)
  const streetAddress = streetParts.length ? streetParts.join(' ') : null

  const city =
    findLong(
      'locality',
      'sublocality',
      'sublocality_level_1',
      'postal_town',
      'neighborhood'
    ) ?? null

  const state = findShort('administrative_area_level_1') ?? null
  const postalCode = findLong('postal_code') ?? null
  const countryCode = findShort('country') ?? null

  return {
    streetAddress,
    city,
    state,
    postalCode,
    countryCode,
  }
}
