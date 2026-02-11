import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  try {
    const county = await prisma.county.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!county) {
      return NextResponse.json({ error: "County not found" }, { status: 404 });
    }

    return NextResponse.json(county);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("GET /api/counties/[id] failed:", message);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
