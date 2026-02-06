import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcrypt"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const handler = NextAuth({
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {label: "Email", type: "text"},
                password: {label: "Password", type: "password"},

            },
            async authorize(credentials){
                if (!credentials?.email || !credentials?.password) return null //check email

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email},
                })

                if (!user) return null;

                const valid = await bcrypt.compare(credentials.password, user.password)
                if (!valid) return null

                return {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                }
            },
        }),
    ],

    pages: {
        signIn: "/signin"
    },
})

export { handler as GET, handler as POST }