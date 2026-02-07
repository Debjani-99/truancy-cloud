export const runtime = "nodejs";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const handler = NextAuth({
  // Minimal provider so NextAuth initializes cleanly.
  // This does NOT log anyone in yet (authorize returns null).
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        // Demo 1: no real auth yet
        return null;
      },
    }),
  ],

  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };
