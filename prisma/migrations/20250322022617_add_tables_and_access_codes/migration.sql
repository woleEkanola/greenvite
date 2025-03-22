-- CreateTable
CREATE TABLE IF NOT EXISTS "Table" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccessCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isAdmitted" BOOLEAN NOT NULL DEFAULT false,
    "admittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

-- Add tableId to Rsvp if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Rsvp' AND column_name = 'tableId') THEN
        ALTER TABLE "Rsvp" ADD COLUMN "tableId" TEXT;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "AccessCode_code_key" ON "AccessCode"("code");

-- Add foreign keys if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccessCode_rsvpId_fkey') THEN
        ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_rsvpId_fkey" 
        FOREIGN KEY ("rsvpId") REFERENCES "Rsvp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Rsvp_tableId_fkey') THEN
        ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_tableId_fkey" 
        FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
