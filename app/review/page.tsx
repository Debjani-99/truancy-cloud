"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

type UploadRow = {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  school: { id: string; name: string };
};

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading...</p>
        </main>
      }
    >
      <ReviewInner />
    </Suspense>
  );
}

function ReviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("schoolId");

  const { data: session, status } = useSession();

  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // -----------------------------
  // Auth Guard
  // -----------------------------
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      const role = session?.user?.role as Role | undefined;

      // SCHOOL users should not access review page
      if (role === "SCHOOL") {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router]);

  // -----------------------------
  // Load school name
  // -----------------------------
  useEffect(() => {
    const loadSchool = async () => {
      if (!schoolId) return;

      try {
        const res = await fetch(`/api/schools/${schoolId}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        setSchoolName(data?.name ?? null);
      } catch {
        setSchoolName(null);
      }
    };

    loadSchool();
  }, [schoolId]);

  // -----------------------------
  // Load uploads for this school
  // -----------------------------
  useEffect(() => {
    const loadUploads = async () => {
      if (!schoolId) return;

      setLoadingUploads(true);
      setUploadError(null);

      try {
        const res = await fetch("/api/uploads", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setUploadError(data?.error ?? "Failed to load uploads.");
          setUploads([]);
          return;
        }

        const all = (data?.uploads ?? []) as UploadRow[];

        // Filter for selected school
        const filtered = all.filter((u) => u.school?.id === schoolId);
        setUploads(filtered);
      } catch {
        setUploadError("Failed to load uploads.");
        setUploads([]);
      } finally {
        setLoadingUploads(false);
      }
    };

    loadUploads();
  }, [schoolId]);

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

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
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Review PDFs
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Review uploaded reports
              </p>

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

          {/* Upload Table */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">
              Uploaded PDFs
            </h2>

            <div className="mt-3 overflow-hidden rounded-lg border bg-white">
              {loadingUploads ? (
                <div className="p-4 text-sm text-gray-600">
                  Loading uploads...
                </div>
              ) : uploadError ? (
                <div className="p-4 text-sm text-red-700">
                  {uploadError}
                </div>
              ) : uploads.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  No uploads found for this school.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Uploaded</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uploads.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">
                          {u.filename}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatBytes(u.fileSize)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(u.uploadedAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {u.status}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/api/uploads/${u.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
