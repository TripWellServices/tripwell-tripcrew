/**
 * LocalStorage API for TripWell
 * 
 * Centralized localStorage management (matching GoFast pattern)
 * Stores traveler and TripCrew data for instant navigation
 */

'use client'

const STORAGE_KEYS = {
  travelerId: 'travelerId',
  firebaseId: 'firebaseId',
  email: 'email',
  traveler: 'traveler',
  tripCrewId: 'tripCrewId', // Primary TripCrew ID
  tripCrewData: 'tripCrewData', // Full TripCrew object
  tripCrewMemberships: 'tripCrewMemberships', // All memberships
}

export const LocalStorageAPI = {
  // Traveler methods
  setTravelerId: (id: string | null) => {
    if (typeof window === 'undefined') return
    if (id) {
      localStorage.setItem(STORAGE_KEYS.travelerId, id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.travelerId)
    }
  },
  getTravelerId: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.travelerId)
  },
  setTraveler: (traveler: any) => {
    if (typeof window === 'undefined') return
    if (traveler) {
      localStorage.setItem(STORAGE_KEYS.traveler, JSON.stringify(traveler))
    } else {
      localStorage.removeItem(STORAGE_KEYS.traveler)
    }
  },
  getTraveler: (): any => {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(STORAGE_KEYS.traveler)
    return data ? JSON.parse(data) : null
  },

  // TripCrew methods
  setTripCrewId: (id: string | null) => {
    if (typeof window === 'undefined') return
    if (id) {
      localStorage.setItem(STORAGE_KEYS.tripCrewId, id)
    } else {
      localStorage.removeItem(STORAGE_KEYS.tripCrewId)
    }
  },
  getTripCrewId: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.tripCrewId)
  },
  setTripCrewData: (crew: any) => {
    if (typeof window === 'undefined') return
    if (crew) {
      localStorage.setItem(STORAGE_KEYS.tripCrewData, JSON.stringify(crew))
    } else {
      localStorage.removeItem(STORAGE_KEYS.tripCrewData)
    }
  },
  getTripCrewData: (): any => {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(STORAGE_KEYS.tripCrewData)
    return data ? JSON.parse(data) : null
  },
  setTripCrewMemberships: (memberships: any[]) => {
    if (typeof window === 'undefined') return
    if (memberships) {
      localStorage.setItem(STORAGE_KEYS.tripCrewMemberships, JSON.stringify(memberships))
    } else {
      localStorage.removeItem(STORAGE_KEYS.tripCrewMemberships)
    }
  },
  getTripCrewMemberships: (): any[] => {
    if (typeof window === 'undefined') return []
    const data = localStorage.getItem(STORAGE_KEYS.tripCrewMemberships)
    return data ? JSON.parse(data) : []
  },
  clearTripCrewData: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEYS.tripCrewId)
    localStorage.removeItem(STORAGE_KEYS.tripCrewData)
    localStorage.removeItem(STORAGE_KEYS.tripCrewMemberships)
    console.log('✅ LocalStorageAPI: Cleared all TripCrew data')
  },

  /**
   * Set full hydration model (like GoFast)
   * Stores traveler and their TripCrews
   */
  setFullHydrationModel: (traveler: any) => {
    if (typeof window === 'undefined') return
    if (!traveler) return

    // Store traveler
    LocalStorageAPI.setTravelerId(traveler.id)
    LocalStorageAPI.setTraveler(traveler)

    // Store TripCrew memberships
    if (traveler.tripCrewMemberships) {
      LocalStorageAPI.setTripCrewMemberships(traveler.tripCrewMemberships)

      // Set primary TripCrew (first one, or most recent)
      if (traveler.tripCrewMemberships.length > 0) {
        const primaryMembership = traveler.tripCrewMemberships[0]
        const primaryCrew = primaryMembership.tripCrew

        if (primaryCrew) {
          LocalStorageAPI.setTripCrewId(primaryCrew.id)
          LocalStorageAPI.setTripCrewData(primaryCrew)
          console.log('✅ LocalStorageAPI: Stored primary TripCrew:', primaryCrew.name)
        }
      }
    }

    console.log('✅ LocalStorageAPI: Full hydration model stored')
  },
}

