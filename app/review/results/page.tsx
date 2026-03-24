"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
            onClick={() => router.back()}
            className="mt-4 rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

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

          <button
            onClick={() => router.back()}
            className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border">
          {records.length === 0 ? (
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
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {r.studentRef ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {`${r.firstName} ${r.lastName}`.trim() || "-"}
                    </td>
                    <td className="px-4 py-3 3 text-gray-900">{r.excusedHours}</td>
                    <td className="px-4 py-3 3 text-gray-900">{r.unexcusedHours}</td>
                    <td className="px-4 py-3 3 text-gray-900">{r.medicalExcusedHours}</td>
                    <td className="px-4 py-3 3 text-gray-900">{r.suspensionHours}</td>
                    <td className="px-4 py-3 3 text-gray-900">{r.addedHours}</td>
                    <td className="px-4 py-3 3 text-gray-900 font-semibold">
                      {r.totalAbsHours}
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