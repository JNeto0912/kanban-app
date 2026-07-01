-- AlterTable
ALTER TABLE "FinanceEntry" ADD COLUMN     "generatedFromId" TEXT;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_generatedFromId_fkey" FOREIGN KEY ("generatedFromId") REFERENCES "FinanceEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
