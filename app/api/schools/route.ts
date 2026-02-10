import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { name: "asc" },
      include: {
        county: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error("GET /api/schools error:", error);
    return NextResponse.json({ schools: [] }, { status: 500 });
  }
}
