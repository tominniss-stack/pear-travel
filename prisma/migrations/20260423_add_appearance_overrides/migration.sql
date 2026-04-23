-- AlterTable: Add new columns FIRST (as text) before enum operations
ALTER TABLE "Trip" ADD COLUMN "displayModeOverride" TEXT;
ALTER TABLE "Trip" ADD COLUMN "themeOverride" TEXT;

-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- AlterEnum: Rebuild AestheticPreference without CONCIERGE
BEGIN;
CREATE TYPE "AestheticPreference_new" AS ENUM ('CLASSIC', 'EDITORIAL', 'NOTEBOOK', 'TERMINAL');
ALTER TABLE "User" ALTER COLUMN "aestheticPreference" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "aestheticPreference" TYPE "AestheticPreference_new" USING ("aestheticPreference"::text::"AestheticPreference_new");
ALTER TYPE "AestheticPreference" RENAME TO "AestheticPreference_old";
ALTER TYPE "AestheticPreference_new" RENAME TO "AestheticPreference";
DROP TYPE "AestheticPreference_old";
ALTER TABLE "User" ALTER COLUMN "aestheticPreference" SET DEFAULT 'CLASSIC';
COMMIT;

-- Now cast the text columns to the correct enum types
ALTER TABLE "Trip" ALTER COLUMN "themeOverride" TYPE "AestheticPreference" USING ("themeOverride"::text::"AestheticPreference");
ALTER TABLE "Trip" ALTER COLUMN "displayModeOverride" TYPE "DisplayMode" USING ("displayModeOverride"::text::"DisplayMode");

-- AlterTable: Add displayMode to User
ALTER TABLE "User" ADD COLUMN "displayMode" "DisplayMode" NOT NULL DEFAULT 'SYSTEM';
