import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    school: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/schools/[id]/route";

const CHAMPAIGN_ID = "county-champaign";
const CLARK_ID = "county-clark";
const URBANA_ID = "school-urbana";
const GRAHAM_ID = "school-graham";
const SPRINGFIELD_ID = "school-springfield";

const urbanaSchool = { id: URBANA_ID, name: "Urbana High School", countyId: CHAMPAIGN_ID };
const springfieldSchool = { id: SPRINGFIELD_ID, name: "Springfield High School", countyId: CLARK_ID };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/schools/[id] RBAC", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    (requireAuth as any).mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      }),
    });

    const res = await GET(new Request("http://test"), makeParams(URBANA_ID));
    expect(res.status).toBe(401);
  });

  it("returns 404 for nonexistent school id", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });
    (prisma.school.findUnique as any).mockResolvedValue(null);

    const res = await GET(new Request("http://test"), makeParams("nonexistent-id"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("School not found");
  });

  it("returns 200 when ADMIN fetches any school", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "ADMIN" } },
    });
    (prisma.school.findUnique as any).mockResolvedValue(springfieldSchool);

    const res = await GET(new Request("http://test"), makeParams(SPRINGFIELD_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(SPRINGFIELD_ID);
  });

  it("returns 200 when COURT fetches a school in their county", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "COURT", countyId: CHAMPAIGN_ID } },
    });
    (prisma.school.findUnique as any).mockResolvedValue(urbanaSchool);

    const res = await GET(new Request("http://test"), makeParams(URBANA_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(URBANA_ID);
  });

  it("returns 403 when COURT fetches a school in a different county", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "COURT", countyId: CHAMPAIGN_ID } },
    });
    (prisma.school.findUnique as any).mockResolvedValue(springfieldSchool);

    const res = await GET(new Request("http://test"), makeParams(SPRINGFIELD_ID));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 200 when SCHOOL fetches their own school", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "SCHOOL", schoolId: URBANA_ID } },
    });
    (prisma.school.findUnique as any).mockResolvedValue(urbanaSchool);

    const res = await GET(new Request("http://test"), makeParams(URBANA_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(URBANA_ID);
  });

  it("returns 403 when SCHOOL fetches another school", async () => {
    (requireAuth as any).mockResolvedValue({
      session: { user: { role: "SCHOOL", schoolId: URBANA_ID } },
    });
    (prisma.school.findUnique as any).mockResolvedValue({
      id: GRAHAM_ID,
      name: "Graham High School",
      countyId: CHAMPAIGN_ID,
    });

    const res = await GET(new Request("http://test"), makeParams(GRAHAM_ID));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });
});
