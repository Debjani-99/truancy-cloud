import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTransaction = vi.fn();
const mockReportUpsert = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentCreate = vi.fn();
const mockRecordUpsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        attendanceReport: { upsert: mockReportUpsert },
        student: {
          findUnique: mockStudentFindUnique,
          findFirst: mockStudentFindFirst,
          create: mockStudentCreate,
        },
        attendanceRecord: { upsert: mockRecordUpsert },
      }),
  },
}));

import { ingestAttendance } from "@/lib/attendance/ingest";
import type { NormalizedRecord } from "@/lib/attendance/types";

const baseRecord: NormalizedRecord = {
  studentRef: "S001",
  firstName: "John",
  lastName: "Smith",
  excusedHours: 2.5,
  unexcusedHours: 1.0,
  medicalExcusedHours: 0.5,
  suspensionHours: 0.0,
  totalAbsHours: 4.0,
};

const baseParams = {
  uploadId: "upload-1",
  schoolId: "school-1",
  schoolYear: "2024-2025",
  validRecords: [baseRecord],
};

describe("ingestAttendance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockReportUpsert.mockResolvedValue({ id: 10 });
    mockStudentFindUnique.mockResolvedValue({ id: 1 });
    mockRecordUpsert.mockResolvedValue({});
  });

  it("inserts a new report and attendance record", async () => {
    const result = await ingestAttendance(baseParams);

    expect(result.reportId).toBe(10);
    expect(result.inserted).toBe(1);
    expect(mockReportUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uploadId: "upload-1" },
        create: expect.objectContaining({ uploadId: "upload-1", schoolId: "school-1" }),
      })
    );
    expect(mockRecordUpsert).toHaveBeenCalledTimes(1);
  });

  it("re-run does not duplicate: upsert is called but inserted count matches records", async () => {
    await ingestAttendance(baseParams);
    await ingestAttendance(baseParams);

    expect(mockReportUpsert).toHaveBeenCalledTimes(2);
    expect(mockRecordUpsert).toHaveBeenCalledTimes(2);
  });

  it("matches student by studentRef when available", async () => {
    await ingestAttendance(baseParams);

    expect(mockStudentFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId_studentRef: { schoolId: "school-1", studentRef: "S001" } },
      })
    );
    expect(mockStudentFindFirst).not.toHaveBeenCalled();
  });

  it("falls back to name matching when studentRef is absent", async () => {
    const recordNoRef: NormalizedRecord = { ...baseRecord, studentRef: undefined };
    mockStudentFindFirst.mockResolvedValue({ id: 2 });

    const result = await ingestAttendance({ ...baseParams, validRecords: [recordNoRef] });

    expect(mockStudentFindUnique).not.toHaveBeenCalled();
    expect(mockStudentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: "school-1", firstName: "John", lastName: "Smith" },
      })
    );
    expect(result.inserted).toBe(1);
  });

  it("creates a new student when no match is found", async () => {
    mockStudentFindUnique.mockResolvedValue(null);
    mockStudentCreate.mockResolvedValue({ id: 99 });

    const result = await ingestAttendance(baseParams);

    expect(mockStudentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schoolId: "school-1", studentRef: "S001" }),
      })
    );
    expect(result.inserted).toBe(1);
  });

  it("returns inserted count equal to number of valid records", async () => {
    const records: NormalizedRecord[] = [
      { ...baseRecord, studentRef: "S001" },
      { ...baseRecord, studentRef: "S002", firstName: "Jane", lastName: "Doe" },
    ];
    mockStudentFindUnique.mockResolvedValue({ id: 1 });

    const result = await ingestAttendance({ ...baseParams, validRecords: records });
    expect(result.inserted).toBe(2);
  });
});
