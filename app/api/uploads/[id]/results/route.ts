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
      records: records.map((r) => {
        const excusedHours = Number(r.excusedHours ?? 0);
        const unexcusedHours = Number(r.unexcusedHours ?? 0);
        const medicalExcusedHours = Number(r.medicalExcusedHours ?? 0);
        const suspensionHours = Number(r.suspensionHours ?? 0);
        const addedHours = Number(r.addedHours ?? 0);
        const totalHours = Number(r.totalHours ?? 0);
        const totalAbsHours = Number(r.totalAbsHours ?? 0);

        const truancyPercent =
          totalHours > 0 ? (unexcusedHours / totalHours) * 100 : 0;

        let flag: "Normal" | "At Watch" | "Court Warning" | "At Risk" =
          "Normal";

        if (truancyPercent >= 10) {
          flag = "At Risk";
        } else if (truancyPercent >= 7) {
          flag = "Court Warning";
        } else if (truancyPercent >= 5) {
          flag = "At Watch";
        }

        return {
          id: r.id,
          studentId: r.studentId,
          studentRef: r.student?.studentRef ?? null,
          firstName: r.student?.firstName ?? "",
          lastName: r.student?.lastName ?? "",
          schoolYear: r.schoolYear,
          excusedHours,
          unexcusedHours,
          medicalExcusedHours,
          suspensionHours,
          addedHours,
          totalHours,
          totalAbsHours,
          truancyPercent: Number(truancyPercent.toFixed(2)),
          flag,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to fetch upload results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results." },
      { status: 500 }
    );
  }
}