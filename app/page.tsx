import Link from 'next/link'

export default function Home() {
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

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link
              href="/trip/7c451e52-380c-405e-98f9-04b349438b8f"
              className="px-8 py-3 bg-white text-sky-600 font-semibold rounded-lg hover:bg-sky-50 transition shadow-lg hover:shadow-xl"
            >
              View Sample Trip
            </Link>
            <Link
              href="/trip/7c451e52-380c-405e-98f9-04b349438b8f?admin=1"
              className="px-8 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition shadow-lg hover:shadow-xl border-2 border-white/20"
            >
              Admin Mode
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30">
              <div className="text-3xl mb-3">🍽</div>
              <h3 className="font-semibold text-white mb-2">Dining</h3>
              <p className="text-sm text-sky-50">
                Find and save restaurants with Google Places
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-white mb-2">Attractions</h3>
              <p className="text-sm text-sky-50">
                Discover places to visit with distance info
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="font-semibold text-white mb-2">Itinerary</h3>
              <p className="text-sm text-sky-50">
                Organize your trip day by day
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
