"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

export default function ReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId");

  const { data: session, status } = useSession();
  const [schoolName, setSchoolName] = useState<string | null>(null);

  // Guard: COURT/ADMIN only
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      const role = session?.user?.role as Role | undefined;
      if (role && role === "SCHOOL") router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Load school name (nice UI)
  useEffect(() => {
    const load = async () => {
      if (!schoolId) return;
      try {
        const res = await fetch(`/api/schools/${schoolId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setSchoolName(data?.name ?? null);
      } catch {
        setSchoolName(null);
      }
    };
    load();
  }, [schoolId]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review PDFs</h1>
              <p className="mt-1 text-sm text-gray-600">Review uploaded reports</p>

              {schoolId && (
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold">School:</span>{" "}
                  {schoolName ?? "Loading..."}
                </p>
              )}
            </div>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
          </div>

          {/* Demo 1 placeholder */}
          <div className="mt-6 rounded-lg border bg-gray-50 p-6">
            <p className="text-sm text-gray-700">
              Demo 1: This page will list uploaded PDFs for the selected school
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
