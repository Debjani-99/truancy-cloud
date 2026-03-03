-- Add schoolYear column (nullable initially so we can backfill)
ALTER TABLE "AttendanceRecord" ADD COLUMN "schoolYear" TEXT;

-- Backfill from the linked AttendanceReport
UPDATE "AttendanceRecord" ar
SET "schoolYear" = r."schoolYear"
FROM "AttendanceReport" r
WHERE ar."reportId" = r.id;

-- Make NOT NULL now that every row has a value
ALTER TABLE "AttendanceRecord" ALTER COLUMN "schoolYear" SET NOT NULL;

-- Drop old unique index (reportId, studentId)
DROP INDEX "AttendanceRecord_reportId_studentId_key";

-- Create new unique index: one record per student per school year
CREATE UNIQUE INDEX "AttendanceRecord_studentId_schoolYear_key" ON "AttendanceRecord"("studentId", "schoolYear");
