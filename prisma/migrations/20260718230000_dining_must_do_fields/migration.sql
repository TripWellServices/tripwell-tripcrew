-- AlterTable: align Dining with schema.prisma (Attraction already has these columns)
ALTER TABLE "Dining" ADD COLUMN IF NOT EXISTS "whyMustDo" TEXT,
ADD COLUMN IF NOT EXISTS "bestCombinedWith" TEXT;
