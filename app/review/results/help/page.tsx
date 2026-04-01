"use client";

import { useRouter } from "next/navigation";

export default function HelpPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-8 shadow-sm">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            How to Interpret Results
          </h1>

          <button
            onClick={() => router.back()}
            className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {/* Section 1 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            What This Page Shows
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            This page displays student attendance results from the processed
            attendance report for the selected school year. Each row represents
            a student and their current cumulative attendance totals.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Truancy Calculation
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Truancy percentage is calculated using unexcused hours compared to
            total attendance hours.
          </p>

          <div className="mt-3 rounded-md bg-gray-100 px-4 py-3 text-sm font-mono text-gray-800">
            Truancy % = Unexcused Hours ÷ Total Hours × 100
          </div>
        </section>

        {/* Section 3 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Flag Meanings
          </h2>

          <ul className="mt-3 space-y-3 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              <strong>Normal:</strong> below 5% (no immediate concern)
            </li>

            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" />
              <strong>At Watch:</strong> 5% to less than 7% (monitor student)
            </li>

            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-400" />
              <strong>Court Warning*:</strong> 7% to less than 10% (*Court may consider intervention measures)
            </li>

            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
              <strong>At Risk:</strong> 10% and above (truancy letter triggered)
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Filters and Sorting
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>
              <strong>Threshold:</strong> filters students based on minimum
              truancy percentage (e.g., 7%+ shows higher-risk students only)
            </li>
            <li>
              <strong>Sort By:</strong> changes how results are ordered (by
              truancy or by name)
            </li>
            <li>
              <strong>Date Range:</strong> reserved for future multi-report
              analysis across multiple uploads
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Important Note
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            Each uploaded report represents a cumulative yearly attendance
            snapshot. The system displays the most recent report, which already
            reflects the total attendance and truancy for each student up to
            that point.
          </p>
        </section>
      </div>
    </main>
  );
}