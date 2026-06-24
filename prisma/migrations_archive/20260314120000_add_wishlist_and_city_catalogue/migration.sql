-- Add cityId to Dining (city catalogue scope for discover flow)
ALTER TABLE "Dining" ADD COLUMN "cityId" TEXT;

CREATE INDEX "Dining_cityId_idx" ON "Dining"("cityId");

ALTER TABLE "Dining" ADD CONSTRAINT "Dining_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add cityId to Attraction (city catalogue scope for discover flow)
ALTER TABLE "Attraction" ADD COLUMN "cityId" TEXT;

CREATE INDEX "Attraction_cityId_idx" ON "Attraction"("cityId");

ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable WishlistItem: traveler bookmark of a global city catalogue item
CREATE TABLE "WishlistItem" (
    "id"           TEXT NOT NULL,
    "travelerId"   TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "notes"        TEXT,
    "concertId"    TEXT,
    "hikeId"       TEXT,
    "diningId"     TEXT,
    "attractionId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WishlistItem_travelerId_idx" ON "WishlistItem"("travelerId");
CREATE INDEX "WishlistItem_concertId_idx"  ON "WishlistItem"("concertId");
CREATE INDEX "WishlistItem_hikeId_idx"     ON "WishlistItem"("hikeId");
CREATE INDEX "WishlistItem_diningId_idx"   ON "WishlistItem"("diningId");
CREATE INDEX "WishlistItem_attractionId_idx" ON "WishlistItem"("attractionId");

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_travelerId_fkey"
  FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_concertId_fkey"
  FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_hikeId_fkey"
  FOREIGN KEY ("hikeId") REFERENCES "Hike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_diningId_fkey"
  FOREIGN KEY ("diningId") REFERENCES "Dining"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_attractionId_fkey"
  FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
