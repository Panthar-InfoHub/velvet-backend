/*
  Warnings:

  - A unique constraint covering the columns `[scheme_id,isin]` on the table `MfProduct` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MfProduct_scheme_id_isin_key" ON "MfProduct"("scheme_id", "isin");
