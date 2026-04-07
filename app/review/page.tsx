"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileText, Play, RotateCcw, BarChart2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge, uploadStatusVariant } from "@/app/components/ui/badge";

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      const role = session?.user?.role as Role | undefined;
      if (role === "SCHOOL") router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const loadSchool = async () => {
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
    loadSchool();
  }, [schoolId]);

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

  const handleProcess = async (uploadId: string) => {
    setProcessingId(uploadId);
    setProcessError(null);
    try {
      const res = await fetch(`/api/uploads/${uploadId}/process`, { method: "POST" });
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

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
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
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-xl border bg-white p-8 shadow-sm">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review PDFs</h1>
              {schoolId && (
                <p className="mt-1 text-sm text-gray-600">
                  {schoolName ?? "Loading..."}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {schoolId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/students?schoolId=${schoolId}`)}
                >
                  View Students
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                ← Back
              </Button>
            </div>
          </div>

          {/* Process error */}
          {processError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {processError}
            </div>
          )}

          {/* Status legend */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <span className="font-medium text-gray-700">Status:</span>
            <span className="flex items-center gap-1.5">
              <Badge variant="pending">PENDING</Badge> Awaiting processing
            </span>
            <span className="flex items-center gap-1.5">
              <Badge variant="processing">PROCESSING</Badge> In progress
            </span>
            <span className="flex items-center gap-1.5">
              <Badge variant="parsed">PARSED</Badge> Results available
            </span>
            <span className="flex items-center gap-1.5">
              <Badge variant="failed">FAILED</Badge> Retry needed
            </span>
          </div>

          {/* Upload Table */}
          <div className="mt-6">
            <div className="rounded-lg border bg-white overflow-hidden">
              {loadingUploads ? (
                <div className="p-4 text-sm text-gray-600">Loading uploads...</div>
              ) : uploadError ? (
                <div className="p-4 text-sm text-red-700">{uploadError}</div>
              ) : uploads.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No uploads found for this school.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Uploaded</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploads.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[240px] truncate">
                          {u.filename}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatBytes(u.fileSize)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(u.uploadedAt)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={uploadStatusVariant(u.status)}>
                            {u.status === "PROCESSING" ? (
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                                PROCESSING
                              </span>
                            ) : (
                              u.status
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* View PDF — always visible */}
                            <a
                              href={`/api/uploads/${u.id}/file`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button variant="ghost" size="icon" title="View PDF">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </a>

                            {/* Process (PENDING) / Retry (FAILED) */}
                            {(u.status === "PENDING" || u.status === "FAILED") && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleProcess(u.id)}
                                disabled={processingId === u.id}
                              >
                                {processingId === u.id ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Working…
                                  </>
                                ) : u.status === "FAILED" ? (
                                  <><RotateCcw className="h-3 w-3" /> Retry</>
                                ) : (
                                  <><Play className="h-3 w-3" /> Process</>
                                )}
                              </Button>
                            )}

                            {/* View Results (PARSED) */}
                            {u.status === "PARSED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/review/results?uploadId=${u.id}`)}
                              >
                                <BarChart2 className="h-3 w-3" />
                                Results
                              </Button>
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

          {/* Collapsible user guide */}
          <details className="mt-8 rounded-xl border border-gray-200 bg-gray-50">
            <summary className="cursor-pointer select-none px-6 py-4 text-sm font-semibold text-gray-700 hover:text-gray-900">
              How to use this page ↓
            </summary>
            <div className="space-y-4 px-6 pb-6 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-yellow-700">PENDING</p>
                <p className="mt-1">Uploaded by the school, not yet processed. Click <strong>Process</strong> to extract attendance data.</p>
              </div>
              <div>
                <p className="font-semibold text-green-700">PARSED</p>
                <p className="mt-1">Processing succeeded. Click <strong>Results</strong> to view the attendance table for this school and year.</p>
              </div>
              <div>
                <p className="font-semibold text-red-700">FAILED</p>
                <p className="mt-1">Processing failed. Click <strong>Retry</strong> to try again, or <strong>View PDF</strong> to inspect the file.</p>
              </div>
            </div>
          </details>

        </div>
      </div>
    </main>
  );
}
