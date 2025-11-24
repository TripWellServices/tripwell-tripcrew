export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to TripWell
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your trip planning companion
        </p>
        <p className="text-gray-500">
          Navigate to /trip/[tripId] to view a trip
        </p>
      </div>
    </main>
  )
}

