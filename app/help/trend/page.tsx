import Link from "next/link";

type TrendHelpPageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function TrendHelpPage({
  searchParams,
}: TrendHelpPageProps) {
  const { studentId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={studentId ? `/students/${studentId}` : "/review"}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          ← Back to Student Dashboard
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Absence Trend</h1>
          <p className="text-slate-600">
            Understand how to read the attendance trend chart and what it is showing over time.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            What is this chart?
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            The <strong>Absence Trend</strong> chart shows how a student’s attendance percentage changes across uploaded attendance reports.
            It helps reviewers quickly see whether the student is improving, worsening, or remaining stable over time.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How to read the axes</h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">X-Axis</p>
            <p className="text-sm leading-6 text-slate-600">
              The horizontal axis shows the sequence of attendance snapshots over time. Each point represents one uploaded report.
              These snapshots should be read from left to right, from earlier reports to more recent ones.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Y-Axis</p>
            <p className="text-sm leading-6 text-slate-600">
              The vertical axis shows the student’s <strong>absence percentage</strong>. Higher values mean a larger share of school time is marked as unexcused absence.
            </p>
            <div className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
              Absence % = Unexcused Hours ÷ Total Hours × 100
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">What each part means</h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Each Point</p>
            <p className="text-sm leading-6 text-slate-600">
              Each point represents one attendance snapshot from a processed report. The point’s height shows the absence percentage at that time.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">The Line</p>
            <p className="text-sm leading-6 text-slate-600">
              The line connects all snapshots to show direction over time. An upward line suggests worsening attendance.
              A downward line suggests improvement. A mostly flat line suggests stable attendance.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Latest Point</p>
            <p className="text-sm leading-6 text-slate-600">
              The most recent point represents the student’s current known status based on the latest available report.
              This is the most important point for current review.
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            How the trend is determined
          </h2>

          <p className="text-sm leading-6 text-slate-600">
            The system compares the most recent attendance snapshot with the previous one.
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              If the absence percentage increased, the trend is marked as worsening.
            </li>
            <li>
              If the absence percentage decreased, the trend is marked as improving.
            </li>
            <li>
              If there is little or no change, the trend is marked as stable.
            </li>
          </ul>

          <p className="text-sm leading-6 text-slate-600">
            This comparison helps quickly identify whether a student's attendance is getting better or worse over time.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How to interpret the trend</h2>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🔺 <strong>Upward trend:</strong> Attendance is getting worse over time.</li>
            <li>🔻 <strong>Downward trend:</strong> Attendance is improving over time.</li>
            <li>➖ <strong>Flat trend:</strong> Attendance is relatively stable.</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Risk thresholds</h2>
          <p className="text-sm leading-6 text-slate-600">
            The chart is most useful when interpreted together with attendance thresholds. As the line moves higher,
            it may cross into more serious review ranges.
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🟢 <strong>Normal:</strong> Less than 5%</li>
            <li>🟡 <strong>At Watch:</strong> 5% to less than 7%</li>
            <li>🟠 <strong>Court Warning:</strong> 7% to less than 10%</li>
            <li>🔴 <strong>At Risk:</strong> 10% or higher</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Example</h2>
          <p className="text-sm leading-6 text-slate-600">
            If the chart shows points at 2%, 4%, 6%, and 9%, the student is trending upward over time.
            This means attendance is worsening and the student may have moved from a normal range into a warning range.
          </p>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-yellow-900">Important Note</h2>
          <p className="text-sm leading-6 text-yellow-800">
            Each report represents a <strong>cumulative snapshot</strong> for the school year.
            The chart does not show daily attendance. It shows how cumulative attendance values change from one report to the next.
          </p>
        </section>
      </div>
    </div>
  );
}