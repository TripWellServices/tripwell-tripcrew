-- Merge CityGuide into City (citySlug + editorial fields); drop CityGuide.

ALTER TABLE "City" ADD COLUMN "citySlug" TEXT;
ALTER TABLE "City" ADD COLUMN "tagline" TEXT;
ALTER TABLE "City" ADD COLUMN "description" TEXT;
ALTER TABLE "City" ADD COLUMN "bestTimeToVisit" TEXT;
ALTER TABLE "City" ADD COLUMN "attractionNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "City" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "City" ADD COLUMN "guideCreatedById" TEXT;

UPDATE "City" c SET
  "citySlug" = g."slug",
  "tagline" = g."tagline",
  "description" = g."description",
  "bestTimeToVisit" = g."bestTimeToVisit",
  "attractionNames" = COALESCE(g."attractionNames", ARRAY[]::TEXT[]),
  "imageUrl" = g."imageUrl",
  "guideCreatedById" = g."createdById"
FROM "CityGuide" g
WHERE g."cityId" = c."id";

ALTER TABLE "City" ADD CONSTRAINT "City_guideCreatedById_fkey"
  FOREIGN KEY ("guideCreatedById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "City_citySlug_key" ON "City"("citySlug");

DROP TABLE "CityGuide";
