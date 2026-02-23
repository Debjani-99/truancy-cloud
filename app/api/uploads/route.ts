import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["SCHOOL"]);
  if (auth.error) return auth.error;

  const { schoolId } = auth.session.user;

  if (!schoolId) {
    return NextResponse.json({ error: "No school assigned" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("POST /api/uploads formData parse failed:", err);
    return NextResponse.json(
      {
        error: "Invalid upload form data.",
        errorDetails: { code: "BAD_FORMDATA" },
      },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File must be under 10MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate PDF magic bytes
  if (buffer.length < 4 || buffer.toString("ascii", 0, 4) !== "%PDF") {
    return NextResponse.json(
      { error: "File does not appear to be a valid PDF" },
      { status: 400 }
    );
  }

  try {
    // 1) Storage upload (Ceph/S3/local)
    const storageKey = await uploadFile(buffer, schoolId, file.name);

    // 2) DB record create (only after upload succeeds)
    const upload = await prisma.upload.create({
      data: {
        filename: file.name,
        storageKey,
        fileSize: file.size,
        mimeType: file.type,
        school: { connect: { id: schoolId } },
        uploadedBy: { connect: { id: auth.session.user.id } },
      },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        status: true,
        uploadedAt: true,
        school: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ upload }, { status: 201 });
  } catch (err) {
    console.error("POST /api/uploads failed:", err);

    const message = "Upload failed. Please try again.";
    return NextResponse.json(
      {
        error: message,
        errorDetails: { code: "UPLOAD_FAILED", message },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAuth(["SCHOOL", "COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const { role, schoolId, countyId } = auth.session.user;

  let where: any = {};

  if (role === "SCHOOL") {
    where = { schoolId };
  } else if (role === "COURT") {
    where = { school: { countyId } };
  }
  // ADMIN: no filter, sees all

  const uploads = await prisma.upload.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      fileSize: true,
      status: true,
      uploadedAt: true,
      school: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ uploads });
}