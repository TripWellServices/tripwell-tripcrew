/** Modern uploads: one folder per memory (works with or without a Trip). */
export function expectedMemoryPhotoPrefix(memoryId: string): string {
  return `memories/${memoryId}/`
}

/** Legacy path from trip-scoped v1. */
export function legacyTripMemoryPhotoPrefix(tripId: string, memoryId: string): string {
  return `trip-memories/${tripId}/${memoryId}/`
}

export function isValidMemoryStoragePath(
  memoryId: string,
  storagePath: string,
  tripIdForLegacy?: string | null
): boolean {
  if (!storagePath || storagePath.includes('..')) return false
  if (storagePath.startsWith(expectedMemoryPhotoPrefix(memoryId))) return true
  if (tripIdForLegacy) {
    if (storagePath.startsWith(legacyTripMemoryPhotoPrefix(tripIdForLegacy, memoryId)))
      return true
  }
  return false
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isAllowedMemoryPhotoContentType(contentType: string | undefined): boolean {
  if (!contentType) return true
  return ALLOWED_TYPES.has(contentType.toLowerCase().split(';')[0].trim())
}

export const MAX_TRIP_MEMORY_PHOTO_BYTES = 10 * 1024 * 1024

export function isHttpsPublicUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}
