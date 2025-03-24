-- Add eventId field to relevant models
ALTER TABLE "Table" ADD COLUMN "eventId" TEXT;
ALTER TABLE "RegistrationCode" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Batch" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Host" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Souvenir" ADD COLUMN "eventId" TEXT;

-- Add foreign key constraints
ALTER TABLE "Table" ADD CONSTRAINT "Table_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistrationCode" ADD CONSTRAINT "RegistrationCode_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Host" ADD CONSTRAINT "Host_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Souvenir" ADD CONSTRAINT "Souvenir_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Now make eventId required for future records
ALTER TABLE "Table" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "RegistrationCode" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Host" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Souvenir" ALTER COLUMN "eventId" SET NOT NULL;
