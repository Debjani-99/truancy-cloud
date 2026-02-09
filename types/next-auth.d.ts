import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    countyId: string | null;
    schoolId: string | null;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      countyId: string | null;
      schoolId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    countyId?: string | null;
    schoolId?: string | null;
  }
}
