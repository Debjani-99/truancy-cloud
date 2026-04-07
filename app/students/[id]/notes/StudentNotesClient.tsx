"use client";

import { useMemo, useState } from "react";

type NoteAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
};

type NoteItem = {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: NoteAuthor;
};

type StudentNotesClientProps = {
  studentId: number;
  initialNotes: NoteItem[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function StudentNotesClient({
  studentId,
  initialNotes,
}: StudentNotesClientProps) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const noteCountText = useMemo(() => {
    if (notes.length === 1) return "1 note";
    return `${notes.length} notes`;
  }, [notes.length]);

  async function refreshNotes() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/students/${studentId}/notes`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load notes");
      }

      setNotes(data.notes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNote() {
    setError("");
    setSuccess("");

    const trimmed = content.trim();

    if (!trimmed) {
      setError("Note content cannot be empty.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/students/${studentId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save note");
      }

      setContent("");
      setSuccess("Note saved successfully.");

      await refreshNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">New Note</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add an internal note for court or admin follow-up.
          </p>
        </div>

        <label
          htmlFor="student-note"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Note
        </label>

        <textarea
          id="student-note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Write a note here..."
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Multiline notes are supported.
          </p>

          <button
            type="button"
            onClick={handleSaveNote}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Previous Notes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Newest first • {noteCountText}
            </p>
          </div>

          <button
            type="button"
            onClick={refreshNotes}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No notes yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Saved notes for this student will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">User Name</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => (
                    <tr
                      key={note.id}
                      className="border-b border-slate-100 align-top last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDateTime(note.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                        {note.author.name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <div className="max-w-3xl whitespace-pre-wrap break-words leading-6">
                          {note.content}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}