-- AlterTable
ALTER TABLE "FinanceEntry" ADD COLUMN     "financeTypeId" TEXT;

-- CreateTable
CREATE TABLE "FinanceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceType_categoryId_kind_name_key" ON "FinanceType"("categoryId", "kind", "name");

-- AddForeignKey
ALTER TABLE "FinanceType" ADD CONSTRAINT "FinanceType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_financeTypeId_fkey" FOREIGN KEY ("financeTypeId") REFERENCES "FinanceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
