"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type RiskLabel = "Normal" | "At Watch" | "Court Warning" | "At Risk" | "All";

type StudentRow = {
  id: number;
  firstName: string;
  lastName: string;
  studentRef: string | null;
  schoolId: string;
  schoolName: string;
  countyName: string;
  schoolYear: string | null;
  unexcusedHours: number;
  totalHours: number;
  truancyPercent: number;
  riskLabel: "Normal" | "At Watch" | "Court Warning" | "At Risk";
};

const RISK_BADGE: Record<StudentRow["riskLabel"], string> = {
  Normal: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "At Watch": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Court Warning": "bg-orange-50 text-orange-700 border-orange-200",
  "At Risk": "bg-red-50 text-red-700 border-red-200",
};

export default function StudentsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 px-4 py-10">
          <div className="mx-auto max-w-7xl rounded-xl border bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-600">Loading students...</p>
          </div>
        </main>
      }
    >
      <StudentsInner />
    </Suspense>
  );
}

function StudentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId");

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLabel>("All");
  const [nameSearch, setNameSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = schoolId
          ? `/api/students?schoolId=${encodeURIComponent(schoolId)}`
          : "/api/students";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Failed to load students.");
          return;
        }
        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [schoolId]);

  const schoolName =
    students.length > 0 ? students[0].schoolName : "Unknown School";
  const countyName =
    students.length > 0 ? students[0].countyName : "";

  const displayed = students.filter((s) => {
    if (riskFilter !== "All" && s.riskLabel !== riskFilter) return false;
    if (nameSearch) {
      const q = nameSearch.toLowerCase();
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      if (!full.includes(q) && !(s.studentRef ?? "").toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-1 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Student List</h1>
            <p className="text-sm text-gray-500">
              {schoolId ? `${schoolName} — ${countyName} County` : "All Schools"}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Risk Status</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLabel)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Students</option>
              <option value="At Risk">At Risk</option>
              <option value="Court Warning">Court Warning</option>
              <option value="At Watch">At Watch</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Name or student ID…"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p className="ml-auto self-end text-sm text-gray-500">
            {loading ? "Loading…" : `${displayed.length} student${displayed.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">No students match the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Student ID</th>
                  <th className="px-4 py-3 font-medium">School Year</th>
                  <th className="px-4 py-3 font-medium">Unexcused Hrs</th>
                  <th className="px-4 py-3 font-medium">Absence %</th>
                  <th className="px-4 py-3 font-medium">Risk Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {s.lastName}, {s.firstName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.studentRef ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.schoolYear ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{s.unexcusedHours.toFixed(1)}</td>
                    <td className="px-4 py-3 text-gray-700">{s.truancyPercent.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISK_BADGE[s.riskLabel]}`}
                      >
                        {s.riskLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${s.id}?from=students&schoolId=${s.schoolId}`}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
