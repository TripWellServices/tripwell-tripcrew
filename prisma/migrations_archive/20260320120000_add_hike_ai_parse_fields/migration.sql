-- AlterTable
ALTER TABLE "Hike" ADD COLUMN     "routeType" TEXT,
ADD COLUMN     "trailheadLat" DOUBLE PRECISION,
ADD COLUMN     "trailheadLng" DOUBLE PRECISION,
ADD COLUMN     "nearestTown" TEXT,
ADD COLUMN     "sourcePaste" TEXT;
