"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [threshold, setThreshold] = useState("7");
  const [sortBy, setSortBy] = useState("truancy-desc");
  const [appliedThreshold, setAppliedThreshold] = useState("7");
  const [appliedSortBy, setAppliedSortBy] = useState("truancy-desc");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  useEffect(() => {
    const loadResults = async () => {
      if (!uploadId) {
        setError("Missing upload ID.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/uploads/${uploadId}/results`, {
          cache: "no-store",
        });

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

          <button
            onClick={() => router.push("/review")}
            className="mt-4 rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  const displayRecords = [...records]
  .filter((r) => {
    const selectedThreshold = Number(appliedThreshold);
    if (selectedThreshold === 0) return true;
    return (r.truancyPercent ?? 0) >= selectedThreshold;
  })
  .sort((a, b) => {
    if (appliedSortBy === "truancy-desc") {
      return (b.truancyPercent ?? 0) - (a.truancyPercent ?? 0);
    }

    if (appliedSortBy === "truancy-asc") {
      return (a.truancyPercent ?? 0) - (b.truancyPercent ?? 0);
    }

    const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();

    if (appliedSortBy === "name-asc") {
      return nameA.localeCompare(nameB);
    }

    if (appliedSortBy === "name-desc") {
      return nameB.localeCompare(nameA);
    }

    return 0;
  });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Results</h1>
            <p className="mt-1 text-sm text-gray-600">
              Current attendance table for this school and school year
            </p>

            {report && (
              <div className="mt-4 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold">School Year:</span>{" "}
                  {report.schoolYear}
                </p>
                <p>
                  <span className="font-semibold">Upload ID:</span>{" "}
                  {report.uploadId}
                </p>
              </div>
            )}
          </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/review/results/help")}
            className="rounded-md border bg-blue-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-200"
          >
            ℹ️ How to Interpret Results
          </button>

          <button
            onClick={() => router.back()}
            className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border bg-gray-50 p-4">
          <div className="flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">Threshold</label>
        <select
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="0">All</option>
          <option value="5">5%+</option>
          <option value="7">7%+</option>
          <option value="8">8%+</option>
          <option value="10">10%+</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="mb-1 text-sm font-medium text-gray-700">Sort By</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="truancy-desc">Absence % (High to Low)</option>
          <option value="truancy-asc">Absence % (Low to High)</option>
          <option value="name-asc">Name (A to Z)</option>
          <option value="name-desc">Name (Z to A)</option>
        </select>
      </div>

      <div className="ml-auto flex items-end gap-2 self-end">
        <button
          onClick={() => {
            setAppliedStartDate(startDate);
            setAppliedEndDate(endDate);
            setAppliedThreshold(threshold);
            setAppliedSortBy(sortBy);
          }}
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-200"
        >
          Apply Changes
        </button>

        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setThreshold("7");
            setSortBy("truancy-desc");

            setAppliedStartDate("");
            setAppliedEndDate("");
            setAppliedThreshold("7");
            setAppliedSortBy("truancy-desc");
          }}
          className="rounded-md border border-gray-300 bg-red-400 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-200"
        >
          Reset
        </button>
      </div>
        </div>

      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <p>
          {displayRecords.length} students
        </p>

        <p>
          Showing{" "}
          {appliedThreshold === "0"
            ? "all students"
            : `≥ ${appliedThreshold}% truancy`}{" "}
          • Sorted by{" "}
          {appliedSortBy === "truancy-desc"
            ? "Absence % (High to Low)"
            : appliedSortBy === "truancy-asc"
            ? "Absence % (Low to High)"
            : appliedSortBy === "name-asc"
            ? "Name (A → Z)"
            : "Name (Z → A)"}
        </p>
      </div>

        

        <div className="mt-8 overflow-x-auto rounded-lg border">
          {displayRecords.length === 0 ? (
            <div className="p-4 text-sm text-gray-600">
              No attendance records found.
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Student Ref</th>
                  <th className="px-4 py-3 font-medium">Student Name</th>
                  <th className="px-4 py-3 font-medium">Excused</th>
                  <th className="px-4 py-3 font-medium">Unexcused</th>
                  <th className="px-4 py-3 font-medium">Medical</th>
                  <th className="px-4 py-3 font-medium">Suspension</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium">Total Abs</th>
                  <th className="px-4 py-3 font-medium">Total Hours</th>
                  <th className="px-4 py-3 font-medium">Absence %</th>
                  <th className="px-4 py-3 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{r.studentRef ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${r.studentId}`}
                        className="text-blue-500 font-medium hover:underline"
                      >
                        {`${r.firstName} ${r.lastName}`.trim() || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.excusedHours}</td>
                    <td className="px-4 py-3 text-gray-900">{r.unexcusedHours}</td>
                    <td className="px-4 py-3 text-gray-900">{r.medicalExcusedHours}</td>
                    <td className="px-4 py-3 text-gray-900">{r.suspensionHours}</td>
                    <td className="px-4 py-3 text-gray-900">{r.addedHours}</td>
                    <td className="px-4 py-3 text-gray-900 ">{r.totalAbsHours}</td>
                    <td className="px-4 py-3 text-gray-900 ">{r.totalHours}</td>
                    <td
                        className={`px-4 py-3 font-medium ${
                          r.flag === "At Risk"
                            ? "text-red-800"
                            : r.flag === "Court Warning"
                            ? "text-red-700"
                            : r.flag === "At Watch"
                            ? "text-yellow-700"
                            : "text-green-700"
                        }`}
                      >
                        {(r.truancyPercent ?? 0).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.flag === "At Risk"
                            ? "bg-red-200 text-red-800"
                            : r.flag === "Court Warning"
                            ? "bg-red-100 text-red-700"
                            : r.flag === "At Watch"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.flag ?? "Normal"}
                      </span>
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