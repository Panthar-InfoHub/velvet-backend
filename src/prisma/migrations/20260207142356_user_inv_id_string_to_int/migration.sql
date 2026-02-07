/*
  Warnings:

  - The `inv_id` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "inv_id",
ADD COLUMN     "inv_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_inv_id_key" ON "User"("inv_id");
