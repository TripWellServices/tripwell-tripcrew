-- CreateEnum
CREATE TYPE "TripFlightDirection" AS ENUM ('OUTBOUND', 'RETURN', 'OTHER');

-- CreateTable
CREATE TABLE "TripFlight" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "direction" "TripFlightDirection" NOT NULL DEFAULT 'OTHER',
    "airlineName" TEXT,
    "airlineCode" TEXT,
    "flightNumber" TEXT,
    "departureAirportCode" TEXT,
    "arrivalAirportCode" TEXT,
    "departureTime" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3),
    "confirmationCode" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripFlight_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Adventure" ADD COLUMN "tripId" TEXT;

-- CreateIndex
CREATE INDEX "TripFlight_tripId_idx" ON "TripFlight"("tripId");

-- CreateIndex
CREATE INDEX "Adventure_tripId_idx" ON "Adventure"("tripId");

-- AddForeignKey
ALTER TABLE "TripFlight" ADD CONSTRAINT "TripFlight_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
