-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "customCss" TEXT,
ADD COLUMN     "fontFamily" TEXT,
ADD COLUMN     "headerImage" TEXT,
ADD COLUMN     "isPagePublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoImage" TEXT,
ADD COLUMN     "pageDescription" TEXT,
ADD COLUMN     "pageTitle" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "showAddToCalendar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLocationMap" BOOLEAN NOT NULL DEFAULT true;
