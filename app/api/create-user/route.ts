import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcrypt"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });


export async function POST(req: Request) {
    const { firstName, lastName, email, password, role } = await req.json()

    if (!firstName || !lastName || !email || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing){
        return NextResponse.json({ error: "Email already linked to an account" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashed,
            role,
        },
    })

    return NextResponse.json({ user })

}
