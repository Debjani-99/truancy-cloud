import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    school: {
      findMany: vi.fn(),
    },
  },
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/counties/[id]/schools/route";

const CHAMPAIGN_ID = "county-champaign";
const CLARK_ID = "county-clark";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/counties/[id]/schools RBAC", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    (requireAuth as any).mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      }),
    });

    const res = await GET(new Request("http://test"), makeParams(CHAMPAIGN_ID));
    expect(res.status).toBe(401);
  });

  it("returns 403 when SCHOOL role tries to access", async () => {
    (requireAuth as any).mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      }),
    });

    const res = await GET(new Request("http://test"), makeParams(CHAMPAIGN_ID));
    expect(res.status).toBe(403);
  });

  it("returns 403 when COURT tries to access a different county", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "COURT", countyId: CHAMPAIGN_ID } },
    });

    const res = await GET(new Request("http://test"), makeParams(CLARK_ID));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 when COURT accesses their own county", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "COURT", countyId: CHAMPAIGN_ID } },
    });
    (prisma.school.findMany as any).mockResolvedValue([
      { id: "school-1", name: "Urbana High School" },
    ]);

    const res = await GET(new Request("http://test"), makeParams(CHAMPAIGN_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schools).toHaveLength(1);
  });

  it("returns 200 when ADMIN accesses any county", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });
    (prisma.school.findMany as any).mockResolvedValue([
      { id: "school-2", name: "Springfield High School" },
    ]);

    const res = await GET(new Request("http://test"), makeParams(CLARK_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schools).toHaveLength(1);
  });
});
