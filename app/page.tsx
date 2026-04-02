'use client'

/**
 * Root splash — same idea as gofastapp-mvp `app/page.tsx`:
 * show a loader until Firebase auth has finished restoring the session, then route.
 * If signed in, persist `firebaseId` (uid) and go to /welcome; otherwise show marketing.
 * No manual JWT parsing: if the user exists on our initialized Firebase app, they belong to this project.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          localStorage.setItem('firebaseId', user.uid)
        } catch {
          /* ignore */
        }
      }
      setIsAuthenticated(!!user)
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    router.replace('/welcome')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-lg font-medium">TripWell</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading your trip...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-6">
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
