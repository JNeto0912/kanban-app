-- CreateTable
CREATE TABLE "FinanceShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceShareLink_token_key" ON "FinanceShareLink"("token");

-- AddForeignKey
ALTER TABLE "FinanceShareLink" ADD CONSTRAINT "FinanceShareLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
