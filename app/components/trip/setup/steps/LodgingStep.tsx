'use client'

import LodgingCard, { type LodgingCardLodging } from '@/app/components/trip/LodgingCard'

type LodgingStepProps = {
  tripId: string
  lodging: LodgingCardLodging | null
  googleApiKey: string
}

export default function LodgingStep({ tripId, lodging, googleApiKey }: LodgingStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Lodging</h3>
        <p className="text-sm text-gray-600">
          Search for your hotel or rental — we use this location to suggest nearby places later.
        </p>
      </div>

      <LodgingCard
        lodging={lodging}
        tripId={tripId}
        isAdmin={true}
        googleApiKey={googleApiKey}
      />

      {!googleApiKey ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Google Places is not configured — lodging search requires GOOGLE_PLACES_API_KEY.
        </p>
      ) : null}
    </div>
  )
}
