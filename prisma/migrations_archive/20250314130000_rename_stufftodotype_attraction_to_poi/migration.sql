-- Rename StuffToDoType enum value to avoid collision with Attraction model name.
-- POI = point of interest (same concept, different name).
ALTER TYPE "StuffToDoType" RENAME VALUE 'ATTRACTION' TO 'POI';
