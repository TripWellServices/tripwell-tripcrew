-- Allow memories without a Trip; add freestyle (hindsight) context fields.
ALTER TABLE "trip_memories" ALTER COLUMN "tripId" DROP NOT NULL;

ALTER TABLE "trip_memories" ADD COLUMN "freestyleTitle" TEXT;
ALTER TABLE "trip_memories" ADD COLUMN "freestyleCity" TEXT;
ALTER TABLE "trip_memories" ADD COLUMN "freestyleState" TEXT;
ALTER TABLE "trip_memories" ADD COLUMN "freestyleCountry" TEXT;
ALTER TABLE "trip_memories" ADD COLUMN "freestyleStartDate" TIMESTAMP(3);
ALTER TABLE "trip_memories" ADD COLUMN "freestyleEndDate" TIMESTAMP(3);
