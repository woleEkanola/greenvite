-- CreateTable
CREATE TABLE "Souvenir" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Souvenir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirAssignment" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hostId" TEXT,
    "tableId" TEXT,
    "accessCodeId" TEXT,
    "souvenirId" TEXT NOT NULL,

    CONSTRAINT "SouvenirAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SouvenirAssignment_souvenirId_hostId_tableId_accessCodeId_key" ON "SouvenirAssignment"("souvenirId", "hostId", "tableId", "accessCodeId");

-- AddForeignKey
ALTER TABLE "SouvenirAssignment" ADD CONSTRAINT "SouvenirAssignment_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirAssignment" ADD CONSTRAINT "SouvenirAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirAssignment" ADD CONSTRAINT "SouvenirAssignment_accessCodeId_fkey" FOREIGN KEY ("accessCodeId") REFERENCES "AccessCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SouvenirAssignment" ADD CONSTRAINT "SouvenirAssignment_souvenirId_fkey" FOREIGN KEY ("souvenirId") REFERENCES "Souvenir"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
