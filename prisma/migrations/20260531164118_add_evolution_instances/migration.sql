-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "evolutionInstanceId" TEXT;

-- CreateTable
CREATE TABLE "EvolutionInstance" (
    "id" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "qrCode" TEXT,
    "webhookSecret" TEXT,
    "messagesPerMinute" INTEGER NOT NULL DEFAULT 5,
    "delayBetweenMs" INTEGER NOT NULL DEFAULT 3000,
    "maxBurst" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "EvolutionInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionInstance_instanceName_ownerId_key" ON "EvolutionInstance"("instanceName", "ownerId");

-- AddForeignKey
ALTER TABLE "EvolutionInstance" ADD CONSTRAINT "EvolutionInstance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_evolutionInstanceId_fkey" FOREIGN KEY ("evolutionInstanceId") REFERENCES "EvolutionInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
