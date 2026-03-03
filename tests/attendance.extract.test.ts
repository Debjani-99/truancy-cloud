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

// Minimal valid ProgressBook block for one student
const SINGLE_STUDENT_TEXT = [
  "Yearly Absence Summary 40 or More Hours",
  "URBANA ELEMENTARY                                                       2024-2025",
  "John Doe  #115936                                          Daily    Consecutive    Monthly    Thresholds",
  "Age: 8                       Calendar: Elementary A                                Grade: 02",
  "HR Teacher: JACOBS, MRS. M.              5 - Resident Attending Full Time            ACTIVE RES - Active % FS - 100",
  "School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.",
  "2024-2025    42.00    0.00       31.17         0.00        628.00       554.83     42.00",
].join("\n");

// Two students across a simulated page break (page header lines between them)
const PAGE_SPLIT_TEXT = [
  "John Doe  #115936                                          Daily    Consecutive    Monthly    Thresholds",
  "Age: 8                       Calendar: Elementary A                                Grade: 02",
  "HR Teacher: JACOBS, MRS. M.              5 - Resident Attending Full Time            ACTIVE RES - Active % FS - 100",
  "School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.",
  "2024-2025    42.00    0.00       31.17         0.00        628.00       554.83     42.00",
  // page break header lines
  "Yearly Absence Summary 40 or More Hours",
  "URBANA ELEMENTARY                                                       2024-2025",
  "Jane Smith  #116157                                        Daily    Consecutive    Monthly    Thresholds",
  "Age: 12                      Calendar: Elementary B                                Grade: 05",
  "HR Teacher: HOLETON, MR. R.             5 - Resident Attending Full Time            ACTIVE RES - Active % FS - 100",
  "School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.",
  "2024-2025    6.00     50.00      0.00          0.00        628.00       572.00     56.00",
].join("\n");

// Malformed row: decimal points dropped due to PDF page-split rendering bug
const MALFORMED_DECIMALS_TEXT = [
  "Emma Gonzalez  #123578                                     Daily    Consecutive    Monthly    Thresholds",
  "Age: 12                      Calendar: Elementary B                                Grade: 05",
  "HR Teacher: ADAMS, MR. C.               5 - Resident Attending Full Time            ACTIVE RES - Active % FS - 100",
  "School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.",
  "2024-2025    1800     4200       400           000         62500        57000      6000",
].join("\n");

describe("extractRawRows", () => {
  beforeEach(() => vi.resetAllMocks());

  it("parses a single student record from a clean ProgressBook PDF", async () => {
    mockPdfText(SINGLE_STUDENT_TEXT);
    const rows = await extractRawRows(makePdfBuffer());

    expect(rows).toHaveLength(1);
    expect(rows[0].rawName).toBe("John Doe");
    expect(rows[0].studentRef).toBe("115936");
    // fields: [excused, unexcused, medical, suspension, totalAbs] — TotalHours+Attending skipped
    expect(rows[0].fields).toEqual(["42.00", "0.00", "31.17", "0.00", "42.00"]);
  });

  it("parses multiple students across a simulated page break", async () => {
    mockPdfText(PAGE_SPLIT_TEXT);
    const rows = await extractRawRows(makePdfBuffer());

    expect(rows).toHaveLength(2);
    expect(rows[0].rawName).toBe("John Doe");
    expect(rows[1].rawName).toBe("Jane Smith");
    expect(rows[1].fields[1]).toBe("50.00"); // unexcused
  });

  it("extracts malformed rows (missing decimals) so the validator can flag them", async () => {
    mockPdfText(MALFORMED_DECIMALS_TEXT);
    const rows = await extractRawRows(makePdfBuffer());

    expect(rows).toHaveLength(1);
    expect(rows[0].rawName).toBe("Emma Gonzalez");
    // Raw numbers extracted as-is — validation will catch unreasonable magnitudes
    expect(rows[0].fields[0]).toBe("1800");
  });

  it("throws UnsupportedPdfFormatError when no student records are found", async () => {
    mockPdfText("Yearly Absence Summary 40 or More Hours\nURBANA ELEMENTARY 2024-2025\n");
    await expect(extractRawRows(makePdfBuffer())).rejects.toThrow(UnsupportedPdfFormatError);
  });

  it("silently skips orphaned data rows that have no preceding student header", async () => {
    // A data row that appears before any student header (e.g. page-start artifact)
    mockPdfText([
      "2024-2025    70.00    0.00       5.00          0.00        645.00       575.00     75.00",
      "John Doe  #115936                                          Daily    Consecutive    Monthly    Thresholds",
      "Age: 8                       Calendar: Elementary A                                Grade: 02",
      "HR Teacher: JACOBS, MRS. M.              5 - Resident Attending Full Time            ACTIVE RES - Active % FS - 100",
      "School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.",
      "2024-2025    42.00    0.00       31.17         0.00        628.00       554.83     42.00",
    ].join("\n"));

    const rows = await extractRawRows(makePdfBuffer());
    expect(rows).toHaveLength(1);
    expect(rows[0].rawName).toBe("John Doe");
  });
});

