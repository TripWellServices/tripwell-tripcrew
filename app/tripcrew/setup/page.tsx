'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect } from 'react'
import Link from 'next/link'

export default function TripCrewSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/splash')
        return
      }

      // Get Traveler ID
      try {
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
          setTravelerId(data.traveler.id)
        }
      } catch (err) {
        console.error('Error hydrating traveler:', err)
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!travelerId) {
      setError('Please wait for authentication...')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tripcrew/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ownerId: travelerId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/tripcrew/${data.tripCrew.id}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create TripCrew')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create TripCrew')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create TripCrew</h1>
          <p className="text-gray-600">Set up your trip planning crew and start adding trips</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crew Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="e.g., Cole Family Travel Crew"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              rows={4}
              placeholder="Tell people about your trip crew..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !travelerId}
              className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create TripCrew'}
            </button>
            <Link
              href="/welcome"
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

