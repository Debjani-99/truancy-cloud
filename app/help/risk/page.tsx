import Link from "next/link";

type RiskHelpPageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function RiskHelpPage({
  searchParams,
}: RiskHelpPageProps) {
  const { studentId } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back Button */}
        <Link
          href={studentId ? `/students/${studentId}` : "/review"}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
        >
          ← Back to Student Dashboard
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Risk Message
          </h1>
          <p className="text-slate-600">
            Understand how student attendance risk is determined and what the system is telling you.
          </p>
        </div>

        {/* What is this */}
        <section className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            What is this section?
          </h2>
          <p className="text-sm text-slate-600 leading-6">
            The <strong>Risk Message</strong> provides a simple explanation of a student’s current attendance risk
            and whether their situation is improving, worsening, or stable.
          </p>
        </section>

        {/* How risk is calculated */}
        <section className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            How is risk calculated?
          </h2>

          <p className="text-sm text-slate-600">
            Risk is based on the student’s <strong>absence percentage</strong>, calculated using:
          </p>

          <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm font-mono text-slate-800">
            Absence % = Unexcused Hours ÷ Total Hours × 100
          </div>

          <p className="text-sm text-slate-600">
            The system compares this value against defined thresholds to determine risk level.
          </p>
        </section>

        {/* Thresholds */}
        <section className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Risk Levels
          </h2>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🟢 <strong>Normal:</strong> Less than 5%</li>
            <li>🟡 <strong>At Watch:</strong> 5% – 7%</li>
            <li>🟠 <strong>Court Warning:</strong> 7% – 10%</li>
            <li>🔴 <strong>At Risk:</strong> 10% or higher</li>
          </ul>
        </section>

        {/* Trend logic */}
        <section className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            How trend is determined
          </h2>

          <p className="text-sm text-slate-600">
            The system compares the latest report with the previous one:
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🔺 Increasing → risk is getting worse</li>
            <li>🔻 Decreasing → attendance is improving</li>
            <li>➖ No change → attendance is stable</li>
          </ul>
        </section>

        {/* Example */}
        <section className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Example
          </h2>
          <p className="text-sm text-slate-600 leading-6">
            If a student’s absence percentage increases from 6% to 9%, the system will identify
            this as increasing risk and may move the student from <strong>At Watch</strong> to
            <strong> Court Warning</strong>.
          </p>
        </section>

        {/* Important note */}
        <section className="rounded-2xl bg-yellow-50 p-5 border border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Important Note
          </h2>
          <p className="text-sm text-yellow-800 leading-6">
            Each report represents a <strong>cumulative snapshot</strong> of attendance for the school year.
            Risk is based on total values at that point in time, not daily attendance.
          </p>
        </section>

      </div>
    </div>
  );
}