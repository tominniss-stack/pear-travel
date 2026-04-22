-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "destinationAddress" TEXT,
ADD COLUMN     "destinationLat" DOUBLE PRECISION,
ADD COLUMN     "destinationLng" DOUBLE PRECISION,
ADD COLUMN     "destinationPlaceId" TEXT;
