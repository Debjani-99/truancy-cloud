# Second Bell — Truancy Cloud

**Second Bell** is a full-stack web application built for the Champaign County Juvenile Court (Supreme Court of Ohio) to manage school truancy data, assess student risk, and generate formal court notice letters.

Schools upload attendance reports. Court users process them, review per-student risk levels, and download PDF truancy notice letters. All data access is scoped by role — courts see only their county, schools see only their own data.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Data Model](#data-model)
4. [RBAC System](#rbac-system)
5. [End-to-End Workflow](#end-to-end-workflow)
6. [API Reference](#api-reference)
7. [Local Development Setup](#local-development-setup)
8. [Environment Variables](#environment-variables)
9. [Running Tests](#running-tests)
10. [Deployment (Kubernetes / NRP)](#deployment-kubernetes--nrp)
11. [Demo Access](#demo-access)
12. [Common Issues](#common-issues)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.4 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Auth | NextAuth v4 — JWT sessions, Credentials provider |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Database | PostgreSQL 15 |
| File Storage | Ceph S3 (NRP Nautilus) via `@aws-sdk/client-s3` |
| PDF Parsing | `pdf-parse` (ProgressBook format) |
| PDF Generation | `@react-pdf/renderer` |
| UI Components | CVA + Radix Slot + Tailwind (shadcn-style, manual — shadcn CLI incompatible with Tailwind v4) |
| Email | Resend |
| Tests | Vitest |
| Deployment | Docker + Kubernetes (NRP Nautilus cluster) |

> **Tailwind v4 note:** This project uses Tailwind v4 (`@tailwindcss/postcss`), which has no `tailwind.config.js`. The shadcn CLI is incompatible with v4 — UI components in `app/components/ui/` were installed manually.

---

## Architecture Overview

```
Browser
  │
  ├── Next.js App Router (SSR + Client Components)
  │     ├── /login              → Credentials auth via NextAuth
  │     ├── /dashboard          → Role-based landing
  │     ├── /upload             → School PDF upload
  │     ├── /review             → Court review queue (uploads list)
  │     ├── /review/results     → Per-upload parsed student results
  │     ├── /students           → Student list with risk filtering
  │     ├── /students/[id]      → Student detail: trend, notes, risk
  │     ├── /students/[id]/notes→ Court internal notes
  │     ├── /admin/courts       → Admin: county management
  │     ├── /admin/schools      → Admin: school management
  │     └── /settings/          → Change / forgot password
  │
  └── API Routes (/app/api/)
        ├── /auth/[...nextauth] → NextAuth session
        ├── /uploads            → POST: upload PDF to S3
        ├── /uploads/[id]/process → POST: trigger PDF parsing
        ├── /uploads/[id]/results → GET: parsed student results
        ├── /students           → GET: student list with risk flags
        ├── /students/[id]      → GET: student detail + attendance
        ├── /students/[id]/notice → GET: stream PDF truancy letter
        ├── /students/[id]/notes → GET/POST/DELETE: court notes
        ├── /counties           → GET: county list (admin)
        ├── /counties/[id]/schools → GET: schools in county
        ├── /schools/[id]       → GET: school detail
        ├── /send-email         → POST: send OTP / password reset
        └── /update-password    → POST: change password

External Services
  ├── Ceph S3 (NRP)   — PDF file storage
  ├── PostgreSQL       — all relational data
  └── Resend           — transactional email
```

### Key architectural patterns

- **`requireAuth(roles)`** (`lib/auth.ts`) — called at the top of every server component and API route. Returns the session or redirects. All data queries are scoped to `session.countyId` or `session.schoolId` depending on role.
- **Snapshot data model** — each upload is a year-to-date snapshot. Re-uploading a newer export for the same school year updates `AttendanceRecord` in place. `AttendanceHistory` preserves a row per upload for trend charting.
- **PDF generation is server-only** — `@react-pdf/renderer` runs with `export const runtime = "nodejs"` and streams the buffer directly as `Content-Type: application/pdf`.

---

## Data Model

```
County
  └── School (many)
        ├── User[] (role=SCHOOL)
        ├── Upload[]
        │     └── AttendanceReport
        │           ├── AttendanceRecord[] (current YTD snapshot per student)
        │           └── AttendanceHistory[] (one row per upload, for trend)
        └── Student[]
              ├── AttendanceRecord[] (current)
              ├── AttendanceHistory[] (trend)
              ├── StudentNote[] (court internal notes)
              └── User? (future: parent portal account link)

User
  ├── role: ADMIN | COURT | SCHOOL | PARENT
  ├── countyId? (COURT users)
  ├── schoolId? (SCHOOL users)
  └── studentId? (PARENT users — future)
```

### Risk classification

Computed from `unexcusedHours / totalAbsHours` on each `AttendanceRecord`:

| Label | Threshold |
|---|---|
| Normal | < 5% |
| At Watch | ≥ 5% |
| Court Warning | ≥ 7% |
| At Risk | ≥ 10% |

---

## RBAC System

All access is enforced at three layers: UI, API route, and database query.

| Role | Scope | Can do |
|---|---|---|
| `ADMIN` | All counties + schools | Full read/write, user management |
| `COURT` | Own `countyId` only | Process uploads, view students, generate PDF notices |
| `SCHOOL` | Own `schoolId` only | Upload PDFs, view own students (no letter generation) |
| `PARENT` | Own `studentId` only | View own student (future — not yet wired) |

Session payload (JWT):
```ts
{
  id: string
  email: string
  firstName: string
  lastName: string
  role: "ADMIN" | "COURT" | "SCHOOL" | "PARENT"
  countyId?: string   // COURT users
  schoolId?: string   // SCHOOL users
}
```

Use `requireAuth(["COURT", "ADMIN"])` in server components and API routes to enforce access.

---

## End-to-End Workflow

### 1. School uploads an attendance PDF

- School user navigates to `/upload`
- Selects a ProgressBook-format PDF attendance export
- `POST /api/uploads`: validates file type/size, uploads to Ceph S3, creates `Upload` record with `status = PENDING`

### 2. Court processes the upload

- Court user navigates to `/review` — sees all uploads for their county
- Clicks **Process** on a pending upload
- `POST /api/uploads/[id]/process`:
  - Fetches PDF from S3
  - Parses with `lib/attendance/extract.ts` (pattern-based, ProgressBook format)
  - Normalizes with `lib/attendance/normalize.ts`
  - Ingests with `lib/attendance/ingest.ts`:
    - Upserts `Student` records
    - Upserts `AttendanceRecord` (current YTD snapshot)
    - Appends `AttendanceHistory` row (for trend)
    - Creates `AttendanceReport`
  - Sets `Upload.status = PARSED` (or `FAILED` on error)

### 3. Court reviews results

- Clicks **Results** on a PARSED upload → `/review/results?uploadId=...`
- Table shows all students from that upload with risk badges
- Filter by threshold (5% / 7% / 8% / 10%+) or view all
- Click **Detail** to open student detail page

### 4. Student detail page

`/students/[id]` — full per-student dashboard:
- Identity card (name, school, risk badge)
- Info cards (school year, latest report date, snapshot count)
- **Absence Trend** chart — line graph of unexcused % across all uploaded snapshots
- **Review Summary** — recent change delta + rule-based risk message
- **Court Notes** — internal notes for court follow-up (COURT/ADMIN only in practice)
- **Attendance History** table — all snapshots

### 5. Generate PDF truancy notice

- Court/Admin user on student detail page clicks **Generate Letter**
- Browser navigates to `GET /api/students/[id]/notice`
- Server builds `LetterData` from student + school + county + attendance records
- Renders `TruancyNoticePdf` React PDF document via `@react-pdf/renderer`
- Streams PDF buffer as download with `Content-Disposition: attachment`
- PDF includes: court header, formal letter body (law student language), attendance summary table, parent portal instructions section

### 6. Student list (alternate entry point)

- Dashboard "View Students" button → `/students?schoolId=...`
- Filterable by risk status and name search
- Same **Detail** link navigates to student detail

---

## API Reference

### Authentication

All routes check the session. `requireAuth(roles)` in `lib/auth.ts` returns the session or throws a redirect.

### Uploads

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/uploads` | SCHOOL | Upload PDF to S3, create Upload record |
| `GET` | `/api/uploads` | COURT, ADMIN | List uploads scoped to county/all |
| `POST` | `/api/uploads/[id]/process` | COURT, ADMIN | Trigger PDF parse + ingest |
| `GET` | `/api/uploads/[id]/results` | COURT, ADMIN | Return parsed student results for upload |

### Students

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/students` | ALL | List students with computed risk flags |
| `GET` | `/api/students/[id]` | ALL | Student detail with all attendance records |
| `GET` | `/api/students/[id]/notice` | COURT, ADMIN | Stream PDF truancy notice letter |
| `GET` | `/api/students/[id]/notes` | COURT, ADMIN | List court notes for student |
| `POST` | `/api/students/[id]/notes` | COURT, ADMIN | Create court note |
| `DELETE` | `/api/students/[id]/notes` | COURT, ADMIN | Delete court note |

### Admin / Structure

| Method | Route | Role | Description |
|---|---|---|---|
| `GET` | `/api/counties` | ADMIN | List all counties |
| `GET` | `/api/counties/[id]/schools` | ADMIN, COURT | List schools in county |
| `GET` | `/api/schools/[id]` | ADMIN, COURT, SCHOOL | School detail |

### Account

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/api/update-password` | ALL | Change password |
| `POST` | `/api/send-email` | Public | Send password reset OTP |

---

## Local Development Setup

### Prerequisites

- Node.js v18+
- npm v9+
- Docker Desktop (for local PostgreSQL)

### 1. Clone and install

```bash
git clone <repo-url>
cd truancy-cloud
npm install
```

### 2. Start a local PostgreSQL container

```bash
docker run --name truancy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=truancycloud \
  -e POSTGRES_DB=mydb \
  -p 5433:5432 \
  -d postgres:15
```

### 3. Configure environment variables

Create `.env` in the project root:

```bash
DATABASE_URL=postgresql://postgres:truancycloud@127.0.0.1:5433/mydb?schema=public
NEXTAUTH_SECRET=any-random-string-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# Optional: required for PDF upload flow
S3_ENDPOINT=https://s3-west.nrp-nautilus.io
S3_REGION=us-west-1
S3_BUCKET=truancy-cloud
S3_ACCESS_KEY=<your-key>
S3_SECRET_KEY=<your-secret>
```

> Without S3 credentials, uploads will fail. Everything else (student detail, PDF generation, notes) works locally without S3 if you seed or manually insert data.

### 4. Run migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

The seed creates:
- Counties: Champaign, Clark
- Schools: Urbana High, Graham High, Springfield High
- Demo users (see [Demo Access](#demo-access))

> **Demo data note:** The seed does not create student or attendance records. To test the full flow, either upload and process a ProgressBook-format PDF, or manually insert records via `prisma studio` (`npx prisma studio`).

### 5. Generate the Prisma client

```bash
npx prisma generate
```

Run this any time `prisma/schema.prisma` changes.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | Yes | Base URL of the app (e.g. `http://localhost:3000`) |
| `S3_ENDPOINT` | For uploads | Ceph S3 endpoint URL |
| `S3_REGION` | For uploads | S3 region |
| `S3_BUCKET` | For uploads | S3 bucket name |
| `S3_ACCESS_KEY` | For uploads | S3 access key |
| `S3_SECRET_KEY` | For uploads | S3 secret key |

---

## Running Tests

```bash
npm run test
```

Tests run with Vitest. The suite covers:

| File | What it tests |
|---|---|
| `tests/attendance.extract.test.ts` | PDF extraction logic |
| `tests/attendance.ingest.test.ts` | Data normalization + DB upsert logic |
| `tests/api.uploads.post.test.ts` | Upload API validation, S3 error handling |
| `tests/api.uploads.get.*.test.ts` | Upload list RBAC (court, school, admin) |
| `tests/api.schools.id.rbac.test.ts` | School detail RBAC |
| `tests/api.counties.schools.rbac.test.ts` | County → schools RBAC |
| `tests/api.upload-id.test.ts` | Upload-by-ID access |
| `tests/students.id.rbac.test.ts` | Student detail RBAC (court county scope, school scope) |
| `tests/sanity.test.ts` | Basic sanity check |

All API tests mock Prisma and NextAuth — no database required to run the suite.

---

## Key Code Locations

| Purpose | Path |
|---|---|
| NextAuth config | `app/api/auth/[...nextauth]/route.ts` |
| Auth guard (requireAuth) | `lib/auth.ts` |
| Prisma client | `lib/prisma.ts` |
| Database schema | `prisma/schema.prisma` |
| Seed script | `prisma/seed.ts` |
| PDF extraction (parse) | `lib/attendance/extract.ts` |
| Data normalization | `lib/attendance/normalize.ts` |
| DB ingestion | `lib/attendance/ingest.ts` |
| PDF letter template | `lib/pdf/letter-template.ts` |
| PDF React document | `lib/pdf/TruancyNoticePdf.tsx` |
| UI components | `app/components/ui/` |
| Student list page | `app/students/page.tsx` |
| Student detail page | `app/students/[id]/page.tsx` |
| Review queue | `app/review/page.tsx` |
| Results page | `app/review/results/page.tsx` |
| Kubernetes configs | `kube/` |

---

## Project Folder Structure

```
truancy-cloud/
├── app/
│   ├── api/                    # All API routes
│   │   ├── auth/               # NextAuth
│   │   ├── uploads/            # Upload CRUD + process + results
│   │   ├── students/           # Student list, detail, notice, notes
│   │   ├── counties/           # County + school structure
│   │   ├── schools/            # School detail
│   │   ├── send-email/         # Resend transactional email
│   │   └── update-password/    # Password change
│   ├── components/
│   │   └── ui/                 # Button, Badge, utils (manual shadcn-style)
│   ├── admin/                  # Admin views (courts, schools)
│   ├── dashboard/              # Role-based dashboard
│   ├── help/                   # Contextual help pages
│   ├── review/                 # Court review queue + results
│   ├── settings/               # Change/forgot password
│   ├── students/               # Student list + detail + notes
│   └── upload/                 # School upload UI
├── lib/
│   ├── attendance/             # extract.ts, normalize.ts, ingest.ts, types.ts
│   ├── pdf/                    # letter-template.ts, TruancyNoticePdf.tsx
│   ├── auth.ts                 # requireAuth() guard
│   └── prisma.ts               # Prisma singleton
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── tests/                      # Vitest test suite
├── kube/                       # Kubernetes manifests
├── types/                      # Shared TypeScript types
└── public/                     # Static assets
```

---

## Deployment (Kubernetes / NRP)

The app is deployed on the [NRP Nautilus](https://nationalresearchplatform.org/) cluster using Kubernetes.

### Deploy infrastructure

```bash
kubectl -n truancy-cloud apply -f kube/postgres-pvc.yaml
kubectl -n truancy-cloud apply -f kube/postgres-deployment.yaml
kubectl -n truancy-cloud apply -f kube/postgres-service.yaml
kubectl -n truancy-cloud apply -f kube/deployment.yaml
kubectl -n truancy-cloud apply -f kube/service.yaml
kubectl -n truancy-cloud apply -f kube/ingress.yaml
```

### Required environment variables on the web deployment

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:truancyCloud@truancy-postgres-svc:5432/mydb?schema=public
NEXTAUTH_SECRET=<long random secret>
NEXTAUTH_URL=https://truancy-cloud-demo.nrp-nautilus.io
S3_ENDPOINT=...
S3_REGION=...
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

> The `DATABASE_URL` must use `truancy-postgres-svc` (the Kubernetes service name), not `localhost`.

### Seed the Kubernetes database

```bash
# 1. Port-forward the Postgres service
kubectl -n truancy-cloud port-forward svc/truancy-postgres-svc 5433:5432

# 2. In a new terminal, point Prisma at the forwarded port
export DATABASE_URL="postgresql://postgres:truancyCloud@127.0.0.1:5433/mydb?schema=public"

# 3. Run migrations and seed
npx prisma migrate deploy
npx prisma db seed

# 4. Restart the web pod to pick up fresh data
kubectl -n truancy-cloud rollout restart deployment truancy-web
```

### Useful kubectl commands

```bash
# Check pod status
kubectl -n truancy-cloud get pods

# Stream web logs
kubectl -n truancy-cloud logs deployment/truancy-web --tail=100 -f

# Check ingress
kubectl -n truancy-cloud get ingress
kubectl -n truancy-cloud describe ingress truancy-web-ingress

# Check env vars on the deployment
kubectl -n truancy-cloud get deployment truancy-web -o yaml

# Restart web pod
kubectl -n truancy-cloud rollout restart deployment truancy-web
```

### NRP resource expiry

NRP resources may expire after ~2 weeks of inactivity. If pods disappear, redeploy with the manifests above and reseed the database. The PVC must exist for Postgres data to persist across restarts.

---

## Post-Deploy Checklist

- [ ] `kubectl -n truancy-cloud get pods` — Postgres + web pods both `Running`
- [ ] Public URL loads: `https://truancy-cloud-demo.nrp-nautilus.io`
- [ ] Login works with `admin@secondbell.dev` / `password123`
- [ ] Court user can view and process uploads
- [ ] School user can upload a PDF
- [ ] Student list loads with risk badges
- [ ] Generate Letter downloads a PDF

---

## Demo Access

| Role | Email | Password |
|---|---|---|
| Admin | `admin@secondbell.dev` | `password123` |
| Court (Champaign) | `champaign_court@secondbell.dev` | `password123` |
| Court (Clark) | `clark_court@secondbell.dev` | `password123` |
| School (Urbana) | `urbana_school@secondbell.dev` | `password123` |
| School (Graham) | `graham_school@secondbell.dev` | `password123` |
| School (Springfield) | `springfield_school@secondbell.dev` | `password123` |

---

## Common Issues

**Login fails in production**
→ Ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set on the web deployment.

**App cannot connect to database**
→ In Kubernetes, `DATABASE_URL` must use `truancy-postgres-svc`, not `localhost`.

**Uploads fail**
→ Check all five S3 environment variables are set correctly on the deployment.

**`Module not found: Can't resolve '@radix-ui/react-slot'`**
→ Run `npm install`. The package is in `package.json` but wasn't installed locally.

**`npx prisma generate` errors after pulling**
→ A teammate may have added migrations. Run `npx prisma migrate deploy && npx prisma generate`.

**Public URL not loading**
→ Check ingress: `kubectl -n truancy-cloud get ingress`

**Seeded users not working**
→ Verify the seed was run against the Kubernetes database (via port-forward), not local.

**PDF generation fails in dev**
→ `@react-pdf/renderer` requires the Node.js runtime. Ensure `export const runtime = "nodejs"` is set on the notice route.
