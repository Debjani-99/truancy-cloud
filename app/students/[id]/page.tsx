import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type StudentPageProps = {
  params: Promise<{ id: string }>;
};

function calculateTruancyPercent(
  unexcusedHours: number | null | undefined,
  totalHours: number | null | undefined,
) {
  const unexcused = unexcusedHours ?? 0;
  const total = totalHours ?? 0;

  if (total <= 0) return 0;
  return Number(((unexcused / total) * 100).toFixed(2));
}

function getRiskStatus(truancyPercent: number) {
  if (truancyPercent >= 10) {
    return {
      label: "At Risk",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      softClass: "border-red-100 bg-red-50/70",
    };
  }

  if (truancyPercent >= 7) {
    return {
      label: "Court Warning",
      badgeClass: "border-orange-200 bg-orange-50 text-orange-700",
      softClass: "border-orange-100 bg-orange-50/70",
    };
  }

  if (truancyPercent >= 5) {
    return {
      label: "At Watch",
      badgeClass: "border-yellow-200 bg-yellow-50 text-yellow-700",
      softClass: "border-yellow-100 bg-yellow-50/70",
    };
  }

  return {
    label: "Normal",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    softClass: "border-emerald-100 bg-emerald-50/70",
  };
}

function formatHours(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Data not available";
  return new Date(value).toLocaleDateString();
}

function getSchoolYearStartYear(schoolYear?: string | null) {
  if (!schoolYear) return 0;
  const match = schoolYear.match(/^(\d{4})/);
  return match ? Number(match[1]) : 0;
}

function getInitials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "ST";
}

type HistoryRow = {
  id: number;
  schoolYear: string;
  excusedHours: number | null;
  unexcusedHours: number | null;
  medicalExcusedHours: number | null;
  suspensionHours: number | null;
  totalAbsHours: number | null;
  totalHours: number | null;
  addedHours: number | null;
  report: {
    createdAt: Date;
    uploadId: string;
  };
};

