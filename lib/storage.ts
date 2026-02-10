import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * Store a file to local disk.
 * Returns the storage key used to retrieve it later.
 *
 * When Ceph S3 credentials are available, swap this implementation
 * to use the S3 client instead -- the interface stays the same.
 */
export async function uploadFile(
  buffer: Buffer,
  schoolId: string,
  filename: string
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, schoolId);
  await mkdir(dir, { recursive: true });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${schoolId}/${Date.now()}-${safeName}`;
  const filePath = path.join(UPLOAD_DIR, key);

  await writeFile(filePath, buffer);
  return key;
}

/**
 * Read a file back by its storage key.
 */
export async function getFile(storageKey: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, storageKey);
  return readFile(filePath);
}
