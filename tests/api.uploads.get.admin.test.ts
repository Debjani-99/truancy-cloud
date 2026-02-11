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

describe("GET /api/uploads - ADMIN access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Regression Test:
  // Ensures ADMIN users can view uploads without any school/county filter applied.
  // Protects against accidental scoping that would hide data from admin review.

  
  it("does not apply a scoping filter for ADMIN role", async () => {
    // Simulate authenticated ADMIN user
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });

    (prisma.upload.findMany as any).mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);

    // Critical regression assertion:
    // ADMIN should not have a schoolId or countyId filter
    expect(prisma.upload.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { uploadedAt: "desc" },
      })
    );
  });
});
