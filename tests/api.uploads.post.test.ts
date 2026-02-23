import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/uploads/route";

// Mock requireAuth
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    upload: {
      create: vi.fn(),
    },
  },
}));

// Mock storage
vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";

function makePdfFile(name = "test.pdf", bytes?: Uint8Array) {
  const content = bytes ?? new TextEncoder().encode("%PDF-1.4\nfake");
  return new File([content], name, { type: "application/pdf" });
}

function makeReqWithFile(file: File) {
  const fd = new FormData();
  fd.set("file", file);

  return new Request("http://test/api/uploads", {
    method: "POST",
    body: fd,
  }) as any;
}

describe("POST /api/uploads (regression suite)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 500 with clear JSON error when storage upload fails", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { id: "user-1", role: "SCHOOL", schoolId: "school-1" } },
    });

    (uploadFile as any).mockRejectedValue(new Error("S3 down"));

    const res = await POST(makeReqWithFile(makePdfFile()));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Upload failed/i);

    // Option 1 expectation: no DB row created if storage fails
    expect(prisma.upload.create).not.toHaveBeenCalled();
  });

  it("returns 400 when file is not a PDF mime type", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { id: "user-1", role: "SCHOOL", schoolId: "school-1" } },
    });

    const bad = new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" });
    const fd = new FormData();
    fd.set("file", bad);

    const req = new Request("http://test/api/uploads", { method: "POST", body: fd }) as any;
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Only PDF/i);
  });
});