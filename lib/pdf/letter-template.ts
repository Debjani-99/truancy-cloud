/**
 * Truancy notice letter template.
 *
 * PLACEHOLDER — replace body paragraphs below with the final language provided
 * by law students once received. All other fields (header, attendance table,
 * parent portal section) are populated dynamically.
 */

export interface LetterData {
  studentFirstName: string;
  studentLastName: string;
  schoolName: string;
  countyName: string;
  schoolYear: string;
  unexcusedHours: number;
  totalHours: number;
  truancyPercent: number;
  riskLabel: string;
  generatedDate: string;
  /** Populated by Henry after Thursday sync — leave empty string until then. */
  parentPortalInstructions: string;
}

/**
 * Returns the letter body as an array of paragraph strings.
 * Each string is rendered as a separate paragraph in the PDF.
 */
export function buildLetterParagraphs(data: LetterData): string[] {
  return [
    `Dear Parent/Guardian of ${data.studentFirstName} ${data.studentLastName},`,

    // ── PLACEHOLDER ─────────────────────────────────────────────────────────
    // TODO: Replace with law-student-provided language once forwarded.
    // The paragraphs below are temporary placeholders only.
    `This letter is to notify you that ${data.studentFirstName} ${data.studentLastName}, ` +
      `a student at ${data.schoolName} in ${data.countyName} County, has accumulated ` +
      `${data.unexcusedHours.toFixed(1)} unexcused absence hours during the ` +
      `${data.schoolYear} school year. ` +
      `This represents approximately ${data.truancyPercent.toFixed(1)}% of total ` +
      `instructional hours and has been flagged as "${data.riskLabel}."`,

    `Under Ohio law (O.R.C. § 3321.19), a student who accumulates excessive unexcused ` +
      `absences may be referred to the Champaign County Juvenile Court for further review. ` +
      `[PLACEHOLDER — law students: add specific statutory thresholds and legal citations here.]`,

    `You are encouraged to contact ${data.schoolName} immediately to discuss your ` +
      `child's attendance record and to provide documentation for any absences that ` +
      `may qualify as excused. Failure to address this matter may result in a formal ` +
      `referral to the court. [PLACEHOLDER — law students: add required next-steps, ` +
      `deadlines, and contact information here.]`,

    `Please review the attached attendance summary and contact the school or court if ` +
      `you have any questions or wish to dispute any of the recorded absences.`,

    `Sincerely,\n${data.countyName} County Juvenile Court\nTruancy Intervention Program`,
  ];
}
