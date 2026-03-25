import type { RawAttendanceRow, NormalizedRecord, ValidationResult } from "./types";

/** Parses a string to a non-negative float; returns 0 for empty/missing. */
function parseHours(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return 0;
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

/** Title-cases a name: "JOHN SMITH" → "John Smith". */
function toTitleCase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Splits a raw name into firstName / lastName.
 * Handles two formats:
 *   "Last, First"  →  firstName: "First", lastName: "Last"
 *   "First Last"   →  firstName: "First", lastName: "Last"
 */
function splitName(rawName: string): { firstName: string; lastName: string } | null {
  const name = toTitleCase(rawName);
  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    const first = rest.join(" ").trim();
    if (last.trim() && first) return { firstName: first, lastName: last.trim() };
  } else {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, -1).join(" ");
      return { firstName, lastName };
    }
  }
  return null;
}

/**
 * Normalizes a single raw row into a NormalizedRecord.
 * Returns null if the row cannot be normalized (no valid name).
 */
export function normalizeRow(
  row: RawAttendanceRow
): NormalizedRecord | null {
  const nameParts = splitName(row.rawName);
  if (!nameParts) return null;

  return {
    studentRef: row.studentRef,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    excusedHours: parseHours(row.fields[0]) ?? NaN,
    unexcusedHours: parseHours(row.fields[1]) ?? NaN,
    medicalExcusedHours: parseHours(row.fields[2]) ?? NaN,
    suspensionHours: parseHours(row.fields[3]) ?? NaN,
    totalHours: parseHours(row.fields[4]) ?? NaN,
    totalAbsHours: parseHours(row.fields[4]) ?? NaN,
  };
}

/**
 * Validates a normalized record.
 * Returns a reason string if invalid, or null if valid.
 */
export function validateRecord(record: NormalizedRecord): string | null {
  if (!record.firstName.trim() || !record.lastName.trim()) {
    return "Missing student name";
  }

  const hourFields: Array<[keyof NormalizedRecord, string]> = [
    ["excusedHours", "excusedHours"],
    ["unexcusedHours", "unexcusedHours"],
    ["medicalExcusedHours", "medicalExcusedHours"],
    ["suspensionHours", "suspensionHours"],
    ["totalHours", "totalHours"],
    ["totalAbsHours", "totalAbsHours"],
  ];

  for (const [key, label] of hourFields) {
    const val = record[key] as number;
    if (typeof val !== "number" || isNaN(val)) {
      return `${label} is not a number`;
    }
    if (val < 0) {
      return `${label} cannot be negative`;
    }
    // A school year is typically 600–700 hours; any single value above 999 is
    // almost certainly a PDF rendering artifact (decimal point dropped across a
    // page break, e.g. "1800" instead of "18.00").
    if (val > 999) {
      return `${label} value ${val} exceeds maximum plausible hours — possible PDF rendering issue (missing decimal point)`;
    }
  }

  return null;
}

/**
 * Processes an array of raw rows into validated and invalid record sets.
 */
export function processRows(rows: RawAttendanceRow[]): ValidationResult {
  const validRecords: NormalizedRecord[] = [];
  const invalidRecords: { row: RawAttendanceRow; reason: string }[] = [];

  for (const row of rows) {
    const normalized = normalizeRow(row);

    if (!normalized) {
      invalidRecords.push({ row, reason: "Could not parse student name" });
      continue;
    }

    const reason = validateRecord(normalized);
    if (reason) {
      invalidRecords.push({ row, reason });
    } else {
      validRecords.push(normalized);
    }
  }

  return { validRecords, invalidRecords };
}
