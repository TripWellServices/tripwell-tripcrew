-- AlterTable
ALTER TABLE "Hike" ADD COLUMN "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Hike" ADD CONSTRAINT "Hike_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Hike_createdById_idx" ON "Hike"("createdById");
