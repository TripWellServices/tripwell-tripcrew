'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const REGIONS = [
  'Southeast',
  'Northeast',
  'Mid-Atlantic',
  'West Coast',
  'Europe',
  'Any',
]
const SOMETHINGS = [
  'Beach',
  'Concerts',
  'Food & dining',
  'History & culture',
  'Outdoors',
  'City break',
  'Other',
]
const VIBES = ['Relax', 'Adventure', 'Culture', 'Party', 'Family', 'Romantic', 'Mix']

type Recommendation = { name: string; state?: string; country: string }

interface PlanWizardClientProps {
  tripCrewId: string
  initialTripId: string | null
}

export default function PlanWizardClient({ tripCrewId, initialTripId }: PlanWizardClientProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [tripId, setTripId] = useState<string | null>(initialTripId)
  const [whereText, setWhereText] = useState('')
  const [region, setRegion] = useState('')
  const [something, setSomething] = useState('')
  const [whoGoing, setWhoGoing] = useState('')
  const [vibes, setVibes] = useState('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ensureTrip = async () => {
    if (tripId) return tripId
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tripcrew/${tripCrewId}/trips`, { method: 'GET' })
      const list = await res.json().catch(() => [])
      const planned = Array.isArray(list) ? list.find((t: { status?: string }) => t.status === 'PLANNED') : null
      if (planned?.id) {
        setTripId(planned.id)
        return planned.id
      }
      const travelerId = typeof window !== 'undefined' ? localStorage.getItem('travelerId') : null
      const createRes = await fetch(`/api/tripcrew/${tripCrewId}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createPlanned: true,
          tripName: 'Planning',
          purpose: 'Planning our trip',
          travelerId,
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create trip')
      }
      const created = await createRes.json()
      const id = created.trip?.id || created.id
      if (id) setTripId(id)
      return id
    } catch (e: any) {
      setError(e.message || 'Need a trip to save to. Create a trip from your crew first.')
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleGetRecommendations = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/plan/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whereText: whereText.trim(),
          region: region || undefined,
          something: something || undefined,
          whoGoing: whoGoing || undefined,
          vibes: vibes || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to get recommendations')
      const data = await res.json()
      setRecommendations(data.suggestions || [])
      setStep(3)
    } catch (e: any) {
      setError(e.message || 'Could not get recommendations')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRecommendation = async (rec: Recommendation) => {
    const tid = await ensureTrip()
    if (!tid) return
    setSaving(true)
    setError('')
    try {
      const cityRes = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rec.name,
          state: rec.state || undefined,
          country: rec.country,
        }),
      })
      if (!cityRes.ok) {
        const err = await cityRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save city')
      }
      const city = await cityRes.json()

      const destRes = await fetch(`/api/trip/${tid}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId: city.id, name: rec.name }),
      })
      if (!destRes.ok) throw new Error('Failed to add destination to trip')
      router.push(`/trip/${tid}`)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <Link
          href={`/tripcrews/${tripCrewId}`}
          className="text-sky-600 hover:underline text-sm"
        >
          ← Back to TripCrew
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {step === 1 && 'Where would you like to go?'}
        {step === 2 && "Let's think through it"}
        {step === 3 && 'Pick a place to add to your trip'}
      </h1>
      <p className="text-gray-600 mb-6">
        {step === 1 && 'Tell us a bit and we’ll suggest regions and cities.'}
        {step === 2 && 'Narrow it down so we can recommend the best spots.'}
        {step === 3 && 'Save as a city and add it to your trip as a destination.'}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <textarea
            value={whereText}
            onChange={(e) => setWhereText(e.target.value)}
            placeholder="e.g. beach, summer concerts, DC, Europe..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            rows={3}
          />
          <button
            onClick={() => setStep(2)}
            className="w-full px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700"
          >
            Next — Let’s think through it
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Choose region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Any</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Choose something</label>
            <select
              value={something}
              onChange={(e) => setSomething(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Any</option>
              {SOMETHINGS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Who&apos;s going?</label>
            <input
              type="text"
              value={whoGoing}
              onChange={(e) => setWhoGoing(e.target.value)}
              placeholder="e.g. family, friends, solo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What vibes?</label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVibes(vibes === v ? '' : v)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    vibes === v ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleGetRecommendations}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? 'Getting recommendations…' : 'Get region recommendations'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={`${rec.name}-${rec.state ?? ''}-${rec.country}`}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div>
                <span className="font-medium">{rec.name}</span>
                {rec.state && <span className="text-gray-500">, {rec.state}</span>}
                <span className="text-gray-500"> — {rec.country}</span>
              </div>
              <button
                onClick={() => handleSelectRecommendation(rec)}
                disabled={saving}
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save city & add to trip'}
              </button>
            </div>
          ))}
          <button
            onClick={() => setStep(2)}
            className="w-full mt-4 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Back to refine
          </button>
        </div>
      )}
    </div>
  )
}
