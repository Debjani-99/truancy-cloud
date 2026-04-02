import { prisma } from "@/lib/prisma";
import type { NormalizedRecord } from "./types";

export interface IngestParams {
  uploadId: string;
  schoolId: string;
  schoolYear: string;
  validRecords: NormalizedRecord[];
}

export interface IngestResult {
  reportId: number;
  inserted: number;
}

export async function ingestAttendance(params: IngestParams): Promise<IngestResult> {
  const { uploadId, schoolId, schoolYear, validRecords } = params;

  return prisma.$transaction(async (tx) => {
    const report = await tx.attendanceReport.upsert({
      where: { uploadId },
      update: {},
      create: { uploadId, schoolId, schoolYear },
    });

    const currentReportCreatedAt = report.createdAt;

    let inserted = 0;

    for (const record of validRecords) {
      let student = record.studentRef
        ? await tx.student.findUnique({
            where: { schoolId_studentRef: { schoolId, studentRef: record.studentRef } },
          })
        : await tx.student.findFirst({
            where: { schoolId, firstName: record.firstName, lastName: record.lastName },
          });

      if (!student) {
        student = await tx.student.create({
          data: {
            schoolId,
            studentRef: record.studentRef,
            firstName: record.firstName,
            lastName: record.lastName,
          },
        });
      }

      await tx.attendanceRecord.upsert({
        // One record per student per school year — latest upload always wins.
        where: { studentId_schoolYear: { studentId: student.id, schoolYear } },
        update: {
          reportId: report.id, // track which upload produced this data
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
        },
        create: {
          reportId: report.id,
          studentId: student.id,
          schoolYear,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
        },
      });

      const previousSnapshot = await tx.attendanceHistory.findFirst({
        where: {
          studentId: student.id,
          schoolYear,
          report: {
            createdAt: {
              lt: currentReportCreatedAt,
            },
          },
        },
        orderBy: {
          report: {
            createdAt: "desc",
          },
        },
      });

      const addedHours = previousSnapshot
      ? record.totalAbsHours - previousSnapshot.totalAbsHours
      : 0;

      await tx.attendanceHistory.upsert({
        where: {studentId_reportId: { studentId: student.id, reportId: report.id}},
        update:{
          schoolYear,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
          addedHours,
        },
        create:{
          studentId: student.id,
          reportId: report.id,
          schoolYear,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
          addedHours,
        },
      });

      inserted++;
    }

    return { reportId: report.id, inserted };
  });
}
