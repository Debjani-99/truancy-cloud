import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAuth so we can simulate roles without real NextAuth sessions
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

describe("GET /api/uploads - COURT scoping", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Regression Test:
  // Ensures COURT users only receive uploads from schools within their county.
  // Protects against accidental removal of the county scoping filter.

  
  it("filters uploads by school.countyId for COURT role", async () => {
    // Simulate authenticated COURT user
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "COURT", countyId: "county-1" } },
    });

    // Simulate prisma returning results
    (prisma.upload.findMany as any).mockResolvedValue([]);

    const res = await GET();

    // Expect successful response
    expect(res.status).toBe(200);

    // Critical regression assertion:
    // Prisma must be called with nested county filter applied
    expect(prisma.upload.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { school: { countyId: "county-1" } },
        orderBy: { uploadedAt: "desc" },
      })
    );
  });
});
