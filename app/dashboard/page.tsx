"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

type School = {
  id: string;
  name: string;
};

function Card({
  title,
  subtitle,
  onClick,
  icon,
  className = "",
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {icon && (
        <div className="relative z-10 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
          {icon}
        </div>
      )}
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
            {subtitle}
          </p>
        )}
        <div className="mt-4 inline-flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
          Open
          <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [scopeName, setScopeName] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Redirect logged-out users
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const role = (session?.user?.role ?? null) as Role | null;
  const displayName = session?.user?.name ?? session?.user?.email ?? "User";

  // Load county/school name
  useEffect(() => {
    const loadScopeName = async () => {
      if (!session || !role) return;

      setScopeName(null);

      try {
        if (role === "SCHOOL" && session.user.schoolId) {
          const res = await fetch(`/api/schools/${session.user.schoolId}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = await res.json();
          setScopeName(data?.name ?? null);
        }

        if (role === "COURT" && session.user.countyId) {
          const res = await fetch(`/api/counties/${session.user.countyId}`, {
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = await res.json();
          setScopeName(data?.name ?? null);
        }
      } catch {
        setScopeName(null);
      }
    };

    loadScopeName();
  }, [session, role]);

  // Load schools for COURT county
  useEffect(() => {
    const loadSchoolsForCourt = async () => {
      if (!session || role !== "COURT") return;
      if (!session.user.countyId) return;

      setSchoolsLoading(true);
      try {
        const res = await fetch(
          `/api/counties/${session.user.countyId}/schools`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          setSchools([]);
          return;
        }

        const data = await res.json();
        setSchools(Array.isArray(data?.schools) ? data.schools : []);
      } catch {
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchoolsForCourt();
  }, [session, role]);

  const scopeLabel = useMemo(() => {
    if (!session || !role) return "";
    if (role === "COURT") return `County: ${scopeName ?? "Loading county..."}`;
    if (role === "SCHOOL") return `School: ${scopeName ?? "Loading school..."}`;
    return "Scope: Admin (all)";
  }, [session, role, scopeName]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  // =========================
  // SCHOOL: school dashboard
  // =========================
  if (role === "SCHOOL") {
    return (
      <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Header */}
        <header className="relative z-10 border-b border-white/20 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">School Portal</h1>
                <p className="text-sm text-gray-600">{scopeName ?? "Loading..."}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 capitalize">{role.toLowerCase()} User</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center rounded-lg bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 py-12">
          {/* Welcome Card */}
          <div className="mb-8 overflow-hidden rounded-3xl border border-white/50 bg-white/80 backdrop-blur-xl shadow-xl">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    ATTENDANCE MANAGEMENT
                  </div>
                  <h2 className="mt-3 text-3xl font-bold text-gray-900">
                    Welcome back, {displayName.split(' ')[0]}
                  </h2>
                  <p className="mt-2 text-gray-600">
                    Manage attendance reports for {scopeName || 'your school'}
                  </p>
                </div>
                <div className="hidden lg:flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Primary Action - Upload Reports */}
            <div className="lg:col-span-2">
              <Card
                title="Upload Attendance Report"
                subtitle="Submit new attendance reports for court review. Only PDF files are accepted."
                onClick={() => router.push("/upload")}
                className="h-full bg-gradient-to-br from-blue-200 to-indigo-50 text-white border-blue-500 hover:border-blue-500"
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                }
              />
            </div>

            {/* Quick Stats/Info */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Session</p>
                    <p className="text-2xl font-bold text-gray-900">2024-25</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p className="text-lg font-semibold text-green-600">Active</p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm p-6">
            <div className="flex items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">Upload Requirements</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Reports must be in PDF format and contain accurate attendance data. 
                  All uploads are automatically associated with your school account.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // =========================
  // COURT + ADMIN 
  // =========================
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <header className="border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">{scopeLabel}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500 capitalize">{role.toLowerCase()} User</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 rounded-2xl border border-white/50 bg-white/80 backdrop-blur-sm p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Welcome Back</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900">{displayName}</h2>
              <p className="mt-2 text-gray-600">
                {role === "COURT" ? "Review attendance reports from schools in your county" : "Manage all system resources and users"}
              </p>
            </div>
            <div className="hidden lg:flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* COURT view */}
        {role === "COURT" && (
          <>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Schools in Your County</h3>
                <p className="mt-1 text-gray-600">Select a school to review their attendance reports</p>
              </div>
            </div>

            {schoolsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading schools...</p>
                </div>
              </div>
            ) : schools.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm p-8 text-center shadow-sm">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Schools Found</h4>
                <p className="text-gray-600">No schools have been registered for this county yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {schools.map((school) => (
                  <Card
                    key={school.id}
                    title={school.name}
                    subtitle="Review uploaded attendance reports"
                    onClick={() => router.push(`/review?schoolId=${school.id}`)}
                    icon={
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ADMIN view */}
        {role === "ADMIN" && (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">System Management</h3>
              <p className="mt-1 text-gray-600">Manage schools, courts, and system-wide settings</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card
                title="Schools Management"
                subtitle="Browse all schools and review uploads by school"
                onClick={() => router.push("/admin/schools")}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <Card
                title="Courts Management"
                subtitle="Browse all courts and their associated schools"
                onClick={() => router.push("/admin/courts")}
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-1m-3 1l-3-1" />
                  </svg>
                }
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
