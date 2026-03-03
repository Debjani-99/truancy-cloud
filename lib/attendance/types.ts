/** A single raw row as parsed from the PDF text, before normalization. */
export interface RawAttendanceRow {
  rawName: string;
  studentRef?: string;
  /** School year extracted from the data row, e.g. "2024-2025". */
  schoolYear?: string;
  /** Raw string values for each hour column in order:
   *  [excused, unexcused, medical, suspension, total] */
  fields: string[];
}

/** A normalized, validated attendance record ready for DB insertion. */
export interface NormalizedRecord {
  studentRef?: string;
  firstName: string;
  lastName: string;
  excusedHours: number;
  unexcusedHours: number;
  medicalExcusedHours: number;
  suspensionHours: number;
  totalAbsHours: number;
}

/** Output of the validation pass over a set of raw rows. */
export interface ValidationResult {
  validRecords: NormalizedRecord[];
  invalidRecords: { row: RawAttendanceRow; reason: string }[];
}
