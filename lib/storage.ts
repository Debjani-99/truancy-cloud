import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

/* ── S3 configuration (optional – falls back to local disk) ─────── */
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const BUCKET = process.env.S3_BUCKET;

const s3 =
  S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY && BUCKET
    ? new S3Client({
        endpoint: S3_ENDPOINT,
        region: "us-east-1",
        credentials: {
          accessKeyId: S3_ACCESS_KEY,
          secretAccessKey: S3_SECRET_KEY,
        },
        forcePathStyle: true, // required for Ceph / MinIO
      })
    : null;

/* ── Local-disk fallback directory ──────────────────────────────── */
const LOCAL_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

/**
 * Store a file. Uses S3 when credentials are configured, otherwise
 * falls back to local disk. Returns a storage key for later retrieval.
 */
export async function uploadFile(
  buffer: Buffer,
  schoolId: string,
  filename: string
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${schoolId}/${Date.now()}-${safeName}`;

  if (s3 && BUCKET) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );
  } else {
    const filePath = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  return key;
}

/**
 * Retrieve a file by its storage key.
 */
export async function getFile(storageKey: string): Promise<Buffer> {
  // Validate key format to prevent path traversal
  if (!/^[a-zA-Z0-9/_.-]+$/.test(storageKey)) {
    throw new Error("Invalid storage key format");
  }

  if (s3 && BUCKET) {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: storageKey })
    );
    const stream = res.Body;
    if (!stream) throw new Error("Empty response from S3");
    // Convert readable stream to Buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  // Local disk fallback with path traversal protection
  const resolvedPath = path.resolve(LOCAL_DIR, storageKey);
  if (!resolvedPath.startsWith(LOCAL_DIR + path.sep)) {
    throw new Error("Invalid storage key path");
  }
  return readFile(resolvedPath);
}
