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

        {/* SCHOOL view */}
        {role === "SCHOOL" && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card
              title="Upload PDFs"
              subtitle="Submit truancy reports for your school."
              onClick={() => router.push("/upload")}
            />
          </div>
        )}

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

        {/* ADMIN view (optional placeholder) */}
        {role === "ADMIN" && (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card
              title="Review PDFs"
              subtitle="Admin review view (all scope)."
              onClick={() => router.push("/review")}
            />
          </div>
        )}
      </section>
    </main>
  );
}
