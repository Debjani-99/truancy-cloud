// pdf file upload UI (drag & drop)
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "SCHOOL" | "COURT" | "ADMIN";

export default function UploadPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Guard: only SCHOOL can access /upload
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      const role = session?.user?.role as Role | undefined;
      if (role && role !== "SCHOOL") {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router]);

  const validatePdf = (file: File) => {
    setError(null);
    setSuccess(null);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please upload a PDF file only.");
      return false;
    }

    const maxMb = 10;
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File is too large. Max size is ${maxMb}MB.`);
      return false;
    }

    return true;
  };

  const handlePick = (file: File | null) => {
    if (!file) return;
    if (!validatePdf(file)) return;
    setSelectedFile(file);
    setSuccess(null);
  };

  const onBrowseClick = () => fileInputRef.current?.click();

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePick(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] ?? null;
    handlePick(file);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onRemove = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Real upload -> hits backend API
  const onUpload = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError("Select a PDF before uploading.");
      return;
    }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch("/api/reports/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Upload failed.");
        return;
      }

      setSuccess(`Upload successful. Received: ${data.filename ?? "PDF"}`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  // While redirecting / loading session, don't flash UI
  if (!session) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload PDF</h1>
              <p className="mt-1 text-sm text-gray-600">
                Submit reports for your school. PDF only.
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            onClick={onBrowseClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={[
              "mt-6 rounded-lg border-2 border-dashed px-6 py-10 text-center transition",
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50",
              "cursor-pointer",
            ].join(" ")}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V8m0 0l-3 3m3-3l3 3m6 5a2 2 0 01-2 2H6a2 2 0 01-2-2"
                />
              </svg>
            </div>

            <p className="mt-3 text-sm text-gray-800">
              <span className="font-semibold text-blue-600">Click to upload</span>{" "}
              or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">PDF only · Max 10MB</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileInputChange}
            />
          </div>

          {/* Selected file */}
          {selectedFile && (
            <div className="mt-4 rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Selected file
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={onRemove}
                  className="rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={onUpload}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-60"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload PDF"}
            </button>

            <button
              onClick={onBrowseClick}
              className="w-full rounded-md border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              disabled={isUploading}
            >
              Choose File
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
