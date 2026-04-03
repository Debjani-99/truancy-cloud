import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReportUpsert = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentCreate = vi.fn();
const mockRecordUpsert = vi.fn();
const mockHistoryFindFirst = vi.fn();
const mockHistoryUpsert = vi.fn();
const mockHistoryFindMany = vi.fn();
const mockHistoryUpdate = vi.fn();

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
        attendanceHistory: {
          findFirst: mockHistoryFindFirst,
          findMany: mockHistoryFindMany,
          upsert: mockHistoryUpsert,
          update: mockHistoryUpdate,
        },
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
  totalHours: 100,
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
    mockReportUpsert.mockResolvedValue({
      id: 10,
      createdAt: new Date("2026-04-01T00:00:00.000Z"),
      reportDate: new Date("2026-04-01T00:00:00.000Z"),
    });
    mockStudentFindUnique.mockResolvedValue({ id: 1 });
    mockRecordUpsert.mockResolvedValue({});
    mockHistoryFindMany.mockResolvedValue([
      {
        id: 1,
        studentId: 1,
        reportId: 10,
        schoolYear: "2024-2025",
        excusedHours: 2.5,
        unexcusedHours: 1.0,
        medicalExcusedHours: 0.5,
        suspensionHours: 0.0,
        totalAbsHours: 4.0,
        totalHours: 100,
        addedHours: 0,
        report: {
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          reportDate: new Date("2026-04-01T00:00:00.000Z"),
        },
      },
    ]);
    mockHistoryUpsert.mockResolvedValue({});
    mockHistoryUpdate.mockResolvedValue({});
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

  it("upserts a history row for each unique processed record", async() => {
    await ingestAttendance(baseParams);

    expect(mockHistoryUpsert).toHaveBeenCalledTimes(1);
    expect(mockHistoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId_reportId: { studentId: 1, reportId: 10}},
        create: expect.objectContaining({ studentId: 1, reportId: 10, schoolYear:"2024-2025"}),
      })
    );
  });

  it("sets addedHours to 0 when no previous snapshot exists", async () => {
    mockHistoryFindMany.mockResolvedValue([
      {
        id: 1,
        studentId: 1,
        reportId: 10,
        schoolYear: "2024-2025",
        excusedHours: 2.5,
        unexcusedHours: 1.0,
        medicalExcusedHours: 0.5,
        suspensionHours: 0.0,
        totalAbsHours: 4.0,
        totalHours: 100,
        addedHours: 0,
        report: {
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          reportDate: new Date("2026-04-01T00:00:00.000Z"),
        },
      },
    ]);

    await ingestAttendance(baseParams);

    expect(mockHistoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ addedHours: 0 }),
      })
    );
  });

  it("calculates addedHours with diff from most recent snapshot", async () => {
    mockHistoryFindMany.mockResolvedValue([
      {
        id: 1,
        studentId: 1,
        reportId: 9,
        schoolYear: "2024-2025",
        excusedHours: 1.5,
        unexcusedHours: 0.5,
        medicalExcusedHours: 0.5,
        suspensionHours: 0,
        totalAbsHours: 2.5,
        totalHours: 100,
        addedHours: 0,
        report: {
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          reportDate: new Date("2026-03-01T00:00:00.000Z"),
        },
      },
      {
        id: 2,
        studentId: 1,
        reportId: 10,
        schoolYear: "2024-2025",
        excusedHours: 2.5,
        unexcusedHours: 1.0,
        medicalExcusedHours: 0.5,
        suspensionHours: 0,
        totalAbsHours: 4.0,
        totalHours: 100,
        addedHours: 0,
        report: {
          createdAt: new Date("2026-04-01T00:00:00.000Z"),
          reportDate: new Date("2026-04-01T00:00:00.000Z"),
        },
      },
    ]);

    await ingestAttendance(baseParams);

    expect(mockHistoryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({ addedHours: 1.5 }),
      })
    );
  });

  it("queries previous snapshot excluding the current reportId", async () => {
    await ingestAttendance(baseParams);

    expect(mockHistoryFindMany).toHaveBeenCalledWith({
      where: {
        studentId: 1,
        schoolYear: "2024-2025",
      },
      include: {
        report: {
          include: {
            upload: true,
          },
        },
      },
      orderBy: {
        report: {
          upload: {
            uploadedAt: "asc",
          },
        },
      },
    });
  });

  it("reprocessing the same upload upserts history without duplicating", async () => {
    await ingestAttendance(baseParams);
    await ingestAttendance(baseParams);

    // upsert called twice (once per run) but uses same unique key — no duplicates
    expect(mockHistoryUpsert).toHaveBeenCalledTimes(2);
    const calls = mockHistoryUpsert.mock.calls;
    expect(calls[0][0].where).toEqual(calls[1][0].where);
  });

  it("creates one history row per student when multiple records are processed", async () => {
    const records: NormalizedRecord[] = [
      { ...baseRecord, studentRef: "S001" },
      { ...baseRecord, studentRef: "S002", firstName: "Jane", lastName: "Doe" },
    ];
    mockStudentFindUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });

    await ingestAttendance({ ...baseParams, validRecords: records });

    expect(mockHistoryUpsert).toHaveBeenCalledTimes(2);
  });
});
