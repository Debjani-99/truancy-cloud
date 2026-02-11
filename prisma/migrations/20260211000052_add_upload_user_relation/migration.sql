/*
  Warnings:

  - You are about to drop the column `uploadedBy` on the `Upload` table. All the data in the column will be lost.
  - Added the required column `uploadedById` to the `Upload` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Upload" DROP COLUMN "uploadedBy",
ADD COLUMN     "uploadedById" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Upload_uploadedById_idx" ON "Upload"("uploadedById");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
