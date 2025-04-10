-- AlterTable
ALTER TABLE "AccessCode" ADD COLUMN     "gateAdmittedAt" TIMESTAMP(3),
ADD COLUMN     "hallAdmittedAt" TIMESTAMP(3),
ADD COLUMN     "isGateAdmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHallAdmitted" BOOLEAN NOT NULL DEFAULT false;
