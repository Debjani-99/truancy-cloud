import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    countyId?: string | null;
    schoolId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      role: string;
      countyId?: string | null;
      schoolId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    countyId?: string | null;
    schoolId?: string | null;
  }
}
