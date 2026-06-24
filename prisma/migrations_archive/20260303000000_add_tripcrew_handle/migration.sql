-- Add handle column to TripCrew (GoFast-style invite slug).
-- Production DB was missing this column; schema expected it and caused P2022 on hydrate.
ALTER TABLE "TripCrew" ADD COLUMN IF NOT EXISTS "handle" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TripCrew_handle_key" ON "TripCrew"("handle");

CREATE INDEX IF NOT EXISTS "TripCrew_handle_idx" ON "TripCrew"("handle");
