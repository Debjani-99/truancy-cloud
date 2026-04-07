import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeRiskLabel(
  unexcusedHours: number,
  totalAbs: number,
): "Normal" | "At Watch" | "Court Warning" | "At Risk" {
  if (totalAbs <= 0) return "Normal";
  const pct = (unexcusedHours / totalAbs) * 100;
  if (pct >= 10) return "At Risk";
  if (pct >= 7) return "Court Warning";
  if (pct >= 5) return "At Watch";
  return "Normal";
}

const recordInclude = {
  orderBy: { schoolYear: "desc" } as const,
  select: {
    id: true,
    schoolYear: true,
    excusedHours: true,
    unexcusedHours: true,
    medicalExcusedHours: true,
    suspensionHours: true,
    totalAbsHours: true,
    addedHours: true,
  },
};

const schoolInclude = {
  select: {
    id: true,
    name: true,
    county: { select: { id: true, name: true } },
  },
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const studentId = Number(id);

  if (Number.isNaN(studentId)) {
    return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
  }

  const auth = await requireAuth(["COURT", "ADMIN", "SCHOOL"]);
  if (auth.error) return auth.error;

  const { role, countyId, schoolId: sessionSchoolId } = auth.session.user;

  let student;

  if (role === "COURT") {
    if (!countyId) {
      return NextResponse.json({ error: "No county assigned" }, { status: 400 });
    }
    student = await prisma.student.findFirst({
      where: { id: studentId, school: { countyId } },
      include: { school: schoolInclude, records: recordInclude },
    });
  } else if (role === "SCHOOL") {
    student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: sessionSchoolId ?? "" },
      include: { school: schoolInclude, records: recordInclude },
    });
  } else {
    student = await prisma.student.findFirst({
      where: { id: studentId },
      include: { school: schoolInclude, records: recordInclude },
    });
  }

  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latestRecord = student.records[0] ?? null;
  const unexcused = Number(latestRecord?.unexcusedHours ?? 0);
  const totalAbs = Number(latestRecord?.totalAbsHours ?? 0);
  const truancyPercent = totalAbs > 0 ? (unexcused / totalAbs) * 100 : 0;

  return NextResponse.json({
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      studentRef: student.studentRef,
      school: student.school,
      riskLabel: computeRiskLabel(unexcused, totalAbs),
      truancyPercent: Number(truancyPercent.toFixed(2)),
      records: student.records.map((r) => {
        const u = Number(r.unexcusedHours ?? 0);
        const t = Number(r.totalAbsHours ?? 0);
        const pct = t > 0 ? (u / t) * 100 : 0;
        return {
          ...r,
          excusedHours: Number(r.excusedHours ?? 0),
          unexcusedHours: u,
          medicalExcusedHours: Number(r.medicalExcusedHours ?? 0),
          suspensionHours: Number(r.suspensionHours ?? 0),
          totalAbsHours: t,
          addedHours: Number(r.addedHours ?? 0),
          truancyPercent: Number(pct.toFixed(2)),
          riskLabel: computeRiskLabel(u, t),
        };
      }),
    },
  });
}
