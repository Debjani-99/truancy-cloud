import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend('re_iruxHtiM_9fEXsLVCD5iCA8zhw6GAqfbE');

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  
  if (!session || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { countyName, email, newRole } = await req.json();
  

  
  if (!(email || countyName)) {
    return NextResponse.json({ error: "Missing fields required for creating school account" }, { status: 400 });
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
  


  

    const countyNameExists = await prisma.county.findUnique({
      where: { name: countyName },
    });
  
    if (countyNameExists) {
      return NextResponse.json(
        { error: "Invalid: Account already exists with this name"},
        { status: 400}
      );
    }

    const countyId = await prisma.county.findUnique({
      where: { name: countyName },
    });

    if (!countyId){
      return NextResponse.json(
        { error: "Invalid: An account cannot be set up for this county"},
        { status: 400}
      );
    }

  const newUser = await prisma.user.create({
    data: {
      firstName: countyName,
      lastName: "Court",
      email: email.toLowerCase(),
      passwordHash: hashed,
      role: "COURT",
      countyId: countyId.toString(),
    },
  });

  try {
    console.log("Sending email to:", email)
    await resend.emails.send({
      from: "test@resend.dev",
      to: email, 
      subject: "Account Activation",
      html: `
        <h2>Account Activation</h2>
        <p>Hello,</p>
        <p>
        An account has been created for the Truancy Cloud portal 
        for the county <strong>${countyName}</strong> with the email address: <strong>${email}</strong>
        </p>
        <p>To activate this account, please click on the link below and enter this email address,
        along with the temporary passcode provided below.
        </p>
        <p>Temporary Passcode: <strong>${tempcode}</strong></p>
        <p>For your security, this passcode is valid for a limited time and can only be used once. 
        After signing in, you’ll be prompted to create a new permanent password.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
