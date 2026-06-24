-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('SINGLE_DAY', 'MULTI_DAY');

-- CreateEnum
CREATE TYPE "WhoWith" AS ENUM ('SOLO', 'SPOUSE', 'FRIENDS', 'FAMILY', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('CAR', 'BOAT', 'PLANE');

-- CreateEnum
CREATE TYPE "TripDayExperienceStatus" AS ENUM ('PLANNED', 'CANCELLED', 'COMPLETE');

-- CreateEnum
CREATE TYPE "StuffToDoType" AS ENUM ('POI', 'RESTAURANT', 'NEAT_THING');

-- CreateEnum
CREATE TYPE "LodgingType" AS ENUM ('HOTEL', 'RESORT', 'EXTENDED_STAY', 'VACATION_RENTAL', 'HOSTEL', 'BED_AND_BREAKFAST', 'OTHER');

-- CreateTable
CREATE TABLE "TripWellEnterprise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'TripWell Enterprises',
    "address" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripWellEnterprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "citySlug" TEXT,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "bestTimeToVisit" TEXT,
    "attractionNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "guideCreatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traveler" (
    "id" TEXT NOT NULL,
    "firebaseId" TEXT,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoURL" TEXT,
    "hometownCity" TEXT,
    "homeState" TEXT,
    "homeAddress" TEXT,
    "persona" TEXT,
    "planningStyle" TEXT,
    "dreamDestination" TEXT,
    "tripWellEnterpriseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripCrew" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "handle" TEXT,
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tripCrewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "join_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "crewId" TEXT,
    "travelerId" TEXT,
    "tripType" "TripType" NOT NULL DEFAULT 'MULTI_DAY',
    "title" TEXT,
    "purpose" TEXT NOT NULL DEFAULT '',
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "whoWith" "WhoWith",
    "transportMode" "TransportMode",
    "startingLocation" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysTotal" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memories" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "authorTravelerId" TEXT NOT NULL,
    "tripDayId" TEXT,
    "body" TEXT NOT NULL,
    "freestyleTitle" TEXT,
    "freestyleCity" TEXT,
    "freestyleState" TEXT,
    "freestyleCountry" TEXT,
    "freestyleStartDate" TIMESTAMP(3),
    "freestyleEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memory_photos" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "trip_memory_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memory_shares" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "sentByTravelerId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMessageId" TEXT,

    CONSTRAINT "trip_memory_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDayExperience" (
    "id" TEXT NOT NULL,
    "tripDayId" TEXT NOT NULL,
    "hikeId" TEXT,
    "diningId" TEXT,
    "attractionId" TEXT,
    "concertId" TEXT,
    "sportId" TEXT,
    "adventureId" TEXT,
    "cruiseId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "TripDayExperienceStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDayExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "cityId" TEXT,
    "eventDate" TIMESTAMP(3),
    "url" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adventure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "cityId" TEXT,
    "durationMin" INTEGER,
    "url" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Adventure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT,
    "state" TEXT,
    "country" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lodging" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "tripWellEnterpriseId" TEXT,
    "title" TEXT NOT NULL,
    "chain" TEXT,
    "lodgingType" "LodgingType",
    "amenities" JSONB,
    "nightlyRate" DECIMAL(10,2),
    "currency" TEXT,
    "address" TEXT,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "defaultCheckInTime" TEXT,
    "defaultCheckOutTime" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "googlePlaceId" TEXT,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lodging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dining" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "tripWellEnterpriseId" TEXT,
    "cityId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "googlePlaceId" TEXT,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "description" TEXT,
    "metadata" JSONB,
    "distanceFromLodging" DOUBLE PRECISION,
    "driveTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Dining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "tripWellEnterpriseId" TEXT,
    "cityId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "googlePlaceId" TEXT,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "description" TEXT,
    "metadata" JSONB,
    "distanceFromLodging" DOUBLE PRECISION,
    "driveTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StuffToDoItem" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "type" "StuffToDoType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StuffToDoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concert" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT,
    "venue" TEXT,
    "cityId" TEXT,
    "eventDate" TIMESTAMP(3),
    "eventStartDate" TIMESTAMP(3),
    "eventStartTime" TEXT,
    "eventEndDate" TIMESTAMP(3),
    "eventEndTime" TEXT,
    "isFestival" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Concert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcertScheduleItem" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "stage" TEXT,
    "location" TEXT,
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConcertScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripConcertAnchor" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripConcertAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hike" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trailOrPlace" TEXT,
    "createdById" TEXT,
    "cityId" TEXT,
    "difficulty" TEXT,
    "distanceMi" DOUBLE PRECISION,
    "durationMin" INTEGER,
    "routeType" TEXT,
    "trailheadLat" DOUBLE PRECISION,
    "trailheadLng" DOUBLE PRECISION,
    "nearestTown" TEXT,
    "sourcePaste" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Hike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cruise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shipName" TEXT,
    "cruiseLine" TEXT,
    "departingFrom" TEXT,
    "cityId" TEXT,
    "baseCostPerRoom" DOUBLE PRECISION,
    "baseCostPerGuest" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "amenities" TEXT,
    "onboardEntertainmentSummary" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "wishlistId" TEXT,
    "savedByTravelerId" TEXT,

    CONSTRAINT "Cruise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isPacked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_crew_members" (
    "id" TEXT NOT NULL,
    "tripCrewId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_crew_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_crew_roles" (
    "id" TEXT NOT NULL,
    "tripCrewId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_crew_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_citySlug_key" ON "City"("citySlug");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE INDEX "City_country_idx" ON "City"("country");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_state_country_key" ON "City"("name", "state", "country");

-- CreateIndex
CREATE UNIQUE INDEX "Traveler_firebaseId_key" ON "Traveler"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Traveler_email_key" ON "Traveler"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TripCrew_handle_key" ON "TripCrew"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "TripCrew_joinCode_key" ON "TripCrew"("joinCode");

-- CreateIndex
CREATE INDEX "TripCrew_joinCode_idx" ON "TripCrew"("joinCode");

-- CreateIndex
CREATE INDEX "TripCrew_handle_idx" ON "TripCrew"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_travelerId_key" ON "wishlists"("travelerId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_slug_key" ON "wishlists"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "join_codes_code_key" ON "join_codes"("code");

-- CreateIndex
CREATE INDEX "join_codes_code_idx" ON "join_codes"("code");

-- CreateIndex
CREATE INDEX "join_codes_tripCrewId_idx" ON "join_codes"("tripCrewId");

-- CreateIndex
CREATE INDEX "Trip_crewId_idx" ON "Trip"("crewId");

-- CreateIndex
CREATE INDEX "Trip_travelerId_idx" ON "Trip"("travelerId");

-- CreateIndex
CREATE INDEX "TripDay_tripId_idx" ON "TripDay"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripDay_tripId_date_key" ON "TripDay"("tripId", "date");

-- CreateIndex
CREATE INDEX "trip_memories_tripId_idx" ON "trip_memories"("tripId");

-- CreateIndex
CREATE INDEX "trip_memories_authorTravelerId_idx" ON "trip_memories"("authorTravelerId");

-- CreateIndex
CREATE INDEX "trip_memory_photos_memoryId_idx" ON "trip_memory_photos"("memoryId");

-- CreateIndex
CREATE INDEX "trip_memory_shares_memoryId_idx" ON "trip_memory_shares"("memoryId");

-- CreateIndex
CREATE INDEX "TripDayExperience_tripDayId_idx" ON "TripDayExperience"("tripDayId");

-- CreateIndex
CREATE INDEX "TripDayExperience_hikeId_idx" ON "TripDayExperience"("hikeId");

-- CreateIndex
CREATE INDEX "TripDayExperience_diningId_idx" ON "TripDayExperience"("diningId");

-- CreateIndex
CREATE INDEX "TripDayExperience_attractionId_idx" ON "TripDayExperience"("attractionId");

-- CreateIndex
CREATE INDEX "TripDayExperience_concertId_idx" ON "TripDayExperience"("concertId");

-- CreateIndex
CREATE INDEX "TripDayExperience_sportId_idx" ON "TripDayExperience"("sportId");

-- CreateIndex
CREATE INDEX "TripDayExperience_adventureId_idx" ON "TripDayExperience"("adventureId");

-- CreateIndex
CREATE INDEX "TripDayExperience_cruiseId_idx" ON "TripDayExperience"("cruiseId");

-- CreateIndex
CREATE INDEX "Sport_cityId_idx" ON "Sport"("cityId");

-- CreateIndex
CREATE INDEX "Sport_eventDate_idx" ON "Sport"("eventDate");

-- CreateIndex
CREATE INDEX "Sport_createdById_idx" ON "Sport"("createdById");

-- CreateIndex
CREATE INDEX "Sport_wishlistId_idx" ON "Sport"("wishlistId");

-- CreateIndex
CREATE INDEX "Sport_savedByTravelerId_idx" ON "Sport"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "Adventure_cityId_idx" ON "Adventure"("cityId");

-- CreateIndex
CREATE INDEX "Adventure_createdById_idx" ON "Adventure"("createdById");

-- CreateIndex
CREATE INDEX "Adventure_wishlistId_idx" ON "Adventure"("wishlistId");

-- CreateIndex
CREATE INDEX "Adventure_savedByTravelerId_idx" ON "Adventure"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "Destination_tripId_idx" ON "Destination"("tripId");

-- CreateIndex
CREATE INDEX "Destination_cityId_idx" ON "Destination"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Lodging_tripId_key" ON "Lodging"("tripId");

-- CreateIndex
CREATE INDEX "Lodging_tripId_idx" ON "Lodging"("tripId");

-- CreateIndex
CREATE INDEX "Lodging_tripWellEnterpriseId_idx" ON "Lodging"("tripWellEnterpriseId");

-- CreateIndex
CREATE INDEX "Lodging_city_state_idx" ON "Lodging"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Dining_googlePlaceId_key" ON "Dining"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Dining_tripId_idx" ON "Dining"("tripId");

-- CreateIndex
CREATE INDEX "Dining_tripWellEnterpriseId_idx" ON "Dining"("tripWellEnterpriseId");

-- CreateIndex
CREATE INDEX "Dining_cityId_idx" ON "Dining"("cityId");

-- CreateIndex
CREATE INDEX "Dining_createdById_idx" ON "Dining"("createdById");

-- CreateIndex
CREATE INDEX "Dining_wishlistId_idx" ON "Dining"("wishlistId");

-- CreateIndex
CREATE INDEX "Dining_savedByTravelerId_idx" ON "Dining"("savedByTravelerId");

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_googlePlaceId_key" ON "Attraction"("googlePlaceId");

-- CreateIndex
CREATE INDEX "Attraction_tripId_idx" ON "Attraction"("tripId");

-- CreateIndex
CREATE INDEX "Attraction_tripWellEnterpriseId_idx" ON "Attraction"("tripWellEnterpriseId");

-- CreateIndex
CREATE INDEX "Attraction_cityId_idx" ON "Attraction"("cityId");

-- CreateIndex
CREATE INDEX "Attraction_createdById_idx" ON "Attraction"("createdById");

-- CreateIndex
CREATE INDEX "Attraction_wishlistId_idx" ON "Attraction"("wishlistId");

-- CreateIndex
CREATE INDEX "Attraction_savedByTravelerId_idx" ON "Attraction"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "StuffToDoItem_cityId_idx" ON "StuffToDoItem"("cityId");

-- CreateIndex
CREATE INDEX "StuffToDoItem_cityId_season_idx" ON "StuffToDoItem"("cityId", "season");

-- CreateIndex
CREATE INDEX "Concert_cityId_idx" ON "Concert"("cityId");

-- CreateIndex
CREATE INDEX "Concert_eventDate_idx" ON "Concert"("eventDate");

-- CreateIndex
CREATE INDEX "Concert_eventStartDate_idx" ON "Concert"("eventStartDate");

-- CreateIndex
CREATE INDEX "Concert_createdById_idx" ON "Concert"("createdById");

-- CreateIndex
CREATE INDEX "Concert_wishlistId_idx" ON "Concert"("wishlistId");

-- CreateIndex
CREATE INDEX "Concert_savedByTravelerId_idx" ON "Concert"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "ConcertScheduleItem_concertId_idx" ON "ConcertScheduleItem"("concertId");

-- CreateIndex
CREATE INDEX "ConcertScheduleItem_concertId_date_idx" ON "ConcertScheduleItem"("concertId", "date");

-- CreateIndex
CREATE INDEX "TripConcertAnchor_tripId_idx" ON "TripConcertAnchor"("tripId");

-- CreateIndex
CREATE INDEX "TripConcertAnchor_concertId_idx" ON "TripConcertAnchor"("concertId");

-- CreateIndex
CREATE UNIQUE INDEX "TripConcertAnchor_tripId_concertId_key" ON "TripConcertAnchor"("tripId", "concertId");

-- CreateIndex
CREATE INDEX "Hike_cityId_idx" ON "Hike"("cityId");

-- CreateIndex
CREATE INDEX "Hike_createdById_idx" ON "Hike"("createdById");

-- CreateIndex
CREATE INDEX "Hike_wishlistId_idx" ON "Hike"("wishlistId");

-- CreateIndex
CREATE INDEX "Hike_savedByTravelerId_idx" ON "Hike"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "Cruise_cityId_idx" ON "Cruise"("cityId");

-- CreateIndex
CREATE INDEX "Cruise_createdById_idx" ON "Cruise"("createdById");

-- CreateIndex
CREATE INDEX "Cruise_wishlistId_idx" ON "Cruise"("wishlistId");

-- CreateIndex
CREATE INDEX "Cruise_savedByTravelerId_idx" ON "Cruise"("savedByTravelerId");

-- CreateIndex
CREATE INDEX "LogisticItem_tripId_idx" ON "LogisticItem"("tripId");

-- CreateIndex
CREATE INDEX "PackItem_tripId_idx" ON "PackItem"("tripId");

-- CreateIndex
CREATE INDEX "trip_crew_members_tripCrewId_idx" ON "trip_crew_members"("tripCrewId");

-- CreateIndex
CREATE INDEX "trip_crew_members_travelerId_idx" ON "trip_crew_members"("travelerId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_crew_members_tripCrewId_travelerId_key" ON "trip_crew_members"("tripCrewId", "travelerId");

-- CreateIndex
CREATE INDEX "trip_crew_roles_tripCrewId_idx" ON "trip_crew_roles"("tripCrewId");

-- CreateIndex
CREATE INDEX "trip_crew_roles_travelerId_idx" ON "trip_crew_roles"("travelerId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_crew_roles_tripCrewId_travelerId_key" ON "trip_crew_roles"("tripCrewId", "travelerId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_guideCreatedById_fkey" FOREIGN KEY ("guideCreatedById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_tripWellEnterpriseId_fkey" FOREIGN KEY ("tripWellEnterpriseId") REFERENCES "TripWellEnterprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_tripCrewId_fkey" FOREIGN KEY ("tripCrewId") REFERENCES "TripCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "TripCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_authorTravelerId_fkey" FOREIGN KEY ("authorTravelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_photos" ADD CONSTRAINT "trip_memory_photos_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "trip_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_shares" ADD CONSTRAINT "trip_memory_shares_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "trip_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_shares" ADD CONSTRAINT "trip_memory_shares_sentByTravelerId_fkey" FOREIGN KEY ("sentByTravelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_diningId_fkey" FOREIGN KEY ("diningId") REFERENCES "Dining"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDayExperience" ADD CONSTRAINT "TripDayExperience_cruiseId_fkey" FOREIGN KEY ("cruiseId") REFERENCES "Cruise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sport" ADD CONSTRAINT "Sport_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lodging" ADD CONSTRAINT "Lodging_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lodging" ADD CONSTRAINT "Lodging_tripWellEnterpriseId_fkey" FOREIGN KEY ("tripWellEnterpriseId") REFERENCES "TripWellEnterprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_tripWellEnterpriseId_fkey" FOREIGN KEY ("tripWellEnterpriseId") REFERENCES "TripWellEnterprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_tripWellEnterpriseId_fkey" FOREIGN KEY ("tripWellEnterpriseId") REFERENCES "TripWellEnterprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StuffToDoItem" ADD CONSTRAINT "StuffToDoItem_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertScheduleItem" ADD CONSTRAINT "ConcertScheduleItem_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripConcertAnchor" ADD CONSTRAINT "TripConcertAnchor_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripConcertAnchor" ADD CONSTRAINT "TripConcertAnchor_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cruise" ADD CONSTRAINT "Cruise_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticItem" ADD CONSTRAINT "LogisticItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackItem" ADD CONSTRAINT "PackItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew_members" ADD CONSTRAINT "trip_crew_members_tripCrewId_fkey" FOREIGN KEY ("tripCrewId") REFERENCES "TripCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew_members" ADD CONSTRAINT "trip_crew_members_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew_roles" ADD CONSTRAINT "trip_crew_roles_tripCrewId_fkey" FOREIGN KEY ("tripCrewId") REFERENCES "TripCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew_roles" ADD CONSTRAINT "trip_crew_roles_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
