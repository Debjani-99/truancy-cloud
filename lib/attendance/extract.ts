import pdfParse from "pdf-parse";
import type { RawAttendanceRow } from "./types";

/**
 * Expected PDF text layout (tab- or multi-space-separated columns):
 *
 *   Student Name          ID       Excused  Unexcused  Medical  Suspension  Total
 *   ──────────────────────────────────────────────────────────────────────────────
 *   Smith, John           S001     2.5      1.0        0.5      0.0         4.0
 *   ...
 *   Total                          ...      (summary row – skipped)
 *
 * Rules:
 *  - Lines with fewer than 3 whitespace-separated tokens are headers/footers/blanks.
 *  - Lines starting with "Total", "Summary", "Student", or "─" are skipped.
 *  - The first token is the student name; an optional second token is the student ID
 *    (if it looks like an alphanumeric ref starting with a letter followed by digits).
 *  - Remaining tokens are the hour fields (up to 5).
 */

const SKIP_PREFIXES = ["total", "summary", "student", "─", "-", "=", "#"];

function isSkippedLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return (
    lower === "" ||
    SKIP_PREFIXES.some((p) => lower.startsWith(p))
  );
}

/** Returns true if token looks like a student reference (e.g. "S001", "A1234"). */
function isStudentRef(token: string): boolean {
  return /^[A-Za-z]\d+$/.test(token);
}

export class UnsupportedPdfFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedPdfFormatError";
  }
}

/**
 * Extracts raw attendance rows from a PDF buffer.
 * Throws UnsupportedPdfFormatError if no data rows can be found.
 */
export async function extractRawRows(
  pdfBuffer: Buffer
): Promise<RawAttendanceRow[]> {
  const data = await pdfParse(pdfBuffer);
  const lines = data.text.split("\n");

  const rows: RawAttendanceRow[] = [];

  for (const line of lines) {
    if (isSkippedLine(line)) continue;

    const tokens = line.trim().split(/\s{2,}|\t/);
    if (tokens.length < 3) continue;

    const rawName = tokens[0].trim();
    let studentRef: string | undefined;
    let fieldStart = 1;

    if (tokens.length > 1 && isStudentRef(tokens[1].trim())) {
      studentRef = tokens[1].trim();
      fieldStart = 2;
    }

    const fields = tokens.slice(fieldStart).map((f) => f.trim());

    rows.push({ rawName, studentRef, fields });
  }

  if (rows.length === 0) {
    throw new UnsupportedPdfFormatError(
      "No attendance data rows found. The PDF format may not be supported."
    );
  }

  return rows;
}
