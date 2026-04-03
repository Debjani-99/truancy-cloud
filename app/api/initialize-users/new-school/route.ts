import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  
  if (!session || !["ADMIN", "COURT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { email, role } = body;

  
  if (!email) {
    return NextResponse.json({ error: "Must provide email for new school account" }, { status: 400 });
  }



  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });
    
    if (user) {
      return NextResponse.json(
        { error: "This email already has an account" },
        { status: 405 }
      );
    }
  }

  
  const tempcode = crypto.randomInt(100000, 999999).toString()
  const hashed = await bcrypt.hash(tempcode, 10);

  const newUser = await prisma.user.create({
    data: {
      firstName: "first",
      lastName: "last",
      email: email.toLowerCase(),
      passwordHash: hashed,
      role,
      studentId: null,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
