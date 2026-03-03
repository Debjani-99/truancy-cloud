-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentRef_key" ON "Student"("schoolId", "studentRef");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_reportId_studentId_key" ON "AttendanceRecord"("reportId", "studentId");
