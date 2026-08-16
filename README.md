# DAS Tutor–Parent Dashboard

A full-stack web application developed in partnership with the **Dyslexia Association of Singapore (DAS)**. The platform is a centralized, secure data hub that bridges the communication gap between tutors (therapists) and parents, fostering a transparent and collaborative environment for neurodivergent learners.

Instead of static, generic grade reports, the dashboard translates raw assessment data into nuanced metrics across **vocabulary, phonics, writing, and listening/reading comprehension**. This lets therapists deliver targeted pedagogical interventions while giving parents clear, strengths-based updates on their child's learning journey — helping build a growth mindset for every student.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Data Model Overview](#data-model-overview)

---

## Features

### 🔐 Role-Based Authentication
- Username/password/role login, with **Therapist** and **Parent** experiences served from a single app shell.
- Session state (role, user ID, username) drives which dashboard, tools, and data each user can see.

### 👩‍🏫 Therapist Dashboard
- Roster view of all assigned students with search, column sorting, and pagination.
- **Student profile modal** showing full assessment history and a score trend line chart (via Recharts) across semesters.
- **At-Risk Table**: surfaces students flagged by the risk engine (see below) so therapists can prioritize outreach.
- **Relationship Manager**: link/unlink parents and students, and manage therapist-student assignments.
- **Message Parents** modal for broadcasting updates or recommendations to one or more parents.

### 👪 Parent Portal
- Simplified, jargon-free view of a child's progress.
- **AI-generated profile summary card**: a short, warm, plain-language summary of the child's current strengths, generated per visit and benchmarked against anonymized peer averages within the same performance band (no other student's raw data is exposed).
- Semester-by-semester score visualization.
- Ability to submit home observations directly to the therapist.

### ⚠️ Configurable Risk Detection Engine
- Automatically flags students as `AT_RISK`, `STABLE`, or `NEUTRAL_INSUFFICIENT_DATA` based on stagnating/declining scores relative to a configurable baseline window.
- **Risk Config Modal**: therapists can tune, per performance band (A/B/C), the critical score ceiling, moderate score ceiling, high-performer benchmark, and baseline window (in months) used to compute risk — with server-side validation to keep thresholds internally consistent.
- Results are sorted so at-risk students surface first.

### 🤖 AI-Powered Report Generation (Claude API)
- **Parent progress reports**: a warm, encouraging narrative summary of achievements, concerns, and recommendations, exportable as **PDF** or **TXT**.
- **Clinical reports**: a professional, therapist-facing summary covering growth trends, persistent gaps, and tailored intervention recommendations, exportable as **PDF** or **DOCX**.
- Generated reports are cached server-side for a short window so they can be re-downloaded without regenerating.
- All AI output is constrained to plain-text formatting (no markdown/emoji) so it renders cleanly in both chat and generated documents.

### 💬 Parent–Therapist Communications
- Threaded messaging tied to a specific student and parent, so observations and recommendations stay attached to the right learner.
- Supports both directions: parents logging home observations, therapists sending recommendations.

### 📥 Assessment Data Entry
- **Single-entry form**: therapists can key in one student's assessment scores (vocabulary, phonics, writing, listening/reading comprehension) directly from the UI.
- **Bulk import**: upload an Excel file of assessment/student data, which is handed off to a dedicated **Python ingestion service** that cleans, validates, and upserts records (students, enrollment dates, centres, bands) into the database.

### 🐳 Containerized, Multi-Service Architecture
- Four Docker Compose services — `client` (React/Vite), `server` (Express API), `db` (MySQL 8), and `data-ingestor` (Python/pandas) — orchestrated together with health checks and a persistent database volume.

### ✅ Test Coverage
- Jest unit tests for both client (component/hook behavior) and server (route handlers, report helpers).
- Property-based / fuzz testing (via `fast-check`) around report generation and other backend robustness edge cases.
- Cypress end-to-end suite covering login, the therapist dashboard, parent reports, communications, risk configuration, clinical reports, relationship management, and bulk data import.

---

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React 19, Vite, Recharts |
| Backend      | Node.js, Express 5, MySQL (`mysql2`), Multer (file uploads) |
| Reports      | `pdfkit` (PDF), `docx` (Word) |
| AI           | Anthropic Claude API (`claude-haiku-4-5`) for parent/clinical summaries |
| Data Ingestion | Python 3.11, pandas, `mysql-connector-python` |
| Database     | MySQL 8.0 |
| Testing      | Jest, Testing Library, `fast-check`, Cypress, Supertest |
| Infra        | Docker & Docker Compose |

---

## Project Structure

