/**
 * MVP1 app chrome: header only — Concert Planner + MyTrips.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { getHydrateTraveler } from '@/lib/hydrateTravelerClient'
import { onAuthStateChanged } from 'firebase/auth'

const HEADER_NAV = [
  { href: '/plan', label: 'Concert Planner' },
  { href: '/my-trips', label: 'My Trips' },
] as const

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [photoURL, setPhotoURL] = useState<string | null>(null)

  const refreshProfile = useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (!firebaseUser) {
      setPhotoURL(null)
      return
    }
    try {
      const res = await getHydrateTraveler(firebaseUser)
      const data = await res.json()
      const t = data.traveler
      if (t?.id && typeof window !== 'undefined') {
        window.localStorage.setItem('travelerId', t.id)
      }
      if (t?.photoURL) setPhotoURL(t.photoURL)
      else if (firebaseUser.photoURL) setPhotoURL(firebaseUser.photoURL)
    } catch {
      if (firebaseUser.photoURL) setPhotoURL(firebaseUser.photoURL)
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = onAuthStateChanged(auth, refreshProfile)
    return () => unsub()
  }, [refreshProfile])

  const navActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="shrink-0 h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/home"
            className="text-lg font-bold text-sky-700 hover:text-sky-800 tracking-tight shrink-0"
          >
            TripWell
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {HEADER_NAV.map(({ href, label }) => {
              const active = navActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    active ? 'bg-sky-100 text-sky-800' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex sm:hidden items-center gap-1">
            {HEADER_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  navActive(href) ? 'text-sky-700' : 'text-gray-600'
                }`}
              >
                {label.split(' ')[0]}
              </Link>
            ))}
          </nav>
          <Link href="/profile/settings" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Settings
          </Link>
          <Link
            href="/profile/settings"
            className="shrink-0 rounded-full overflow-hidden border border-gray-200 w-9 h-9 bg-gray-100 flex items-center justify-center"
            title="Profile"
          >
            {photoURL ? (
              <img src={photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-500 font-medium">You</span>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
    </div>
  )
}
