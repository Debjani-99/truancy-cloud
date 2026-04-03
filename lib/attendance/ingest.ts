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

      await tx.attendanceHistory.upsert({
        where: {
          studentId_reportId: {
            studentId: student.id,
            reportId: report.id,
          },
        },
        update: {
          schoolYear,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
          addedHours: 0,
        },
        create: {
          studentId: student.id,
          reportId: report.id,
          schoolYear,
          excusedHours: record.excusedHours,
          unexcusedHours: record.unexcusedHours,
          medicalExcusedHours: record.medicalExcusedHours,
          suspensionHours: record.suspensionHours,
          totalHours: record.totalHours,
          totalAbsHours: record.totalAbsHours,
          addedHours: 0,
        },
      });

    const historyRows = await tx.attendanceHistory.findMany({
        where: {
          studentId: student.id,
          schoolYear,
        },
        include: {
          report: {
            include: {
              upload: true,
            },
          },
        },
        orderBy: {
          report: {
            upload: {
              uploadedAt: "asc",
            },
          },
        },
      });

      for (let i = 0; i < historyRows.length; i++) {
        const currentRow = historyRows[i];
        const previousRow = i > 0 ? historyRows[i - 1] : null;

        const recalculatedAddedHours = previousRow
          ? currentRow.totalAbsHours - previousRow.totalAbsHours
          : 0;

        await tx.attendanceHistory.update({
          where: { id: currentRow.id },
          data: {
            addedHours: recalculatedAddedHours,
          },
        });

        currentRow.addedHours = recalculatedAddedHours;
      }

      const latestSnapshot = historyRows[historyRows.length - 1];

      await tx.attendanceRecord.upsert({
        // One record per student per school year — latest upload always wins.
        where: { studentId_schoolYear: { studentId: student.id, schoolYear } },
        update: {
          reportId: latestSnapshot.reportId, // track which upload produced this data
          excusedHours: latestSnapshot.excusedHours,
          unexcusedHours: latestSnapshot.unexcusedHours,
          medicalExcusedHours: latestSnapshot.medicalExcusedHours,
          suspensionHours: latestSnapshot.suspensionHours,
          totalHours:latestSnapshot.totalHours,
          totalAbsHours: latestSnapshot.totalAbsHours,
          addedHours: latestSnapshot.addedHours,
        },
        create: {
          reportId: latestSnapshot.reportId,
          studentId: student.id,
          schoolYear,
          excusedHours: latestSnapshot.excusedHours,
          unexcusedHours: latestSnapshot.unexcusedHours,
          medicalExcusedHours: latestSnapshot.medicalExcusedHours,
          suspensionHours: latestSnapshot.suspensionHours,
          totalHours: latestSnapshot.totalHours,
          totalAbsHours: latestSnapshot.totalAbsHours,
          addedHours: latestSnapshot.addedHours,
        },
      });

      inserted++;
    }

    return { reportId: report.id, inserted };
  });
}
