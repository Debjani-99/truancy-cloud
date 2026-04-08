
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    
    console.log("SESSION: ", session);
    
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized"}, { status: 401 })
    }

    const { currentPassword, newPassword, newPassword2 } = await req.json()

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) {
        return NextResponse.json({ error: "User not found "}, { status: 403 })
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 })
    }

    if (newPassword == currentPassword){
        return NextResponse.json({ error: "Cannot use previous password" }, { status: 403 })
    }

    if (newPassword !== newPassword2){
        return NextResponse.json({ error: "Updated password does not match" }, { status: 403 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
        where: { email: session.user.email },
        data: { 
            passwordHash: newHash,
            firstTimeUser: false,
            needsPasswordReset: false,
         }
    })

     return NextResponse.json({ redirect: "/login?passwordUpdated=1" });

}