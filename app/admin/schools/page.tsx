"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

type School = {
  id: string;
  name: string;
  county?: { id: string; name: string };
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

export default function AdminSchoolsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user?.role ?? null) as Role | null;

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Basic protection
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/schools", { cache: "no-store" });
        if (!res.ok) {
          setSchools([]);
          return;
        }
        const data = await res.json();
        setSchools(Array.isArray(data?.schools) ? data.schools : []);
      } finally {
        setLoading(false);
      }
    };
    if (role === "ADMIN") load();
  }, [role]);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">Admin • Schools</h1>
            <p className="mt-1 text-sm text-gray-600">Select a school to review uploads.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900
                        hover:bg-gray-200 transition"
            >
            ← Back
            </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-gray-500">Loading schools...</p>
        ) : schools.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-700">No schools found yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {schools.map((s) => (
              <Card
                key={s.id}
                title={s.name}
                subtitle={s.county?.name ? `County: ${s.county.name}` : "Review uploaded reports"}
                onClick={() => router.push(`/review?schoolId=${s.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
