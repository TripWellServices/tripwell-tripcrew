/** Client uploads to Firebase Storage under this prefix (see storage.rules). */
export function expectedMemoryPhotoPrefix(tripId: string, memoryId: string): string {
  return `trip-memories/${tripId}/${memoryId}/`
}

export function isValidMemoryStoragePath(
  tripId: string,
  memoryId: string,
  storagePath: string
): boolean {
  if (!storagePath || storagePath.includes('..')) return false
  const prefix = expectedMemoryPhotoPrefix(tripId, memoryId)
  return storagePath.startsWith(prefix)
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
