"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
  const loadUploads = useCallback(async () => {
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
      setUploads(all.filter((u) => u.school?.id === schoolId));
    } catch {
      setUploadError("Failed to load uploads.");
      setUploads([]);
    } finally {
      setLoadingUploads(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  // -----------------------------
  // Process / Retry upload
  // -----------------------------
  const handleProcess = async (uploadId: string) => {
    setProcessingId(uploadId);
    setProcessError(null);
    setOpenMenuId(null);

    try {
      const res = await fetch(`/api/uploads/${uploadId}/process`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setProcessError(data?.error ?? "Processing failed.");
      } else {
        await loadUploads();
      }
    } catch {
      setProcessError("Processing failed. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewResults = (uploadId: string) => {
    setOpenMenuId(null);
    router.push(`/review/results?uploadId=${uploadId}`);
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  };

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PROCESSING: "bg-blue-100 text-blue-800",
      PARSED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      REVIEW: "bg-purple-100 text-purple-800",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          colors[s] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {s}
      </span>
    );
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
    <main
      className="min-h-screen bg-gray-50 px-4 py-10"
      onClick={() => {
        if (openMenuId) setOpenMenuId(null);
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-xl border bg-white p-8 shadow-sm overflow-visible">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review PDFs</h1>
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
              className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
          </div>

          {/* Process error banner */}
          {processError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {processError}
            </div>
          )}

          {/* Upload Table */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-900">
              Uploaded PDFs
            </h2>

            <div className="mt-3 rounded-lg border bg-white overflow-visible">
              {loadingUploads ? (
                <div className="p-4 text-sm text-gray-600">
                  Loading uploads...
                </div>
              ) : uploadError ? (
                <div className="p-4 text-sm text-red-700">{uploadError}</div>
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
                      <th className="px-4 py-3 font-medium">Actions</th>
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
                        <td className="px-4 py-3">{statusBadge(u.status)}</td>
                        <td className="px-4 py-3">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId((prev) =>
                                  prev === u.id ? null : u.id
                                );
                              }}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                              Actions
                              <span className="ml-2 text-xs">▼</span>
                            </button>

                            {openMenuId === u.id && (
                              <div
                                className="absolute right-0 z-20 mt-2 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <a
                                  href={`/api/uploads/${u.id}/file`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View
                                </a>

                                {u.status === "PENDING" && (
                                  <button
                                    onClick={() => handleProcess(u.id)}
                                    disabled={processingId === u.id}
                                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {processingId === u.id
                                      ? "Processing..."
                                      : "Process"}
                                  </button>
                                )}

                                {u.status === "PARSED" && (
                                  <button
                                    onClick={() => handleViewResults(u.id)}
                                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    View Results
                                  </button>
                                )}

                                {u.status === "FAILED" && (
                                  <button
                                    onClick={() => handleProcess(u.id)}
                                    disabled={processingId === u.id}
                                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {processingId === u.id
                                      ? "Retrying..."
                                      : "Retry"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* User Manual */}
          <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-base font-semibold text-gray-900">
              User Guide
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Use the status and action options below to decide what to do with
              each uploaded PDF.
            </p>

            <div className="mt-6 space-y-5 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-yellow-700">PENDING</p>
                <p className="mt-1">
                  The file has been uploaded by the school, but it has not been processed yet.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium">View:</span> Open the original
                    uploaded PDF.
                  </li>
                  <li>
                    <span className="font-medium">Process:</span> Start parsing
                    the PDF and extract attendance data.
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-green-700">PARSED</p>
                <p className="mt-1">
                  The PDF was processed successfully and results are available.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium">View:</span> Open the original
                    uploaded PDF.
                  </li>
                  <li>
                    <span className="font-medium">View Results:</span> Open the
                    the current attendance results table for this school and school year
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-red-700">FAILED</p>
                <p className="mt-1">
                  The system tried to process the PDF, but the process did not
                  complete successfully.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <span className="font-medium">View:</span> Open the original
                    uploaded PDF to inspect the file.
                  </li>
                  <li>
                    <span className="font-medium">Retry:</span> Run the
                    processing step again for the same PDF.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}