import Link from "next/link";

type RiskHelpPageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function RiskHelpPage({
  searchParams,
}: RiskHelpPageProps) {
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
          <h1 className="text-3xl font-bold text-slate-900">Risk Message</h1>
          <p className="text-slate-600">
            Understand what the current risk message means and how the system determines it.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            What is this section?
          </h2>
          <p className="text-sm leading-6 text-slate-600">
            The <strong>Risk Message</strong> explains the student’s current attendance status
            based on the latest available snapshot. It helps reviewers understand whether the
            student is currently in a normal, watch, warning, or at-risk range.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            How the message is determined
          </h2>

          <p className="text-sm leading-6 text-slate-600">
            The system first calculates the student’s current <strong>absence percentage</strong>
            using the most recent attendance snapshot:
          </p>

          <div className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">
            Absence % = Unexcused Hours ÷ Total Hours × 100
          </div>

          <p className="text-sm leading-6 text-slate-600">
            That value is then compared against the defined risk thresholds. The message shown on
            the dashboard explains what the student’s current range means for review.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Rule-Based Logic
          </h2>

          <p className="text-sm text-slate-600 leading-6">
            The Risk Message is generated using a fixed set of rules based on the student’s
            current absence percentage. These rules ensure consistent and transparent
            interpretation of attendance data.
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              If absence percentage is <strong>10% or higher</strong>, the student is classified as <strong>At Risk</strong>.
            </li>
            <li>
              If absence percentage is between <strong>7% and 10%</strong>, the student is classified as <strong>Court Warning</strong>.
            </li>
            <li>
              If absence percentage is between <strong>5% and 7%</strong>, the student is classified as <strong>At Watch</strong>.
            </li>
            <li>
              If absence percentage is <strong>below 5%</strong>, the student is classified as <strong>Normal</strong>.
            </li>
          </ul>

          <p className="text-sm text-slate-600 leading-6">
            The system then displays a message explaining what this classification means
            for review and monitoring.
          </p>

          <p className="text-sm text-slate-600 leading-6">
            When only one attendance snapshot is available, the message is based solely on
            the current absence percentage. As more snapshots are added, the system may
            provide additional context, but the classification thresholds remain the same.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Risk Levels</h2>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>🟢 <strong>Normal:</strong> Less than 5%</li>
            <li>🟡 <strong>At Watch:</strong> 5% to less than 7%</li>
            <li>🟠 <strong>Court Warning:</strong> 7% to less than 10%</li>
            <li>🔴 <strong>At Risk:</strong> 10% or higher</li>
          </ul>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            What the message is telling you
          </h2>

          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              The message identifies the student’s <strong>current risk range</strong>.
            </li>
            <li>
              It gives a simple interpretation of what that range means for review.
            </li>
            <li>
              It is designed to support quick decision-making without requiring the reviewer to
              interpret all attendance values manually.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Example</h2>
          <p className="text-sm leading-6 text-slate-600">
            If a student’s current absence percentage is 8.5%, the system places the student in
            the <strong> Court Warning </strong>
            range. The risk message will explain that the student is currently in a warning band
            and should be reviewed more closely.
          </p>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-yellow-900">Important Note</h2>
          <p className="text-sm leading-6 text-yellow-800">
            Each report represents a <strong>cumulative snapshot</strong> of attendance for the
            school year. The risk message reflects the student’s current status based on the most
            recent processed snapshot, not daily attendance.
          </p>
        </section>
      </div>
    </div>
  );
}