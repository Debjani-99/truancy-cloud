import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import StudentDetailPage from "@/app/students/[id]/page";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const NOT_FOUND_ERROR = new Error("NEXT_NOT_FOUND");

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw NOT_FOUND_ERROR;
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    student: {
      findFirst: vi.fn(),
    },
  },
}));

function makeStudent() {
  return {
    id: 101,
    firstName: "Ava",
    lastName: "Brown",
    studentRef: "STU-101",
    schoolId: 10,
    school: {
      id: 10,
      name: "Central High",
      countyId: 1,
    },
    records: [
      {
        id: 201,
        schoolYear: "2024-2025",
        excusedHours: 3,
        unexcusedHours: 15,
        medicalExcusedHours: 2,
        suspensionHours: 1,
        totalHours: 500,
        totalAbsHours: 21,
        addedHours: 0,
        report: {
          id: 301,
          uploadId: "upload-1",
          createdAt: new Date("2026-03-20T00:00:00Z"),
        },
      },
    ],
    history: [],
  };
}

describe("students/[id] page RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows the correct court to open their own county student", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: {
        user: {
          role: "COURT",
          countyId: 1,
          schoolId: null,
        },
      },
    } as any);

    vi.mocked(prisma.student.findFirst).mockResolvedValue(makeStudent() as any);

    await expect(
      StudentDetailPage({
        params: Promise.resolve({ id: "101" }),
      })
    ).resolves.toBeTruthy();

    expect(prisma.student.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 101,
          school: {
            countyId: 1,
          },
        },
      })
    );
  });

  it("blocks a court user trying to open a student from another county by direct URL", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: {
        user: {
          role: "COURT",
          countyId: 999,
          schoolId: null,
        },
      },
    } as any);

    vi.mocked(prisma.student.findFirst).mockResolvedValue(null as any);

    await expect(
      StudentDetailPage({
        params: Promise.resolve({ id: "101" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(prisma.student.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 101,
          school: {
            countyId: 999,
          },
        },
      })
    );
  });

  it("blocks a school user trying to open a student from a different school by direct URL", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      session: {
        user: {
          role: "SCHOOL",
          countyId: null,
          schoolId: 555,
        },
      },
    } as any);

    vi.mocked(prisma.student.findFirst).mockResolvedValue(null as any);

    await expect(
      StudentDetailPage({
        params: Promise.resolve({ id: "101" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(prisma.student.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 101,
          schoolId: 555,
        },
      })
    );
  });
});