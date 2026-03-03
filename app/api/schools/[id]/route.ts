import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "COURT", "SCHOOL"]);
  if (auth.error) return auth.error;

  const { session } = auth;
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, countyId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // COURT users can only access schools within their county
    if (
      session.user.role === "COURT" &&
      session.user.countyId !== school.countyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // SCHOOL users can only access their own school
    if (
      session.user.role === "SCHOOL" &&
      session.user.schoolId !== school.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(school);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/schools/[id] failed:", message);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
