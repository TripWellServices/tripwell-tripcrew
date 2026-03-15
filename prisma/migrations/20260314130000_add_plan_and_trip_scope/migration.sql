-- CreateTable Plan (traveler-scoped top-level container)
CREATE TABLE "Plan" (
    "id"         TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "tripCrewId" TEXT,
    "name"       TEXT NOT NULL,
    "season"     TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Plan_travelerId_idx" ON "Plan"("travelerId");
CREATE INDEX "Plan_tripCrewId_idx" ON "Plan"("tripCrewId");

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_travelerId_fkey"
  FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tripCrewId_fkey"
  FOREIGN KEY ("tripCrewId") REFERENCES "TripCrew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Trip: crewId nullable, add planId and tripScope
ALTER TABLE "Trip" ALTER COLUMN "crewId" DROP NOT NULL;

ALTER TABLE "Trip" ADD COLUMN "planId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "tripScope" TEXT;

CREATE INDEX "Trip_planId_idx" ON "Trip"("planId");

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable WishlistItem: add planId
ALTER TABLE "WishlistItem" ADD COLUMN "planId" TEXT;

CREATE INDEX "WishlistItem_planId_idx" ON "WishlistItem"("planId");

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
