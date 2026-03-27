/*
  Warnings:

  - You are about to drop the column `totalHours` on the `AttendanceRecord` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AttendanceRecord_reportId_idx";

-- DropIndex
DROP INDEX "AttendanceRecord_studentId_idx";

-- DropIndex
DROP INDEX "Student_schoolId_lastName_firstName_idx";

-- AlterTable
ALTER TABLE "AttendanceRecord" DROP COLUMN "totalHours",
ALTER COLUMN "excusedHours" DROP DEFAULT,
ALTER COLUMN "unexcusedHours" DROP DEFAULT,
ALTER COLUMN "medicalExcusedHours" DROP DEFAULT,
ALTER COLUMN "suspensionHours" DROP DEFAULT,
ALTER COLUMN "totalAbsHours" DROP DEFAULT,
ALTER COLUMN "addedHours" DROP DEFAULT;
