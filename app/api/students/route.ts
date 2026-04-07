import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function computeRiskLabel(
  unexcusedHours: number,
  totalHours: number,
): "Normal" | "At Watch" | "Court Warning" | "At Risk" {
  if (totalHours <= 0) return "Normal";
  const pct = (unexcusedHours / totalHours) * 100;
  if (pct >= 10) return "At Risk";
  if (pct >= 7) return "Court Warning";
  if (pct >= 5) return "At Watch";
  return "Normal";
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["COURT", "ADMIN", "SCHOOL"]);
  if (auth.error) return auth.error;

  const { role, countyId, schoolId: sessionSchoolId } = auth.session.user;

  const schoolIdParam = req.nextUrl.searchParams.get("schoolId");
  const riskFilter = req.nextUrl.searchParams.get("risk");

  const recordSelect = {
    orderBy: { schoolYear: "desc" } as const,
    take: 1,
    select: {
      schoolYear: true,
      unexcusedHours: true,
      totalHours: true,
      totalAbsHours: true,
    },
  };

  let students;

  if (role === "SCHOOL") {
    students = await prisma.student.findMany({
      where: { schoolId: sessionSchoolId ?? "" },
      include: {
        school: { select: { id: true, name: true, county: { select: { name: true } } } },
        records: recordSelect,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  } else if (role === "COURT") {
    if (!countyId) {
      return NextResponse.json({ error: "No county assigned" }, { status: 400 });
    }
    if (schoolIdParam) {
      // Verify school is in this court's county
      const school = await prisma.school.findFirst({
        where: { id: schoolIdParam, countyId },
        select: { id: true },
      });
      if (!school) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      students = await prisma.student.findMany({
        where: { schoolId: schoolIdParam },
        include: {
          school: { select: { id: true, name: true, county: { select: { name: true } } } },
          records: recordSelect,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    } else {
      students = await prisma.student.findMany({
        where: { school: { countyId } },
        include: {
          school: { select: { id: true, name: true, county: { select: { name: true } } } },
          records: recordSelect,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    }
  } else {
    // ADMIN
    students = await prisma.student.findMany({
      where: schoolIdParam ? { schoolId: schoolIdParam } : undefined,
      include: {
        school: { select: { id: true, name: true, county: { select: { name: true } } } },
        records: recordSelect,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  const rows = students.map((s) => {
    const latest = s.records[0] ?? null;
    const unexcused = Number(latest?.unexcusedHours ?? 0);
    const totalHours = Number(latest?.totalHours ?? 0);
    const totalAbs = Number(latest?.totalAbsHours ?? 0);
    const riskLabel = computeRiskLabel(unexcused, totalHours);
    const truancyPercent = totalAbs > 0 ? (unexcused / totalHours) * 100 : 0;

    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      studentRef: s.studentRef,
      schoolId: s.schoolId,
      schoolName: s.school.name,
      countyName: s.school.county.name,
      schoolYear: latest?.schoolYear ?? null,
      unexcusedHours: unexcused,
      totalHours,
      totalAbsHours: totalAbs,
      truancyPercent: Number(truancyPercent.toFixed(2)),
      riskLabel,
    };
  });

  const filtered = riskFilter ? rows.filter((r) => r.riskLabel === riskFilter) : rows;

  return NextResponse.json({ students: filtered });
}
