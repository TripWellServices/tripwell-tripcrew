-- Wishlist aggregate + FKs on catalogue; drop experience_wishlists

CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wishlists_travelerId_key" ON "wishlists"("travelerId");
CREATE UNIQUE INDEX "wishlists_slug_key" ON "wishlists"("slug");

ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Hike" ADD COLUMN "wishlistId" TEXT,
ADD COLUMN "savedByTravelerId" TEXT,
ADD COLUMN "savedPlanId" TEXT;

ALTER TABLE "Concert" ADD COLUMN "createdById" TEXT,
ADD COLUMN "wishlistId" TEXT,
ADD COLUMN "savedByTravelerId" TEXT,
ADD COLUMN "savedPlanId" TEXT;

ALTER TABLE "Dining" ADD COLUMN "createdById" TEXT,
ADD COLUMN "wishlistId" TEXT,
ADD COLUMN "savedByTravelerId" TEXT,
ADD COLUMN "savedPlanId" TEXT;

ALTER TABLE "Attraction" ADD COLUMN "createdById" TEXT,
ADD COLUMN "wishlistId" TEXT,
ADD COLUMN "savedByTravelerId" TEXT,
ADD COLUMN "savedPlanId" TEXT;

CREATE INDEX "Hike_wishlistId_idx" ON "Hike"("wishlistId");
CREATE INDEX "Hike_savedByTravelerId_idx" ON "Hike"("savedByTravelerId");
CREATE INDEX "Hike_savedPlanId_idx" ON "Hike"("savedPlanId");

CREATE INDEX "Concert_createdById_idx" ON "Concert"("createdById");
CREATE INDEX "Concert_wishlistId_idx" ON "Concert"("wishlistId");
CREATE INDEX "Concert_savedByTravelerId_idx" ON "Concert"("savedByTravelerId");
CREATE INDEX "Concert_savedPlanId_idx" ON "Concert"("savedPlanId");

CREATE INDEX "Dining_createdById_idx" ON "Dining"("createdById");
CREATE INDEX "Dining_wishlistId_idx" ON "Dining"("wishlistId");
CREATE INDEX "Dining_savedByTravelerId_idx" ON "Dining"("savedByTravelerId");
CREATE INDEX "Dining_savedPlanId_idx" ON "Dining"("savedPlanId");

CREATE INDEX "Attraction_createdById_idx" ON "Attraction"("createdById");
CREATE INDEX "Attraction_wishlistId_idx" ON "Attraction"("wishlistId");
CREATE INDEX "Attraction_savedByTravelerId_idx" ON "Attraction"("savedByTravelerId");
CREATE INDEX "Attraction_savedPlanId_idx" ON "Attraction"("savedPlanId");

ALTER TABLE "Hike" ADD CONSTRAINT "Hike_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_savedPlanId_fkey" FOREIGN KEY ("savedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Concert" ADD CONSTRAINT "Concert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Concert" ADD CONSTRAINT "Concert_savedPlanId_fkey" FOREIGN KEY ("savedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dining" ADD CONSTRAINT "Dining_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Dining" ADD CONSTRAINT "Dining_savedPlanId_fkey" FOREIGN KEY ("savedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_savedByTravelerId_fkey" FOREIGN KEY ("savedByTravelerId") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attraction" ADD CONSTRAINT "Attraction_savedPlanId_fkey" FOREIGN KEY ("savedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "wishlists" ("id", "travelerId", "name", "slug", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id",
  COALESCE(
    NULLIF(TRIM(t."firstName"), '') || '''s list',
    'My list'
  ),
  gen_random_uuid()::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Traveler" t
WHERE NOT EXISTS (SELECT 1 FROM "wishlists" w WHERE w."travelerId" = t."id");

UPDATE "Hike" h SET
  "wishlistId" = w."id",
  "savedByTravelerId" = ew."travelerId",
  "savedPlanId" = ew."planId"
FROM "experience_wishlists" ew
INNER JOIN "wishlists" w ON w."travelerId" = ew."travelerId"
WHERE ew."hikeId" = h."id";

UPDATE "Concert" c SET
  "wishlistId" = w."id",
  "savedByTravelerId" = ew."travelerId",
  "savedPlanId" = ew."planId"
FROM "experience_wishlists" ew
INNER JOIN "wishlists" w ON w."travelerId" = ew."travelerId"
WHERE ew."concertId" = c."id";

UPDATE "Dining" d SET
  "wishlistId" = w."id",
  "savedByTravelerId" = ew."travelerId",
  "savedPlanId" = ew."planId"
FROM "experience_wishlists" ew
INNER JOIN "wishlists" w ON w."travelerId" = ew."travelerId"
WHERE ew."diningId" = d."id";

UPDATE "Attraction" a SET
  "wishlistId" = w."id",
  "savedByTravelerId" = ew."travelerId",
  "savedPlanId" = ew."planId"
FROM "experience_wishlists" ew
INNER JOIN "wishlists" w ON w."travelerId" = ew."travelerId"
WHERE ew."attractionId" = a."id";

DROP TABLE "experience_wishlists";
