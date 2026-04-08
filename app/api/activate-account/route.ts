import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt";

export async function POST(req: Request) {
    try {
        const { role, email, studentId, firstName, lastName, password } =
        await req.json();

        if (!(role || email || password)) {
            return NextResponse.json(
                { error: "Missing required fields"},
                { status: 400 }
            );
        }

        if (!email) {
            return NextResponse.json(
                { error: "Email is required for account activation" },
                { status: 400 }
        );
      }

      if (role === "COURT" || role === "SCHOOL") {

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "No pending account for this email"},
                { status: 400 }
            );
        }

        if (user.firstTimeUser !== true) {
            return NextResponse.json(
                { error: "This account has already been activated. Please login or use the forgot password option"},
                { status: 403}
            );
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
            return NextResponse.json(
                { error: "Incorrect temorary password"},
                { status: 405}
            );
        }

        return NextResponse.json({ success: true, message: "Account activated " });
      }

      if (role === "PARENT") {

        if (!(studentId || firstName || lastName)) {
            return NextResponse.json(
                { error: "Missing fields"},
                { status: 400}
            );
        }

        const user = await prisma.user.findUnique({
            where: { studentId: studentId },
        });

        if (!user) {
            return NextResponse.json(
                { error: "No account associated with this studentId"},
                { status: 405}
            );
        }

        if (user.firstTimeUser !== true) {
            return NextResponse.json(
                { error: "This account has already been activated. Please login or use the forgot password option"},
                { status: 403}
            );
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
            return NextResponse.json(
                { error: "Incorrect temorary password"},
                { status: 405}
            );
        }

        const exists = await prisma.user.findUnique({
            where: { email: email},
        });

        if (exists) {
            return NextResponse.json(
                { error: "There is already an existing account with this email"},
                { status: 405}
            );
        }
        await prisma.user.update({
            where: { studentId },
            data: {
                email: email,
                firstName: firstName,
                lastName: lastName,
            }
        })

        return NextResponse.json({ success: true, message: "Account activated" });
      }
      return NextResponse.json({ error: "invalid role"}, { status: 400 });
    } catch (err) {
        console.error("Activation error:", err);
        return NextResponse.json(
            { error: "Server error during activation" },
            { status: 500 }
        );
    }
}