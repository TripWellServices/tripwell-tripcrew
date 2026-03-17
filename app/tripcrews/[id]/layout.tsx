/**
 * TripCrew Layout Wrapper
 * 
 * Fetches TripCrew data and wraps all pages with TripCrewLayout
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getTripCrew, generateInviteLink } from '@/lib/actions/tripcrew'
import { LocalStorageAPI } from '@/lib/localStorage'
import TripCrewLayout from '@/app/components/layout/TripCrewLayout'
import Link from 'next/link'
import { useMemo } from 'react'

interface TripCrewLayoutWrapperProps {
  children: React.ReactNode
}

export default function TripCrewLayoutWrapper({ children }: TripCrewLayoutWrapperProps) {
  const params = useParams()
  const tripCrewId = params.id as string
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [travelerId, setTravelerId] = useState<string | null>(null)
  const [tripCrew, setTripCrew] = useState<any>(null)
  const [error, setError] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)

  // Compute categorized trips for badge count
  const categorizedTrips = useMemo(() => {
    if (!tripCrew?.trips) return { upcoming: [], past: [] }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const upcoming: any[] = []
    const past: any[] = []
    
    tripCrew.trips.forEach((trip: any) => {
      if (!trip.endDate) {
        upcoming.push(trip)
        return
      }
      
      const endDate = new Date(trip.endDate)
      endDate.setHours(0, 0, 0, 0)
      
      if (endDate >= today) {
        upcoming.push(trip)
      } else {
        past.push(trip)
      }
    })
    
    return { upcoming, past }
  }, [tripCrew?.trips])

  const loadInviteLink = useCallback(async (id: string) => {
    try {
      const result = await generateInviteLink(tripCrewId, id)
      if (result.success && result.inviteUrl) {
        setInviteUrl(result.inviteUrl)
      }
    } catch (err: any) {
      console.error('Failed to generate invite link:', err)
    }
  }, [tripCrewId])

  const loadTripCrew = useCallback(async (id: string) => {
    try {
      const result = await getTripCrew(tripCrewId, id)
      if (result.success && result.tripCrew) {
        setTripCrew(result.tripCrew)
        LocalStorageAPI.setTripCrewId(result.tripCrew.id)
        LocalStorageAPI.setTripCrewData(result.tripCrew)
        
        const isAdmin = result.tripCrew.roles?.some((r: any) => r.travelerId === id && r.role === 'admin')
        if (isAdmin) {
          loadInviteLink(id)
        }
      } else {
        setError(result.error || 'Failed to load TripCrew')
        if (result.error?.includes('Not a member')) {
          router.push('/home')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load TripCrew')
    } finally {
      setLoading(false)
    }
  }, [tripCrewId, router, loadInviteLink])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/')
        return
      }

      const storedTravelerId = LocalStorageAPI.getTravelerId()
      const storedTripCrewData = LocalStorageAPI.getTripCrewData()

      if (storedTripCrewData && storedTripCrewData.id === tripCrewId && storedTravelerId) {
        setTravelerId(storedTravelerId)
        setTripCrew(storedTripCrewData)
        setLoading(false)
        if (storedTravelerId) {
          loadTripCrew(storedTravelerId)
        }
        return
      }

      if (storedTravelerId) {
        setTravelerId(storedTravelerId)
        loadTripCrew(storedTravelerId)
      } else {
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
            const travelerId = data.traveler.id
            setTravelerId(travelerId)
            LocalStorageAPI.setFullHydrationModel(data.traveler)
            loadTripCrew(travelerId)
          } else {
            setError('Failed to load your account')
            setLoading(false)
          }
        } catch (err) {
          console.error('Error hydrating:', err)
          setError('Failed to load your account')
          setLoading(false)
        }
      }
    })

    return () => unsubscribe()
  }, [router, tripCrewId, loadTripCrew])

  const handleCopyInvite = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-sky-600 mx-auto mb-4" />
          <p className="text-gray-600 text-xl">Loading TripCrew...</p>
        </div>
      </div>
    )
  }

  if (error && !tripCrew) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/home" className="text-sky-600 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!tripCrew) {
    return null
  }

  return (
    <TripCrewLayout
      tripCrewId={tripCrewId}
      tripCrew={tripCrew}
      travelerId={travelerId}
      inviteUrl={inviteUrl}
      inviteCopied={inviteCopied}
      onCopyInvite={handleCopyInvite}
      categorizedTrips={categorizedTrips}
    >
      {children}
    </TripCrewLayout>
  )
}
