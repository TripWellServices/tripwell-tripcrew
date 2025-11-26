'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user exists in TripWell (not just Firebase)
        try {
          const response = await fetch('/api/auth/hydrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseId: user.uid,
              email: user.email,
              name: user.displayName,
              picture: user.photoURL,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            // Only redirect if Traveler exists in TripWell
            if (data.traveler) {
              router.push('/welcome')
            }
            // If no Traveler, stay on splash (let them sign up fresh)
          }
        } catch (err) {
          console.error('Check traveler error:', err)
          // On error, stay on splash
        }
      }
    })

    return () => unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-6">
          {/* TripWell Logo */}
          <div className="flex flex-col items-center space-y-4">
            <svg 
              width="140" 
              height="140" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              <path 
                d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L12 21L16 22V20.5L14 19V13.5L22 16Z" 
                fill="#0ea5e9"
              />
            </svg>
            
            {/* TripWell Text */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                <span className="text-sky-100">Trip</span>
                <span className="text-white">Well</span>
              </h1>
              <p className="text-lg text-sky-50 font-medium drop-shadow-md mb-2">
                Trip Crew Edition
              </p>
              <p className="text-base text-sky-100 drop-shadow-sm">
                Plan and organize your trips with your crew
              </p>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link
              href="/signin"
              className="px-8 py-3 bg-white text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition shadow-lg hover:shadow-xl"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition shadow-lg hover:shadow-xl border-2 border-white/20"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

