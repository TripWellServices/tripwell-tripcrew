'use client'

import { COUNTRIES } from '@/lib/geo/countries'
import { UNITED_STATES_COUNTRY, US_STATES } from '@/lib/geo/us-states'
import { isUnitedStates } from '@/lib/trip/inferTripTitle'

type DestinationFieldsProps = {
  city: string
  state: string
  country: string
  onChange: (patch: { city?: string; state?: string; country?: string }) => void
}

export default function DestinationFields({
  city,
  state,
  country,
  onChange,
}: DestinationFieldsProps) {
  const isUsa = isUnitedStates(country || UNITED_STATES_COUNTRY)
  const resolvedCountry = country.trim() || UNITED_STATES_COUNTRY

  function handleCountryChange(nextCountry: string) {
    const patch: { country: string; state?: string } = { country: nextCountry }
    if (!isUnitedStates(nextCountry)) {
      patch.state = state
    } else if (state && state.length > 2) {
      const match = US_STATES.find((s) => s.name.toLowerCase() === state.toLowerCase())
      patch.state = match?.code ?? state
    }
    onChange(patch)
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
        </span>
        <select
          value={resolvedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="e.g. Montreal"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </label>

        {isUsa ? (
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">State</span>
            <select
              value={state}
              onChange={(e) => onChange({ state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Region / province
            </span>
            <input
              type="text"
              value={state}
              onChange={(e) => onChange({ state: e.target.value })}
              placeholder="e.g. QC, Bavaria"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </label>
        )}
      </div>
    </div>
  )
}
