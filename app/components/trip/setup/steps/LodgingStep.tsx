'use client'

import LodgingPlacePicker, {
  type LodgingPlaceSelection,
} from '@/app/components/trip/LodgingPlacePicker'
import type { LodgingCardLodging } from '@/app/components/trip/LodgingCard'

type LodgingStepProps = {
  tripId: string
  lodging: LodgingCardLodging | null
  googleApiKey: string
  onLodgingSaved?: () => void
}

function selectionFromLodging(lodging: LodgingCardLodging | null): LodgingPlaceSelection | null {
  if (!lodging) return null
  return {
    title: lodging.title,
    address: lodging.address,
    streetAddress: lodging.streetAddress,
    city: lodging.city,
    state: lodging.state,
    postalCode: lodging.postalCode,
    countryCode: lodging.countryCode,
    phone: lodging.phone,
    website: lodging.website,
    imageUrl: lodging.imageUrl,
    rating: lodging.rating,
    defaultCheckInTime: lodging.defaultCheckInTime,
    defaultCheckOutTime: lodging.defaultCheckOutTime,
  }
}

export default function LodgingStep({
  tripId,
  lodging,
  googleApiKey,
  onLodgingSaved,
}: LodgingStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Stay</h3>
        <p className="text-sm text-gray-600">
          Search for your hotel or rental — we use this location to suggest nearby things to do.
        </p>
      </div>

      <LodgingPlacePicker
        googleApiKey={googleApiKey}
        value={selectionFromLodging(lodging)}
        onChange={() => {
          onLodgingSaved?.()
        }}
        tripId={tripId}
      />
    </div>
  )
}
