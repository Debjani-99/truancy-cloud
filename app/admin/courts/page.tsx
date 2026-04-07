"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

type County = {
  id: string;
  name: string;
};

export default function AdminCourtsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = (session?.user?.role ?? null) as Role | null;

  const [counties, setCounties] = useState<County[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/counties", { cache: "no-store" });
        if (!res.ok) {
          setCounties([]);
          return;
        }
        const data = await res.json();
        setCounties(Array.isArray(data?.counties) ? data.counties : []);
      } finally {
        setLoading(false);
      }
    };
    if (role === "ADMIN") load();
  }, [role]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Courts</h1>
            <p className="mt-1 text-sm text-gray-500">Admin · Select a county to view its schools.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-gray-500">Loading courts...</p>
        ) : counties.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-700">No courts/counties found yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {counties.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
              >
                <h3 className="text-lg font-semibold text-gray-900">{c.name} County</h3>
                <p className="mt-1 text-sm text-gray-500">Champaign County Juvenile Court</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => router.push(`/admin/courts/${c.id}`)}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    View Schools
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
