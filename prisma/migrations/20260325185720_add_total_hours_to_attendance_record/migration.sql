-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "excusedHours" SET DEFAULT 0,
ALTER COLUMN "unexcusedHours" SET DEFAULT 0,
ALTER COLUMN "medicalExcusedHours" SET DEFAULT 0,
ALTER COLUMN "suspensionHours" SET DEFAULT 0,
ALTER COLUMN "totalAbsHours" SET DEFAULT 0,
ALTER COLUMN "addedHours" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "AttendanceRecord_reportId_idx" ON "AttendanceRecord"("reportId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "Student_schoolId_lastName_firstName_idx" ON "Student"("schoolId", "lastName", "firstName");
