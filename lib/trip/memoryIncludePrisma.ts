/** Shared Prisma include for TripMemory API responses. */
export const tripMemoryApiInclude = {
  author: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  photos: { orderBy: { sortOrder: 'asc' as const } },
  tripDay: { select: { id: true, dayNumber: true, date: true } },
  trip: {
    select: {
      id: true,
      purpose: true,
      city: true,
      state: true,
      country: true,
      startDate: true,
      endDate: true,
      crewId: true,
    },
  },
} as const
