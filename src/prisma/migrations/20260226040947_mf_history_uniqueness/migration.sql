/*
  Warnings:

  - A unique constraint covering the columns `[mf_product_id,nav_date]` on the table `MfNavHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MfNavHistory_scheme_id_nav_date_idx";

-- DropIndex
DROP INDEX "MfNavHistory_scheme_id_nav_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "MfNavHistory_mf_product_id_nav_date_key" ON "MfNavHistory"("mf_product_id", "nav_date");
