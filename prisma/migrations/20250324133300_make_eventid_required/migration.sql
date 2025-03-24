-- Make eventId required for future records
ALTER TABLE "Table" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "RegistrationCode" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Host" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Souvenir" ALTER COLUMN "eventId" SET NOT NULL;
