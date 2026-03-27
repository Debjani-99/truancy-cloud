Truancy Cloud is a Next.js (App Router) full-stack web application designed to securely manage truancy-related data for schools and courts.

The project supports role-based access, secure authentication, and scalable cloud deployment.
The system allows:
- Schools to upload attendance reports (PDFs)
- Courts to process and analyze attendance data
- Role-based access to ensure secure and scoped data visibility

The project is also set up to be containerized with Docker and deployed to NRP (using Kubernetes).

- **Note:** Deployment is handled separately using Docker/Kubernetes.

## Core Features

- Secure login using email + password
- Role-based access control (ADMIN, COURT, SCHOOL)
- Session includes role and scope (county/school)
- County-scoped data access for court users
- Server-side route protection for authenticated pages
- Multi-tenant architecture with county- and school-scoped access
- PDF upload validation (type + size + structure)
- Attendance PDF parsing (ProgressBook format)
- Data normalization and ingestion into database
- Student-level attendance aggregation
- Truancy % calculation and risk classification
- Court review dashboard with:
  - Filtering (risk level)
  - Sorting (truancy %, name)
- Upload status tracking (PENDING, PROCESSING, PARSED, FAILED)

---

## System Flow (End-to-End)

1. School uploads attendance PDF
2. File is validated (type, size, structure)
3. File is stored in Ceph S3
4. Upload record is created (status = PENDING)
5. Court user triggers processing
6. PDF is parsed into structured data
7. Data is normalized and validated
8. Student records are created/updated in database
9. Attendance records are stored (year-to-date snapshot)
10. Truancy % is calculated
11. Results are displayed in the review dashboard

----

## Tech Stack

- **Frontend & Backend**
  - Next.js (App Router)
  - TypeScript
  - Tailwind CSS (UI styling)

- **Authentication & Authorization**
  - Auth.js / NextAuth
  - Credential-based login (email + password)
  - Role-based access (RBAC)
  - JWT-based sessions
  - Session scoping:
    - countyId for COURT users
    - schoolId for SCHOOL users

- **Database**
  - PostgreSQL
  - Prisma ORM
  - Seed scripts for initial users

- **File storage**
  - NRP Ceph S3 (S3-compatible object storage)

- **PDF processing**
  - pdf-parse (structured extraction)

- **Deployment**
  - Docker (containerization)
  - Kubernetes (NRP / Nautilus cluster)
 
---

## System Requirements

Before running the project, make sure you have the following installed:

- **Node.js (v18 or higher recommended)**

- **npm (v9 or higher)**

- **Docker (for containerization and DB)**

- **kubectl (for Kubernetes deployment to NRP)**

---

## Database (Docker-Based PostgreSQL)

This project runs PostgreSQL using Docker instead of a locally installed PostgreSQL instance.

**Required**

- Docker Desktop installed and running

Check Docker:

```bash
docker --version
docker ps
```

---

## Start PostgreSQL Container

```bash
docker run --name truancy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=truancycloud \
  -e POSTGRES_DB=mydb \
  -p 5433:5432 \
  -d postgres:15
```
---

## Authentication & Access Control Details

- **When a user logs in, their session includes**:

  - id
  - email
  - firstName
  - lastName
  - role
  - countyId (COURT users)
  - schoolId (SCHOOL users)

- This session data is available via:
  - useSession() (client)
  - getServerSession() (server)
  - /api/auth/session

## Role Enforcement

- Logged-out users are redirected to /login
- Logged-in users with the wrong role are blocked from protected pages
- Access is enforced at the page and API level, not just the UI

---

## Key Design Decisions

### Cumulative Data Model

- Each upload represents a **year-to-date snapshot**
- Prevents duplicate records
- Simplifies data consistency
- Tradeoff: no historical tracking yet

---

### RBAC at Multiple Layers

- Enforced at:
  - UI level
  - API level
  - Database queries
- Ensures strong data isolation between schools and counties

---

### PDF Parsing Approach

- Uses pattern-based parsing (pdf-parse)
- Optimized for known format (ProgressBook)
- Tradeoff: less flexible for unknown formats

---

## Project Folder Structure

