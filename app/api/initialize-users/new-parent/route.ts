import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  
  if (!session || !["ADMIN", "COURT", "SCHOOL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { newRole, studentId } = await req.json();
  
  const sid = Number(studentId);
  
  if (!studentId) {
    return NextResponse.json({ error: "Must provide student ID for new parent account" }, { status: 400 });
  }

  //if (isNaN(sid)) {
    //return NextResponse.json({ error: "Invalid Student ID" }, { status: 400 });
  //}


  
  if (studentId) {
    const student = await prisma.student.findFirst({
      where: { studentRef: studentId },
      include: { user: true },
    });

    const parent = await prisma.user.findFirst({
      where: {studentId: Number(studentId)}
    })

    if (parent){
      return NextResponse.json({ error: "This student already has a parent assigned" }, { status: 405 });
    }

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 405 });
    }

    
    if (student.user) {
      return NextResponse.json(
        { error: "This student already has a parent assigned" },
        { status: 405 }
      );
    }
  }


  
  //const tempcode = crypto.randomInt(100000, 999999).toString()
  const tempcode = "password123"
  const hashed = await bcrypt.hash(tempcode, 10);

  const newUser = await prisma.user.create({
    data: {
      firstName: "first",
      lastName: "last",
      email: studentId.toString(),
      passwordHash: hashed,
      role: newRole,
      studentId: sid,
    },
  });

  return NextResponse.json(
  { success: true, userId: newUser.id.toString() },
  { status: 201 }
  );

}
