import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import StudentNotesClient from "./StudentNotesClient";

type NotesPageProps = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedStudent(studentId: number, session: any) {
  if (session.user.role === "ADMIN") {
    return prisma.student.findFirst({
      where: { id: studentId },
      include: {
        school: true,
      },
    });
  }

  if (session.user.role === "COURT") {
    if (!session.user.countyId) return null;

    return prisma.student.findFirst({
      where: {
        id: studentId,
        school: {
          countyId: session.user.countyId,
        },
      },
      include: {
        school: true,
      },
    });
  }

  return null;
}

export default async function StudentNotesPage({ params }: NotesPageProps) {
  const auth = await requireAuth(["ADMIN", "COURT"]);
  if (auth.error) {
    redirect("/login");
  }

  const session = auth.session;
  const { id } = await params;
  const studentId = Number(id);

  if (Number.isNaN(studentId)) {
    notFound();
  }

  const student = await getAuthorizedStudent(studentId, session);

  if (!student) {
    notFound();
  }

  const initialNotes = await prisma.studentNote.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const serializedNotes = initialNotes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    author: {
      id: note.author.id,
      firstName: note.author.firstName,
      lastName: note.author.lastName,
      name: `${note.author.firstName} ${note.author.lastName}`.trim(),
    },
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Student Notes</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {student.firstName} {student.lastName}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Student ID: {student.id}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Ref: {student.studentRef ?? "Not available"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                School: {student.school.name}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href={`/students/${student.id}`}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Student
            </Link>
          </div>
        </div>

        <StudentNotesClient
          studentId={student.id}
          initialNotes={serializedNotes}
        />
      </div>
    </main>
  );
}