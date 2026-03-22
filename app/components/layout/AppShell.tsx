/**
 * Universal app chrome: top nav (home + profile + settings) + fixed 5-link sidebar.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const SIDEBAR: { href: string; label: string; prefix?: boolean }[] = [
  { href: '/plan', label: 'Planner', prefix: true },
  { href: '/destinations', label: 'Destinations', prefix: true },
  { href: '/experiences', label: 'Experiences', prefix: true },
  { href: '/calendar', label: 'Calendar', prefix: true },
  { href: '/tripcrews', label: 'TripCrews', prefix: true },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [photoURL, setPhotoURL] = useState<string | null>(null)

  const refreshProfile = useCallback(async (firebaseUser: import('firebase/auth').User | null) => {
    if (!firebaseUser) {
      setPhotoURL(null)
      return
    }
    try {
      const res = await fetch(`/api/auth/hydrate?firebaseId=${firebaseUser.uid}`)
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

  const navActive = (href: string, prefix?: boolean) => {
    if (prefix) return pathname === href || pathname.startsWith(`${href}/`)
    return pathname === href
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="shrink-0 h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between gap-4 z-10">
        <Link
          href="/home"
          className="text-lg font-bold text-sky-700 hover:text-sky-800 tracking-tight"
        >
          TripWell
        </Link>
        <div className="flex items-center gap-3">
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

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <nav className="p-2 flex-1 space-y-0.5 pt-4">
            {SIDEBAR.map(({ href, label, prefix }) => {
              const active = navActive(href, prefix)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active ? 'bg-sky-100 text-sky-800' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  )
}
