Truancy Cloud is a Next.js (App Router) full-stack web application designed to securely manage truancy-related data for schools and courts.

The project supports role-based access, secure authentication, and scalable cloud deployment.
The system allows:
- Schools to upload attendance reports (PDFs)
- Courts to process and analyze attendance data
- Role-based access to ensure secure and scoped data visibility

The project is also set up to be containerized with Docker and deployed to NRP (using Kubernetes).

- **Note:** Deployment is handled separately using Docker/Kubernetes.

---

## Current Implementation Status

### Fully Implemented

- Per-student dashboard (detail page)
  - Displays student identity and latest attendance snapshot
  - Shows absence percentage and current risk status

- Attendance metrics
  - Total absence hours
  - Truancy (absence) percentage calculation

- Attendance history table
  - Displays multiple uploaded snapshots per student
  - Shows changes across reports

- Basic trend visualization
  - Line chart of absence % over time
  - Threshold indicators (5%, 7%, 10%)

- Filtering and review workflows
  - Courts can filter students by risk level
  - School-scoped and county-scoped access enforced via RBAC

- Role-based dashboards
  - Admin: full system access
  - Court: county-level access
  - School: upload + limited visibility

- Court workflow actions
  - Courts can review flagged students
  - Courts can generate truancy letters

---

### Partially Implemented / Demo-Ready

- Trend analysis
  - Based on uploaded snapshots (not full time-series engine)
  - Limited to available reports

- Student filtering
  - Basic filtering by thresholds implemented
  - Advanced filtering (multi-dimensional) not yet complete

- Truancy letter generation
  - Generates draft letter with student data
  - Includes placeholders for manual completion
  - Preview/edit workflow still evolving

- OTP / parent access system
  - Concept implemented in flow design
  - Partial backend/frontend integration

- QR code integration
  - Planned in workflow
  - Not fully wired into final system

---

### Not Yet Fully Implemented

- Full workflow state engine (case lifecycle tracking)
  - No persistent state machine for cases yet

- Advanced analytics / predictions
  - No ML or predictive modeling yet

- True historical time-series tracking
  - System uses snapshot-based history (not continuous tracking)

- Cross-county analytics dashboards (advanced)
  - Admin visibility exists
  - Deep analytics still limited

- Performance optimizations at scale
  - Basic functionality works
  - Large-scale optimization not yet addressed

---

## Demo Access

Public demo URL:
https://truancy-cloud-demo.nrp-nautilus.io

Seeded demo accounts:

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

---

## Important NRP Note
NRP resources may expire after about 2 weeks of inactivity or according to cluster cleanup rules.
If the pods or deployment disappear, redeploy using the Kubernetes manifests and reseed the database.

## Redeploy Steps
1. Apply namespace/resources if needed
2. Deploy Postgres
3. Deploy Postgres service
4. Deploy web app
5. Deploy web service
6. Deploy ingress
7. Run Prisma migrations against the Kubernetes Postgres database
8. Seed the database
9. Restart the web deployment

## Example Commands

### Deploy infrastructure
```bash
kubectl -n truancy-cloud apply -f kube/postgres-pvc.yaml
kubectl -n truancy-cloud apply -f kube/postgres-deployment.yaml
kubectl -n truancy-cloud apply -f kube/postgres-service.yaml
kubectl -n truancy-cloud apply -f kube/deployment.yaml
kubectl -n truancy-cloud apply -f kube/service.yaml
kubectl -n truancy-cloud apply -f kube/ingress.yaml
```
---
## Kubernetes Web Deployment Environment Variables

The `truancy-web` deployment must include these environment variables:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://postgres:truancyCloud@truancy-postgres-svc:5432/mydb?schema=public`
- `NEXTAUTH_SECRET=<long random secret>`
- `NEXTAUTH_URL=https://truancy-cloud-demo.nrp-nautilus.io`

Without `NEXTAUTH_SECRET`, login will fail in production.
Without the Kubernetes `DATABASE_URL`, the web pod will not connect to the cluster Postgres service correctly.

---

## Seeding the Kubernetes Database

To seed the NRP database from your local machine:

1. Port-forward the Postgres service:
   kubectl -n truancy-cloud port-forward svc/truancy-postgres-svc 5433:5432

2. In a new terminal:
   export DATABASE_URL="postgresql://postgres:truancyCloud@127.0.0.1:5433/mydb?schema=public"

3. Run:
   npx prisma migrate deploy
   npx prisma db seed

4. Restart the web deployment:
   kubectl -n truancy-cloud rollout restart deployment truancy-web

> Port-forwarding is only needed while running local Prisma commands against the cluster DB. It can be closed afterward.
---

## When do I need to reseed?

You do NOT need to reseed if:
- the public URL is already working
- the database PVC still exists
- the seeded demo users can log in

