-- DropIndex
DROP INDEX "Dipendenza_predecessoreId_successoreId_key";

-- DropIndex
DROP INDEX "Dipendenza_successoreId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Dipendenza_predecessoreId_key" ON "Dipendenza"("predecessoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Dipendenza_successoreId_key" ON "Dipendenza"("successoreId");

