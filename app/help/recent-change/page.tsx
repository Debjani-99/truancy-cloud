import Link from "next/link";

type RecentChangeHelpPageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function RecentChangeHelpPage({
  searchParams,
}: RecentChangeHelpPageProps) {
  const { studentId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href={studentId ? `/students/${studentId}` : "/review"}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          ← Back to Student Dashboard
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Recent Change
          </h1>
          <p className="text-slate-600">
            Understand how a student’s attendance has changed between the two most recent reports.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            What is this section?
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            The <strong>Recent Change</strong> section compares the latest attendance snapshot with the previous one.
            It helps you quickly understand whether a student’s attendance is improving, worsening, or staying the same.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            What is being compared?
          </h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Absence Percentage</p>
            <p className="text-sm text-slate-600">
              Shows how much of the student’s time is unexcused absence.
            </p>
            <div className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
              Absence % = Unexcused Hours ÷ Total Hours × 100
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Added Hours</p>
            <p className="text-sm text-slate-600">
              Shows how many additional absence hours were added since the previous report.
            </p>
            <div className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
              Added Hours = Current Total Abs Hours − Previous Total Abs Hours
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            How to interpret the results
          </h2>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🔺 <strong>Increase:</strong> The student’s attendance is getting worse.</li>
            <li>🔻 <strong>Decrease:</strong> The student’s attendance is improving.</li>
            <li>➖ <strong>No Change:</strong> The student’s attendance is stable between reports.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            Why this matters
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            This section helps reviewers quickly assess whether a student is trending toward higher risk,
            improving, or remaining stable — without needing to analyze the full attendance history.
          </p>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-yellow-900">
            Important Note
          </h2>
          <p className="text-sm leading-6 text-yellow-800">
            Each report represents a <strong>cumulative snapshot</strong> of attendance for the school year.
            Changes reflect differences between reports, not daily attendance updates.
          </p>
        </section>
      </div>
    </div>
  );
}