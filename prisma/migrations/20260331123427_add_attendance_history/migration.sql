-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "excusedHours" SET DEFAULT 0,
ALTER COLUMN "unexcusedHours" SET DEFAULT 0,
ALTER COLUMN "medicalExcusedHours" SET DEFAULT 0,
ALTER COLUMN "suspensionHours" SET DEFAULT 0,
ALTER COLUMN "totalAbsHours" SET DEFAULT 0,
ALTER COLUMN "addedHours" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "AttendanceHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reportId" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "excusedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unexcusedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medicalExcusedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "suspensionHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAbsHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceHistory_studentId_idx" ON "AttendanceHistory"("studentId");

-- CreateIndex
CREATE INDEX "AttendanceHistory_reportId_idx" ON "AttendanceHistory"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceHistory_studentId_reportId_key" ON "AttendanceHistory"("studentId", "reportId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_reportId_idx" ON "AttendanceRecord"("reportId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "Student_schoolId_lastName_firstName_idx" ON "Student"("schoolId", "lastName", "firstName");

-- AddForeignKey
ALTER TABLE "AttendanceHistory" ADD CONSTRAINT "AttendanceHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceHistory" ADD CONSTRAINT "AttendanceHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AttendanceReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
