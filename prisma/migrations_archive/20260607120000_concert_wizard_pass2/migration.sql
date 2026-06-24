-- Concert Wizard Pass 2: event window, schedule items, trip-level concert anchors

ALTER TABLE "Concert" ADD COLUMN "eventStartDate" TIMESTAMP(3);
ALTER TABLE "Concert" ADD COLUMN "eventStartTime" TEXT;
ALTER TABLE "Concert" ADD COLUMN "eventEndDate" TIMESTAMP(3);
ALTER TABLE "Concert" ADD COLUMN "eventEndTime" TEXT;
ALTER TABLE "Concert" ADD COLUMN "isFestival" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Concert_eventStartDate_idx" ON "Concert"("eventStartDate");

CREATE TABLE "ConcertScheduleItem" (
    "id" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "stage" TEXT,
    "location" TEXT,
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConcertScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripConcertAnchor" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "concertId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TripConcertAnchor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConcertScheduleItem_concertId_idx" ON "ConcertScheduleItem"("concertId");
CREATE INDEX "ConcertScheduleItem_concertId_date_idx" ON "ConcertScheduleItem"("concertId", "date");

CREATE INDEX "TripConcertAnchor_tripId_idx" ON "TripConcertAnchor"("tripId");
CREATE INDEX "TripConcertAnchor_concertId_idx" ON "TripConcertAnchor"("concertId");
CREATE UNIQUE INDEX "TripConcertAnchor_tripId_concertId_key" ON "TripConcertAnchor"("tripId", "concertId");

ALTER TABLE "ConcertScheduleItem" ADD CONSTRAINT "ConcertScheduleItem_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripConcertAnchor" ADD CONSTRAINT "TripConcertAnchor_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripConcertAnchor" ADD CONSTRAINT "TripConcertAnchor_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
