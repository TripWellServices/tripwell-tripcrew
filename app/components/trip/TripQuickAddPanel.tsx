'use client'

import Link from 'next/link'
import { useState } from 'react'
import AddEntryModal, { type AddEntryType } from './AddEntryModal'
import CatalogueModal, { type CatalogueModalType } from './CatalogueModal'

type TripQuickAddPanelProps = {
  tripId: string
  catalogueCityId?: string | null
  destinationLabel?: string | null
  diningIds: string[]
  attractionIds: string[]
  locationBias?: {
    lat: number
    lng: number
    radiusMeters?: number
  } | null
}

export default function TripQuickAddPanel({
  tripId,
  catalogueCityId,
  destinationLabel,
  diningIds,
  attractionIds,
  locationBias,
}: TripQuickAddPanelProps) {
  const [entryType, setEntryType] = useState<AddEntryType | null>(null)
  const [catalogueType, setCatalogueType] = useState<CatalogueModalType | null>(null)

  return (
    <section className="mt-6 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            On this trip
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">Add what you find</h2>
          <p className="mt-1 text-sm text-gray-600">
            Save restaurants and places from Google, paste notes, or pick from the local catalogue.
            Then add saved items to a trip day below.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap md:justify-end">
          <button
            type="button"
            onClick={() => setEntryType('dining')}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add restaurant
          </button>
          <button
            type="button"
            onClick={() => setEntryType('attraction')}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add place
          </button>
          <button
            type="button"
            onClick={() => setCatalogueType('dining')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Restaurants
          </button>
          <button
            type="button"
            onClick={() => setCatalogueType('attraction')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Places
          </button>
          <Link
            href={`/trip/${tripId}/admin`}
            className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 sm:col-span-1"
          >
            Trip details
          </Link>
        </div>
      </div>

      <AddEntryModal
        type={entryType ?? 'dining'}
        tripId={tripId}
        open={entryType !== null}
        onClose={() => setEntryType(null)}
        catalogueCityId={catalogueCityId}
        googleSearchContext={destinationLabel}
        locationBias={locationBias}
      />
      <CatalogueModal
        type={catalogueType ?? 'dining'}
        tripId={tripId}
        cityId={catalogueCityId ?? null}
        tripItemIds={catalogueType === 'attraction' ? attractionIds : diningIds}
        open={catalogueType !== null}
        onClose={() => setCatalogueType(null)}
      />
    </section>
  )
}
