# Reflect — AI-Powered Peer Review

Reflect is an AI-powered peer review tool for creative agencies. It runs as a Next.js application with SQLite for storage and Claude (via Anthropic API) for generating developmental feedback reports.

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key (get one at console.anthropic.com)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment file and fill in your values:
```bash
cp .env.example .env.local
```

3. Set these values in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...       # Your Anthropic API key
ADMIN_PASSCODE=your-secret-here    # Password to access the admin panel
NEXTAUTH_SECRET=random-string-here # Used for session cookies (any random string)
DATABASE_PATH=./reflect.db         # Where the SQLite database file lives
```

4. Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:3000. The database is automatically created and seeded with questions on first run.

## First-Time Setup Guide

1. **Go to Admin** at `/admin` and enter your `ADMIN_PASSCODE`
2. **Create a Review Cycle** — on the "Add participant" page, use the "+ Create new cycle" button
3. **Add Participants** — use "Add participant" to add team members
4. **Generate Review Links** — click on a participant to see their unique links:
   - One self-review link (share directly with the participant)
   - Up to 8 peer review links (share one per reviewer)
5. **Wait for Submissions** — reviewers fill out forms anonymously
6. **Generate Reports** — once a participant has at least 3 peer submissions, click "Generate report"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | API key for Claude report generation |
| `ADMIN_PASSCODE` | Yes | Passcode to access the admin dashboard |
| `NEXTAUTH_SECRET` | Yes | Secret for signing session cookies |
| `DATABASE_PATH` | No | Path to SQLite file (default: `./reflect.db`) |

## Pages

### Public
- `/` — Landing page
- `/review/[token]` — Review form (unique per reviewer)
- `/review/thanks` — Confirmation page

### Admin (protected)
- `/admin` — Login
- `/admin/dashboard` — Overview of all participants and cycles
- `/admin/participants/new` — Add a participant
- `/admin/participants/[id]` — Participant detail: links, stats, report generation
- `/admin/reports/[id]` — View AI-generated report

## Deployment on Vercel

**Important SQLite Note**: SQLite works on Vercel's serverless functions, but the database file is **not persistent** — it resets on every deploy because the filesystem is ephemeral.

**For production, you have two options:**

1. **Mounted Volume** (recommended for small teams): Use a service like [Railway](https://railway.app) or [Fly.io](https://fly.io) instead of Vercel, which supports persistent volumes. Set `DATABASE_PATH` to point to the mounted disk.

2. **Migrate to Postgres**: Swap `better-sqlite3` for `pg` or use [Neon](https://neon.tech) (serverless Postgres, free tier available). The schema is identical — just change the SQL dialect slightly.

**To deploy to Vercel for demos/testing** (non-persistent):
```bash
vercel deploy
```
Set all environment variables in the Vercel dashboard under Settings → Environment Variables.

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript**
- **Tailwind CSS**
- **better-sqlite3** for database
- **Anthropic SDK** (Claude) for AI report generation
