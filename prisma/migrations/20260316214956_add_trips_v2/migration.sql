-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "intakeData" JSONB NOT NULL,
    "itineraryData" JSONB,
    "isFavourite" BOOLEAN NOT NULL DEFAULT false,
    "userEmail" TEXT,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);