You DO need to reseed if:
- the environment is redeployed from scratch
- the Postgres PVC is deleted
- the cluster database is empty

---

## Post-Deploy Verification Checklist

- `kubectl -n truancy-cloud get pods` shows Postgres and web pods as `Running`
- `kubectl -n truancy-cloud get svc` shows `truancy-postgres-svc` and `truancy-web-svc`
- `kubectl -n truancy-cloud get ingress` shows `truancy-web-ingress`
- Public URL loads: `https://truancy-cloud-demo.nrp-nautilus.io`
- Demo login works:
  - `admin@secondbell.dev`
  - `password123`
- Courts and schools can access their scoped views
- School user can upload a PDF
- Court user can process a report

---

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

## Cloud Storage (Ceph / S3) Setup

Uploads are stored in Ceph S3-compatible storage.

The following environment variables must be set for uploads to work:

- S3_ENDPOINT
- S3_REGION
- S3_BUCKET
- S3_ACCESS_KEY
- S3_SECRET_KEY

If these are not provided, the app may fall back to local storage (if implemented), or uploads may fail.

Example:

S3_ENDPOINT=https://s3-west.nrp-nautilus.io  
S3_REGION=us-west-1  
S3_BUCKET=truancy-cloud  
S3_ACCESS_KEY=<your-key>  
S3_SECRET_KEY=<your-secret>

---

## Key Code Locations

- Authentication:
  /app/api/auth/[...nextauth]/route.ts

- Prisma client setup:
  /lib/prisma.ts

- Database schema:
  /prisma/schema.prisma

- Seed script:
  /prisma/seed.ts

- PDF parsing logic:
  /lib/attendance/parser.ts

- Data ingestion logic:
  /lib/attendance/ingest.ts

- Student dashboard:
  /app/students/[id]/page.tsx

- Upload API:
  /app/api/uploads/route.ts

- Kubernetes configs:
  /kube/

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

### Seed Command

To generate these accounts locally:

```bash
npm run seed
```
---


## Local Development Setup

Follow these steps to run the project locally.

---

### 1. Clone the repository

```bash
git clone <repo-url>
cd truancy-cloud
```

### 2. Install dependencies:

```bash
npm install
```

### 3. Create a new branch (Please don’t work on main)

Before making any changes, create and switch to a new branch:

```bash
git checkout -b your-branch-name
```
To confirm your current branch:

```bash
git branch
```

### 4. Start a local PostgreSQL database:

Run the following command to start a Postgres container:
   ```bash
   docker run --name truancy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=truancycloud \
  -e POSTGRES_DB=mydb \
  -p 5433:5432 \
  -d postgres:15
   ```
This will:

- create a database named mydb
- run on port 5433
- use username postgres
- use password truancycloud



### 5. Set environment variables (.env)

In the root of the project, create a file named .env and add:

```bash
DATABASE_URL=postgresql://postgres:truancycloud@127.0.0.1:5433/mydb?schema=public
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
```

### 6. Run database migrations:
   
   ```bash
   npx prisma migrate deploy
   ```
- This creates all required tables in the database.

### 7. Seed the database with demo data:
   
   ```bash
   npx prisma db seed
   ````

This will create:

- demo users
- counties
- schools

### 8. Start the development server:
   
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### 9. Pushing Your Branch

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

### 10. Create a Pull Request (PR) on GitHub

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

# Common Issues / Debugging

- Login fails in production  
  → Ensure NEXTAUTH_SECRET and NEXTAUTH_URL are set in the web deployment

- App cannot connect to database  
  → Ensure DATABASE_URL uses:
    truancy-postgres-svc (NOT localhost)

- Public URL not loading  
  → Check ingress:
    kubectl -n truancy-cloud get ingress

- Seeded users not working  
  → Ensure database was seeded against the Kubernetes DB (not local)

- Uploads failing  
  → Check S3 environment variables
  
- Docker container conflicts (e.g., PostgreSQL already running)
- Missing or incorrect `.env` variables
- Cached images in Kubernetes deployments (old versions running)
- Failed uploads due to invalid file format or size limits
- If the public site loads but login fails, verify the `truancy-web` deployment includes `NEXTAUTH_SECRET` and `NEXTAUTH_URL`.

### Check pods
kubectl -n truancy-cloud get pods

### Check logs
kubectl -n truancy-cloud logs deployment/truancy-web --tail=100

### Check ingress
kubectl -n truancy-cloud get ingress
kubectl -n truancy-cloud describe ingress truancy-web-ingress

### Check services
kubectl -n truancy-cloud get svc

### Restart web deployment
kubectl -n truancy-cloud rollout restart deployment truancy-web

### Check environment variables
kubectl -n truancy-cloud get deployment truancy-web -o yaml

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- Auth.js / NextAuth Documentation (https://authjs.dev/)
- Prisma Documentation (https://www.prisma.io/docs)
