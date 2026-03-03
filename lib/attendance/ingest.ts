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
        where: { reportId_studentId: { reportId: report.id, studentId: student.id } },
        update: {
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalAbsHours: record.totalAbsHours,
        },
        create: {
          reportId: report.id,
          studentId: student.id,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalAbsHours: record.totalAbsHours,
        },
      });

      inserted++;
    }

    return { reportId: report.id, inserted };
  });
}
