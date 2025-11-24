# TripWell MVP - Trip Crew Edition

A Next.js 14 app for planning and organizing trips with your crew, modeled after RunCrew architecture.

## Features

- **Trip Management**: Create and manage trips with dates, destinations, and cover images
- **Lodging**: Add and manage lodging with Google Places integration
- **Dining**: Search and add restaurants with distance calculations
- **Attractions**: Find and add attractions with drive time estimates
- **Itinerary**: Assign dining and attractions to specific trip days
- **Logistics**: Shared checklist for trip logistics
- **What to Pack**: Group packing checklist with progress tracking
- **Weather Forecast**: 7-day weather forecast based on lodging location
- **Admin Mode**: Edit trips via `?admin=1` query parameter

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- Prisma + PostgreSQL
- Google Places API
- OpenWeather API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Add your API keys:
- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_PLACES_API_KEY`: Google Places API key
- `OPENWEATHER_API_KEY`: OpenWeather API key

3. Set up the database:
```bash
npx prisma migrate dev --name init
```

4. Seed the database:
```bash
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

## Usage

### View a Trip
Navigate to `/trip/[tripId]` to view a trip in read-only mode.

### Admin Mode
Add `?admin=1` to the URL to enable editing:
- `/trip/[tripId]?admin=1`

Or use the dedicated admin route:
- `/trip/[tripId]/admin`

### Adding Places
In admin mode:
1. Click "Add Restaurant" or "Add Attraction"
2. Search using the Google Places autocomplete
3. Select a place to hydrate and save

### Itinerary
- Assign dining and attractions to specific days
- View items grouped by day
- Drag and drop (coming soon)

## Project Structure

```
app/
  api/
    hydrate/        # Google Places hydration endpoints
    trip/           # Trip CRUD endpoints
    weather/        # Weather forecast endpoint
  components/trip/  # Trip-related components
  trip/[tripId]/    # Trip pages
lib/
  distance.ts       # Distance calculation utilities
  prisma.ts         # Prisma client
prisma/
  schema.prisma     # Database schema
  seed.ts           # Seed script
```

## API Endpoints

- `POST /api/hydrate/dining` - Hydrate dining from Google Places
- `POST /api/hydrate/attractions` - Hydrate attractions from Google Places
- `POST /api/hydrate/lodging` - Hydrate lodging from Google Places
- `GET /api/weather/[tripId]` - Get weather forecast
- `GET /api/trip/[tripId]` - Get trip data
- `POST /api/trip/[tripId]/logistics` - Add logistics item
- `PATCH /api/trip/[tripId]/logistics` - Update logistics item
- `DELETE /api/trip/[tripId]/logistics` - Delete logistics item
- `POST /api/trip/[tripId]/pack` - Add pack item
- `PATCH /api/trip/[tripId]/pack` - Update pack item
- `DELETE /api/trip/[tripId]/pack` - Delete pack item
- `PATCH /api/trip/[tripId]/itinerary` - Update itinerary assignment

## Notes

- Admin mode is currently controlled via `?admin=1` query parameter
- No authentication required (for MVP)
- All users except admin see read-only view
- Distance calculations use Haversine formula
- Drive time estimates assume 30 mph average speed

