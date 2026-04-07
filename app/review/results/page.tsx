"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Badge, riskVariant } from "@/app/components/ui/badge";

type ResultRow = {
  id: number;
  studentId: number;
  studentRef: string | null;
  firstName: string;
  lastName: string;
  excusedHours: number;
  unexcusedHours: number;
  medicalExcusedHours: number;
  suspensionHours: number;
  addedHours: number;
  totalAbsHours: number;
  totalHours: number;
  truancyPercent: number;
  flag: "Normal" | "At Watch" | "Court Warning" | "At Risk";
};

type ReportInfo = {
  id: number;
  uploadId: string;
  schoolId: string;
  schoolYear: string;
  createdAt: string;
};

const THRESHOLDS = [
  { label: "All", value: "0" },
  { label: "5%+", value: "5" },
  { label: "7%+", value: "7" },
  { label: "8%+", value: "8" },
  { label: "10%+", value: "10" },
];

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 py-10">
          <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-600">Loading results...</p>
          </div>
        </main>
      }
    >
      <ResultsInner />
    </Suspense>
  );
}

function ResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");

  const [report, setReport] = useState<ReportInfo | null>(null);
  const [records, setRecords] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Live filters — no "Apply" button needed
  const [threshold, setThreshold] = useState("7");
  const [sortBy, setSortBy] = useState("truancy-desc");

  useEffect(() => {
    const loadResults = async () => {
      if (!uploadId) {
        setError("Missing upload ID.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/uploads/${uploadId}/results`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? "Failed to load results.");
          return;
        }
        setReport(data.report ?? null);
        setRecords(data.records ?? []);
      } catch {
        setError("Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [uploadId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">
          <p className="text-sm text-gray-600">Loading results...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/review")}
          >
            ← Back
          </Button>
        </div>
      </main>
    );
  }

  const displayRecords = [...records]
    .filter((r) => {
      const t = Number(threshold);
      return t === 0 || (r.truancyPercent ?? 0) >= t;
    })
    .sort((a, b) => {
      if (sortBy === "truancy-desc") return (b.truancyPercent ?? 0) - (a.truancyPercent ?? 0);
      if (sortBy === "truancy-asc") return (a.truancyPercent ?? 0) - (b.truancyPercent ?? 0);
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      if (sortBy === "name-asc") return nameA.localeCompare(nameB);
      if (sortBy === "name-desc") return nameB.localeCompare(nameA);
      return 0;
    });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Results</h1>
            {report && (
              <p className="mt-1 text-sm text-gray-500">
                School Year: <span className="font-medium text-gray-700">{report.schoolYear}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/review/results/help")}
            >
              How to interpret results
            </Button>

            {report?.schoolId && (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push(`/students?schoolId=${report.schoolId}`)}
              >
                View All Students
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(report?.schoolId ? `/review?schoolId=${report.schoolId}` : "/review")}
            >
              ← Back
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          {/* Threshold chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Min absence %</span>
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
              {THRESHOLDS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setThreshold(t.value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    threshold === t.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="truancy-desc">Absence % ↓</option>
              <option value="truancy-asc">Absence % ↑</option>
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
            </select>
          </div>

          {/* Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setThreshold("7"); setSortBy("truancy-desc"); }}
            className="ml-auto"
          >
            Reset
          </Button>

          {/* Count */}
          <span className="text-xs text-gray-500">
            {displayRecords.length} student{displayRecords.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border">
          {displayRecords.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No students match the current filter.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Student ID</th>
                  <th className="px-4 py-3 font-medium">Unexcused Hrs</th>
                  <th className="px-4 py-3 font-medium">Absence %</th>
                  <th className="px-4 py-3 font-medium">Risk Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {`${r.firstName} ${r.lastName}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.studentRef ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.unexcusedHours.toFixed(1)}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className={
                        r.flag === "At Risk" ? "text-red-700"
                        : r.flag === "Court Warning" ? "text-orange-600"
                        : r.flag === "At Watch" ? "text-yellow-700"
                        : "text-emerald-700"
                      }>
                        {(r.truancyPercent ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={riskVariant(r.flag)}>{r.flag}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/students/${r.studentId}?from=results&uploadId=${uploadId}&schoolId=${report?.schoolId ?? ""}`}
                        >
                          Detail
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
