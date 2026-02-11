import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth(["COURT"]);
  if (auth.error) return auth.error;

  const { countyId } = auth.session.user;

  if (!countyId) {
    return NextResponse.json({ schools: [] });
  }

  const schools = await prisma.school.findMany({
    where: { countyId },
    select: {
      id: true,
      name: true,
      countyId: true,
    },
  });

  return NextResponse.json({ schools });
}
