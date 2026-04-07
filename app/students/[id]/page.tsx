import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Info } from "lucide-react";

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

  const chartData = preparedHistory.map((row, index) => ({
    uploadDate:
      preparedHistory.length <= 6
      ? formatDate(row.report.createdAt)
      : `Snapshot ${index + 1}`,
    reportDate: row.report.createdAt,
    absencePercent: row.truancyPercent,
    excusedHours: row.excusedHours ?? 0,
    unexcusedHours: row.unexcusedHours ?? 0,
    medicalExcusedHours: row.medicalExcusedHours ?? 0,
    suspensionHours: row.suspensionHours ?? 0,
    totalAbsHours: row.totalAbsHours ?? 0,
    totalHours: row.totalHours ?? 0,
    addedHours: row.addedHours ?? 0,
  }));

  
const latestHistory =
  preparedHistory.length > 0
    ? preparedHistory[preparedHistory.length - 1]
    : null;

const previousHistory =
  preparedHistory.length > 1
    ? preparedHistory[preparedHistory.length - 2]
    : null;

const snapshotCount = preparedHistory.length;
const latestUploadDate = formatDate(latestHistory?.report.createdAt);

const hasComparison = !!latestHistory && !!previousHistory;

const truancyDiff = hasComparison
  ? Number(
      (
        latestHistory.truancyPercent - previousHistory.truancyPercent
      ).toFixed(2),
    )
  : 0;

