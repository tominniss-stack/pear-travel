-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Convert role from String to Role enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING (
  CASE 
    WHEN "role" = 'ADMIN' THEN 'ADMIN'::"Role"
    ELSE 'USER'::"Role"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
