import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.error) return auth.error;

  return NextResponse.json({
    message: "pong",
    user: auth.session.user,
  });
}