```bash
truancy-cloud/
├── app/                    # Next.js App Router (pages, layouts, UI)
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Global layout
│   ├── globals.css        # Global styles
│   └── session-wrapper.tsx# Auth provider (NextAuth)

├── admin/                 # Admin-only views (manage courts, schools)
├── dashboard/             # Role-based landing page after login
├── upload/                # School upload UI
├── review/                # Court/Admin review workspace

├── api/                   # Backend API routes
│   ├── auth/              # Authentication (NextAuth)
│   ├── uploads/           # Upload handling + file retrieval
│   ├── reports/           # PDF processing + ingestion
│   ├── counties/          # County + school data (admin/court)
│   ├── schools/           # School data endpoints
│   └── court/             # Court-specific routes

├── prisma/                # Database schema + migrations
├── tests/                 # Automated tests (Vitest, RBAC)
├── kube/                  # Kubernetes deployment configs

├── .env                   # Environment variables (local)
├── package.json           # Project dependencies
├── README.md              # Project documentation

```

## Environment Variables

Create a .env file in the project root.

```bash
DATABASE_URL=postgresql://postgres:truancycloud@127.0.0.1:5433/mydb?schema=public
NEXTAUTH_SECRET=change-me-to-a-random-string
NEXTAUTH_URL=http://localhost:3000
```

## Seed the Database

Run the following commands to initialize the database and create demo data:

```bash
npx prisma db push
npm run seed
```

## Demo Accounts

The following accounts are available for testing different roles within the system:

| Role   | Email             | Password     |
|--------|------------------|--------------|
| Admin  | admin@secondbell.dev   | password123  |
| Court  | champaign_court@secondbell.dev | password123  |
| Court  | clark_court@secondbell.dev | password123  |
| School | urbana_school@secondbell.dev  | password123  |
| School | graham_school@secondbell.dev | password123  |
| School | springfield_school@secondbell.dev | password123  |

> These accounts are created using the seed script and are intended for development and demo purposes only.

### Seed Command

To generate these accounts locally:

```bash
npm run seed
```
---

## One-time setup

```bash
git clone <repo-url>
cd truancy-cloud
```

## Before you start: pull the latest main

This makes sure you’re not building on old code.

```bash
git checkout main
git pull origin main
```

## Getting Started (Local Development)

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Create a new branch (Please don’t work on main)

Before making changes, create a new branch:

```bash
git checkout -b your-branch-name
```

This creates a new branch and switches you to it.

- Check which branch you are on:

```bash
git branch
```

## Pushing Your Branch

After making changes:

```bash
git add .
git commit -m "your message"
```

Then:

First push of a new branch:

```bash
git push -u origin your-branch-name
```

After that, for the SAME branch, future pushes are just:

```bash
git push
```

## Create a Pull Request (PR) on GitHub

- Go to GitHub

- Click Pull requests tab → New pull request

- Base branch: main

- Compare branch: your-branch-name

- Click **Create pull request**

## After PR merged: update your local main

```bash
git checkout main
git pull origin main
```

Now you’re synced.

---

## Test Suite

### Automated

- **Vitest**
- RBAC validation
- API response testing


### Manual Testing

- Login as each role:
  - Admin
  - Court
  - School

- Upload PDFs:
  - Valid file
  - Invalid file

- Process reports

- Verify:
  - Status changes (PENDING → PROCESSING → PARSED/FAILED)
  - Truancy calculations

- Retry failed uploads

---

## Unique Aspects / Pitfalls

### PDF Parsing Constraints

- The system currently supports a specific attendance report format (ProgressBook)
- Variations in PDF structure (spacing, formatting) may cause parsing failures
- Parsing logic relies on pattern matching and may require updates for new formats

---

### Cumulative Data Model

- Attendance data is treated as **year-to-date snapshots**
- Re-uploading a report overwrites previous records for that student and school year
- The system does not yet support true historical tracking or time-series analysis

---

### RBAC Enforcement Complexity

- Role-based access control must be enforced consistently across:
  - UI (page access)
  - API routes
  - Database queries
- Improper enforcement can lead to data leakage across schools or counties

---

### File Storage (Ceph S3)

- Files are stored in an S3-compatible object storage (Ceph)
- Requires correct environment configuration
- Missing or incorrect credentials will break upload and retrieval functionality

---

### Common Issues / Debugging

- Docker container conflicts (e.g., PostgreSQL already running)
- Missing or incorrect `.env` variables
- Cached images in Kubernetes deployments (old versions running)
- Failed uploads due to invalid file format or size limits

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- Auth.js / NextAuth Documentation (https://authjs.dev/)
- Prisma Documentation (https://www.prisma.io/docs)
