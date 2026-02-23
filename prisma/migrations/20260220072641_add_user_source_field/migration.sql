-- AlterTable
ALTER TABLE "User" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'simpjobs';

-- CreateIndex
CREATE INDEX "User_source_idx" ON "User"("source");
