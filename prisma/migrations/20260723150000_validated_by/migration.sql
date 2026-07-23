-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "validatedById" TEXT,
ADD COLUMN "validatedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TimeEntry_validatedById_idx" ON "TimeEntry"("validatedById");
