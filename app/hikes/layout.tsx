import Link from 'next/link'

/**
 * Standalone /hikes/* routes (not under /tripcrews/...) get a thin persistent header
 * so navigation isn’t a dead end. Crew-scoped hike URLs still use TripCrewLayout only.
 */
export default function HikesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href="/home"
          className="text-sm font-semibold text-gray-900 hover:text-sky-700"
        >
          TripCrew
        </Link>
        <span className="text-xs text-gray-500 truncate">Hikes</span>
      </header>
      {children}
    </div>
  )
}
