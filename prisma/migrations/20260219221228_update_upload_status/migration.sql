/*
  Warnings:

  - The values [COMPLETED,REQUIRES_REVIEW] on the enum `UploadStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UploadStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'FAILED', 'REVIEW');
ALTER TABLE "public"."Upload" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Upload" ALTER COLUMN "status" TYPE "UploadStatus_new" USING ("status"::text::"UploadStatus_new");
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
DROP TYPE "public"."UploadStatus_old";
ALTER TABLE "Upload" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
