import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile } from "fs/promises";

// Mock requireAuth (we don't need real NextAuth session cookies)
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock prisma (route imports: `import { prisma } from "@/lib/prisma"`)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    upload: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock file read (so local fallback works in CI without real files)
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/uploads/[id]/file/route";

describe("GET /api/uploads/[id]/file (regression suite)", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Ensure it doesn't try S3 (use local fallback path)
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;
  });

  // Regression Test:
  // Ensures the API returns 404 when a requested upload file ID does not exist.
  // Protects against accidental changes that might expose invalid or undefined records.


  it("returns 404 when upload is not found", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });

    (prisma.upload.findUnique as any).mockResolvedValue(null);

    const res = await GET(new Request("http://test"), {
      params: Promise.resolve({ id: "missing-id" }),
    });

    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  // Regression Test:
  // Ensures SCHOOL users cannot access uploads belonging to other schools.
  // Protects strict school-level scoping and prevents cross-school data exposure.


  it("returns 403 when SCHOOL tries to access another school's upload", async () => {
    (requireAuth as any).mockResolvedValue({
      session: {
        user: {
          role: "SCHOOL",
          schoolId: "school-A",
        },
      },
    });

    (prisma.upload.findUnique as any).mockResolvedValue({
      id: "upload-1",
      filename: "file.pdf",
      mimeType: "application/pdf",
      storageKey: "demo/file.pdf",
      schoolId: "school-B", // different school
      school: { countyId: "county-1" },
    });

    const res = await GET(new Request("http://test"), {
      params: Promise.resolve({ id: "upload-1" }),
    });

    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  // Regression Test:
  // Ensures authorized users (e.g., ADMIN) can successfully retrieve a file.
  // Protects against accidental changes that block valid access.

  
  it("returns 200 and streams file for ADMIN", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });

    (prisma.upload.findUnique as any).mockResolvedValue({
      id: "upload-2",
      filename: "report.pdf",
      mimeType: "application/pdf",
      storageKey: "demo/report.pdf",
      schoolId: "school-A",
      school: { countyId: "county-1" },
    });

    // Use the mocked readFile import (local fallback)
    (readFile as any).mockResolvedValue(Buffer.from("%PDF-1.4 fake content"));

    const res = await GET(new Request("http://test"), {
      params: Promise.resolve({ id: "upload-2" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const body = Buffer.from(await res.arrayBuffer());
    expect(body.length).toBeGreaterThan(0);
  });
});
