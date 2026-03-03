import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getFile } from "@/lib/storage";
import { extractRawRows, UnsupportedPdfFormatError } from "@/lib/attendance/extract";
import { processRows } from "@/lib/attendance/normalize";
import { ingestAttendance } from "@/lib/attendance/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const auth = await requireAuth(["COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const upload = await prisma.upload.findUnique({
    where: { id },
    select: {
      id: true,
      storageKey: true,
      schoolId: true,
      status: true,
      school: { select: { countyId: true } },
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (auth.session.user.role === "COURT") {
    if (auth.session.user.countyId !== upload.school.countyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!upload.storageKey) {
    return NextResponse.json({ error: "File not available" }, { status: 409 });
  }

  await prisma.upload.update({ where: { id }, data: { status: "PROCESSING" } });

  try {
    const buffer = await getFile(upload.storageKey);
    const rawRows = await extractRawRows(buffer);
    const { validRecords, invalidRecords } = processRows(rawRows);
    const schoolYear = rawRows[0]?.schoolYear ?? "unknown";

    const { reportId, inserted } = await ingestAttendance({
      uploadId: id,
      schoolId: upload.schoolId,
      schoolYear,
      validRecords,
    });

    await prisma.upload.update({ where: { id }, data: { status: "PARSED" } });

    return NextResponse.json({
      reportId,
      inserted,
      skipped: invalidRecords.length,
      invalidRecords: invalidRecords.map((r) => ({
        name: r.row.rawName,
        reason: r.reason,
      })),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await prisma.upload.update({
      where: { id },
      data: { status: "FAILED", errorMessage },
    });

    if (err instanceof UnsupportedPdfFormatError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    console.error("POST /api/uploads/[id]/process failed:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
