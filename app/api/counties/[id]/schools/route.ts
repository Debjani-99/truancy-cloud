import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing county id" }, { status: 400 });
  }

  try {
    const schools = await prisma.school.findMany({
      where: { countyId: id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ schools });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/counties/[id]/schools failed:", message);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
