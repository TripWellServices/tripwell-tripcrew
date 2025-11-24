import { format } from 'date-fns'
import Image from 'next/image'

interface TripHeaderProps {
  name: string
  destination?: string | null
  startDate?: Date | null
  endDate?: Date | null
  coverImage?: string | null
}

export default function TripHeader({
  name,
  destination,
  startDate,
  endDate,
  coverImage,
}: TripHeaderProps) {
  const dateRange =
    startDate && endDate
      ? `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
      : startDate
        ? format(new Date(startDate), 'MMM d, yyyy')
        : null

  return (
    <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-lg">
      {coverImage ? (
        <Image
          src={coverImage}
          alt={name}
          fill
          className="object-cover"
          priority
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600" />
      )}
      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
        <div className="p-6 md:p-8 text-white w-full">
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{name}</h1>
          {destination && (
            <p className="text-lg md:text-xl mb-2 flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {destination}
            </p>
          )}
          {dateRange && (
            <p className="text-base md:text-lg opacity-90">{dateRange}</p>
          )}
        </div>
      </div>
    </div>
  )
}

