'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

interface TripCrew {
  id: string
  name: string
  trips: Array<{ id: string; name: string }>
}

interface TripCrewMembership {
  tripCrew: TripCrew
}

interface Traveler {
  id: string
  firebaseId: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  photoURL: string | null
  hometownCity: string | null
  homeState: string | null
  persona: string | null
  planningStyle: string | null
  dreamDestination: string | null
  tripCrewMemberships: TripCrewMembership[]
}

export default function WelcomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [traveler, setTraveler] = useState<Traveler | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      // Hydrate Traveler from Firebase (Universal Hydrator - like GoFast)
      try {
        console.log('🚀 WELCOME: ===== STARTING HYDRATION =====')
        console.log('🔄 WELCOME: Hydrating traveler for firebaseId:', firebaseUser.uid)
        
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

        console.log('🔄 WELCOME: Response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          const hydratedTraveler = data.traveler
          
          console.log('✅ WELCOME: Traveler hydrated:', hydratedTraveler?.id)
          console.log('✅ WELCOME: Email:', hydratedTraveler?.email)
          console.log('✅ WELCOME: Name:', hydratedTraveler?.firstName, hydratedTraveler?.lastName)
          console.log('✅ WELCOME: TripCrews count:', hydratedTraveler?.tripCrewMemberships?.length || 0)

          // Store in localStorage (like GoFast pattern)
          if (typeof window !== 'undefined') {
            localStorage.setItem('travelerId', hydratedTraveler.id)
            localStorage.setItem('firebaseId', firebaseUser.uid)
            localStorage.setItem('email', hydratedTraveler.email || firebaseUser.email || '')
            localStorage.setItem('traveler', JSON.stringify(hydratedTraveler))
            
            console.log('💾 WELCOME: Traveler data cached to localStorage')
          }

          setTraveler(hydratedTraveler)

          console.log('✅ WELCOME: ===== HYDRATION SUCCESS =====')
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ WELCOME: Hydrate failed:', errorData)
          setError(errorData.error || 'Failed to load your account')
        }
      } catch (err: any) {
        console.error('❌ WELCOME: Hydrate error:', err)
        setError(err.message || 'Failed to load your account')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/"
            className="text-sky-600 hover:underline"
          >
            Go back
          </Link>
        </div>
      </div>
    )
  }

  const displayName = traveler?.firstName || traveler?.email || 'Traveler'

  // Check if profile is complete
  const isProfileComplete = 
    traveler?.firstName && 
    traveler?.lastName && 
    traveler?.hometownCity && 
    traveler?.homeState && 
    traveler?.persona && 
    traveler?.planningStyle

  const handleLetsGo = () => {
    if (!isProfileComplete) {
      // Profile incomplete - go to profile setup
      router.push('/profile/setup')
    } else {
      // Profile complete - go to home (shows all TripCrews)
      router.push('/home')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        <div className="space-y-8">
          {/* TripWell Logo */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
              <svg 
                width="60" 
                height="60" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="text-white"
              >
                <path 
                  d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L12 21L16 22V20.5L14 19V13.5L22 16Z" 
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome{displayName ? `, ${displayName.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 font-medium drop-shadow-md">
              Ready to start TripWelling?
            </p>
          </div>

          {/* Let's Go Button */}
          {traveler && (
            <div className="mt-8">
              <button
                onClick={handleLetsGo}
                className="bg-white text-sky-600 px-12 py-4 rounded-xl font-bold text-xl hover:bg-sky-50 transition shadow-2xl transform hover:scale-105"
              >
                Let's Go! →
              </button>
            </div>
          )}

          {/* Settings Link */}
          <div className="mt-6">
            <Link
              href="/profile/settings"
              className="text-white/80 hover:text-white text-sm underline"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

