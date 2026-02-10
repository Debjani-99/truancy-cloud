"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
      <p className="mt-4 text-sm font-semibold text-blue-600">Open →</p>
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!session) return null;

  // SCHOOL: hero landing layout
  if (role === "SCHOOL") {
    return (
      <main className="min-h-screen bg-[#f7f5f2] relative overflow-hidden">
        {/* Decorative side wave-ish accent */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br top-0 h-full w-[35%] opacity-60">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute right-[-140px] top-[240px] h-[520px] w-[520px] rounded-full bg-indigo-250 blur-3xl" />
        </div>

        {/* Top bar: small corner button(s) */}
        <div className="absolute top-6 right-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/upload")}
            className="rounded-md border border-gray-900/30 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
          >
            Upload
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition"
          >
            Logout
          </button>
        </div>

        {/* Center hero */}
        <section className="min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-3xl text-center">
            <p className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
              {scopeLabel}
            </p>


            <p className="mt-4 text-base sm:text-lg text-gray-700">
              Submit your school’s reports securely for court review. PDF only.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/upload")}
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 border border-gray-900/30 hover:bg-gray-50 transition"
              >
                Upload Now
              </button>
            </div>

            <p className="mt-8 text-sm text-gray-800">
              Signed in as <span className="font-semibold">{displayName}</span>
            </p>
          </div>
        </section>
      </main>
    );
  }

  // COURT + ADMIN 
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              {scopeLabel} • Role: {role}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">Signed in</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Welcome</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {displayName}
          </p>
        </div>

        {/* COURT view */}
        {role === "COURT" && (
          <>
            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Schools in your county
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Select a school to review uploaded reports.
                </p>
              </div>
            </div>

            <div className="mt-4">
              {schoolsLoading ? (
                <p className="text-sm text-gray-500">Loading schools...</p>
              ) : schools.length === 0 ? (
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-700">
                    No schools found for this county yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {schools.map((s) => (
                    <Card
                      key={s.id}
                      title={s.name}
                      subtitle="Review uploaded reports"
                      onClick={() => router.push(`/review?schoolId=${s.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ADMIN view */}
        {role === "ADMIN" && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card
              title="Schools"
              subtitle="Browse all schools and review uploads by school."
              onClick={() => router.push("/admin/schools")}
            />
            <Card
              title="Courts"
              subtitle="Browse all courts and their schools."
              onClick={() => router.push("/admin/courts")}
            />
          </div>
        )}
      </section>
    </main>
  );
}
