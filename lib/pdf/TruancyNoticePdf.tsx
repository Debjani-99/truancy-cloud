import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { buildLetterParagraphs, type LetterData } from "./letter-template";

export type AttendanceRow = {
  schoolYear: string;
  excusedHours: number;
  unexcusedHours: number;
  medicalExcusedHours: number;
  suspensionHours: number;
  totalAbsHours: number;
  totalHours: number;
  truancyPercent: number;
  riskLabel: string;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    color: "#1a1a1a",
    lineHeight: 1.5,
  },
  // ── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  courtName: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  dateText: {
    fontSize: 10,
    color: "#555",
  },
  subheader: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginVertical: 12,
  },
  // ── Subject line ────────────────────────────────────────────────────────
  subjectLine: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
  },
  // ── Body paragraphs ─────────────────────────────────────────────────────
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
  },
  // ── Attendance table ────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    flex: 1,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
    textAlign: "center",
    color: "#374151",
  },
  riskNormal: { color: "#059669" },
  riskWatch: { color: "#d97706" },
  riskWarning: { color: "#ea580c" },
  riskAtRisk: { color: "#dc2626" },
  // ── Parent portal section ────────────────────────────────────────────────
  portalBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#eff6ff",
  },
  portalTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: "#1e40af",
  },
  portalText: {
    fontSize: 9,
    color: "#1e3a8a",
    lineHeight: 1.5,
  },
  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  placeholder: {
    color: "#dc2626",
    fontFamily: "Helvetica-Oblique",
  },
});

function riskStyle(label: string) {
  if (label === "At Risk") return styles.riskAtRisk;
  if (label === "Court Warning") return styles.riskWarning;
  if (label === "At Watch") return styles.riskWatch;
  return styles.riskNormal;
}

interface Props {
  letterData: LetterData;
  attendanceRows: AttendanceRow[];
}

export function TruancyNoticePdf({ letterData, attendanceRows }: Props) {
  const paragraphs = buildLetterParagraphs(letterData);
  const hasPortal = !!letterData.parentPortalInstructions;

  return (
    <Document
      title={`Truancy Notice — ${letterData.studentLastName}, ${letterData.studentFirstName}`}
      author={`${letterData.countyName} County Juvenile Court`}
    >
      <Page size="LETTER" style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.courtName}>
              {letterData.countyName} County Juvenile Court
            </Text>
            <Text style={styles.subheader}>Truancy Intervention Program</Text>
          </View>
          <Text style={styles.dateText}>Date: {letterData.generatedDate}</Text>
        </View>

        <View style={styles.divider} />

        {/* ── RE: subject ── */}
        <Text style={styles.subjectLine}>
          RE: Truancy Notice — {letterData.studentLastName},{" "}
          {letterData.studentFirstName} | {letterData.schoolName} |{" "}
          {letterData.schoolYear}
        </Text>

        {/* ── Letter body ── */}
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}

        {/* ── Attendance summary table ── */}
        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>School Year</Text>
            <Text style={styles.tableHeaderCell}>Excused Hrs</Text>
            <Text style={styles.tableHeaderCell}>Unexcused Hrs</Text>
            <Text style={styles.tableHeaderCell}>Medical Hrs</Text>
            <Text style={styles.tableHeaderCell}>Suspension Hrs</Text>
            <Text style={styles.tableHeaderCell}>Total Abs Hrs</Text>
            <Text style={styles.tableHeaderCell}>Total Hrs</Text>
            <Text style={styles.tableHeaderCell}>Absence %</Text>
            <Text style={styles.tableHeaderCell}>Status</Text>
          </View>

          {attendanceRows.map((row, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.tableCell}>{row.schoolYear}</Text>
              <Text style={styles.tableCell}>
                {row.excusedHours.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {row.unexcusedHours.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {row.medicalExcusedHours.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {row.suspensionHours.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>
                {row.totalAbsHours.toFixed(1)}
              </Text>
              <Text style={styles.tableCell}>{row.totalHours.toFixed(1)}</Text>
              <Text style={styles.tableCell}>
                {row.truancyPercent.toFixed(1)}%
              </Text>
              <Text style={[styles.tableCell, riskStyle(row.riskLabel)]}>
                {row.riskLabel}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Parent portal section ── */}
        <View style={styles.portalBox}>
          <Text style={styles.portalTitle}>Parent Portal Access</Text>
          {hasPortal ? (
            <Text style={styles.portalText}>
              {letterData.parentPortalInstructions}
            </Text>
          ) : (
            <Text style={[styles.portalText, styles.placeholder]}>
              Parent portal access instructions will be provided separately by
              the court. Please contact your school or the Champaign County
              Juvenile Court office if you have not received your account
              information.
            </Text>
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {letterData.countyName} County Juvenile Court — Confidential
          </Text>
          <Text style={styles.footerText}>
            Student: {letterData.studentLastName},{" "}
            {letterData.studentFirstName} | Generated: {letterData.generatedDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
