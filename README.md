Truancy Cloud is a Next.js (App Router) full-stack web application designed to securely manage truancy-related data for schools and courts.

The project supports role-based access, secure authentication, and scalable cloud deployment.

The project is also set up to be containerized with Docker and deployed to NRP (using Kubernetes).

- **Note:** Deployment is handled separately using Docker/Kubernetes.

## Core Features

- Secure login using email + password
- Role-based access control (ADMIN, COURT, SCHOOL)
- Session includes role and scope (county/school)
- County-scoped data access for court users
- Server-side route protection for authenticated pages
- Multi-tenant architecture with county- and school-scoped access

## Tech Stack

- **Frontend & Backend**
  - Next.js (App Router)
  - TypeScript
  - Tailwind CSS (UI styling)

- **Authentication & Authorization**
  - Auth.js / NextAuth
  - Credential-based login (email + password)
  - Role-based access (RBAC) for Admin, Court, and School
  - JWT-based sessions
  - Session scoping:
    - countyId for COURT users
    - schoolId for SCHOOL users

- **Database**
  - PostgreSQL
  - Prisma ORM
  - Seed scripts for initial users (Admin, Court, School)

- **File storage**
  - NRP Ceph S3 (S3-compatible object storage)

- **PDF processing**
  - pdf-parse or pdfjs (Node libraries)

- **Deployment**
  - Docker (containerization)
  - Kubernetes (NRP / Nautilus cluster)

## System Requirements

Before running the project, make sure you have the following installed:

- **Node.js (v18 or higher recommended)**

- **npm (v9 or higher)**

- **Docker (for containerization and DB)**

- **kubectl (for Kubernetes deployment to NRP)**


## Database (Docker-Based PostgreSQL)

This project runs PostgreSQL using Docker instead of a locally installed PostgreSQL instance.

**Required**

- Docker Desktop installed and running

Check Docker:

```bash
docker --version
docker ps
```
## Start PostgreSQL Container

```bash
docker run --name truancy-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=truancycloud \
  -e POSTGRES_DB=mydb \
  -p 5433:5432 \
  -d postgres:15
```

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

## Project Folder Structure

**app/** : Top level view

- **/page.tsx** : Landing / entry page.
- **/layout.tsx** : Global layout (wrapper for all pages).
- **/globals.css** : Global styles.
- **/session-wrapper.tsx** : Client-side session provider (NextAuth).

**admin/** : Admin-only pages (courts, schools, and admin dashboards)

- **courts/page.tsx** :
  - **courts/[countyID]/page.tsx** :

- **schools/page.tsx** :

**api/** : Backend API routes used by the frontend

- **admin/ping/route.ts** : Check endpoint for admin API routes.

- **auth/[nextAuth]/route.ts** : Handles authentication (login, logout, sessions) using Auth.js / NextAuth.

- **counties/route.ts** : Returns the list of counties (admin view).
  - **counties/[id]/route.ts** : Fetches details for a specific county by ID.
    - **counties/[id]/schools/route.ts** : Returns all schools belonging to a specific county (admin or court-scoped).

- **court/ping/route.ts**     : Check endpoint for court routes.
- **court/schools/route.ts**  : Returns schools accessible to the logged-in court user.

- **reports/upload/route.ts** : Handles PDF upload and metadata storage (likely S3 + DB).

- **school/me/route.ts** : Returns the logged-in school user’s own school information(session-scoped).

- **schools/route.ts** : Returns list of schools (admin view).
  - **schools/[id]/route.ts** : Fetches details for a specific school by ID (RBAC protected).

- **uploads/route.ts** : Returns list of uploaded files (filtered by role).
  - **uploads/[id]/file/route.ts** : Returns the actual PDF file from object storage (Ceph S3).

**dashboard/**  : Main landing page after login (role-based UI).

**login/**      : Authentication entry point.

**review/**     : Court/Admin review workspace.

**upload/**     : School upload workspace.

**prisma/**     : Database schema and migrations (Postgres).

**tests/**      : Automated tests for API routes and access control logic.
**kube/**       : Kubernetes deployment configuration for NRP (Nautilus cluster).


## Environment Variables

Create a .env file in the project root.

```bash
DATABASE_URL=postgresql://postgres:truancycloud@127.0.0.1:5433/mydb?schema=public
NEXTAUTH_SECRET=change-me-to-a-random-string
NEXTAUTH_URL=http://localhost:3000
```

## Seed the Database

```bash
npx prisma db push
npm run seed
```

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- Auth.js / NextAuth Documentation (https://authjs.dev/)
- Prisma Documentation (https://www.prisma.io/docs)
