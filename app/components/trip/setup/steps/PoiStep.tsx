'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddEntryModal from '@/app/components/trip/AddEntryModal'
import CatalogueModal from '@/app/components/trip/CatalogueModal'

type PoiItem = {
  id: string
  title: string
  category?: string | null
  address?: string | null
  distanceFromLodging?: number | null
  driveTimeMinutes?: number | null
}

type PoiStepProps = {
  tripId: string
  catalogueCityId: string | null
  dining: PoiItem[]
  attractions: PoiItem[]
  lodgingSet: boolean
}

export default function PoiStep({
  tripId,
  catalogueCityId,
  dining,
  attractions,
  lodgingSet,
}: PoiStepProps) {
  const router = useRouter()
  const [addType, setAddType] = useState<'dining' | 'attraction' | null>(null)
  const [catalogueType, setCatalogueType] = useState<'dining' | 'attraction' | null>(null)

  const allPois = [
    ...dining.map((d) => ({ ...d, kind: 'dining' as const })),
    ...attractions.map((a) => ({ ...a, kind: 'attraction' as const })),
  ]

  const tripItemIds = allPois.map((p) => p.id)

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Places to go</h3>
        <p className="text-sm text-gray-600">
          Add restaurants, beaches, trails, and sights for this trip. These become your POI pool —
          assign them to days from the Plan tab when you are ready.
        </p>
      </div>

      {!lodgingSet ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Set lodging first for distance-from-stay estimates when you add places via Google.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAddType('attraction')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Add attraction
        </button>
        <button
          type="button"
          onClick={() => setAddType('dining')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Add restaurant
        </button>
        <button
          type="button"
          onClick={() => setCatalogueType('attraction')}
          className="px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Browse attractions
        </button>
        <button
          type="button"
          onClick={() => setCatalogueType('dining')}
          className="px-4 py-2 border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Browse restaurants
        </button>
      </div>

      {addType ? (
        <AddEntryModal
          type={addType}
          tripId={tripId}
          open={true}
          onClose={() => {
            setAddType(null)
            router.refresh()
          }}
          catalogueCityId={catalogueCityId}
        />
      ) : null}

      {catalogueType ? (
        <CatalogueModal
          type={catalogueType}
          tripId={tripId}
          cityId={catalogueCityId}
          tripItemIds={tripItemIds}
          open={true}
          onClose={() => {
            setCatalogueType(null)
            router.refresh()
          }}
        />
      ) : null}

      {allPois.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600 text-sm">
            No places yet — add manually, paste text for AI extraction, or pick from the regional
            catalogue.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allPois.map((poi) => (
            <li
              key={`${poi.kind}-${poi.id}`}
              className="border border-gray-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {poi.kind === 'dining' ? 'Restaurant' : 'Attraction'}
                  </span>
                  <h4 className="font-semibold text-gray-900 mt-0.5">{poi.title}</h4>
                  {poi.category ? (
                    <p className="text-xs text-gray-500 mt-0.5">{poi.category}</p>
                  ) : null}
                  {poi.address ? (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{poi.address}</p>
                  ) : null}
                  {poi.distanceFromLodging != null ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {poi.distanceFromLodging} mi
                      {poi.driveTimeMinutes != null
                        ? ` · ${poi.driveTimeMinutes} min drive`
                        : ''}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
