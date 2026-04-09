# Contributing to Second Bell

Welcome. This document is written for the development team or capstone group picking this project up after the initial build. It covers how the codebase is structured for contribution, how to work with the existing patterns, and what Phase 2 looks like.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Branching and PR Workflow](#branching-and-pr-workflow)
3. [Project Conventions](#project-conventions)
4. [Adding a New API Route](#adding-a-new-api-route)
5. [Adding a New Page](#adding-a-new-page)
6. [Working with the Database](#working-with-the-database)
7. [Writing Tests](#writing-tests)
8. [Phase 2 Roadmap](#phase-2-roadmap)

---

## Getting Started

Follow the [Local Development Setup](README.md#local-development-setup) section in the README to get a running instance.

Quick reference:

```bash
npm install
docker run --name truancy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=truancycloud \
  -e POSTGRES_DB=mydb \
  -p 5433:5432 -d postgres:15
# create .env (see README)
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

---

## Branching and PR Workflow

- **Never commit directly to `main`.**
- Branch off `main` for every feature or fix:
  ```bash
  git checkout main && git pull origin main
  git checkout -b feature/your-feature-name
  ```
- Open a PR against `main` when done.
- CI runs `npm run test` (Vitest) — all tests must pass before merging.
- Keep commits focused and atomic. Prefer multiple small commits over one large one.

---

## Project Conventions

### Auth guard — always call `requireAuth` first

Every server component and API route that touches protected data must call `requireAuth` at the top:

```ts
import { requireAuth } from "@/lib/auth";

const auth = await requireAuth(["COURT", "ADMIN"]);
if (auth.error) redirect("/login");

const session = auth.session;
// session.countyId, session.schoolId, session.role are now available
```

Never trust client-supplied `schoolId` or `countyId` without verifying it against the session.

### RBAC data scoping

All database queries must be scoped to the authenticated user's context:

```ts
// COURT — scope to session.countyId
const students = await prisma.student.findMany({
  where: { school: { countyId: session.countyId } }
});

// SCHOOL — scope to session.schoolId
const students = await prisma.student.findMany({
  where: { schoolId: session.schoolId }
});

// ADMIN — no scoping required
```

Never return data from other counties or schools, even if the client requests it.

### UI components

Shared components live in `app/components/ui/`:

- `button.tsx` — `Button` with variants `default | outline | ghost | destructive` and sizes `sm | default | lg | icon`. Supports `asChild` for rendering as a link via `@radix-ui/react-slot`.
- `badge.tsx` — `Badge` for upload status and risk labels. Use `uploadStatusVariant(status)` and `riskVariant(label)` helpers.
- `utils.ts` — `cn(...classes)` utility (clsx + tailwind-merge).

> **Do not use the shadcn CLI** — it writes `tailwind.config.js` and CSS variables that break Tailwind v4. Install components manually using the same CVA pattern.

### Server vs. client components

- Pages that need `searchParams`, database access, or auth checks: **server components** (no `"use client"`).
- Pages that need `useState`, `useEffect`, `useRouter`, or event handlers: **client components** (`"use client"` at top).
- Prefer server components for data fetching. Wrap client-only subtrees in `<Suspense>`.

### API routes

- Use `export const runtime = "nodejs"` on any route using `@react-pdf/renderer`, `bcrypt`, or other Node.js-only packages.
- Use `export const dynamic = "force-dynamic"` on routes that must not be cached.
- Return `Response.json(...)` (not `NextResponse.json`) for consistency with the Node runtime routes.

---

## Adding a New API Route

1. Create the file at `app/api/your-route/route.ts`
2. Call `requireAuth(["ROLE"])` at the top — never skip this
3. Scope all Prisma queries to the session user's county/school
4. Return typed JSON with appropriate status codes

Example skeleton:

```ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["COURT", "ADMIN"]);
  if (auth.error) redirect("/login");

  const session = auth.session;

  // scope query to session
  const data = await prisma.something.findMany({
    where: session.role === "ADMIN"
      ? {}
      : { school: { countyId: session.countyId } }
  });

  return Response.json({ data });
}
```

---

## Adding a New Page

1. Create `app/your-page/page.tsx`
2. If it's a server component (recommended default), call `requireAuth` at the top
3. If it needs client interactivity, add `"use client"` and use `useSession()` from `next-auth/react`
4. Use the existing layout patterns: `bg-gradient-to-br from-slate-50 to-blue-50` for backgrounds, the frosted glass header style from `app/dashboard/page.tsx`

---

## Working with the Database

### Making a schema change

```bash
# Edit prisma/schema.prisma
npx prisma migrate dev --name describe-your-change
npx prisma generate
```

`migrate dev` creates a new migration file under `prisma/migrations/` and regenerates the client. Commit both.

### After pulling a branch with schema changes

```bash
npx prisma migrate deploy
npx prisma generate
```

If you see TypeScript errors about missing models after a pull, you likely just need `npx prisma generate`.

### Prisma Studio (visual DB browser)

```bash
npx prisma studio
```

Useful for inspecting and manually inserting seed data during development.

---

## Writing Tests

Tests live in `tests/` and run with Vitest. All existing tests mock Prisma and NextAuth — no live database is needed.

```bash
npm run test               # run all tests
npx vitest run tests/foo.test.ts  # run a single file
```

### Test conventions

- Mock Prisma with `vi.mock("@/lib/prisma", ...)`
- Mock NextAuth with `vi.mock("next-auth/next", ...)`
- Test RBAC explicitly: write one test per role that should succeed and one per role that should be blocked
- Test with `Promise.resolve({ id: "..." })` for `params` when testing async server components

---

## Phase 2 Roadmap

The following features were designed and scoped for Phase 2. They are intentional next steps for any team picking this project up.

---

### Parent Portal

**What:** A dedicated portal for parents to log in and view their child's attendance data and risk status.

**Schema work already done:**
- `Role.PARENT` exists in `prisma/schema.prisma`
- `User.studentId` field links a parent account to a `Student` record
- `User.firstTimeUser` and `User.needsPasswordReset` fields support account initialization flow

**What still needs building:**
- Parent-facing pages: `/parent/dashboard`, `/parent/student/[id]`
- Account provisioning: court generates a parent account (or sends an invite), parent completes setup with OTP
- `requireAuth(["PARENT"])` scoping to `session.studentId` only
- The PDF notice already has a `parentPortalInstructions` field — populate it in `app/api/students/[id]/notice/route.tsx` once the portal URL and login flow are confirmed

**Email infrastructure is already wired:** `app/api/send-email/route.ts` uses Resend and is set up to send OTP and password reset emails.

---

### Automatic Warning Letter Delivery

**What:** Instead of a court user manually downloading a PDF and mailing it, the system sends the truancy notice directly to the parent's email on file.

**Depends on:** Parent accounts with verified email addresses (parent portal, above).

**Implementation path:**
1. Add a `parentEmail` field to `Student` (or use `User.email` for the linked parent account)
2. In `app/api/students/[id]/notice/route.tsx`, after generating the PDF buffer, call Resend with the buffer as an attachment
3. Add a `noticeSentAt` timestamp to `Student` or a separate `TruancyNotice` model for audit tracking
4. Court user gets a confirmation UI rather than a download prompt

**Key file:** `lib/pdf/letter-template.ts` — `buildLetterParagraphs()` contains the formal letter body. This is where law-student-authored language should be dropped in when received.

---

### DocuSign Integration

**What:** Formal court documents (truancy agreements, hearing notices) require signatures from parents/guardians. DocuSign provides a compliant e-signature workflow.

**Implementation path:**
1. Install the DocuSign eSignature Node.js SDK
2. After generating the PDF notice in `app/api/students/[id]/notice/route.tsx`, POST it to DocuSign as an envelope
3. Add the parent email as a signer recipient
4. Store the DocuSign `envelopeId` on the student or a new `TruancyCase` model
5. Webhook endpoint (`app/api/docusign/webhook/route.ts`) to receive signature completion events and update case status

**Note:** DocuSign requires an account with the eSignature API enabled. Sandbox credentials can be obtained free through the DocuSign developer portal.

---

### Zoom Hearing Integration

**What:** When a student is flagged for a court hearing, the system schedules a Zoom meeting and sends the link to the parent and court user automatically.

**Implementation path:**
1. Use the Zoom REST API (OAuth 2.0 server-to-server app) to create meetings
2. Trigger from a "Schedule Hearing" action on the student detail page (COURT role only)
3. Store the `zoomMeetingId` and `meetingTime` on a `TruancyCase` or `CourtHearing` model
4. Send the meeting link to the parent via Resend (email infra already in place)
5. Surface upcoming hearings on the court dashboard

---

### Case Lifecycle / State Machine

**What:** A formal `TruancyCase` model tracking the full lifecycle of a truancy case from first flag to resolution.

**Proposed states:**

```
FLAGGED → NOTICE_SENT → HEARING_SCHEDULED → RESOLVED | ESCALATED
```

**Why it matters:** Currently the system tracks attendance data but has no persistent case state. Court users have no way to mark a case as resolved, note the outcome of a hearing, or track which students have been contacted. A `TruancyCase` model would tie together the student, uploaded notices, DocuSign envelope, Zoom hearing, and resolution outcome in one place.

---

### Admin User Management UI

**What:** A page for admins to create and manage court/school user accounts directly in the app without needing database access.

**What exists:** Routes for counties and schools. No user creation/editing UI.

**What to build:** `/admin/users` page with the ability to create COURT and SCHOOL users, assign them to a county or school, and reset passwords. The `NEXTAUTH_SECRET`-based password flow is already in place — just need the UI and a `POST /api/admin/users` route.

---

*For questions about the current implementation, refer to the inline `TODO` comments in `lib/pdf/letter-template.ts` and `app/api/students/[id]/notice/route.tsx`, and the git log for context on individual decisions.*
