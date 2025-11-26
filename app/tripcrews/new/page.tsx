/**
 * Create TripCrew Page (3-Step Wizard)
 * 
 * Step 1: Create Crew
 * Step 2: Add Members (future)
 * Step 3: Create First Trip (optional)
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
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
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
          }
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!travelerId) {
      setError('Please wait for authentication...')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await createTripCrew({
        name: formData.name,
        description: formData.description,
        travelerId,
      })

      if (result.success && result.tripCrew) {
        // Step 1 complete - go to Step 2 (Add Members) or Step 3 (Create Trip)
        // For now, skip to Step 3 (Create First Trip)
        setStep(3)
      } else {
        setError(result.error || 'Failed to create TripCrew')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create TripCrew')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipToCrew = () => {
    // After creating crew, go to home (will show new crew)
    router.push('/home')
  }
  
  const handleGoHome = () => {
    // Soft fallback - go home if not ready
    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-sky-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-sky-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Create Crew</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-sky-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-sky-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Add Members</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step >= 3 ? 'text-sky-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-sky-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Create Trip</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Step 1: Create Crew */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your TripCrew</h2>
              <p className="text-gray-600 mb-6">Give your crew a name and description</p>
            </div>

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
                {loading ? 'Creating...' : 'Create Crew'}
              </button>
              <Link
                href="/home"
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Go Home
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: Add Members (Future) */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Add Members</h2>
              <p className="text-gray-600 mb-6">Invite people to join your TripCrew</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-center">
                Member invitation feature coming soon!
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
              >
                Skip for Now
              </button>
              <button
                onClick={handleGoHome}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Go Home
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Create First Trip */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your First Trip</h2>
              <p className="text-gray-600 mb-6">Start planning your first adventure!</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-center mb-4">
                Trip creation will be available on your TripCrew page.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSkipToCrew}
                className="flex-1 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition"
              >
                Go Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

