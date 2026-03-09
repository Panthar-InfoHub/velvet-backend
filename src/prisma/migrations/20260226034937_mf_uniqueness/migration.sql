/*
  Warnings:

  - A unique constraint covering the columns `[scheme_id,isin,nse_scheme_code]` on the table `MfProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MfProduct_scheme_id_isin_key";

-- AlterTable
ALTER TABLE "MfProduct" ADD COLUMN     "nse_scheme_code" TEXT,
ADD COLUMN     "platform_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MfProduct_scheme_id_isin_nse_scheme_code_key" ON "MfProduct"("scheme_id", "isin", "nse_scheme_code");
