-- PlanType enum + Plan.type; CityGuide catalogue

CREATE TYPE "PlanType" AS ENUM ('TRIP', 'SEASON');

ALTER TABLE "Plan" ADD COLUMN "type" "PlanType" NOT NULL DEFAULT 'TRIP';

CREATE TABLE "CityGuide" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "bestTimeToVisit" TEXT,
    "attractionNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityGuide_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CityGuide_cityId_key" ON "CityGuide"("cityId");
CREATE UNIQUE INDEX "CityGuide_slug_key" ON "CityGuide"("slug");

ALTER TABLE "CityGuide" ADD CONSTRAINT "CityGuide_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CityGuide" ADD CONSTRAINT "CityGuide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
