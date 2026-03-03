import pdfParse from "pdf-parse";
import type { RawAttendanceRow } from "./types";

export class UnsupportedPdfFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedPdfFormatError";
  }
}

/**
 * Matches the student header line in ProgressBook Yearly Absence Summary PDFs.
 * Format: "First Last #NNNNNN Daily Consecutive Monthly Thresholds"
 * The #ID (4+ digits) is the student reference number.
 */
const STUDENT_HEADER_RE = /^(.+?)\s+#(\d{4,})\b/;

/**
 * Matches a data row starting with a school year.
 * Format: "YYYY-YYYY N N N N N N N"
 * PDF columns: Excused[0] Unexcused[1] MedicalExc[2] Suspension[3] TotalHours[4] Attending[5] TotalAbs[6]
 * We extract indices 0,1,2,3,6 and skip 4 (TotalHours) and 5 (Attending).
 */
const DATA_ROW_RE = /^(\d{4}-\d{4})\s+(.+)$/;

/**
 * Extracts raw attendance rows from a ProgressBook "Yearly Absence Summary" PDF.
 *
 * Each student block in the PDF has the form:
 *   First Last #ID   Daily  Consecutive  Monthly  Thresholds
 *   Age: X   Calendar: ...   Grade: XX
 *   HR Teacher: ...
 *   School Year  Excused  Unexcused  Medical Exc.  Suspension  Total Hours  Attending  Total Abs.
 *   YYYY-YYYY    N        N          N             N           N            N          N
 *
 * Page-split behaviour: pdf-parse concatenates all pages in reading order so a student
 * header at the bottom of page N and its data row at the top of page N+1 will still be
 * processed in sequence. Rows whose table cells are cut across a page boundary may have
 * missing decimal points (e.g. "1800" instead of "18.00"); these pass through extraction
 * and are caught by the max-hours validator in normalize.ts.
 *
 * Orphaned data rows (no preceding student header in the text stream) are silently skipped.
 */
export async function extractRawRows(pdfBuffer: Buffer): Promise<RawAttendanceRow[]> {
  const { text } = await pdfParse(pdfBuffer);
  const rows: RawAttendanceRow[] = [];

  let pendingName: string | undefined;
  let pendingRef: string | undefined;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    // Student header: sets context for the data row that follows
    const studentMatch = STUDENT_HEADER_RE.exec(line);
    if (studentMatch) {
      pendingName = studentMatch[1].trim();
      pendingRef = studentMatch[2];
      continue;
    }

    // Data row: associate with the most recently seen student header
    const dataMatch = DATA_ROW_RE.exec(line);
    if (dataMatch && pendingName) {
      const nums = dataMatch[2].trim().split(/\s+/);
      if (nums.length >= 7) {
        rows.push({
          rawName: pendingName,
          studentRef: pendingRef,
          fields: [nums[0], nums[1], nums[2], nums[3], nums[6]],
        });
        pendingName = undefined;
        pendingRef = undefined;
      }
    }
  }

  if (rows.length === 0) {
    throw new UnsupportedPdfFormatError(
      "No attendance records found. Ensure this is a ProgressBook Yearly Absence Summary PDF."
    );
  }

  return rows;
}
