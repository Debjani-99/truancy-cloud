import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Handles both:
// - AsyncIterable<Uint8Array> (Node streams)
// - Web ReadableStream<Uint8Array>
async function streamToBuffer(
  stream: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
): Promise<Buffer> {
  // Web ReadableStream path
  if (typeof (stream as ReadableStream<Uint8Array>).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const parts: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) parts.push(value);
    }

    return Buffer.concat(parts.map((p) => Buffer.from(p)));
  }

  // AsyncIterable path (Node stream)
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function s3Enabled() {
  return (
    !!process.env.S3_ENDPOINT &&
    !!process.env.S3_BUCKET &&
    !!process.env.S3_ACCESS_KEY &&
    !!process.env.S3_SECRET_KEY
  );
}

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "us-west-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
}

function getLocalPathFromStorageKey(storageKey: string) {
  const baseDir = path.join(process.cwd(), "uploads");

  const safeKey = storageKey.replace(/^\/+/, "");
  const fullPath = path.normalize(path.join(baseDir, safeKey));

  if (!fullPath.startsWith(baseDir)) {
    throw new Error("Invalid storage key path");
  }

  return fullPath;
}

async function readBytes(storageKey: string): Promise<Uint8Array> {
  if (s3Enabled()) {
    const client = getS3Client();
    const bucket = process.env.S3_BUCKET!;

    const obj = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      })
    );

    if (!obj.Body) throw new Error("Empty S3 object body");

    const body = obj.Body as any;

    //Best path: AWS SDK v3 SdkStreamMixin helper
    if (typeof body.transformToByteArray === "function") {
      const bytes = await body.transformToByteArray(); // Uint8Array
      return new Uint8Array(bytes);
    }

    // Fallback: Blob
    if (typeof Blob !== "undefined" && body instanceof Blob) {
      const ab = await body.arrayBuffer();
      return new Uint8Array(ab);
    }

    // Fallback: stream conversion
    const buf = await streamToBuffer(
      body as AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
    );
    return new Uint8Array(buf);
  }

  const filePath = getLocalPathFromStorageKey(storageKey);
  const buf = await readFile(filePath);
  return new Uint8Array(buf);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const auth = await requireAuth(["SCHOOL", "COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const { role, schoolId, countyId } = auth.session.user;

  const upload = await prisma.upload.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      storageKey: true,
      schoolId: true,
      school: { select: { countyId: true } },
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // RBAC + scoping
  if (role === "SCHOOL") {
    if (!schoolId || upload.schoolId !== schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (role === "COURT") {
    if (!countyId || upload.school.countyId !== countyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Optional guardrail
  if (!upload.storageKey) {
    return NextResponse.json({ error: "File not available" }, { status: 409 });
  }

  try {
    const bytes = await readBytes(upload.storageKey);

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": upload.mimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${upload.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/uploads/[id]/file failed:", err);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}