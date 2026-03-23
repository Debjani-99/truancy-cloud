import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: uploadId } = await context.params;

  try {
    const report = await prisma.attendanceReport.findFirst({
      where: { uploadId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "No report found for this upload." },
        { status: 404 }
      );
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        schoolYear: report.schoolYear,
        student: {
          schoolId: report.schoolId,
        },
      },
      include: {
        student: true,
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });

    return NextResponse.json({
      report,
      recordCount: records.length,
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentRef: r.student?.studentRef ?? null,
        firstName: r.student?.firstName ?? "",
        lastName: r.student?.lastName ?? "",
        schoolYear: r.schoolYear,
        excusedHours: r.excusedHours,
        unexcusedHours: r.unexcusedHours,
        medicalExcusedHours: r.medicalExcusedHours,
        suspensionHours: r.suspensionHours,
        addedHours: r.addedHours,
        totalAbsHours: r.totalAbsHours,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch upload results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results." },
      { status: 500 }
    );
  }
}