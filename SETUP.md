# TripWell MVP Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/tripwell?schema=public"
   GOOGLE_PLACES_API_KEY="your_google_places_api_key"
   OPENWEATHER_API_KEY="your_openweather_api_key"
   ```

3. **Set up database**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the database**
   ```bash
   npm run db:seed
   ```
   This will create a sample trip. Note the trip ID from the output.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **View your trip**
   - Public view: `http://localhost:3000/trip/[tripId]`
   - Admin view: `http://localhost:3000/trip/[tripId]?admin=1`

## Getting API Keys

### Google Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API"
4. Create credentials (API Key)
5. Add the key to your `.env` file

### OpenWeather API
1. Go to [OpenWeather](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add the key to your `.env` file

## Database Setup

### Using PostgreSQL locally
```bash
# Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# Create database
createdb tripwell

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://your_username@localhost:5432/tripwell?schema=public"
```

### Using a cloud database
- [Supabase](https://supabase.com/) - Free PostgreSQL hosting
- [Railway](https://railway.app/) - Easy PostgreSQL setup
- [Neon](https://neon.tech/) - Serverless PostgreSQL

Copy the connection string to your `.env` file.

## Troubleshooting

### Prisma errors
- Make sure PostgreSQL is running
- Verify DATABASE_URL is correct
- Run `npx prisma generate` if schema changes

### Google Places not working
- Verify API key is correct
- Check that Places API is enabled in Google Cloud Console
- Ensure billing is enabled (free tier available)

### Weather not showing
- Verify OpenWeather API key
- Make sure lodging has lat/lng coordinates
- Check browser console for errors

## Next Steps

1. Create your first trip via the seed script or manually in the database
2. Add lodging with a location to enable weather forecasts
3. Search and add dining options
4. Add attractions
5. Assign items to itinerary days
6. Add logistics items and pack list items

## Admin Mode

Admin mode is currently controlled via the `?admin=1` query parameter. In the future, this will be replaced with proper Firebase authentication.

In admin mode, you can:
- Add/remove lodging, dining, and attractions
- Edit logistics items
- Edit pack list
- Assign items to itinerary days

