-- CreateTable
CREATE TABLE "trip_memories" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "authorTravelerId" TEXT NOT NULL,
    "tripDayId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memory_photos" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "trip_memory_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_memory_shares" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "sentByTravelerId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerMessageId" TEXT,

    CONSTRAINT "trip_memory_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_memories_tripId_idx" ON "trip_memories"("tripId");

-- CreateIndex
CREATE INDEX "trip_memories_authorTravelerId_idx" ON "trip_memories"("authorTravelerId");

-- CreateIndex
CREATE INDEX "trip_memory_photos_memoryId_idx" ON "trip_memory_photos"("memoryId");

-- CreateIndex
CREATE INDEX "trip_memory_shares_memoryId_idx" ON "trip_memory_shares"("memoryId");

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_authorTravelerId_fkey" FOREIGN KEY ("authorTravelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memories" ADD CONSTRAINT "trip_memories_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_photos" ADD CONSTRAINT "trip_memory_photos_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "trip_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_shares" ADD CONSTRAINT "trip_memory_shares_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "trip_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_memory_shares" ADD CONSTRAINT "trip_memory_shares_sentByTravelerId_fkey" FOREIGN KEY ("sentByTravelerId") REFERENCES "Traveler"("id") ON DELETE CASCADE ON UPDATE CASCADE;