export default async function StudentDetailPage({ params }: StudentPageProps) {
  const auth = await requireAuth(["ADMIN", "COURT", "SCHOOL"]);
    if (auth.error) {
    redirect("/login");
    }
    
  const session = auth.session;

  const { id } = await params;
  const studentId = Number(id);

  if (Number.isNaN(studentId)) {
    notFound();
  }

  let student = null;

  const studentInclude = {
  school: true,
  records: {
    include: {
      report: true,
    },
  },
  history: {
    include: {
      report: true,
    },
    orderBy: {
      report: {
        createdAt: "asc",
      },
    },
  },
} as const;

  if (session.user.role === "ADMIN") {
    student = await prisma.student.findFirst({
      where: {
        id: studentId,
      },
      include: studentInclude,
    });
  } else if (session.user.role === "COURT") {
    if (!session.user.countyId) {
      notFound();
    }
    student = await prisma.student.findFirst({
      where: {
        id: studentId,
        school: {
          countyId: session.user.countyId,
        },
      },
     include: studentInclude,
    });
  } else if (session.user.role === "SCHOOL") {
    if (!session.user.schoolId) {
      notFound();
    }
    student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: session.user.schoolId,
      },
      include: studentInclude,
    });
  }

  if (!student) {
    notFound();
  }

  const latestRecord =
    student.records.length > 0
      ? [...student.records].sort(
          (a, b) =>
            getSchoolYearStartYear(b.schoolYear) -
            getSchoolYearStartYear(a.schoolYear),
        )[0]
      : null;

  const currentTruancyPercent = calculateTruancyPercent(
    latestRecord?.unexcusedHours,
    latestRecord?.totalHours,
  );

  const currentStatus = getRiskStatus(currentTruancyPercent);
  const history = student.history as HistoryRow[];

  const preparedHistory = [...history].map((row) => {
  const truancyPercent = calculateTruancyPercent(
    row.unexcusedHours,
    row.totalHours,
  );

    return {
      ...row,
      truancyPercent,
      status: getRiskStatus(truancyPercent),
    };
  });

  const latestHistory =
    preparedHistory.length > 0
      ? preparedHistory[preparedHistory.length - 1]
      : null;

  const previousHistory =
    preparedHistory.length > 1
      ? preparedHistory[preparedHistory.length - 2]
      : null;

  const backHref = latestRecord?.report?.uploadId
    ? `/review/results?uploadId=${latestRecord.report.uploadId}`
    : "/review";

  const hasHistory = preparedHistory.length > 0;
  const hasEnoughHistoryForComparison = preparedHistory.length > 1;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top nav */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Student Dashboard
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {student.firstName} {student.lastName}
            </h1>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            ← Back to Results
          </Link>
        </div>

        {/* Top overview area */}
        <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
          {/* Left hero */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-700">
                {getInitials(student.firstName, student.lastName)}
              </div>

              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Attendance summary with detailed metrics, history, and review
                  context.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                label="Student Ref"
                value={student.studentRef || "Data not available"}
              />
              <InfoCard
                label="School"
                value={student.school.name || "Data not available"}
              />
              <InfoCard
                label="Current School Year"
                value={latestRecord?.schoolYear || "Data not available"}
              />
              <InfoCard
                label="Latest Report Date"
                value={formatDate(latestRecord?.report?.createdAt)}
              />
            </div>
          </section>

          {/* Right summary sidebar */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Absence %</p>
              <p className="mt-3 text-5xl font-bold tracking-tight text-slate-900">
                {currentTruancyPercent.toFixed(2)}%
              </p>
              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${currentStatus.badgeClass}`}
                >
                  {currentStatus.label}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Quick Summary
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow
                  label="Unexcused"
                  value={formatHours(latestRecord?.unexcusedHours)}
                />
                <SummaryRow
                  label="Total Abs"
                  value={formatHours(latestRecord?.totalAbsHours)}
                />
                <SummaryRow
                  label="Total Hours"
                  value={formatHours(latestRecord?.totalHours)}
                />
                <SummaryRow label="Snapshots" value={String(preparedHistory.length)} />
              </dl>
            </div>
          </section>
        </section>

        {/* Highlight cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <StatCard
            title="Excused"
            value={formatHours(latestRecord?.excusedHours)}
          />
          <StatCard
            title="Unexcused"
            value={formatHours(latestRecord?.unexcusedHours)}
          />
          <StatCard
            title="Medical"
            value={formatHours(latestRecord?.medicalExcusedHours)}
          />
          <StatCard
            title="Suspension"
            value={formatHours(latestRecord?.suspensionHours)}
          />
          <StatCard
            title="Added"
            value={formatHours(latestRecord?.addedHours)}
          />
          <StatCard
            title="Total Abs"
            value={formatHours(latestRecord?.totalAbsHours)}
          />
          <StatCard
            title="Total Hours"
            value={formatHours(latestRecord?.totalHours)}
          />
          <StatCard
            title="Absence %"
            value={`${currentTruancyPercent.toFixed(2)}%`}
          />
        </section>

        {/* Middle section */}
        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <Panel
            title="Truancy Trend"
            subtitle="Trend chart will use snapshot history when available."
          >
            <EmptyPanel
              message={
                history.length <= 1
                  ? "Not enough snapshot data to show a trend yet."
                  : "Trend chart integration is coming soon."
              }
              tall
            />
          </Panel>

          <div className="space-y-6">
            <Panel
              title="Recent Change"
              subtitle="Compare the latest snapshot with the previous one."
            >
              {!hasEnoughHistoryForComparison ? (
                <EmptyPanel message="No comparison available yet." />
              ) : (
                <RecentChange history={history} />
              )}
            </Panel>

            <Panel
              title="Risk Message"
              subtitle="Simple rule-based guidance for review."
            >
              <RiskMessage
                currentTruancyPercent={currentTruancyPercent}
                history={history}
              />
            </Panel>
          </div>
        </section>

        {/* Detailed history */}
        <Panel
          title="Student History"
          subtitle="One row per uploaded attendance snapshot with detailed attendance data."
        >
          {!hasHistory ? (
            <EmptyPanel message="History data is not available yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Upload Date</th>
                    <th className="px-4 py-3 font-medium">School Year</th>
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
                <tbody className="divide-y divide-slate-100">
                  {preparedHistory.map((row) => {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(row.report.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {row.schoolYear || "Data not available"}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.excusedHours)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatHours(row.unexcusedHours)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.medicalExcusedHours)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.suspensionHours)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.addedHours)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.totalAbsHours)}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {formatHours(row.totalHours)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {row.truancyPercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${row.status.badgeClass}`}
                          >
                            {row.status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Notes at bottom */}
        <Panel
          title="Court Notes"
          subtitle="Internal notes for court review and follow-up."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Add a Note
              </p>

              <textarea
                readOnly
                placeholder="Court users will be able to save internal notes here for later review."
                className="min-h-[180px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />

              <div className="mt-3 flex justify-end">
                <button
                  disabled
                  className="rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Note
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Saved Notes
              </p>
              <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-center text-sm text-slate-500">
                Saved court notes will appear here once note storage is
                connected.
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({
  message,
  tall = false,
}: {
  message: string;
  tall?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500 ${
        tall ? "min-h-[260px]" : "min-h-[160px]"
      }`}
    >
      {message}
    </div>
  );
}

function RecentChange({ history }: { history: HistoryRow[] }) {
  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const latestTruancy = calculateTruancyPercent(
    latest.unexcusedHours,
    latest.totalHours,
  );
  const previousTruancy = calculateTruancyPercent(
    previous.unexcusedHours,
    previous.totalHours,
  );

  const truancyDiff = Number((latestTruancy - previousTruancy).toFixed(2));
  const addedHoursDiff = Number(
    ((latest.addedHours ?? 0) - (previous.addedHours ?? 0)).toFixed(2),
  );

  const truancyTone =
    truancyDiff > 0
      ? "text-red-700 bg-red-50 border-red-200"
      : truancyDiff < 0
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-slate-700 bg-slate-50 border-slate-200";

  const hourTone =
    addedHoursDiff > 0
      ? "text-red-700 bg-red-50 border-red-200"
      : addedHoursDiff < 0
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-slate-700 bg-slate-50 border-slate-200";

 const truancyText =
  truancyDiff === 0
    ? "No change in absence percentage since the last report."
    : truancyDiff > 0
    ? `Absence percentage increased by ${truancyDiff.toFixed(2)}% since the last report.`
    : `Absence percentage decreased by ${Math.abs(truancyDiff).toFixed(2)}% since the last report.`;

  const hoursText =
  addedHoursDiff === 0
    ? "No new hours were added compared to the previous report."
    : addedHoursDiff > 0
    ? `${addedHoursDiff.toFixed(2)} more hours were added compared to the previous report.`
    : `${Math.abs(addedHoursDiff).toFixed(2)} fewer hours were added compared to the previous report.`;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${truancyTone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Absence Related
        </p>
        <p className="mt-2 text-base font-semibold">{truancyText}</p>
      </div>

      <div className={`rounded-2xl border p-4 ${hourTone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Hours Related
        </p>
        <p className="mt-2 text-base font-semibold">{hoursText}</p>
      </div>
    </div>
  );
}

function RiskMessage({
  currentTruancyPercent,
  history,
}: {
  currentTruancyPercent: number;
  history: HistoryRow[];
}) {
  if (history.length <= 1) {
    if (currentTruancyPercent >= 10) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-slate-700">
          This student is currently in the at-risk range. More snapshot history
          is needed to determine whether risk is increasing or stabilizing.
        </div>
      );
    }

    if (currentTruancyPercent >= 7) {
      return (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-slate-700">
          This student is currently in the court warning range. More history is
          needed to determine the trend.
        </div>
      );
    }

    if (currentTruancyPercent >= 5) {
      return (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-slate-700">
          This student is approaching a higher-risk threshold. Additional
          snapshots will help confirm whether attendance is worsening.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
        This student is currently in the normal range. More history is needed to
        determine whether the status remains stable over time.
      </div>
    );
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const latestTruancy = calculateTruancyPercent(
    latest.unexcusedHours,
    latest.totalHours,
  );
  const previousTruancy = calculateTruancyPercent(
    previous.unexcusedHours,
    previous.totalHours,
  );

  if (latestTruancy > previousTruancy && latestTruancy >= 7) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-slate-700">
        Risk appears to be increasing. Truancy percentage has gone up since the
        previous snapshot and is now in a warning range.
      </div>
    );
  }

  if (latestTruancy >= 5 && latestTruancy < 7) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-slate-700">
        This student is approaching a threshold that may require closer review.
      </div>
    );
  }

  if (latestTruancy === previousTruancy) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        Attendance risk appears stable based on the most recent two snapshots.
      </div>
    );
  }

  if (latestTruancy < previousTruancy) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
        Attendance trend appears to be improving compared with the previous
        snapshot.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      Current attendance data is available. Continue monitoring future snapshots
      for clearer trend information.
    </div>
  );
}
