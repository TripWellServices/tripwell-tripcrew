export const HIKE_ROUTE_TYPES = [
  'out_and_back',
  'loop',
  'point_to_point',
  'lollipop',
] as const

export type HikeRouteType = (typeof HIKE_ROUTE_TYPES)[number]

export const HIKE_ROUTE_LABELS: Record<HikeRouteType, string> = {
  out_and_back: 'Out & back',
  loop: 'Loop',
  point_to_point: 'Point to point',
  lollipop: 'Lollipop',
}

/** Normalized hike fields after AI parse (and user edit before save). */
export interface HikeParseResult {
  name: string
  trailOrPlace: string | null
  difficulty: string | null
  distanceMi: number | null
  durationMin: number | null
  routeType: HikeRouteType | null
  trailheadLat: number | null
  trailheadLng: number | null
  nearestTown: string | null
  nearestState: string | null
  country: string | null
  url: string | null
  notes: string | null
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v.replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v)
  if (n == null) return null
  return Math.round(n)
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

function normalizeRouteType(v: unknown): HikeRouteType | null {
  const s =
    typeof v === 'string' ? v.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''
  const aliases: Record<string, HikeRouteType> = {
    out_and_back: 'out_and_back',
    outback: 'out_and_back',
    loop: 'loop',
    circular: 'loop',
    loops: 'loop',
    point_to_point: 'point_to_point',
    oneway: 'point_to_point',
    one_way: 'point_to_point',
    lollipop: 'lollipop',
  }
  const mapped = aliases[s]
  if (mapped) return mapped
  if (HIKE_ROUTE_TYPES.includes(s as HikeRouteType)) return s as HikeRouteType
  return null
}

/**
 * Coerce OpenAI JSON into HikeParseResult (tolerates extra keys / partial output).
 */
export function normalizeHikeParseResponse(parsed: unknown): HikeParseResult {
  const obj =
    parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const nameRaw =
    strOrNull(obj.name) ?? strOrNull(obj.trailName) ?? 'Unnamed trail'
  let trailheadLat = numOrNull(obj.trailheadLat ?? obj.trailheadLatitude)
  let trailheadLng = numOrNull(obj.trailheadLng ?? obj.trailheadLongitude)
  if (trailheadLat != null && (trailheadLat < -90 || trailheadLat > 90))
    trailheadLat = null
  if (trailheadLng != null && (trailheadLng < -180 || trailheadLng > 180))
    trailheadLng = null

  return {
    name: nameRaw,
    trailOrPlace: strOrNull(
      obj.trailOrPlace ?? obj.parkOrArea ?? obj.locationName
    ),
    difficulty: strOrNull(obj.difficulty ?? obj.difficultyRating),
    distanceMi: numOrNull(obj.distanceMi ?? obj.distanceMiles ?? obj.lengthMi),
    durationMin: intOrNull(
      obj.durationMin ?? obj.estimatedMinutes ?? obj.timeMinutes
    ),
    routeType: normalizeRouteType(
      obj.routeType ?? obj.route_type ?? obj.trailType
    ),
    trailheadLat,
    trailheadLng,
    nearestTown: strOrNull(obj.nearestTown ?? obj.town ?? obj.city),
    nearestState: strOrNull(obj.nearestState ?? obj.state ?? obj.region),
    country: strOrNull(obj.country) ?? 'USA',
    url: strOrNull(obj.url ?? obj.mapUrl),
    notes: strOrNull(obj.notes ?? obj.summary ?? obj.description),
  }
}
