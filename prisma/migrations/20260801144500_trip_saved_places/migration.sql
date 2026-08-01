-- CreateTable
CREATE TABLE "trip_dining_saves" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "diningId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_dining_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_attraction_saves" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_attraction_saves_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy trip-linked rows into explicit trip save joins.
INSERT INTO "trip_dining_saves" ("id", "tripId", "diningId", "createdAt", "updatedAt")
SELECT
    'tds_' || md5(random()::text || clock_timestamp()::text || "id"),
    "tripId",
    "id",
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "Dining"
WHERE "tripId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "trip_attraction_saves" ("id", "tripId", "attractionId", "createdAt", "updatedAt")
SELECT
    'tas_' || md5(random()::text || clock_timestamp()::text || "id"),
    "tripId",
    "id",
    COALESCE("createdAt", CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM "Attraction"
WHERE "tripId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- CreateIndex
CREATE UNIQUE INDEX "trip_dining_saves_tripId_diningId_key" ON "trip_dining_saves"("tripId", "diningId");

-- CreateIndex
CREATE INDEX "trip_dining_saves_tripId_idx" ON "trip_dining_saves"("tripId");

-- CreateIndex
CREATE INDEX "trip_dining_saves_diningId_idx" ON "trip_dining_saves"("diningId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_attraction_saves_tripId_attractionId_key" ON "trip_attraction_saves"("tripId", "attractionId");

-- CreateIndex
CREATE INDEX "trip_attraction_saves_tripId_idx" ON "trip_attraction_saves"("tripId");

-- CreateIndex
CREATE INDEX "trip_attraction_saves_attractionId_idx" ON "trip_attraction_saves"("attractionId");

-- AddForeignKey
ALTER TABLE "trip_dining_saves" ADD CONSTRAINT "trip_dining_saves_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_dining_saves" ADD CONSTRAINT "trip_dining_saves_diningId_fkey" FOREIGN KEY ("diningId") REFERENCES "Dining"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_attraction_saves" ADD CONSTRAINT "trip_attraction_saves_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_attraction_saves" ADD CONSTRAINT "trip_attraction_saves_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
