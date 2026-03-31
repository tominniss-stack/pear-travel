-- CreateEnum
CREATE TYPE "AestheticPreference" AS ENUM ('CLASSIC', 'EDITORIAL', 'NOTEBOOK', 'TERMINAL', 'CONCIERGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aestheticPreference" "AestheticPreference" NOT NULL DEFAULT 'CLASSIC';

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "poiId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_tripId_idx" ON "Document"("tripId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
