-- Add Trip.title and backfill from legacy purpose blob (first segment before ". ").
ALTER TABLE "Trip" ADD COLUMN "title" TEXT;

UPDATE "Trip"
SET "title" = CASE
  WHEN POSITION('. ' IN "purpose") > 0 THEN
    SUBSTRING("purpose" FROM 1 FOR POSITION('. ' IN "purpose") - 1)
  ELSE NULLIF(TRIM("purpose"), '')
END
WHERE TRIM("purpose") <> '';