describe("normalizeRow", () => {
  it("normalizes First Last name format from ProgressBook", () => {
    const row: RawAttendanceRow = {
      rawName: "John Doe",
      studentRef: "115936",
      fields: ["42.00", "0.00", "31.17", "0.00", "42.00"],
    };
    const record = normalizeRow(row);
    expect(record).not.toBeNull();
    expect(record!.firstName).toBe("John");
    expect(record!.lastName).toBe("Doe");
    expect(record!.studentRef).toBe("115936");
    expect(record!.excusedHours).toBe(42);
    expect(record!.medicalExcusedHours).toBe(31.17);
    expect(record!.totalAbsHours).toBe(42);
  });

  it("converts empty hour fields to 0", () => {
    const row: RawAttendanceRow = {
      rawName: "Jane Smith",
      fields: ["", "", "", "", ""],
    };
    const record = normalizeRow(row);
    expect(record!.excusedHours).toBe(0);
    expect(record!.totalAbsHours).toBe(0);
  });

  it("returns null for unparseable single-word name", () => {
    const row: RawAttendanceRow = { rawName: "Unknown", fields: ["1.0", "0.0", "0.0", "0.0", "1.0"] };
    expect(normalizeRow(row)).toBeNull();
  });
});

describe("validateRecord", () => {
  const base = {
    firstName: "John",
    lastName: "Doe",
    excusedHours: 42,
    unexcusedHours: 0,
    medicalExcusedHours: 31.17,
    suspensionHours: 0,
    totalAbsHours: 42,
  };

  it("returns null for a valid record", () => {
    expect(validateRecord(base)).toBeNull();
  });

  it("flags negative hour values", () => {
    expect(validateRecord({ ...base, excusedHours: -1 })).toMatch(/negative/);
  });

  it("flags non-numeric hour values", () => {
    expect(validateRecord({ ...base, excusedHours: NaN })).toMatch(/not a number/);
  });
});

describe("processRows", () => {
  it("separates valid and invalid rows", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "John Doe", studentRef: "115936", fields: ["42.00", "0.00", "31.17", "0.00", "42.00"] },
      { rawName: "GarbageRow", fields: ["0.00", "0.00", "0.00", "0.00", "0.00"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(1);
    expect(result.invalidRecords).toHaveLength(1);
  });

  it("flags rows with non-numeric hour values as invalid", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "Jane Smith", fields: ["N/A", "0.00", "0.00", "0.00", "0.00"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(0);
    expect(result.invalidRecords[0].reason).toMatch(/not a number/);
  });

  it("flags rows with PDF-malformed hour values (missing decimal points) as invalid", () => {
    // Simulates the page-split rendering bug: "1800" instead of "18.00"
    const rows: RawAttendanceRow[] = [
      { rawName: "Emma Gonzalez", studentRef: "123578", fields: ["1800", "4200", "400", "000", "6000"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(0);
    expect(result.invalidRecords[0].reason).toMatch(/exceeds maximum plausible hours/);
  });

  it("returns all valid for well-formed records", () => {
    const rows: RawAttendanceRow[] = [
      { rawName: "John Doe", studentRef: "115936", fields: ["42.00", "0.00", "31.17", "0.00", "42.00"] },
      { rawName: "Jane Smith", studentRef: "116157", fields: ["6.00", "50.00", "0.00", "0.00", "56.00"] },
    ];
    const result = processRows(rows);
    expect(result.validRecords).toHaveLength(2);
    expect(result.invalidRecords).toHaveLength(0);
  });
});
