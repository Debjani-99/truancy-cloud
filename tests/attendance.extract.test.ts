import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("pdf-parse", () => ({
  default: vi.fn(),
}));

import pdfParse from "pdf-parse";
import { extractRawRows, UnsupportedPdfFormatError } from "@/lib/attendance/extract";
import { processRows, normalizeRow, validateRecord } from "@/lib/attendance/normalize";
import type { RawAttendanceRow } from "@/lib/attendance/types";

function makePdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4 fake");
}

function mockPdfText(text: string) {
  (pdfParse as any).mockResolvedValue({ text });
}

describe("extractRawRows", () => {
  beforeEach(() => vi.resetAllMocks());

  it("parses valid attendance rows from PDF text", async () => {
    mockPdfText(
      "Student Name          ID       Excused  Unexcused  Medical  Suspension  Total\n" +
      "─────────────────────────────────────────────────────────────────────────────\n" +
      "Smith, John           S001     2.5      1.0        0.5      0.0         4.0\n" +
      "Doe, Jane             S002     0.0      3.0        0.0      0.0         3.0\n" +
      "Total                          2.5      4.0        0.5      0.0         7.0\n"
    );

    const rows = await extractRawRows(makePdfBuffer());
    expect(rows).toHaveLength(2);
    expect(rows[0].rawName).toBe("Smith, John");
    expect(rows[0].studentRef).toBe("S001");
    expect(rows[0].fields).toEqual(["2.5", "1.0", "0.5", "0.0", "4.0"]);
  });

  it("skips header, separator, and summary rows", async () => {
    mockPdfText(
      "Student Name  Excused\n" +
      "────────────────────\n" +
      "Adams, Bob    S003  1.0  0.0  0.0  0.0  1.0\n" +
      "Total         1.0\n"
    );

    const rows = await extractRawRows(makePdfBuffer());
    expect(rows).toHaveLength(1);
    expect(rows[0].rawName).toBe("Adams, Bob");
  });

  it("throws UnsupportedPdfFormatError when no data rows are found", async () => {
    mockPdfText("Student Name\nTotal\n─────\n");
    await expect(extractRawRows(makePdfBuffer())).rejects.toThrow(UnsupportedPdfFormatError);
  });

  it("handles rows without a student ref", async () => {
    mockPdfText("Johnson, Alice        1.5      2.0        0.0      0.0         3.5\n");
    const rows = await extractRawRows(makePdfBuffer());
    expect(rows).toHaveLength(1);
    expect(rows[0].studentRef).toBeUndefined();
  });
});

describe("normalizeRow", () => {
  it("normalizes Last, First name format", () => {
    const row: RawAttendanceRow = {
      rawName: "SMITH, JOHN",
      studentRef: "S001",
      fields: ["2.5", "1.0", "0.5", "0.0", "4.0"],
    };
    const record = normalizeRow(row);
    expect(record).not.toBeNull();
    expect(record!.firstName).toBe("John");
    expect(record!.lastName).toBe("Smith");
    expect(record!.excusedHours).toBe(2.5);
    expect(record!.totalAbsHours).toBe(4.0);
  });

  it("normalizes First Last name format", () => {
    const row: RawAttendanceRow = { rawName: "jane doe", fields: ["0.0", "3.0", "0.0", "0.0", "3.0"] };
    const record = normalizeRow(row);
    expect(record!.firstName).toBe("Jane");
    expect(record!.lastName).toBe("Doe");
  });

  it("converts empty hour fields to 0", () => {
    const row: RawAttendanceRow = { rawName: "Brown, Charlie", fields: ["", "", "", "", ""] };
    const record = normalizeRow(row);
    expect(record!.excusedHours).toBe(0);
    expect(record!.totalAbsHours).toBe(0);
  });

  it("returns null for unparseable name", () => {
    const row: RawAttendanceRow = { rawName: "SingleWord", fields: ["1.0", "0.0", "0.0", "0.0", "1.0"] };
    expect(normalizeRow(row)).toBeNull();
  });
});

describe("validateRecord", () => {
  const base = {
    firstName: "John",
    lastName: "Smith",
    excusedHours: 0,
    unexcusedHours: 0,
    medicalExcusedHours: 0,
    suspensionHours: 0,
    totalAbsHours: 0,
  };

  it("returns null for a valid record", () => {
    expect(validateRecord(base)).toBeNull();
  });

  it("flags negative hour values", () => {
    expect(validateRecord({ ...base, excusedHours: -1 })).toMatch(/negative/);
  });
});

describe("processRows", () => {
  it("separates valid and invalid rows", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "Smith, John", fields: ["2.5", "1.0", "0.5", "0.0", "4.0"] },
      { rawName: "Garbage!!!!", fields: ["abc", "xyz", "", "", ""] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(1);
    expect(result.invalidRecords).toHaveLength(1);
  });

  it("flags rows with non-numeric hour values as invalid", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "Doe, Jane", fields: ["N/A", "0.0", "0.0", "0.0", "0.0"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(0);
    expect(result.invalidRecords[0].reason).toMatch(/not a number/);
  });

  it("returns all valid when all rows are well-formed", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "Adams, Bob", studentRef: "S003", fields: ["1.0", "0.0", "0.0", "0.0", "1.0"] },
      { rawName: "Clark, Sue", studentRef: "S004", fields: ["0.0", "2.0", "0.0", "0.0", "2.0"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(2);
    expect(result.invalidRecords).toHaveLength(0);
  });
});
