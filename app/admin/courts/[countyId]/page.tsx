"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

type School = { id: string; name: string };
type County = { id: string; name: string };

export default function AdminCourtDetailPage() {
  const router = useRouter();
  const params = useParams<{ countyId: string }>();
  const countyId = params?.countyId;

  const { status, data: session } = useSession();
  const role = (session?.user?.role ?? null) as Role | null;

  const [county, setCounty] = useState<County | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && role !== "ADMIN") router.replace("/dashboard");
  }, [status, role, router]);

  useEffect(() => {
    const load = async () => {
      if (!countyId) return;
      try {
        setLoading(true);

        const [countyRes, schoolsRes] = await Promise.all([
          fetch(`/api/counties/${countyId}`, { cache: "no-store" }),
          fetch(`/api/counties/${countyId}/schools`, { cache: "no-store" }),
        ]);

        if (countyRes.ok) setCounty(await countyRes.json());
        if (schoolsRes.ok) {
          const data = await schoolsRes.json();
          setSchools(Array.isArray(data?.schools) ? data.schools : []);
        } else {
          setSchools([]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (role === "ADMIN") load();
  }, [role, countyId]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-white/20 bg-white/80 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {county?.name ? `${county.name} County` : "County Schools"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">Admin · Select a school to review uploads or browse students.</p>
          </div>
          <button
            onClick={() => router.push("/admin/courts")}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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
            <p className="text-sm text-gray-700">No schools found for this county yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {schools.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
              >
                <h3 className="text-lg font-semibold text-gray-900">{s.name}</h3>
                {county?.name && (
                  <p className="mt-1 text-sm text-gray-500">{county.name} County</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => router.push(`/review?schoolId=${s.id}`)}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    View Uploads
                  </button>
                  <button
                    onClick={() => router.push(`/students?schoolId=${s.id}`)}
                    className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    View Students
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
