'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY',
]

const personaOptions = ['Art', 'Food', 'History', 'Adventure']
const planningStyleOptions = [
  'Spontaneous',
  'Mix of spontaneous and planned',
  'Set a plan and stick to it!',
]

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [traveler, setTraveler] = useState<any>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    hometownCity: '',
    state: '',
    persona: '',
    planningStyle: '',
    dreamDestination: '',
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      try {
        // Hydrate traveler
        const response = await fetch('/api/auth/hydrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseId: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            picture: firebaseUser.photoURL,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const hydratedTraveler = data.traveler
          setTraveler(hydratedTraveler)

          // Pre-fill form with existing data
          setFormData({
            firstName: hydratedTraveler.firstName || '',
            lastName: hydratedTraveler.lastName || '',
            email: hydratedTraveler.email || firebaseUser.email || '',
            hometownCity: '',
            state: '',
            persona: '',
            planningStyle: '',
            dreamDestination: '',
          })
        }
      } catch (err) {
        console.error('Error hydrating traveler:', err)
        setError('Failed to load your profile')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Update profile via API
      const response = await fetch('/api/traveler/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      // Redirect back to welcome
      router.push('/welcome')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-xl">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Profile Settings
          </h1>
          <Link
            href="/welcome"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-gray-700">First Name</label>
              <input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-gray-700">Last Name</label>
              <input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-700">Email</label>
            <input
              value={formData.email}
              disabled
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-700">City/State You Call Home</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={formData.hometownCity}
                onChange={(e) => setFormData({ ...formData, hometownCity: e.target.value })}
                placeholder="City"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">State</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              How do you best describe your trip desires?
            </h3>
            <div className="space-y-3">
              {personaOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <input
                    type="radio"
                    name="persona"
                    value={option}
                    checked={formData.persona === option}
                    onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              How do you plan/live out your trips?
            </h3>
            <div className="space-y-3">
              {planningStyleOptions.map((style) => (
                <label
                  key={style}
                  className="flex items-center space-x-3 cursor-pointer p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <input
                    type="radio"
                    name="planningStyle"
                    value={style}
                    checked={formData.planningStyle === style}
                    onChange={(e) => setFormData({ ...formData, planningStyle: e.target.value })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">{style}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-700">Dream Destination</label>
            <input
              value={formData.dreamDestination}
              onChange={(e) => setFormData({ ...formData, dreamDestination: e.target.value })}
              placeholder="Where would you love to travel?"
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/welcome"
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

