// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            firstName: true,
            lastName: true,
            role: true,
            countyId: true,
            schoolId: true,
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          countyId: user.countyId,
          schoolId: user.schoolId,
          // Optional convenience for components that use session.user.name
          name: `${user.firstName} ${user.lastName}`.trim(),
        };
      },
    }),
  ],

  callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.firstName = user.firstName;
      token.lastName = user.lastName;
      token.role = user.role;
      token.countyId = user.countyId ?? null;
      token.schoolId = user.schoolId ?? null;
      token.name = `${user.firstName} ${user.lastName}`;
    }
    return token;
  },

  async session({ session, token }) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.firstName = token.firstName;
    session.user.lastName = token.lastName;
    session.user.role = token.role;
    session.user.countyId = token.countyId ?? null;
    session.user.schoolId = token.schoolId ?? null;
    session.user.name = token.name;

    return session;
  },
},
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
