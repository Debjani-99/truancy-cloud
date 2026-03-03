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
 * Handles both space-separated and concatenated (pdf-parse) output where table
 * cells are joined with no spaces: "John Doe  #115936DailyConsecutive..."
 */
const STUDENT_HEADER_RE = /^(.+?)\s+#(\d{4,})/;

/**
 * Matches a data row starting with a school year range.
 * PDF columns: Excused Unexcused MedicalExc Suspension TotalHours Attending TotalAbs
 * Handles both spaced and concatenated formats.
 */
const DATA_ROW_RE = /^(\d{4}-\d{4})([\d.\s]+)$/;

/**
 * Extracts numeric column values from a data row suffix.
 * Standard PDFs: cells concatenated without spaces ("42.000.0031.17...") –
 *   /\d+\.\d{2}/g reliably splits on two-decimal boundaries.
 * Malformed PDFs: decimal points dropped ("1800 4200 400...") –
 *   falls back to whitespace splitting.
 */
function extractNumbers(s: string): string[] {
  const decimals = s.match(/\d+\.\d{2}/g) ?? [];
  if (decimals.length >= 7) return decimals;
  return s.trim().split(/\s+/).filter(Boolean);
}

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
 * pdf-parse concatenates all pages in reading order and typically joins table
 * cells without whitespace. Orphaned data rows (no preceding student header)
 * are silently skipped.
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
      const nums = extractNumbers(dataMatch[2]);
      if (nums.length >= 7) {
        rows.push({
          rawName: pendingName,
          studentRef: pendingRef,
          schoolYear: dataMatch[1],
          // PDF columns: Excused[0] Unexcused[1] MedExc[2] Suspension[3]
          //              TotalHours[4] Attending[5] TotalAbs[6]
          // Skip TotalHours (index 4) and Attending (index 5).
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
