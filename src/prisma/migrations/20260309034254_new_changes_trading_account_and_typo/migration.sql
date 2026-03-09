/*
  Warnings:

  - You are about to drop the column `mututal_funds` on the `UserAssets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nse_client_code]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nse_client_code" TEXT;

-- AlterTable
ALTER TABLE "UserAssets" DROP COLUMN "mututal_funds",
ADD COLUMN     "mutual_funds" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "Sequence" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_key_key" ON "Sequence"("key");

-- CreateIndex
CREATE UNIQUE INDEX "User_nse_client_code_key" ON "User"("nse_client_code");
