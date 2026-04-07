import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedStudent(studentId: number, session: any) {
  if (session.user.role === "ADMIN") {
    return prisma.student.findFirst({
      where: { id: studentId },
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
    });
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth(["COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const { id } = await context.params;
  const studentId = Number(id);

  if (Number.isNaN(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const student = await getAuthorizedStudent(studentId, session);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const notes = await prisma.studentNote.findMany({
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

  return NextResponse.json({
    notes: notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: {
        id: note.author.id,
        firstName: note.author.firstName,
        lastName: note.author.lastName,
        name: `${note.author.firstName} ${note.author.lastName}`.trim(),
      },
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(["COURT", "ADMIN"]);
  if (auth.error) return auth.error;

  const session = auth.session;
  const { id } = await context.params;
  const studentId = Number(id);

  if (Number.isNaN(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const student = await getAuthorizedStudent(studentId, session);

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  let body: { content?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = body.content?.trim() ?? "";

  if (!content) {
    return NextResponse.json(
      { error: "Note content cannot be empty" },
      { status: 400 },
    );
  }

  const createdNote = await prisma.studentNote.create({
    data: {
      studentId,
      authorId: session.user.id,
      content,
    },
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

  return NextResponse.json(
    {
      note: {
        id: createdNote.id,
        content: createdNote.content,
        createdAt: createdNote.createdAt,
        updatedAt: createdNote.updatedAt,
        author: {
          id: createdNote.author.id,
          firstName: createdNote.author.firstName,
          lastName: createdNote.author.lastName,
          name: `${createdNote.author.firstName} ${createdNote.author.lastName}`.trim(),
        },
      },
    },
    { status: 201 },
  );
}