const addedHoursTrendDiff = hasComparison
  ? Number(
      (
        (latestHistory.addedHours ?? 0) - (previousHistory.addedHours ?? 0)
      ).toFixed(2),
    )
  : 0;

  const backHref = latestRecord?.report?.uploadId
    ? `/review/results?uploadId=${latestRecord.report.uploadId}`
    : "/review";

  const hasHistory = preparedHistory.length > 0;
  const hasEnoughHistoryForComparison = hasComparison;

  return (
  <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-6 md:py-8">
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top nav */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Student Dashboard
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            {student.firstName} {student.lastName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Attendance risk overview, trend monitoring, and snapshot history
          </p>
        </div>

        <Link
          href={backHref}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Back to Results
        </Link>
      </div>

      {/* Header summary */}
      <section className="space-y-4">

        {/* Avatar + name card ONLY */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
              {getInitials(student.firstName, student.lastName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900">
                  {student.firstName} {student.lastName}
                </h2>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${currentStatus.badgeClass}`}
                >
                  {currentStatus.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                {student.school.name} • Student Ref: {student.studentRef || "Data not available"}
              </p>
            </div>
          </div>
        </div>

        {/* Small info cards OUTSIDE the white card */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Current School Year"
            value={latestRecord?.schoolYear || "Data not available"}
            tone="blue"
          />
          <InfoCard
            label="Latest Report Date"
            value={formatDate(latestRecord?.report?.createdAt)}
            tone="slate"
          />
          <InfoCard
            label="Snapshots"
            value={String(preparedHistory.length)}
            tone="slate"
          />
          <InfoCard
            label="School"
            value={student.school.name || "Data not available"}
            tone="slate"
          />
        </div>

      </section>

      {/* Main analytics area */}
      <section className="grid items-start gap-6 xl:grid-cols-[1.75fr_0.95fr]">
        <Panel
          title={
            <div className="flex items-center gap-2">
              <span>Absence Trend</span>
              <Link
                href={`/help/trend?studentId=${student.id}`}
                className="flex items-center"
              >
                <Info className="h-4 w-4 text-blue-500 hover:text-blue-700" />
              </Link>
            </div>
          }
          subtitle="Trend across uploaded attendance snapshots."
        >
          {chartData.length <= 1 ? (
            <EmptyPanel
              message="Trend will appear once more snapshots are available."
              tall
            />
          ) : (
            <TrendChart data={chartData} />
          )}
        </Panel>

      <Panel
  title={
    <div className="flex items-center gap-2">
      <span>Review Summary</span>
      <Link
        href={`/help/recent-change?studentId=${student.id}`}
        className="flex items-center"
      >
        <Info className="h-4 w-4 text-blue-500 hover:text-blue-700" />
      </Link>
    </div>
  }
  subtitle="Recent attendance change and rule-based review guidance."
>
  <div className="space-y-6">
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recent Change
      </p>
      {!hasEnoughHistoryForComparison ? (
        <EmptyPanel message="No comparison available yet." />
      ) : (
        <RecentChange history={history} />
      )}
    </div>

    <div>
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Risk Message
        </p>
        <Link
          href={`/help/risk?studentId=${student.id}`}
          className="flex items-center"
        >
          <Info className="h-4 w-4 text-blue-500 hover:text-blue-700" />
        </Link>
      </div>

      <RiskMessage
        currentTruancyPercent={currentTruancyPercent}
        history={history}
      />
    </div>
  </div>
</Panel>
</section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Court Notes"
          subtitle="View and manage internal notes for this student."
        >
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">
              Add and review internal notes for court follow-up.
            </p>

            <Link
              href={`/students/${student.id}/notes`}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Notes
            </Link>
          </div>
        </Panel>

        <Panel
          title="Truancy Letter"
          subtitle="Generate a notice letter for mailing to the student's family."
        >
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
            {session.user.role === "SCHOOL" ? (
              <p className="text-sm text-slate-500">
                Only court users and administrators can generate truancy notice letters.
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Downloads a PDF truancy notice letter pre-filled with this
                  student&apos;s attendance data. Parent portal instructions will
                  be added once available.
                </p>
                <a
                  href={`/api/students/${student.id}/notice`}
                  download
                  className="inline-flex items-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Generate Letter
                </a>
              </>
            )}
          </div>
        </Panel>
      </section>

      {/* Detailed current snapshot breakdown */}
      <Panel
        title="Detailed Snapshot Breakdown"
        subtitle="Full current attendance metrics from the latest processed snapshot."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Excused Hours" value={formatHours(latestRecord?.excusedHours)} />
          <MetricCard label="Medical Excused" value={formatHours(latestRecord?.medicalExcusedHours)} />
          <MetricCard label="Suspension Hours" value={formatHours(latestRecord?.suspensionHours)} />
          <MetricCard label="Added Hours" value={formatHours(latestRecord?.addedHours)} />
          <MetricCard label="Total Hours" value={formatHours(latestRecord?.totalHours)} />
          <MetricCard label="Total Abs Hours" value={formatHours(latestRecord?.totalAbsHours)} />
          <MetricCard label="Unexcused Hours" value={formatHours(latestRecord?.unexcusedHours)} />
          <MetricCard label="Absence %" value={`${currentTruancyPercent.toFixed(2)}%`} />
        </div>
      </Panel>

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
                {preparedHistory.map((row) => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  </main>
);
}

function InfoCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "blue";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50"
      : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
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


function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
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

function TrendChart({
  data,
}: {
  data: {
    uploadDate: string;
    reportDate: Date;
    absencePercent: number;
    excusedHours: number;
    unexcusedHours: number;
    medicalExcusedHours: number;
    suspensionHours: number;
    totalAbsHours: number;
    totalHours: number;
    addedHours: number;
  }[];
}) {
  const width = 760;
  const height = 360;
  const padding = { top: 32, right: 36, bottom: 70, left: 64 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxDataY = Math.max(...data.map((d) => d.absencePercent), 10);
  const maxY = Math.max(12, Math.ceil(maxDataY + 1));

  const thresholds = [
    { value: 5, label: "Watch", line: "#EAB308", fill: "#F0FDF4" },
    { value: 7, label: "Court Warning", line: "#F59E0B", fill: "#FEFCE8" },
    { value: 10, label: "At Risk", line: "#EF4444", fill: "#FFF7ED" },
  ];

  const getY = (value: number) =>
    padding.top + chartHeight - (value / maxY) * chartHeight;

  const getX = (index: number) =>
    data.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (data.length - 1)) * chartWidth;

  const getRiskStatus = (value: number) => {
    if (value >= 10) return { label: "At Risk", color: "#DC2626", fill: "#FEF2F2" };
    if (value >= 7) return { label: "Court Warning", color: "#EA580C", fill: "#FFF7ED" };
    if (value >= 5) return { label: "At Watch", color: "#CA8A04", fill: "#FEFCE8" };
    return { label: "Normal", color: "#059669", fill: "#ECFDF5" };
  };

  const points = data.map((point, index) => ({
    ...point,
    x: getX(index),
    y: getY(point.absencePercent),
    xLabel:
      data.length <= 6
        ? point.uploadDate
        : `S${index + 1}`,
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const latestPoint = points[points.length - 1];
  const previousPoint = points.length > 1 ? points[points.length - 2] : null;

  const latestRisk = getRiskStatus(latestPoint.absencePercent);

  const trendLabel = previousPoint
    ? latestPoint.absencePercent > previousPoint.absencePercent
      ? "Increasing"
      : latestPoint.absencePercent < previousPoint.absencePercent
        ? "Improving"
        : "Stable"
    : "No comparison";

  const trendTone =
    trendLabel === "Increasing"
      ? "border-red-200 bg-red-50 text-red-700"
      : trendLabel === "Improving"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  const latestDelta =
    previousPoint != null
      ? Number((latestPoint.absencePercent - previousPoint.absencePercent).toFixed(2))
      : 0;

  const yTicks = [0, 3, 5, 7, 10, maxY]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* KPI / legend row */}
      <div className="flex flex-wrap gap-3">
        <div
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold`}
          style={{
            borderColor: latestRisk.color + "33",
            backgroundColor: latestRisk.fill,
            color: latestRisk.color,
          }}
        >
          Current Status: {latestRisk.label}
        </div>

        <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${trendTone}`}>
          Trend: {trendLabel}
        </div>

        <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
          Latest %: {latestPoint.absencePercent.toFixed(2)}%
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[340px] w-full"
          role="img"
          aria-label="Absence trend chart"
        >
          <defs>
            <linearGradient id="trendLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <filter id="latestGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Threshold bands */}
          <rect
            x={padding.left}
            y={getY(5)}
            width={chartWidth}
            height={getY(0) - getY(5)}
            fill="#ECFDF5"
          />
          <rect
            x={padding.left}
            y={getY(7)}
            width={chartWidth}
            height={getY(5) - getY(7)}
            fill="#FEFCE8"
          />
          <rect
            x={padding.left}
            y={getY(10)}
            width={chartWidth}
            height={getY(7) - getY(10)}
            fill="#FFF7ED"
          />
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={getY(10) - padding.top}
            fill="#FEF2F2"
          />

          {/* Grid lines + y labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#CBD5E1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#64748B"
                >
                  {tick.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Threshold lines + labels */}
          {thresholds.map((t) => {
            const y = getY(t.value);
            return (
              <g key={t.value}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={t.line}
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                />
                <rect
                  x={width - padding.right - 116}
                  y={y - 14}
                  width="110"
                  height="18"
                  rx="9"
                  fill="white"
                  opacity="0.92"
                />
                <text
                  x={width - padding.right - 61}
                  y={y - 2}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={t.line}
                >
                  {t.label} • {t.value}%
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#94A3B8"
            strokeWidth="1.2"
          />

          {/* Line */}
          <polyline
            fill="none"
            points={polylinePoints}
            stroke="#1E3A8A"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Area under line */}
          <polygon
            points={`${padding.left},${height - padding.bottom} ${polylinePoints} ${width - padding.right},${height - padding.bottom}`}
            fill="#2563EB"
            opacity="0.06"
          />

          {/* Points */}
          {points.map((p, index) => {
            const isLatest = index === points.length - 1;
            const pointColor = isLatest ? latestRisk.color : "#1E293B";

            return (
              <g key={`${p.uploadDate}-${index}`}>
                {isLatest && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="11"
                    fill={pointColor}
                    opacity="0.14"
                    filter="url(#latestGlow)"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLatest ? 6.5 : 4.5}
                  fill={pointColor}
                  stroke="white"
                  strokeWidth={isLatest ? 3 : 2}
                />
              </g>
            );
          })}

          {/* X labels */}
          {points.map((p, index) => (
            <text
              key={`${p.uploadDate}-label-${index}`}
              x={p.x}
              y={height - padding.bottom + 26}
              textAnchor="middle"
              fontSize="11"
              fill="#64748B"
            >
              {p.xLabel}
            </text>
          ))}

          {/* Axis titles */}
          <text
            x={padding.left - 44}
            y={padding.top - 8}
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            Percent
          </text>
          <text
            x={width / 2}
            y={height - 18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#475569"
          >
            Uploaded attendance snapshots
          </text>
        </svg>

        <p className="mt-3 text-xs text-slate-500">
          **Absence % in this dashboard is based on unexcused hours only.
        </p>
      </div>

      {/* Bottom business summary row */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latest Upload
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {latestPoint.uploadDate}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Latest Absence %
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {latestPoint.absencePercent.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Recent Change
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              latestDelta > 0
                ? "text-red-700"
                : latestDelta < 0
                  ? "text-emerald-700"
                  : "text-slate-900"
            }`}
          >
            {previousPoint ? `${latestDelta > 0 ? "+" : ""}${latestDelta.toFixed(2)}%` : "N/A"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Unexcused Hours
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {latestPoint.unexcusedHours.toFixed(2)}
          </p>
        </div>
      </div>
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
          This student is currently in the at-risk range. Immediate review is recommended based on the latest available attendance snapshot.
        </div>
      );
    }

    if (currentTruancyPercent >= 7) {
      return (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-slate-700">
          This student is currently in the court warning range. Closer review is recommended based on the latest available attendance snapshot.
        </div>
      );
    }

    if (currentTruancyPercent >= 5) {
      return (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-slate-700">
          This student is currently in the at-watch range. Continued monitoring is recommended to see whether attendance moves into a higher-risk range.
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
        This student is currently in the normal range. No immediate attendance concern is indicated from the latest available snapshot.
      </div>
    );
  }

  if (currentTruancyPercent >= 10) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-slate-700">
        This student is currently in the at-risk range. Immediate review is recommended because the current absence percentage is in the highest risk band.
      </div>
    );
  }

  if (currentTruancyPercent >= 7) {
    return (
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-slate-700">
        This student is currently in the court warning range. Attendance should be reviewed closely because the current absence percentage is above the warning threshold.
      </div>
    );
  }

  if (currentTruancyPercent >= 5) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-slate-700">
        This student is currently in the at-watch range. Continued monitoring is recommended because the current absence percentage is approaching a more serious threshold.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-slate-700">
      This student is currently in the normal range. Current attendance does not indicate a higher-risk status at this time.
    </div>
  );
}
