/*
  Warnings:

  - You are about to drop the column `tableId` on the `Rsvp` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Rsvp" DROP CONSTRAINT "Rsvp_tableId_fkey";

-- AlterTable
ALTER TABLE "AccessCode" ADD COLUMN     "tableId" TEXT;

-- AlterTable
ALTER TABLE "Rsvp" DROP COLUMN "tableId";

-- AddForeignKey
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
