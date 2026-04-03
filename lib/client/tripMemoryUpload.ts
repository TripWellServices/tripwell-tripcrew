'use client'

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirebaseStorage } from '@/lib/firebase'
import {
  expectedMemoryPhotoPrefix,
  isAllowedMemoryPhotoContentType,
  MAX_TRIP_MEMORY_PHOTO_BYTES,
} from '@/lib/trip/memoryPhoto'

function extForMime(mime: string): string {
  const m = mime.toLowerCase().split(';')[0].trim()
  if (m === 'image/jpeg') return 'jpg'
  if (m === 'image/png') return 'png'
  if (m === 'image/webp') return 'webp'
  return 'bin'
}

export async function uploadTripMemoryPhotoFile(
  memoryId: string,
  file: File
): Promise<{
  storagePath: string
  publicUrl: string
  byteLength: number
  contentType: string
}> {
  if (file.size > MAX_TRIP_MEMORY_PHOTO_BYTES) {
    throw new Error(`Photo must be at most ${MAX_TRIP_MEMORY_PHOTO_BYTES / (1024 * 1024)} MB`)
  }
  const contentType = file.type || 'application/octet-stream'
  if (!isAllowedMemoryPhotoContentType(contentType)) {
    throw new Error('Use JPEG, PNG, or WebP')
  }

  const ext = extForMime(contentType)
  const name = `${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${ext}`
  const storagePath = `${expectedMemoryPhotoPrefix(memoryId)}${name}`
  const storageRef = ref(getFirebaseStorage(), storagePath)

  await uploadBytes(storageRef, file, { contentType })
  const publicUrl = await getDownloadURL(storageRef)

  return { storagePath, publicUrl, byteLength: file.size, contentType }
}
