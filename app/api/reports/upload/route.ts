
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs"; // keep Node runtime

type Role = "SCHOOL" | "COURT" | "ADMIN";

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

  const role = session.user?.role as Role | undefined;
  if (role !== "SCHOOL") {
    return NextResponse.json({ error: "Forbidden (SCHOOL only)" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field 'file'" }, { status: 400 });
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "PDF files only" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max is ${MAX_MB}MB.` },
      { status: 400 }
    );
  }


  // (Later: upload to Ceph S3 + store metadata in Prisma)
  const bytes = await file.arrayBuffer();

  return NextResponse.json({
    ok: true,
    message: "Upload received",
    filename: file.name,
    sizeBytes: file.size,
    receivedBytes: bytes.byteLength,
    uploadedBy: session.user?.email ?? "unknown",
  });
}
