import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TruancyNoticePdf, type AttendanceRow } from "@/lib/pdf/TruancyNoticePdf";
import type { LetterData } from "@/lib/pdf/letter-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const recordSelect = {
  orderBy: { schoolYear: "asc" } as const,
  select: {
    schoolYear: true,
    excusedHours: true,
    unexcusedHours: true,
    medicalExcusedHours: true,
    suspensionHours: true,
    totalHours: true,
    totalAbsHours: true,
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

  const auth = await requireAuth(["COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const { role, countyId } = auth.session.user;

  let student;

  if (role === "COURT") {
    if (!countyId) {
      return NextResponse.json({ error: "No county assigned" }, { status: 400 });
    }
    student = await prisma.student.findFirst({
      where: { id: studentId, school: { countyId } },
      include: {
        school: {
          select: { name: true, county: { select: { name: true } } },
        },
        records: recordSelect,
      },
    });
  } else {
    student = await prisma.student.findFirst({
      where: { id: studentId },
      include: {
        school: {
          select: { name: true, county: { select: { name: true } } },
        },
        records: recordSelect,
      },
    });
  }

  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Most recent record first for summary figures
  const sortedRecords = [...student.records].sort((a, b) =>
    b.schoolYear.localeCompare(a.schoolYear),
  );
  const latest = sortedRecords[0];
  const unexcused = Number(latest?.unexcusedHours ?? 0);
  const totalHours = Number(latest?.totalHours ?? 0);
  const truancyPercent = totalHours > 0 ? (unexcused / totalHours) * 100 : 0;

  const attendanceRows: AttendanceRow[] = student.records.map((r) => {
    const u = Number(r.unexcusedHours ?? 0);
    const t = Number(r.totalHours ?? 0);
    const abs = Number(r.totalAbsHours ?? 0);
    const pct = t > 0 ? (u / t) * 100 : 0;
    return {
      schoolYear: r.schoolYear,
      excusedHours: Number(r.excusedHours ?? 0),
      unexcusedHours: u,
      medicalExcusedHours: Number(r.medicalExcusedHours ?? 0),
      suspensionHours: Number(r.suspensionHours ?? 0),
      totalAbsHours: abs,
      totalHours: t,
      truancyPercent: Number(pct.toFixed(2)),
      riskLabel: computeRiskLabel(u, t),
    };
  });

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const letterData: LetterData = {
    studentFirstName: student.firstName,
    studentLastName: student.lastName,
    schoolName: student.school.name,
    countyName: student.school.county.name,
    schoolYear: latest?.schoolYear ?? "Unknown",
    unexcusedHours: unexcused,
    totalHours,
    truancyPercent: Number(truancyPercent.toFixed(2)),
    riskLabel: computeRiskLabel(unexcused, totalHours),
    generatedDate,
    // TODO: Populate after Thursday sync with Henry (parent account init)
    parentPortalInstructions: "",
  };

  const pdfBuffer = await renderToBuffer(
    <TruancyNoticePdf letterData={letterData} attendanceRows={attendanceRows} />,
  );

  const safeRef = (student.studentRef ?? String(studentId)).replace(
    /[^a-zA-Z0-9-_]/g,
    "",
  );
  const filename = `truancy-notice-${safeRef}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
