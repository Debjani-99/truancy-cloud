import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth(["SCHOOL"]);
  if (auth.error) return auth.error;

  const { schoolId } = auth.session.user;

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school assigned" },
      { status: 400 }
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { county: true },
  });

  if (!school) {
    return NextResponse.json(
      { error: "School not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ school });
}