```text
dashboard_project/
├── db_init/
│   └── init.sql            # Database schema (users, students, assessments, risk config, etc.)
├── server/
│   ├── app.js               # Express routes: auth, students, assessments, reports, risk, communications
│   ├── index.js              # Server entry point
│   ├── __tests__/            # Jest + fuzz tests for backend routes and helpers
│   ├── scripts/               # Long-running fuzz test scripts
│   ├── Dockerfile
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/        # StudentModal, ReportDownload, ClinicalReportDownload,
│   │   │                       #  Communications, RelationshipManager, AddAssessmentModal,
│   │   │                       #  MessageParentsModal, ProfileSummaryCard, TherapistSummaryCard,
│   │   │                       #  ParentModal, linechart
│   │   ├── hooks/
│   │   │   └── useAuth.jsx     # Login / session state
│   │   ├── utils/
│   │   │   ├── loadData.jsx    # Fetches dashboard data by role
│   │   │   ├── risk.js         # Client-side risk status helper
│   │   │   └── scoreCalculator.jsx
│   │   ├── AtRiskTable.jsx
│   │   ├── RiskConfigModal.jsx
│   │   ├── App.jsx             # Root component / role-based routing
│   │   └── __tests__/          # Jest + Testing Library component tests
│   ├── Dockerfile
│   ├── vite.config.js
│   └── package.json
├── ingestor/
│   ├── ingest.py             # Bulk Excel → MySQL ingestion script
│   ├── requirements.txt
│   └── Dockerfile
├── cypress/
│   ├── e2e/                   # 01_login … 08_data_import end-to-end specs
│   ├── fixtures/
│   └── support/
├── data/                      # Mounted volume for uploaded bulk-import files
├── .env                       # Local configuration (ignored by Git)
├── .gitignore
└── docker-compose.yml         # Orchestration of client, server, db, and data-ingestor
```

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- An [Anthropic API key](https://console.anthropic.com/) if you want AI-generated parent/clinical summaries to work (the app still runs without one, but those features will return an error).

## Setup Instructions

### 1. Clone the repository and configure environment

```bash
git clone <repo-url>
cd dashboard_project

cp .env.example .env
# Open .env and fill in your database password and Anthropic API key
```

### 2. Launch the application

```bash
docker-compose up --build
```

This starts MySQL, the Express API, and the React client. The `data-ingestor` service is defined with the `manual` Compose profile and only runs when explicitly invoked — normal bulk imports triggered from the UI run inside the `server` container instead (see [Bulk Data Import](#bulk-data-import) below).

### 3. Access the dashboard

```
http://localhost:5173
```

The API itself is available at `http://localhost:3000`.

## Environment Variables

Set these in your `.env` file at the project root:

| Variable | Used by | Description |
|---|---|---|
| `DB_PASSWORD` | `db`, `server` | MySQL root password (defaults to `password` if unset) |
| `DB_NAME` | `db`, `server` | Database name (defaults to `dashboard_db` if unset) |
| `ANTHROPIC_API_KEY` | `server` | API key used to generate parent-friendly and clinical AI summaries |

## Usage

- **Log in** with a seeded therapist or parent account (see `db_init/init.sql` for schema details, or create accounts directly in the `users` table).
- **Therapists** land on the management dashboard: browse/search/sort students, open a student to view history and generate reports, configure risk thresholds, manage parent-student relationships, and add or bulk-import assessments.
- **Parents** land on the progress portal: view their child's AI-generated summary and score history, download parent-facing reports, and message the therapist.

### Bulk Data Import

From the therapist dashboard, use **Add Assessment → Bulk Import** to upload an Excel file of student/assessment records. The server saves the file, invokes the Python ingestion script (`ingestor/ingest.py`) to validate and upsert the data into MySQL, and then removes the temporary upload.

## Development Workflow

**Stopping the app**
```bash
docker-compose down
```

**Cleaning data** (wipes the database volume and starts fresh)
```bash
docker-compose down -v
```

**Adding new dependencies**

Add the package to the relevant `package.json` (`server/` or `client/`), then rebuild:
```bash
docker-compose up --build
```

## Testing

**Backend unit tests** (from `server/`)
```bash
npm test
```
Covers route handlers and report/document generation helpers, and includes fuzz/property-based tests via `fast-check` for backend robustness.

**Frontend unit tests** (from `client/`)
```bash
npm test
```
Component and hook tests using Jest + React Testing Library.

**End-to-end tests** (from the project root)
```bash
npm run cypress:open   # interactive
npm run cypress:run    # headless / CI
```
Specs cover: login, the therapist dashboard, parent report generation, communications, risk configuration, clinical report generation, relationship management, and bulk data import.

## Data Model Overview

Core entities defined in `db_init/init.sql`:

- **users** — shared login table with a `role` of `parent` or `therapist`.
- **students** — student profile (name, age, band, enrollment date, centre, school).
- **therapist_student** / **parent_student** — many-to-many linking tables connecting users to the students they support.
- **assessments** — per-semester scores stored as validated JSON across four domains (`vocab`, `pa/phonics`, `writing`, `listening/readingcomprehension`), plus an overall performance band.
- **communications** — threaded messages between a parent and therapist for a given student.
- **Risk_Threshold_Configurations** — configurable, band-aware thresholds that drive the at-risk detection engine.
