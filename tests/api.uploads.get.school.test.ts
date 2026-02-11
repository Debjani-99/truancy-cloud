import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAuth (we can simulate roles without real NextAuth sessions)
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock prisma to avoid real database calls in CI
vi.mock("@/lib/prisma", () => ({
  prisma: {
    upload: {
      findMany: vi.fn(),
    },
  },
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/uploads/route";

describe("GET /api/uploads - SCHOOL scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Regression Test:
  // Ensures SCHOOL users only receive uploads belonging to their own school.
  // Protects against accidental removal of the school-level filter.


  it("filters uploads by schoolId for SCHOOL role", async () => {
    // Simulate authenticated SCHOOL user
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "SCHOOL", schoolId: "school-A" } },
    });

    // Simulate prisma returning results
    (prisma.upload.findMany as any).mockResolvedValue([]);

    const res = await GET();

    // Expect successful response
    expect(res.status).toBe(200);

    // Critical regression assertion:
    // Prisma must be called with schoolId filter applied
    expect(prisma.upload.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "school-A" },
        orderBy: { uploadedAt: "desc" },
      })
    );
  });
});




