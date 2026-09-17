# Gradify

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**An automated Final Year Project (FYP) management and monitoring system for universities.**

## Overview

Gradify digitizes the entire Final Year Project lifecycle — from group formation to final scoring — replacing the spreadsheets, email threads, and physical sign-off sheets that most Computer Science / Software Engineering departments rely on. Students form groups and invite teammates, rank supervisor preferences, submit proposals, and complete weekly tasks, all from one dashboard. Supervisors assign and review tasks, run Minutes of Meeting (MOM), and track every group they're responsible for. Managers oversee their university's entire FYP pipeline — students, supervisors, groups, proposals, and reporting — while a Super Admin runs the platform across multiple universities at once.

The system is built as a multi-tenant, role-based platform: every university operates independently within Gradify, with its own departments, programs, academic sessions, and users, while a single Super Admin account can configure and monitor all of them. Security and accountability are built in from the ground up — rate-limited authentication, hashed credentials, a full audit trail of sensitive actions, and forced password resets on first login — so the platform is safe to operate as the system of record for real academic data.

Beyond the core workflow, Gradify layers in automation that saves staff time: bulk student onboarding from Excel/CSV with smart column detection, automatic FYP ID generation tied to the active semester, and a weekly cron job that pulls each student's GitHub activity so supervisors can see real engagement — not just self-reported status updates.

## ✨ Key Features

- 🔐 **Role-based access control** — four distinct roles (Super Admin, Manager, Supervisor, Student), each with its own dashboard and permissions
- 👥 **Group formation & invite system** — students create groups, invite teammates, and accept/reject invitations
- ✅ **Task management & scoring** — supervisors assign weekly tasks, students submit deliverables, progress is scored out of 15
- 📝 **Minutes of Meeting (MOM) system** — structured meeting records with agenda, decisions, action items, and next-meeting scheduling
- 📄 **Proposal management** — submission, supervisor/manager review, and approval workflow
- 📊 **Smart Excel/CSV import** — bulk student onboarding with automatic column detection (name, email, roll number, section)
- 🆔 **Auto FYP ID generation** — semester-aware sequencing (Fall/Spring) tied to each university's program
- 🔔 **Real-time notifications** — in-app alerts for invites, assignments, approvals, and task activity
- 💻 **GitHub commit tracking** — weekly automated sync of each student's public commit activity
- 🏫 **Admin panel (multi-university)** — manage universities, departments, programs, sessions, managers, and users from one place
- 🧾 **Audit trail** — every sensitive action (logins, password changes, user/group/task mutations) logged with actor, IP, and timestamp
- 🛡️ **Rate limiting & security** — Helmet security headers, per-route throttling, bcrypt password hashing, CORS allowlisting

## 🛠️ Tech Stack

| Frontend | Backend | Database | DevOps |
|---|---|---|---|
| Next.js 16 (App Router) | NestJS 11 | PostgreSQL 15 | Docker Compose |
| React 19 | Prisma ORM 7 | | ESLint |
| TypeScript | TypeScript | | GitHub |
| Tailwind CSS 4 | Passport + JWT | | |
| Zustand | class-validator | | |
| React Hook Form + Zod | bcryptjs | | |
| Axios | @nestjs/throttler + Helmet | | |
| Radix UI · lucide-react | @nestjs/schedule (cron) | | |

## 👤 System Roles

| Role | Responsibilities |
|---|---|
| **Super Admin** | Manages universities, departments, programs, and academic sessions across the platform; manages managers and all users (suspend, reset password, view login history); configures system-wide feature flags; posts announcements; reviews the platform-wide audit trail. |
| **Manager** | Runs a single university's FYP pipeline — students, supervisors, groups, supervisor assignment, tasks, MOM, proposals, workload balancing, and reporting for their own institution. |
| **Supervisor** | Reviews incoming supervisor-preference requests, manages assigned groups, assigns and reviews tasks, conducts MOM, reviews proposals, and tracks their schedule. |
| **Student** | Forms or joins a group, ranks supervisor preferences, submits proposals, completes and submits tasks, participates in MOM, and maintains a profile (including GitHub/LinkedIn for activity tracking). |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL 15 (or Docker, to run it via `docker-compose`)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abdullah4506878/gradify.git
   cd gradify
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file inside `backend/` (see [Environment Variables](#-environment-variables) below).

5. **Apply the database schema**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

6. **Seed initial data**
   ```bash
   node seed.js            # university, department, program, session, manager account
   node seed-admin.js      # super admin account
   node seed-settings.js   # system settings / feature flags
   ```

7. **Start the backend**
   ```bash
   npm run start:dev       # runs on http://localhost:4000
   ```

8. **Install & start the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev              # runs on http://localhost:3000
   ```

9. Open **http://localhost:3000** in your browser.

## 🔑 Environment Variables

Set these in `backend/.env`:

```
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
JWT_EXPIRES_IN
GITHUB_TOKEN
```

## 📁 Project Structure

```
gradify/
├── backend/                     # NestJS API
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── src/
│   │   ├── academic-session/    # Semesters / academic sessions
│   │   ├── admin/               # Super Admin panel endpoints
│   │   ├── announcements/       # Public announcement feed
│   │   ├── audit/               # Audit log service + endpoints
│   │   ├── auth/                # Login, JWT, password change, rate limiting
│   │   ├── department/          # Departments
│   │   ├── fyp-phase/           # FYP-1 / FYP-2 phases
│   │   ├── github/              # GitHub commit tracking + weekly cron
│   │   ├── groups/              # Group formation, invites, supervisor assignment
│   │   ├── mom/                 # Minutes of Meeting
│   │   ├── notification/        # In-app notifications
│   │   ├── prisma/              # Prisma service wrapper
│   │   ├── program/             # Academic programs
│   │   ├── proposal/            # Proposal submission & review
│   │   ├── settings/            # Public system settings
│   │   ├── tasks/               # Task assignment, submission, scoring
│   │   ├── university/          # Universities
│   │   ├── users/               # User management
│   │   └── main.ts              # Application entry point
│   └── package.json
│
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── admin-login/         # Super Admin login
│   │   ├── change-password/     # Forced first-login password change
│   │   ├── login/               # Student / Supervisor / Manager login
│   │   └── dashboard/
│   │       ├── admin/           # Super Admin dashboard
│   │       ├── manager/         # Manager dashboard
│   │       ├── supervisor/      # Supervisor dashboard
│   │       └── student/         # Student dashboard
│   ├── components/              # Shared UI components
│   ├── lib/                     # API client, auth store, utilities
│   └── package.json
│
├── docker-compose.yml           # PostgreSQL container
└── README.md
```

## 📸 Screenshots

> _Coming soon._

## 👨‍💻 Author

**Abdullah Zaman** — Full Stack Developer
- GitHub: [github.com/Abdullah4506878](https://github.com/Abdullah4506878)
- University: The Superior University, Lahore

## 📄 License

This project is licensed under the **MIT License**.
