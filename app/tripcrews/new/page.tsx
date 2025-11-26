/**
 * Create TripCrew Page
 * 
 * Simple single-form page to create a new TripCrew
 * Redirects to /tripcrews/[id] after creation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { createTripCrew } from '@/lib/actions/tripcrew'
import Link from 'next/link'

export default function CreateTripCrewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [travelerId, setTravelerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      // Get Traveler ID from localStorage (set during hydration)
      if (typeof window !== 'undefined') {
        const storedTravelerId = localStorage.getItem('travelerId')
        if (storedTravelerId) {
          setTravelerId(storedTravelerId)
          setLoading(false)
        } else {
          // Hydrate if not in localStorage
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
              localStorage.setItem('travelerId', data.traveler.id)
            }
          } catch (err) {
            console.error('Error hydrating:', err)
            setError('Failed to load your account')
          } finally {
            setLoading(false)
          }
        }
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

    setSaving(true)
    setError('')

    try {
      const result = await createTripCrew({
        name: formData.name,
        description: formData.description,
        travelerId,
      })

      if (result.success && result.tripCrew) {
        // Redirect to the new TripCrew admin page
        router.push(`/tripcrews/${result.tripCrew.id}`)
      } else {
        setError(result.error || 'Failed to create TripCrew')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create TripCrew')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
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
              disabled={saving || !travelerId}
              className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create TripCrew'}
            </button>
            <Link
              href="/tripcrews"
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
