'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import AddEntryModal from './AddEntryModal'
import CatalogueModal from './CatalogueModal'
import {
  googleMapsUrlFromMetadata,
  summarizeDiningMetadata,
} from '@/lib/trip-experience-display'

interface Dining {
  id: string
  title: string
  category?: string | null
  address?: string | null
  description?: string | null
  metadata?: unknown
  rating?: number | null
  imageUrl?: string | null
  distanceFromLodging?: number | null
  driveTimeMinutes?: number | null
  website?: string | null
  phone?: string | null
}

interface DiningCardProps {
  dining: Dining[]
  tripId: string
  isAdmin: boolean
  catalogueCityId?: string | null
}

export default function DiningCard({
  dining,
  tripId,
  isAdmin,
  catalogueCityId,
}: DiningCardProps) {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)
  const [catalogueOpen, setCatalogueOpen] = useState(false)

  const tripItemIds = dining.map((d) => d.id)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Dining</h2>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setCatalogueOpen(true)}
              className="px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              View catalogue
            </button>
          </div>
        )}
      </div>

      <AddEntryModal
        type="dining"
        tripId={tripId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        catalogueCityId={catalogueCityId}
      />
      <CatalogueModal
        type="dining"
        tripId={tripId}
        cityId={catalogueCityId ?? null}
        tripItemIds={tripItemIds}
        open={catalogueOpen}
        onClose={() => setCatalogueOpen(false)}
      />

      {dining.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
          <p className="text-gray-600 text-sm mb-3">
            No restaurants yet — add manually, paste text for AI extraction, or pick from the
            regional catalogue.
          </p>
          {isAdmin ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setCatalogueOpen(true)}
                className="px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                View catalogue
              </button>
            </div>
          ) : (
            <Link
              href={`${pathname}?admin=1`}
              className="inline-block text-sm font-medium text-sky-600 hover:underline"
            >
              Enable editing (?admin=1) to add restaurants
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dining.map((item) => {
            const mapsUrl = googleMapsUrlFromMetadata(item.metadata)
            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                  {item.category && (
                    <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                  )}
                  {item.description?.trim() ? (
                    <p className="text-sm text-gray-700 mt-1 line-clamp-4">
                      {item.description.trim()}
                    </p>
                  ) : null}
                  {summarizeDiningMetadata(item.metadata).map((line, i) => (
                    <p key={i} className="text-xs text-gray-600 mt-1.5">
                      {line}
                    </p>
                  ))}
                  {item.rating && (
                    <div className="flex items-center mb-2">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span className="text-gray-700">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {item.distanceFromLodging != null && (
                    <p className="text-sm text-gray-600">
                      {item.distanceFromLodging} mi
                      {item.driveTimeMinutes != null &&
                        ` • ${item.driveTimeMinutes} min drive`}
                    </p>
                  )}
                  {item.address && (
                    <p className="text-xs text-gray-500 mt-2">{item.address}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Google Maps
                      </a>
                    ) : null}
                    {item.website && (
                      <a
                        href={item.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Website
                      </a>
                    )}
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
