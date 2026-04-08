import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt";
import crypto from "crypto";

export const runtime = "nodejs";

const resend = new Resend('re_iruxHtiM_9fEXsLVCD5iCA8zhw6GAqfbE');

export async function POST(req: Request) {
 
  const session = await getServerSession(authOptions);

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {

  }
  const email = body?.email?.toLowerCase().trim() || session?.user?.email;

  if (!email) {
    
    return NextResponse.json( 
      { error: "Email is required" },
      { status: 400 }
    );
    
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!user) {
    return NextResponse.json(
      { error: "No user exists with that email" },
      { status: 400 }
    )
  }

  const tempcode = crypto.randomInt(100000, 999999).toString()
  const hashed = await bcrypt.hash(tempcode, 10);

  await prisma.user.update({
    where: { id: user.id},
    data: { 
      passwordHash: hashed,
      needsPasswordReset: true,
    }
  });
  
  try {
    
    await resend.emails.send({
      from: "test@resend.dev",
      to: email, 
      subject: "Reset Password",
      html: `
        <h2>Reset Password</h2>
        <p>Hello ${user.firstName},</p>
        <p>A temporary passcode has been generated for your account. Please use the code below to sign in and complete the required steps..</p>
        <p>Temporary Passcode: ${tempcode}</p>
        <p>For your security, this passcode is valid for a limited time and can only be used once. After signing in, you’ll be prompted to create a new permanent password.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
