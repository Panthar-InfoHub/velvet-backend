/*
  Warnings:

  - Made the column `mapping_code` on table `MfProduct` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MfProduct" ALTER COLUMN "mapping_code" SET NOT NULL;
